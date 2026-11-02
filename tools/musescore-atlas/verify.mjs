#!/usr/bin/env node
// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import { esc } from './specimens.mjs';
const [input,proof]=process.argv.slice(2);
if(!input||!proof)throw new Error('Usage: node verify.mjs ATLAS_DIRECTORY PROOF_DIRECTORY');
const root=resolve(input),output=resolve(proof);await mkdir(output,{recursive:true});
const manifest=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
let pages=0;
const ids=new Set();
function pathFor(path){const absolute=resolve(root,path);if(!absolute.startsWith(root+'/'))throw new Error('Unsafe relative path');return absolute;}
for(const entry of manifest.entries){
  if(ids.has(entry.id))throw new Error(`Duplicate ID ${entry.id}`);ids.add(entry.id);
  if(!entry.samples.length || !entry.pdfFonts.length || entry.png.length!==entry.svg.length || entry.pdfPages!==entry.png.length)throw new Error(`Incomplete metadata ${entry.id}`);
  for(const path of [entry.input,entry.style,...entry.png,...entry.svg,entry.pdf,entry.mscz,entry.mscx,entry.actualStyle])if((await stat(pathFor(path))).size===0)throw new Error(`Empty ${path}`);
  for(const svg of entry.svg){const text=await readFile(pathFor(svg),'utf8');if(!text.includes('<svg')||!text.includes('<path'))throw new Error(`SVG has no outlines ${svg}`);}
  pages+=entry.pdfPages;
}
if(ids.size!==manifest.sheetCount || manifest.entries.reduce((n,e)=>n+e.samples.length,0)!==manifest.sampleCount)throw new Error('Manifest counts mismatch');
async function render(entry){await new Promise((done,reject)=>{const p=spawn('/usr/bin/pdftoppm',['-scale-to','1000','-png',pathFor(entry.pdf),join(output,entry.id)],{stdio:['ignore','ignore','pipe']});let error='';p.stderr.on('data',d=>error+=d);p.on('error',reject);p.on('close',code=>code?reject(new Error(error)):done());});}
let cursor=0;await Promise.all(Array.from({length:4},async()=>{while(cursor<manifest.entries.length)await render(manifest.entries[cursor++]);}));
const proofFiles=await readdir(output);
const groups=[];
for(let start=0;start<manifest.entries.length;start+=16){
  const cards=[];
  for(const entry of manifest.entries.slice(start,start+16)){
    const files=proofFiles.filter(f=>f.startsWith(entry.id+'-')&&f.endsWith('.png')).sort();
    if(files.length!==entry.pdfPages)throw new Error(`PDF proof missing ${entry.id}`);
    for(const f of files){const image=(await readFile(join(output,f))).toString('base64');cards.push(`<section><h2>${esc(entry.profile)} · ${esc(entry.categoryId)}</h2><img src="data:image/png;base64,${image}" alt="PDF proof"></section>`);}
  }
  const name=`contact-${Math.floor(start/16)+1}.html`;groups.push(name);
  await writeFile(join(output,name),`<!doctype html><meta charset="utf-8"><style>body{font-family:Arial;background:#dde4ed;margin:15px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}section{background:white;padding:10px}h2{font-size:12px;margin:0 0 6px}img{width:100%;height:230px;object-fit:contain}</style>${cards.join('')}`);
}
await writeFile(join(output,'summary.json'),JSON.stringify({sheets:ids.size,pages,samples:manifest.sampleCount,contacts:groups},null,2));
console.log(`${ids.size} sheets, ${pages} PDF pages, ${manifest.sampleCount} samples; all assets and PDF proofs verified`);
