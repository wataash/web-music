// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { uiNodes, byId, center, searchQuery, matchSong, keyPitch } from './ireal-ui.mjs';

test('UI XML decoding and bounds', () => {
  const nodes = uiNodes('<node text="A &amp; B &#9837;" resource-id="com.massimobiolcati.irealb:id/title" bounds="[0,10][100,50]"/>');
  assert.equal(byId(nodes, 'title').text, 'A & B ♭');
  assert.deepEqual(center(nodes[0]), [50, 30]);
  assert.throws(() => center(undefined), /bounds/);
});
test('search selects exact title, composer and playlist', () => {
  const song = { title: 'James', composer: 'Metheny Pat' };
  const node = { 'content-desc': 'James. Pat Metheny. In playlists: Jazz 1460' };
  assert.equal(matchSong([node], song), node);
  assert.equal(matchSong([{ 'content-desc': 'The Bat. Pat Metheny. In playlists: Jazz 1460' }], { ...song, title: 'Bat, The' })['content-desc'], 'The Bat. Pat Metheny. In playlists: Jazz 1460');
  assert.throws(() => matchSong([node, node], song), /found 2/);
  assert.throws(() => matchSong([node], { ...song, title: 'James II' }), /found 0/);
  assert.throws(() => matchSong([node], { ...song, composer: 'Other' }), /found 0/);
});
test('search queries use an ASCII substring and keys allow enharmonics', () => {
  assert.equal(searchQuery('Señor Blues'), 'or Blues');
  assert.equal(keyPitch('D-'), 2);
  assert.equal(keyPitch('E♭'), keyPitch('D#'));
  assert.throws(() => keyPitch(undefined), /Unrecognized/);
});
