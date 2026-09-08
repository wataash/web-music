import assert from "node:assert/strict";
import { test } from "node:test";
import { extractIreal, scramble } from "@web-music/ireal";

// Fixed vectors: the first five and positions 10..23 swap with 49..45
// and 39..26; positions 5..9 and 24..25 stay in place.
const plain = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop";
const encoded = "nmlkj56789dcbaZYXWVUTSRQOPNMLKJIHGFEDCBAefghi43210op";

test("matches a fixed permutation and preserves the 52-character threshold", () => {
  assert.equal(scramble(plain), encoded);
  assert.equal(scramble(encoded), plain);
  for (const length of [0, 1, 49, 50, 51]) {
    assert.equal(scramble(plain.slice(0, length)), plain.slice(0, length));
  }
  for (const length of [52, 99, 100, 101, 102, 150, 152]) {
    const text = plain.repeat(3).slice(0, length);
    assert.equal(scramble(scramble(text)), text);
  }
  const block = plain.slice(0, 50);
  assert.equal(scramble(block + block + "op"), encoded.slice(0, 50).repeat(2) + "op");
});

test("decodes a fixed original chart and round-trips its raw notation", () => {
  const raw = "T44[C^7 |D-7 G7 |C^7 |A-7 D7 |G^7 |E-7 A7 |D^7 |G7 C^7 ]";
  const music = "7G| 7^7 |DA 7-E| 7^G| 7D7 -A| 7^C| 7G 7-7 |D^C[44T C^7 ]";
  const html = `<a href="irealb://${encodeURIComponent("Original=Example==Swing=C==1r34LbKcu7" + music + "==100=1")}">import</a>`;
  const result = extractIreal(html);
  assert.deepEqual(result.chords, ["CM7", "Dm7", "G7", "CM7", "Am7", "D7", "GM7", "Em7", "A7", "DM7", "G7", "CM7"]);
  assert.equal(result.score.blocks.flat().map(token => token.raw).join(""), raw);
  assert.equal(scramble(raw), music);
});
