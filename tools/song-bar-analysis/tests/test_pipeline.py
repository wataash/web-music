"""Behavior checks for arbitrary audio, indexing, and derived-file invalidation."""
import json
from pathlib import Path

import numpy as np
import pytest
from scipy.io import wavfile

from song_bar_analysis import core
from song_bar_analysis.cli import main


@pytest.fixture
def session(tmp_path):
    root = tmp_path / "session"
    root.mkdir()
    sr, hop = core.SR, core.HOP
    duration = 8.
    times = np.arange(.5, duration, .5)
    count = int(duration * sr / hop) + 1
    np.savez_compressed(root / "features.npz", times=times, frames=np.round(times * sr / hop).astype(int), onset=np.ones(count), bands=np.ones((4, count)), sr=sr, hop=hop)
    core.write_json(root / "session.json", dict(schema_version=1, source="arbitrary.wav", duration=duration, regularization=None))
    wavfile.write(root / "audio.wav", sr, np.zeros(int(duration * sr), dtype=np.int16))
    return root


def test_export_indexing_and_half_time(session):
    result = core.export(session, beats_per_bar=3, first_beat=1, stride=2, last_beat=13, first_bar=7)
    assert (session / "bars.txt").read_text().splitlines() == ["時間 小節", "00:01.000 7", "00:04.000 8", "00:07.000 9"]
    assert result["median_bpm"] == 60.
    assert result["phase_selection"] == "explicit"
    assert len((session / "beats.csv").read_text().splitlines()) == 8


@pytest.mark.parametrize("options", [dict(first_beat=20), dict(first_beat=3, last_beat=2), dict(first_beat=0, last_beat=20)])
def test_invalid_export_does_not_replace_previous_output(session, options):
    (session / "bars.txt").write_text("keep me")
    with pytest.raises(ValueError):
        core.export(session, **options)
    assert (session / "bars.txt").read_text() == "keep me"


def test_regularize_repeated_calls_use_original_and_invalidate(session):
    for name in core.DERIVED:
        (session / name).write_text("stale")
    original = np.load(session / "features.npz")["times"].copy()
    core.regularize(session, bpm=120, offset=.6, tolerance=.01)
    assert all(not (session / name).exists() for name in core.DERIVED)
    core.regularize(session, bpm=120, offset=.5)
    np.testing.assert_allclose(np.load(session / "features.npz")["times"], original)
    assert json.loads((session / "session.json").read_text())["regularization"]["bpm"] == 120


def test_regularize_rejects_duplicate_matching(session):
    with pytest.raises(ValueError, match="half a beat"):
        core.regularize(session, bpm=120, offset=.5, tolerance=.5)
    assert not (session / "features-original.npz").exists()


def test_dry_run_creates_nothing(tmp_path, capsys):
    root = tmp_path / "output"
    assert main(["-n", "run", str(tmp_path / "a 'quoted' input.opus"), str(root), "--click-track"]) == 0
    assert not root.exists()
    assert "ffmpeg" in capsys.readouterr().out


@pytest.mark.parametrize("option,value", [("--bpm", "nan"), ("--bpm", "0"), ("--stride", "0"), ("--first-beat", "-1"), ("--beats-per-bar", "0")])
def test_invalid_cli_parameters(option, value):
    with pytest.raises(SystemExit) as error:
        main(["run", "input.wav", "output", option, value])
    assert error.value.code == 2


def test_cosine_change_without_signal_is_not_evidence():
    assert core.cosine_change(np.zeros(12), np.ones(12)) == 0.


def test_real_audio_pipeline_and_clicks(tmp_path):
    sr = core.SR
    y = np.zeros(sr * 12, dtype=np.float32)
    for t in np.arange(.5, 11.5, .5):
        i = round(t * sr)
        x = np.arange(round(.04 * sr)) / sr
        y[i:i + len(x)] += .7 * np.sin(2 * np.pi * 1000 * x) * np.exp(-100 * x)
    source = tmp_path / "unrelated name.wav"
    wavfile.write(source, sr, (y * 32767).astype(np.int16))
    root = tmp_path / "analysis"
    assert main(["run", str(source), str(root), "--bpm", "120", "--first-beat", "0", "--click-track"]) == 0
    metadata, data = core.read_session(root)
    assert metadata["source"] == str(source)
    assert 20 <= len(data["times"]) <= 25
    assert np.median(np.diff(data["times"])) == pytest.approx(.5, abs=.02)
    assert (root / "review.opus").stat().st_size > 0
    output_sr, click_audio = wavfile.read(root / "review.wav")
    assert output_sr == sr and click_audio.shape == (len(y), 2)
    np.testing.assert_allclose(click_audio[:, 0] / 32767, y * .65, atol=1e-4)
    assert np.max(np.abs(click_audio[:, 1])) > 0
    evaluation = core.evaluate(root, meters=[3, 4], stride=2)
    assert evaluation["candidates"]
    assert all(np.isfinite(c["score"]) for c in evaluation["candidates"])
    assert main(["inspect", str(root), "--start", "3", "--end", "6"]) == 0
    assert (root / "onsets.png").exists()
    before = (root / "features.npz").read_bytes()
    assert main(["analyze", str(source), str(root)]) == 1
    assert (root / "features.npz").read_bytes() == before


def test_silence_and_short_audio(tmp_path):
    for seconds in (2., .02):
        source = tmp_path / f"silence-{seconds}.wav"
        wavfile.write(source, core.SR, np.zeros(round(seconds * core.SR), dtype=np.int16))
        root = tmp_path / f"out-{seconds}"
        assert main(["analyze", str(source), str(root)]) == 0
        metadata, data = core.read_session(root)
        assert len(data["times"]) == 0
        assert main(["export", str(root)]) == 1
        assert not (root / "bars.txt").exists()
        json.loads((root / "initial.json").read_text(), parse_constant=lambda value: pytest.fail(value))
