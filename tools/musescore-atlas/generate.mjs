#!/usr/bin/env node
// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, readdir, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories, profiles, sourceFor, styleFor } from './specimens.mjs';

const {values}=parseArgs({options:{musescore:{type:'string'},output:{type:'string'},limit:{type:'string'},profile:{type:'string'},help:{type:'boolean'},'sources-only':{type:'boolean'},'viewer-only':{type:'boolean'}}});
if(values.help){console.log('Usage: node tools/musescore-atlas/generate.mjs [--musescore /path/to/AppRun] --output /path/to/atlas [--profile ID] [--limit N] [--sources-only] [--viewer-only]');process.exit(0);}
if(!values.output || (!values.musescore && !values['sources-only'] && !values['viewer-only']))throw new Error('--output is required; use --musescore, --sources-only or --viewer-only');
if(values['sources-only'] && values['viewer-only'])throw new Error('Choose either --sources-only or --viewer-only');
const output=resolve(values.output), executable=values.musescore&&resolve(values.musescore);
// Embed the same palette and base styles used by Music Flashcards.
async function writeViewer(){
  const here=dirname(fileURLToPath(import.meta.url));
  const [template,theme]=await Promise.all([readFile(join(here,'gallery.html'),'utf8'),readFile(join(here,'../../packages/practice-ui/src/theme.css'),'utf8')]);
  if(!template.includes('/* @shared-theme */'))throw new Error('Missing shared theme placeholder');
  await mkdir(output,{recursive:true});
  await writeFile(join(output,'index.html'),template.replace('/* @shared-theme */',theme));
}
if(!values['sources-only'])await writeViewer();
if(values['viewer-only']){console.log(`Viewer updated → ${output}`);process.exit(0);}
const limit=values.limit===undefined?Infinity:Number(values.limit);
if(!(limit>0&& (limit===Infinity||Number.isInteger(limit))))throw new Error('--limit must be a positive integer');
const sourceDir=join(output,'sources');
await mkdir(sourceDir,{recursive:true});
for(const category of categories)await writeFile(join(sourceDir,`${category.id}.${category.kind==='music'?'musicxml':'mscx'}`),sourceFor(category));
const entries=[];
if(values.profile && !profiles.some(p=>p.id===values.profile))throw new Error('Unknown --profile');
for(const profile of profiles){
  if(values.profile && profile.id!==values.profile)continue;
  await writeFile(join(sourceDir,`${profile.id}.mss`),styleFor(profile));
  for(const category of categories.filter(c=>c.kind===profile.kind)){
    if(entries.length>=limit)break;
    entries.push({id:`${profile.id}-${category.id}`,profile:profile.name,profileId:profile.id,category:category.name,categoryId:category.id,tags:category.tags,kind:category.kind,settings:profile.settings,samples:category.examples.map(e=>e.label),input:`sources/${category.id}.${category.kind==='music'?'musicxml':'mscx'}`,style:`sources/${profile.id}.mss`});
  }
}
async function run(command,args,env={}){
  return await new Promise((resolvePromise,reject)=>{
    const child=spawn(command,args,{cwd:output,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    child.stdout.on('data',data=>stdout+=data);child.stderr.on('data',data=>stderr+=data);
    const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error(`Timed out: ${command}`));},180000);
    child.on('error',error=>{clearTimeout(timer);reject(error);});
    child.on('close',code=>{clearTimeout(timer);resolvePromise({code,stdout,stderr});});
  });
}
let version='Sources only';
if(!values['sources-only']){
  const versionRun=await run(executable,['--long-version']);version=versionRun.stdout.trim();
  for(const profile of profiles){
    const selected=entries.filter(e=>e.profileId===profile.id);if(!selected.length)continue;
    const directory=join(output,profile.id);await mkdir(directory,{recursive:true});
    // Old files must not make an unsuccessful conversion look complete.
    for(const file of await readdir(directory)){
      if(selected.some(e=>new RegExp(`^${e.categoryId}(?:-[0-9]+)?\\.(png|svg|pdf|mscz|mscx|json)$`).test(file)))await rm(join(directory,file));
    }
    const job=selected.map(e=>({in:e.input,out:['png','svg','pdf','mscz'].map(ext=>`${profile.id}/${e.categoryId}.${ext}`)}));
    const jobPath=join(sourceDir,`${profile.id}-job.json`);await writeFile(jobPath,JSON.stringify(job,null,2));
    const runtime=await mkdtemp(join(tmpdir(),'musescore-atlas-'));
    const env={MU_QT_QPA_PLATFORM:'offscreen',QT_QPA_PLATFORM:'offscreen',QT_QPA_PLATFORMTHEME:'generic',QT_STYLE_OVERRIDE:'Fusion',XDG_CONFIG_HOME:join(runtime,'config'),XDG_DATA_HOME:join(runtime,'data'),XDG_CACHE_HOME:join(runtime,'cache')};
    const result=await run(executable,['-r','144','-T','12','-S',join(sourceDir,`${profile.id}.mss`),'-j',jobPath],env);
    await writeFile(join(directory,'render.log'),result.stdout+result.stderr);
    await rm(runtime,{recursive:true,force:true});
    const files=await readdir(directory);
    for(const entry of selected){
      const pages=ext=>files.filter(f=>f===`${entry.categoryId}.${ext}`||new RegExp(`^${entry.categoryId}-[0-9]+\\.${ext}$`).test(f)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(f=>`${profile.id}/${f}`);
      entry.png=pages('png');entry.svg=pages('svg');entry.pdf=`${profile.id}/${entry.categoryId}.pdf`;entry.mscz=`${profile.id}/${entry.categoryId}.mscz`;
      for(const path of [...entry.png,...entry.svg,entry.pdf,entry.mscz])if((await stat(join(output,path))).size===0)throw new Error(`Empty output ${path}`);
      if(!entry.png.length||entry.png.length!==entry.svg.length)throw new Error(`Missing or mismatched pages ${entry.id}, exit=${result.code}`);
      const fontResult=await run('/usr/bin/pdffonts',[join(output,entry.pdf)]);
      if(fontResult.code!==0)throw new Error(`Cannot read PDF fonts for ${entry.id}`);
      entry.pdfFonts=fontResult.stdout.trim().split('\n').slice(2).map(line=>line.trim().split(/\s+/)[0]);
      const info=await run('/usr/bin/pdfinfo',[join(output,entry.pdf)]);
      entry.pdfPages=Number(info.stdout.match(/^Pages:\s+(\d+)/m)?.[1]);
      if(!entry.pdfPages)throw new Error(`Cannot read PDF pages ${entry.id}`);
      const native=await run('/usr/bin/unzip',['-p',join(output,entry.mscz),`${entry.categoryId}.mscx`]);
      if(native.code!==0)throw new Error(`Cannot extract MSCX ${entry.id}`);
      entry.mscx=`${profile.id}/${entry.categoryId}.mscx`;
      await writeFile(join(output,entry.mscx),native.stdout);
      const actualStyle=await run('/usr/bin/unzip',['-p',join(output,entry.mscz),'score_style.mss']);
      if(actualStyle.code!==0)throw new Error(`Cannot extract style ${entry.id}`);
      entry.actualStyle=`${profile.id}/actual-style.mss`;
      await writeFile(join(output,entry.actualStyle),actualStyle.stdout);
      entry.nativeHarmonyNames=[...native.stdout.matchAll(/<harmonyInfo>[\s\S]*?<name>([\s\S]*?)<\/name>/g)].map(m=>m[1]);
      entry.unicodeCoverageNotice=entry.kind==='text'?'Characters absent in the requested face can use fallback fonts; inspect PDF font names.':undefined;
      await writeFile(join(directory,`${entry.categoryId}.json`),JSON.stringify(entry,null,2));
    }
    console.log(`${profile.name}: ${selected.length} sheets, ${result.code===0?'OK':`exit ${result.code}; all files verified`}`);
    await writeFile(join(output,'manifest.json'),JSON.stringify({version,entries},null,2));
  }
}
const manifest={version,generatedAt:new Date().toISOString(),sheetCount:entries.length,sampleCount:entries.reduce((n,e)=>n+e.samples.length,0),entries};
await writeFile(join(output,'manifest.json'),JSON.stringify(manifest,null,2));
console.log(`${entries.length} sheets / ${manifest.sampleCount} samples → ${output}`);
