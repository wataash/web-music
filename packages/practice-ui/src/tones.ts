// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// The sound of a card: the note it answers with, and the note under a finger
// on the keyboard or the neck. Synthesised rather than sampled — a deck of
// recordings is megabytes the app would have to carry offline, and what is
// wanted here is only enough of a piano or a guitar to hear an interval.
//
// Both voices are built the way the instrument makes its sound. A piano is a
// struck string heard as a few harmonics that die away at different rates, so
// it is drawn as partials over one envelope. A guitar is a plucked string,
// which is what Karplus–Strong models directly: a burst of noise fed round a
// delay line the length of one period, averaged a little on each lap.
// <https://en.wikipedia.org/wiki/Karplus%E2%80%93Strong_string_synthesis>

export type Instrument = "piano" | "guitar";

// Concert pitch, from which every other note is a number of semitones away.
const A4_SEMITONE = 69;
const A4_HERTZ = 440;

// Two notes at once would be twice as loud as one, and a card can name a
// handful of positions at a time.
const VOICE_GAIN = 0.22;

// How long a plucked string is drawn out for. Long enough to hear it ring,
// short enough that the next tap is a new note rather than a chord.
const PLUCK_SECONDS = 2.2;

let context: AudioContext | null = null;
// One string per pitch, kept: a keyboard tapped along a scale would otherwise
// build the same noise burst over and over.
const pluckCache = new Map<number, AudioBuffer>();

export function semitoneHertz(semitone: number): number {
  return A4_HERTZ * 2 ** ((semitone - A4_SEMITONE) / 12);
}

// Made on the first note rather than at load: a context built before the
// reader has touched anything starts suspended, and some browsers log it.
function audioContext(): AudioContext | null {
  if (context !== null) {
    // Coming back to the tab can leave it suspended; a note is a gesture.
    if (context.state === "suspended") void context.resume();
    return context;
  }
  const Constructor =
    typeof AudioContext === "undefined" ? undefined : AudioContext;
  if (Constructor === undefined) return null;
  try {
    context = new Constructor();
  } catch {
    return null;
  }
  return context;
}

export function playSemitone(
  semitone: number,
  instrument: Instrument = "piano",
): void {
  playSemitones([semitone], instrument);
}

// Several notes at once are spread by a moment each, the way a hand rolls a
// chord: struck together they mask one another and read as one sound.
export function playSemitones(
  semitones: readonly number[],
  instrument: Instrument = "piano",
  spacingSeconds = instrument === "guitar" ? 0.035 : 0.09,
): void {
  const audio = audioContext();
  if (audio === null) return;
  semitones.forEach((semitone, index) => {
    const when = audio.currentTime + index * spacingSeconds;
    if (instrument === "guitar") pluck(audio, semitone, when);
    else strike(audio, semitone, when);
  });
}

// A struck string: the fundamental with three partials over it, each quieter
// and each dying away faster than the one below, which is what makes the
// attack bright and the tail plain.
function strike(audio: AudioContext, semitone: number, when: number): void {
  const hertz = semitoneHertz(semitone);
  const output = audio.createGain();
  output.gain.value = VOICE_GAIN;
  output.connect(audio.destination);
  const partials = [
    { ratio: 1, gain: 1, seconds: 2.4 },
    { ratio: 2, gain: 0.34, seconds: 1.5 },
    { ratio: 3, gain: 0.14, seconds: 0.9 },
    { ratio: 4.02, gain: 0.06, seconds: 0.5 },
  ];
  let last = when;
  for (const { ratio, gain, seconds } of partials) {
    const oscillator = audio.createOscillator();
    oscillator.frequency.value = hertz * ratio;
    const envelope = audio.createGain();
    // Not from silence: a ramp from zero in an exponential curve is undefined,
    // and the attack is a hammer rather than a swell in any case.
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.linearRampToValueAtTime(gain, when + 0.005);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + seconds);
    oscillator.connect(envelope).connect(output);
    oscillator.start(when);
    oscillator.stop(when + seconds);
    last = Math.max(last, when + seconds);
  }
  window.setTimeout(
    () => output.disconnect(),
    Math.ceil((last - audio.currentTime + 0.1) * 1000),
  );
}

// A plucked string: noise round a delay line one period long, averaged with
// its neighbour on each lap, which is the low-pass that turns a burst into a
// note that dulls as it fades.
function pluck(audio: AudioContext, semitone: number, when: number): void {
  const source = audio.createBufferSource();
  source.buffer = pluckBuffer(audio, semitone);
  const output = audio.createGain();
  output.gain.value = VOICE_GAIN;
  // The body of the instrument rather than the string: it takes the edge off
  // the noise burst the pluck starts with.
  const body = audio.createBiquadFilter();
  body.type = "lowpass";
  body.frequency.value = 3600;
  source.connect(body).connect(output).connect(audio.destination);
  source.start(when);
  source.onended = () => output.disconnect();
}

function pluckBuffer(audio: AudioContext, semitone: number): AudioBuffer {
  const cached = pluckCache.get(semitone);
  if (cached !== undefined) return cached;
  const rate = audio.sampleRate;
  const length = Math.ceil(rate * PLUCK_SECONDS);
  const buffer = audio.createBuffer(1, length, rate);
  const samples = buffer.getChannelData(0);
  const period = Math.max(2, Math.round(rate / semitoneHertz(semitone)));
  const line = new Float32Array(period);
  for (let index = 0; index < period; index += 1) {
    line[index] = Math.random() * 2 - 1;
  }
  // How much of each lap survives. A high string loops far more often per
  // second than a low one, so a fixed loss would silence it first; tying the
  // loss to the period makes every string ring for about as long.
  const decay = Math.exp(-period / (rate * 0.9));
  for (let index = 0; index < length; index += 1) {
    const slot = index % period;
    const value = line[slot];
    samples[index] = value;
    line[slot] = ((value + line[(slot + 1) % period]) / 2) * decay;
  }
  pluckCache.set(semitone, buffer);
  return buffer;
}
