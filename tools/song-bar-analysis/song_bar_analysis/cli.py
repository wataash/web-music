"""Command-line interface for beat and bar analysis."""
import argparse
import json
import logging
import math
from pathlib import Path
import subprocess

from . import __version__
from . import core

logger = logging.getLogger(__name__)


class ArgumentDefaultsRawTextHelpFormatter(argparse.ArgumentDefaultsHelpFormatter, argparse.RawTextHelpFormatter):
    pass


def positive_float(value):
    number = float(value)
    if not math.isfinite(number) or number <= 0:
        raise argparse.ArgumentTypeError("must be finite and greater than zero")
    return number


def nonnegative_float(value):
    number = float(value)
    if not math.isfinite(number) or number < 0:
        raise argparse.ArgumentTypeError("must be finite and nonnegative")
    return number


def positive_int(value):
    number = int(value)
    if number <= 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return number


def nonnegative_int(value):
    number = int(value)
    if number < 0:
        raise argparse.ArgumentTypeError("must be nonnegative")
    return number


def analyze_options(parser):
    parser.add_argument("audio", type=Path, help="input audio supported by ffmpeg")
    parser.add_argument("output", type=Path, help="analysis directory")
    parser.add_argument("--bpm", type=positive_float, help="fixed beat-tracking BPM; default: estimate")
    parser.add_argument("--tightness", type=positive_float, default=100, help="beat-interval regularity weight")
    parser.add_argument("--force", action="store_true", help="replace generated artifacts in an existing output directory")


def export_options(parser):
    parser.add_argument("--beats-per-bar", type=positive_int, default=4, help="assumed beats per bar (not automatic meter detection)")
    parser.add_argument("--first-beat", type=nonnegative_int, help="zero-based detected beat index of first bar; default: harmonic heuristic")
    parser.add_argument("--stride", type=positive_int, default=1, help="use every Nth detected beat; 2 gives half-time counting")
    parser.add_argument("--last-beat", type=nonnegative_int, help="inclusive last detected beat index")
    parser.add_argument("--first-bar", type=int, default=1, help="number assigned to the first exported bar")
    parser.add_argument("--click-track", action="store_true", help="create review.opus: music left, accented clicks right")


def parser_for_cli():
    parser = argparse.ArgumentParser(description="Estimate beat and provisional bar timestamps from audio.", formatter_class=ArgumentDefaultsRawTextHelpFormatter)
    parser.add_argument("--version", action="version", version=__version__)
    parser.add_argument("-q", "--quiet", action="count", default=0)
    parser.add_argument("-n", "--dry-run", "--dry_run", action="store_true", help="print planned work without creating or modifying files")
    subs = parser.add_subparsers(dest="command", required=True)
    p = subs.add_parser("analyze", help="decode audio and detect beats", formatter_class=ArgumentDefaultsRawTextHelpFormatter)
    analyze_options(p)
    p = subs.add_parser("run", help="analyze then export provisional bars", formatter_class=ArgumentDefaultsRawTextHelpFormatter)
    analyze_options(p); export_options(p)
    p = subs.add_parser("evaluate", help="compare bar-phase candidates", formatter_class=ArgumentDefaultsRawTextHelpFormatter)
    p.add_argument("directory", type=Path)
    p.add_argument("--meters", type=positive_int, nargs="+", default=[3, 4, 6])
    p.add_argument("--stride", type=positive_int, default=1)
    p = subs.add_parser("regularize", help="repair tracking slips using a specified constant tempo", formatter_class=ArgumentDefaultsRawTextHelpFormatter)
    p.add_argument("directory", type=Path)
    p.add_argument("--bpm", required=True, type=positive_float)
    p.add_argument("--offset", required=True, type=nonnegative_float, help="seconds of the first grid beat")
    p.add_argument("--tolerance", type=nonnegative_float, default=.07, help="retain measured beats within this many seconds of the grid")
    p = subs.add_parser("export", help="write bars.txt and optional click audio", formatter_class=ArgumentDefaultsRawTextHelpFormatter)
    p.add_argument("directory", type=Path); export_options(p)
    p = subs.add_parser("inspect", help="plot onset strengths and detected beat indices", formatter_class=ArgumentDefaultsRawTextHelpFormatter)
    p.add_argument("directory", type=Path)
    p.add_argument("--start", type=nonnegative_float, default=0.)
    p.add_argument("--end", type=positive_float, help="default: start + 30 seconds, capped at duration")
    return parser


def execute(args):
    if args.dry_run:
        if args.command in ("analyze", "run"):
            core.run_command(core.decode_command(args.audio, args.output / "audio.wav"), dry_run=True)
            print(f"Detect beats and write session.json, features.npz, initial.json in {args.output}/")
        if args.command in ("export", "run"):
            root = args.output if args.command == "run" else args.directory
            print(f"Write bars.txt, beats.csv, result.json in {root}/; assumed {args.beats_per_bar} beats/bar, stride={args.stride}, first-beat={args.first_beat}")
            if args.click_track:
                print(f"Render stereo clicks to {root / 'review.wav'}")
                core.run_command(["ffmpeg", "-nostdin", "-v", "error", "-i", str(root / "review.wav"), "-c:a", "libopus", "-b:a", "128k", "-y", str(root / "review.opus")], dry_run=True)
        elif args.command not in ("analyze",):
            print(f"{args.command}: {args.directory}/")
        return {"dry_run": True}
    if args.command in ("analyze", "run"):
        result = core.analyze(args.audio, args.output, bpm=args.bpm, tightness=args.tightness, force=args.force)
        if args.command == "analyze":
            return result
    if args.command in ("export", "run"):
        return core.export(args.output if args.command == "run" else args.directory,
                           beats_per_bar=args.beats_per_bar, first_beat=args.first_beat, stride=args.stride,
                           last_beat=args.last_beat, first_bar=args.first_bar, click_track=args.click_track)
    if args.command == "evaluate":
        return core.evaluate(args.directory, meters=args.meters, stride=args.stride)
    if args.command == "regularize":
        return core.regularize(args.directory, bpm=args.bpm, offset=args.offset, tolerance=args.tolerance)
    return core.inspect(args.directory, start=args.start, end=args.end)


def main(argv=None):
    parser = parser_for_cli()
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO if not args.quiet else logging.WARNING, format="%(levelname)s %(message)s")
    try:
        result = execute(args)
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        logger.error("%s", error)
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False))
    return 0
