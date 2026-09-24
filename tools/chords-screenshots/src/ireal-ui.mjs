// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const decode = text => text.replace(/&(#\d+|#x[\da-f]+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
  if (entity[0] === '#') return String.fromCodePoint(parseInt(entity.slice(entity[1] === 'x' ? 2 : 1), entity[1] === 'x' ? 16 : 10));
  return { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'" }[entity];
});
export const uiNodes = xml => [...xml.matchAll(/<node\b[^>]*>/g)].map(([node]) => Object.fromEntries([...node.matchAll(/([\w-]+)="([^"]*)"/g)].map(([,key,value]) => [key,decode(value)])));
export const byId = (nodes, id) => nodes.find(n => n['resource-id'] === `com.massimobiolcati.irealb:id/${id}`);
export function center(node) {
  const bounds = node?.bounds?.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/);
  if (!bounds) throw new Error('Missing UI bounds');
  return [Math.floor((+bounds[1]+ +bounds[3])/2), Math.floor((+bounds[2]+ +bounds[4])/2)];
}
export function searchQuery(title) {
  return title.match(/[\x20-\x7e]+/g).sort((a,b)=>b.length-a.length)[0].trim();
}
const words = value => value.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.sort().join(' ');
export function matchSong(nodes, song) {
  const prefix = `${song.title.replace(/^(.+), (The|A|An)$/, '$2 $1')}. `;
  const matches = nodes.filter(node => {
    const label = node['content-desc'] ?? '';
    if (!label.startsWith(prefix) || !label.includes('. In playlists: Jazz 1460')) return false;
    const composer = label.slice(prefix.length).split('. In playlists:')[0];
    return words(composer) === words(song.composer);
  });
  if (matches.length !== 1) throw new Error(`Expected one Jazz 1460 search result for ${song.title}; found ${matches.length}`);
  return matches[0];
}
export function keyPitch(value) {
  const match = /^([A-G])([#b♯♭]?)/.exec(value ?? '');
  if (!match) throw new Error(`Unrecognized key: ${value}`);
  return ({ C:0,D:2,E:4,F:5,G:7,A:9,B:11 }[match[1]] + ({ '#':1,'♯':1,b:-1,'♭':-1 }[match[2]] ?? 0) + 12) % 12;
}
