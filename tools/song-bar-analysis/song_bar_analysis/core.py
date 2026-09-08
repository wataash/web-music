"""Analysis and artifact generation. Musical choices belong to callers."""
import json
import logging
import math
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import tempfile

import numpy as np
from scipy.io import wavfile

logger = logging.getLogger(__name__)
SR = 22050
HOP = 220
DERIVED = ("evaluation.json", "bars.txt", "beats.csv", "result.json", "review.wav", "review.opus", "onsets.png")


def audio_library():
    # Numba otherwise tries to write alongside a possibly read-only installation.
    os.environ.setdefault("NUMBA_CACHE_DIR", str(Path(tempfile.gettempdir()) / "song-bar-analysis-numba"))
    import librosa
    return librosa


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def run_command(command, *, dry_run=False):
    printable = shlex.join([str(x) for x in command])
    logger.info("%s", printable)
    if dry_run:
        print(printable)
        return
    if shutil.which(str(command[0])) is None:
        raise ValueError(f"Required executable is not installed: {command[0]}")
    subprocess.run(command, check=True)


def decode_command(source, destination):
    return ["ffmpeg", "-nostdin", "-v", "error", "-i", str(source), "-ac", "1", "-ar", str(SR), "-y", str(destination)]


def timestamp(seconds):
    ms = round(float(seconds) * 1000)
    return f"{ms // 60000:02d}:{ms // 1000 % 60:02d}.{ms % 1000:03d}"


def read_session(root):
    metadata = json.loads((root / "session.json").read_text(encoding="utf-8"))
    if metadata.get("schema_version") != 1:
        raise ValueError("Unsupported session schema; run analyze into a new directory")
    with np.load(root / "features.npz", allow_pickle=False) as archive:
        data = {key: archive[key] for key in archive.files}
    times = data["times"]
    if times.ndim != 1 or not np.all(np.isfinite(times)) or np.any(np.diff(times) <= 0):
        raise ValueError("Invalid or non-increasing beat times")
    if len(times) and (times[0] < 0 or times[-1] >= metadata["duration"]):
        raise ValueError("Beat times lie outside the audio")
    return metadata, data


def read_audio(root):
    librosa = audio_library()
    return librosa.load(root / "audio.wav", sr=SR)[0]


def invalidate(root):
    for name in DERIVED:
        (root / name).unlink(missing_ok=True)


def beat_summary(times, duration):
    segments = []
    for start in range(0, math.ceil(duration), 30):
        local = times[(times >= start) & (times < start + 30)]
        intervals = np.diff(local)
        fit = np.polyfit(np.arange(len(local)), local, 1) if len(local) >= 3 else None
        segments.append({
            "start": start, "beat_count": len(local),
            "median_bpm": float(60 / np.median(intervals)) if len(intervals) else None,
            "interval_quantiles": np.quantile(intervals, [0, .1, .9, 1]).tolist() if len(intervals) else [],
            "linear_grid_residual_90_ms": float(np.percentile(np.abs(local - np.polyval(fit, np.arange(len(local)))), 90) * 1000) if fit is not None else None,
        })
    return {"beat_count": len(times), "segments": segments}


def analyze(source, root, *, bpm=None, tightness=100, force=False):
    source = source.resolve()
    if not source.is_file():
        raise ValueError(f"Input audio does not exist: {source}")
    if root.exists() and any(root.iterdir()) and not force:
        raise ValueError("Output directory is not empty; use a new directory or --force")
    if source == (root / "audio.wav").resolve():
        raise ValueError("Input must not be the output audio.wav")
    # Decode before replacing existing artifacts, including on --force.
    root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="decode-", dir=root) as temporary:
        decoded = Path(temporary) / "audio.wav"
        run_command(decode_command(source, decoded))
        librosa = audio_library()
        y, sr = librosa.load(decoded, sr=SR)
        if not len(y):
            raise ValueError("Input audio is empty")
        logger.info("Computing spectral features (%.2f seconds)", len(y) / sr)
        mel = librosa.feature.melspectrogram(y=y, sr=sr, hop_length=HOP, n_fft=2048, n_mels=96)
        db = librosa.power_to_db(mel)
        onset = librosa.onset.onset_strength(S=db, sr=sr, hop_length=HOP)
        bands = np.array([librosa.onset.onset_strength(S=b, sr=sr, hop_length=HOP) for b in np.array_split(db, 4)])
        tempo, frames = librosa.beat.beat_track(onset_envelope=onset, sr=sr, hop_length=HOP, bpm=bpm, tightness=tightness, trim=False)
        times = librosa.frames_to_time(frames, sr=sr, hop_length=HOP)
        valid = times < len(y) / sr
        times, frames = times[valid], frames[valid]
        data = dict(onset=onset, bands=bands, frames=frames, times=times, sr=sr, hop=HOP)
        metadata = {
            "schema_version": 1, "source": str(source), "duration": len(y) / sr,
            "librosa_version": librosa.__version__, "sample_rate": sr, "hop_length": HOP,
            "n_fft": 2048, "n_mels": 96, "requested_bpm": bpm, "tightness": tightness,
            "detected_bpm": float(np.asarray(tempo).reshape(-1)[0]),
            "regularization": None,
        }
        invalidate(root)
        (root / "features-original.npz").unlink(missing_ok=True)
        decoded.replace(root / "audio.wav")
        np.savez_compressed(root / "features.npz", **data)
        write_json(root / "session.json", metadata)
        write_json(root / "initial.json", beat_summary(times, metadata["duration"]))
    return metadata


def cosine_change(before, after):
    denominator = float(np.linalg.norm(before) * np.linalg.norm(after))
    # Silence does not supply evidence of a harmonic change.
    return max(0., 1 - float(np.dot(before, after)) / denominator) if denominator > 1e-10 else 0.


def evaluate(root, *, meters=(3, 4, 6), stride=1):
    metadata, data = read_session(root)
    times, frames = data["times"], data["frames"]
    if len(times) < 2:
        raise ValueError("At least two detected beats are required to evaluate bar candidates")
    librosa = audio_library()
    y = read_audio(root)
    sr, hop = int(data["sr"]), int(data["hop"])
    harmonic_hop = hop * 2
    logger.info("Comparing harmonic changes and bar phases")
    power = np.abs(librosa.stft(y, n_fft=4096, hop_length=harmonic_hop)) ** 2
    frequencies = librosa.fft_frequencies(sr=sr, n_fft=4096)
    chroma = librosa.feature.chroma_stft(S=power, sr=sr, n_fft=4096, hop_length=harmonic_hop)
    bass = librosa.feature.chroma_stft(S=power * (frequencies[:, None] < 350), sr=sr, n_fft=4096, hop_length=harmonic_hop)
    period = float(np.median(np.diff(times))) * stride

    def sample(c, a, b):
        start = max(0, min(c.shape[1] - 1, int(a * sr / harmonic_hop)))
        end = max(start + 1, min(c.shape[1], int(b * sr / harmonic_hop)))
        return c[:, start:end].mean(axis=1)

    changes = np.array([[cosine_change(sample(c, t - period * .5, t - period * .12), sample(c, t + period * .12, t + period * .55)) for t in times] for c in (chroma, bass)])
    accents = np.array([[float(np.max(b[max(0, f - 5):min(len(b), f + 6)])) for f in frames] for b in data["bands"]])
    margin = min(5., metadata["duration"] / 10)
    usable = (times >= margin) & (times < metadata["duration"] - margin)
    if usable.sum() < max(meters) * stride * 2:
        usable = np.ones(len(times), dtype=bool)
    indices = np.arange(len(times))
    candidates = []
    for meter in meters:
        for phase in range(meter * stride):
            select = usable & (indices % (meter * stride) == phase)
            count = int(select.sum())
            if not count:
                continue
            harmony_bass = changes[:, select].mean(axis=1)
            candidates.append({"beats_per_bar": meter, "stride": stride, "first_beat": phase,
                               "observations": count, "score": float(harmony_bass.mean()),
                               "harmony_bass": harmony_bass.tolist(), "onsets": accents[:, select].mean(axis=1).tolist()})
    candidates.sort(key=lambda item: item["score"], reverse=True)
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
    active = np.flatnonzero(rms > rms.max() * .025)
    report = {"method": "mean harmonic and bass cosine change; scores are not probabilities",
              "duration": metadata["duration"], "median_bpm": 60 / period,
              "stride": stride, "detected_beat_count": len(times), "candidates": candidates,
              "audible_range": [float(active[0] * hop / sr), float(active[-1] * hop / sr)] if len(active) else None,
              **beat_summary(times[::stride], metadata["duration"])}
    write_json(root / "evaluation.json", report)
    return report


def regularized_times(original, duration, bpm, offset, tolerance):
    if not len(original):
        raise ValueError("No detected beats to regularize")
    period = 60 / bpm
    if not 0 <= offset < duration:
        raise ValueError("Offset must lie within the audio")
    if not 0 <= tolerance < period / 2:
        raise ValueError("Tolerance must be less than half a beat period")
    grid = np.arange(offset, duration, period)
    right = np.clip(np.searchsorted(original, grid), 0, len(original) - 1)
    left = np.maximum(right - 1, 0)
    nearest = np.where(np.abs(original[left] - grid) < np.abs(original[right] - grid), left, right)
    matched = np.abs(original[nearest] - grid) < tolerance
    return np.where(matched, original[nearest], grid), int((~matched).sum())


def regularize(root, *, bpm, offset, tolerance=.07):
    metadata, data = read_session(root)
    backup = root / "features-original.npz"
    if backup.exists():
        with np.load(backup) as archive:
            original = archive["times"]
    else:
        original = data["times"]
    times, filled = regularized_times(original, metadata["duration"], bpm, offset, tolerance)
    if not backup.exists():
        shutil.copyfile(root / "features.npz", backup)
    data["times"] = times
    data["frames"] = np.minimum(np.round(times * int(data["sr"]) / int(data["hop"])).astype(int), len(data["onset"]) - 1)
    metadata["regularization"] = dict(bpm=bpm, offset=offset, tolerance=tolerance, grid_filled_beats=filled)
    invalidate(root)
    np.savez_compressed(root / "features.npz", **data)
    write_json(root / "session.json", metadata)
    return metadata["regularization"]


def select_beats(times, *, first_beat, stride, last_beat=None):
    end = len(times) - 1 if last_beat is None else last_beat
    if not 0 <= first_beat <= end < len(times):
        raise ValueError("Require 0 <= first-beat <= last-beat < detected beat count")
    return times[first_beat:end + 1:stride]


def render_clicks(y, sr, times, beats_per_bar):
    clicks = np.zeros_like(y, dtype=np.float32)
    for index, beat in enumerate(times):
        start = round(float(beat) * sr)
        length = min(round(.055 * sr), len(y) - start)
        if length <= 0:
            continue
        x = np.arange(length) / sr
        downbeat = index % beats_per_bar == 0
        clicks[start:start + length] += (.65 if downbeat else .3) * np.sin(2 * np.pi * (1600 if downbeat else 900) * x) * np.exp(-x * 70)
    return np.clip(np.column_stack([y * .65, clicks]), -1, 1)


def export(root, *, beats_per_bar=4, first_beat=None, stride=1, last_beat=None, first_bar=1, click_track=False):
    metadata, data = read_session(root)
    times = data["times"]
    if not len(times):
        raise ValueError("No beats were detected; cannot assign bar numbers")
    automatic = first_beat is None
    if automatic:
        # Re-evaluate to avoid applying a cached phase to a different beat sequence.
        report = evaluate(root, meters=(beats_per_bar,), stride=stride)
        first_beat = report["candidates"][0]["first_beat"]
    selected = select_beats(times, first_beat=first_beat, stride=stride, last_beat=last_beat)
    downbeats = selected[::beats_per_bar]
    result = {"source": metadata["source"], "duration": metadata["duration"],
              "beats_per_bar": beats_per_bar, "first_beat": first_beat, "stride": stride,
              "last_beat": last_beat, "first_bar": first_bar, "phase_selection": "heuristic" if automatic else "explicit",
              "bars": len(downbeats), "first": timestamp(downbeats[0]), "last": timestamp(downbeats[-1]),
              "median_bpm": float(60 / np.median(np.diff(selected))) if len(selected) > 1 else None,
              "regularization": metadata["regularization"],
              "provisional": True, "warning": "Meter is assumed, not detected. Phase and bar numbering require listening verification."}
    # Validate before overwriting exported files.
    if click_track and shutil.which("ffmpeg") is None:
        raise ValueError("Required executable is not installed: ffmpeg")
    (root / "result.json").unlink(missing_ok=True)
    (root / "bars.txt").write_text("時間 小節\n" + "".join(f"{timestamp(t)} {i}\n" for i, t in enumerate(downbeats, first_bar)), encoding="utf-8")
    (root / "beats.csv").write_text("time_seconds,beat,bar,beat_in_bar\n" + "".join(f"{t:.6f},{i + 1},{first_bar + i // beats_per_bar},{i % beats_per_bar + 1}\n" for i, t in enumerate(selected)), encoding="utf-8")
    for filename in ("review.wav", "review.opus"):
        (root / filename).unlink(missing_ok=True)
    if click_track:
        y = read_audio(root)
        audio = render_clicks(y, int(data["sr"]), selected, beats_per_bar)
        wavfile.write(root / "review.wav", int(data["sr"]), (audio * 32767).astype(np.int16))
        run_command(["ffmpeg", "-nostdin", "-v", "error", "-i", str(root / "review.wav"), "-c:a", "libopus", "-b:a", "128k", "-y", str(root / "review.opus")])
    write_json(root / "result.json", result)
    return result


def inspect(root, *, start=0., end=None):
    metadata, data = read_session(root)
    end = min(start + 30, metadata["duration"]) if end is None else end
    if not 0 <= start < end <= metadata["duration"]:
        raise ValueError("Require 0 <= start < end <= audio duration")
    os.environ.setdefault("MPLCONFIGDIR", str(Path(tempfile.gettempdir()) / "song-bar-analysis-mpl"))
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(14, 4))
    t = np.arange(len(data["onset"])) * int(data["hop"]) / int(data["sr"])
    for index, band in enumerate(data["bands"]):
        ax.plot(t, band / max(float(np.percentile(band, 99)), 1e-8) + index, label=f"Band {index + 1}")
    for index, beat in enumerate(data["times"]):
        if start <= beat <= end:
            ax.axvline(beat, color="black", alpha=.25)
            ax.text(beat, 4.2, str(index), fontsize=7)
    ax.set(xlim=(start, end), ylim=(0, 4.7), xlabel="Seconds", title="Onset strength and detected beat indices (zero-based)")
    ax.legend(); fig.tight_layout(); fig.savefig(root / "onsets.png", dpi=120); plt.close(fig)
    return {"plot": str(root / "onsets.png"), "start": start, "end": end}
