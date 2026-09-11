# Song bar analysis

A Python CLI that detects beats in audio and exports bar start times and optional click tracks for review.
The user specifies the number of beats per bar. The first downbeat is either selected from harmonic and bass changes or specified by beat index.
All results are provisional: the tool does not automatically determine score bar numbers or changes in time signature.

## Usage

Requires Python 3.11 or later, librosa, NumPy, SciPy, Matplotlib, and `ffmpeg`.
Python dependencies are defined in `pyproject.toml`. Activate a Python 3.11+ virtual environment, then install the tool as shown below.
Install `ffmpeg` separately and make it available on PATH. Run the installed tool with `python -m song_bar_analysis` or `song-bar-analysis`.

The commands below work in **both fish and bash**. Adjust input paths, output directories, and BPM values for your audio.

```sh
# Start from the web-music repository root
cd tools/song-bar-analysis/
python -m pip install -e '.[test]'

# Analyze audio and export bar times in one step
python -m song_bar_analysis run /path/to/music.opus outputs/music/ --beats-per-bar 4 --click-track

# Preview work without creating files; -n and -q go before the subcommand
python -m song_bar_analysis -n run /path/to/music.opus outputs/music/ --click-track

# Run beat detection, phase evaluation, and export separately
python -m song_bar_analysis analyze /path/to/music.mp3 outputs/another/
python -m song_bar_analysis evaluate outputs/another/ --meters 3 4 6
python -m song_bar_analysis inspect outputs/another/ --start 20 --end 40
python -m song_bar_analysis export outputs/another/ --beats-per-bar 4 --first-beat 1 --click-track

# Count every second detected pulse as a beat, starting at zero-based index 3
python -m song_bar_analysis evaluate outputs/another/ --meters 4 --stride 2
python -m song_bar_analysis export outputs/another/ --beats-per-bar 4 --first-beat 3 --stride 2 --click-track

# Repair tracking slips in audio with a confirmed constant tempo, then export again
python -m song_bar_analysis regularize outputs/another/ --bpm 100 --offset 0.5
python -m song_bar_analysis export outputs/another/ --first-beat 0 --click-track

# Help and tests
python -m song_bar_analysis --help
python -m song_bar_analysis export --help
python -m pytest -q
```

Use an empty output directory for `analyze` / `run`, or pass `--force` to replace existing generated files.
Input audio is converted to mono at 22050 Hz using ffmpeg. The source file is not modified.

## Beat and bar selection

| Option | Meaning |
|---|---|
| `--beats-per-bar 4` | Assume four beats per bar; this does not enable automatic meter detection |
| `--first-beat 1` | Use detected beat index 1 as the first downbeat; indices are **zero-based** |
| `--stride 2` | Use every second detected beat, counting at approximately half the detected BPM |
| `--last-beat 100` | Include detected beats through index 100, inclusive |
| `--first-bar 7` | Number the first exported bar as 7 |
| `--bpm 120` | Specify the beat-tracking tempo for `analyze` / `run` |
| `--tightness 100` | Control how strongly `analyze` / `run` prefer the expected beat interval |

If `--first-beat` is omitted, the tool selects the phase with the largest average harmonic and bass change for the specified beats per bar and stride.
It does not determine whether the opening contains silence or a pickup. If the automatic selection is unsuitable, use the beat indices from `inspect` and listen to the click track to adjust it.
Scores from `evaluate` are neither probabilities nor accuracy estimates. Do not infer meter solely by comparing scores across meters or candidates with few observations.

## Outputs

| File | Contents |
|---|---|
| `bars.txt` | A `Time Bar` header followed by downbeats in `00:01.234 1` format |
| `beats.csv` | Selected beat times in seconds, beat numbers, bar numbers, and beat positions within each bar |
| `session.json` | Input path, audio duration, librosa version, analysis settings, and regularization settings |
| `initial.json` | Beat-interval statistics in 30-second segments from the initial detection |
| `evaluation.json` | Bar-phase candidates and statistics for the current beat sequence |
| `result.json` | Exported bar count, first and last bar times, selection method, and assumptions |
| `review.opus` | Generated with `--click-track`: music on the left, clicks on the right, with higher-pitched clicks for downbeats |
| `onsets.png` | Onset strengths and detected beat indices over the time range requested with `inspect` |
| `audio.wav`, `features.npz` | Decoded audio and features used by subsequent processing |

`regularize` builds a constant-tempo grid to repair tracking slips while retaining nearby measured beats.
Original features are saved in `features-original.npz`; repeated corrections always start from that original beat sequence.
Stale evaluations, bar exports, click tracks, and plots are removed and must be regenerated as needed.
Re-running `export` also removes previous click tracks so that audio from a different bar selection does not remain alongside the new results.

## Algorithm and limitations

1. Analyze frequency content in 2048-sample windows, advancing by 220 samples (about 9.98 ms).
2. Compute onset strengths from log-power features in 96 mel bands.
3. Use librosa's tempo estimation and dynamic programming to detect beats. A single BPM is used for the entire recording, either estimated from the full signal or supplied with `--bpm`.
4. When needed, compute chroma features for the full spectrum and for frequencies below 350 Hz. Compare features before and after beats using cosine distance to score downbeat candidates.
5. Select beats using the chosen first downbeat, beats per bar, and stride, then assign bar numbers.

The current implementation assumes a roughly constant BPM. It tolerates small variations in beat spacing but does not estimate and follow changes in BPM throughout the recording.
Supporting large tempo changes or sustained acceleration and deceleration requires estimating a BPM for each frame, passing that array to `beat_track`, and updating the code that currently saves BPM as a single value.
Librosa itself supports time-varying BPM; see its [official tutorial](https://librosa.org/doc/1.0.0/auto_tutorials/03-advanced/plot_dynamic_beat.html).
Changing `--tightness` alone does not enable time-varying BPM estimation. `regularize` also assumes a constant-BPM grid and cannot provide variable-tempo tracking.

The analysis time step is not a guarantee of timing accuracy. Offbeats, double- or half-time interpretations, pickups, silence, meter changes, and tempo changes can cause errors.
Beat detection with `trim=False` can retain candidates near weak beginnings and endings. Listen and adjust the selection with options such as `--last-beat`.
Silent input is saved with zero detected beats. Evaluation and bar export fail with an explanatory message when no beats are available.

## Layout

- `song_bar_analysis/cli.py`: Subcommands, argument validation, and dry runs.
- `song_bar_analysis/core.py`: Audio analysis, regularization, phase evaluation, export, and visualization.
- `tests/`: Synthetic-audio pipeline tests, silence and short-input handling, beat selection, regularization, and invalidation of stale outputs.

The default output directory `outputs/`, audio files (including Opus, WAV, and MP3), generated `onsets.png` plots, features, logs, caches, and ZIP archives are excluded from Git.
