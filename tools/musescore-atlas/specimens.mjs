// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
export const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const rest = '<Rest><durationType>measure</durationType><duration>1/1</duration></Rest>';
const part = '<Part><Staff id="1"><StaffType group="pitched"><name>stdNormal</name></StaffType></Staff><trackName>Reference</trackName><Instrument id="piano"><trackName>Reference</trackName><Channel><program value="0"/></Channel></Instrument></Part>';
const label = text => `<StaffText><placement>below</placement><text><font size="8"/>${esc(text)}</text></StaffText>`;
function native(title, examples, columns=4) {
  return `<?xml version="1.0" encoding="UTF-8"?><museScore version="4.70"><Score><Division>480</Division>${part}<Staff id="1"><VBox><height>7</height><Text><style>title</style><text>${esc(title)}</text></Text></VBox>${examples.map((example,index)=>`<Measure><voice>${index===0?'<Clef><concertClefType>G</concertClefType><transposingClefType>G</transposingClefType><isHeader>1</isHeader></Clef><TimeSig><sigN>4</sigN><sigD>4</sigD></TimeSig>':''}${example.markup}${label(`${String(index+1).padStart(2,'0')} ${example.label}`)}${example.music??rest}</voice>${index%columns===columns-1?'<LayoutBreak><subtype>line</subtype></LayoutBreak>':''}</Measure>`).join('')}</Staff></Score></museScore>`;
}
function chord(labelText, suffix, root=14, bass) {
  return {label:labelText,markup:`<Harmony><harmonyInfo><name>${esc(suffix)}</name><root>${root}</root>${bass===undefined?'':`<base>${bass}</base>`}</harmonyInfo></Harmony>`};
}
const basic = ['', 'm','dim','aug','sus2','sus4','5','6','m6','7','maj7','^7','m7','m(maj7)','mMaj7','-maj7','dim7','o7','m7b5','07','9','maj9','m9','13'];
const aliases = ['maj7','Maj7','M7','^7','Δ7','ma7','m7','min7','-7','m(maj7)','mMaj7','mM7','m^7','mΔ7','-maj7','-^7','dim7','o7','°7','m7b5','min7b5','07','ø7','half-dim'];
const minorSpellings = [[12,'Bb'],[5,'Bbb'],[28,'C##']].flatMap(([root,name])=>['','m','m7','min7','-7','m(maj7)','mMaj7','-maj7'].map(suffix=>chord(`${name}${suffix}`,suffix,root)));
const alterations = ['7b5','7#5','7b9','7#9','7#11','7b13','7(b9,#11)','7b9#9','7alt','9#11','13b9','13#11','maj7#5','maj7#11','maj9#11','m9','m11','m13','6/9','add9','add11','sus4','7sus4','9sus4'];
const spellings = [chord('C/E','',14,18),chord('Cm/G','m',14,15),chord('C7/Bb','7',14,12),chord('Fmaj7/A','maj7',13,17),chord('Dm7/F','m7',16,13),chord('G7/B','7',15,19),...[[9,'Db'],[21,'C#'],[12,'Bb'],[26,'B#'],[7,'Cb'],[20,'F#'],[10,'Ab'],[25,'E#'],[6,'Fb'],[28,'C##'],[0,'Cbb']].map(([root,name])=>chord(`${name}m(maj7)`,'m(maj7)',root))];
const textExamples = [
 ['Latin capitals','ABCDEFGHIJKLMNOPQRSTUVWXYZ'],['Latin lowercase','abcdefghijklmnopqrstuvwxyz'],['Digits','0123456789'],['Roman upper','I II III IV V VI VII VIII IX X'],['Roman lower','i ii iii iv v vi vii viii ix x'],['Chord text','Cmaj7 Dm7 E7 FΔ7 Gø7 A°7 Bm(maj7)'],['Punctuation','( ) [ ] / + - − = , . : ; ! ?'],['Greek','Α Β Γ Δ Θ Λ Π Σ Φ Ω α β γ δ θ λ π σ φ ω'],['Music Unicode','♭ ♯ ♮ 𝄪 𝄫 ♩ ♪ ♫ 𝄞 𝄢'],['Normal','Andante moderato / dolce cantabile'],['Bold','<b>Andante moderato / dolce cantabile</b>'],['Italic','<i>Andante moderato / dolce cantabile</i>'],
].map(([name,text])=>({label:name,markup:`<StaffText><text><font size="14"/>${['Bold','Italic'].includes(name)?text:esc(text)}</text></StaffText>`}));
function xml(title, examples) {
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>${esc(title)}</work-title></work><part-list><score-part id="P1"><part-name></part-name><score-instrument id="I1"><instrument-name>Piano</instrument-name></score-instrument></score-part></part-list><part id="P1">${examples.map((e,i)=>`<measure number="${i+1}">${i%4===0?'<print new-system="yes"/>':''}${i===0?'<attributes><divisions>64</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>':''}${e.attributes??''}<direction placement="below"><direction-type><words font-size="8">${esc(`${String(i+1).padStart(2,'0')} ${e.label}`)}</words></direction-type></direction>${e.markup??''}${e.music??'<note><rest measure="yes"/><duration>256</duration></note>'}</measure>`).join('')}</part></score-partwise>`;
}
const note = (type,extra='',pitch='<step>C</step><octave>5</octave>') => `<note><pitch>${pitch}</pitch><duration>${({whole:256,half:128,quarter:64,eighth:32,'16th':16,'32nd':8,'64th':4,'128th':2,'256th':1})[type]??64}</duration><type>${type}</type>${extra}</note>`;
const types=['whole','half','quarter','eighth','16th','32nd','64th'];
const notes=types.map(t=>({label:t,music:note(t)})).concat(['quarter','eighth','16th'].map(t=>({label:`dotted ${t}`,music:note(t,'<dot/>')})),['x','diamond','triangle','slash'].map(h=>({label:`head ${h}`,music:note('quarter',`<notehead>${h}</notehead>`)})));
const rests=types.map(t=>({label:`rest ${t}`,music:note(t).replace(/<pitch>.*?<\/pitch>/,'<rest/>')})).concat([{label:'measure rest'}]);
const clefs=[['treble','G',2,0],['bass','F',4,0],['alto','C',3,0],['tenor','C',4,0],['treble 8va','G',2,1],['treble 8vb','G',2,-1],['bass 8vb','F',4,-1],['percussion','percussion',2,0]].map(([name,sign,line,oct])=>({label:name,attributes:`<attributes><clef><sign>${sign}</sign><line>${line}</line><clef-octave-change>${oct}</clef-octave-change></clef></attributes>`}));
const meters=[[4,4],[3,4],[2,4],[6,8],[9,8],[12,8],[5,4],[7,8],[3,8],[2,2],[4,4,'common'],[2,2,'cut']].map(([n,d,s])=>({label:s??`${n}/${d}`,attributes:`<attributes><time${s?` symbol="${s}"`:''}><beats>${n}</beats><beat-type>${d}</beat-type></time></attributes>`}));
const accidentals=[['flat',-1],['sharp',1],['natural',0],['double-sharp',2],['flat-flat',-2],['quarter-flat',-.5],['quarter-sharp',.5],['three-quarters-flat',-1.5],['three-quarters-sharp',1.5]].map(([a,n])=>({label:a,music:note('quarter',`<accidental>${a}</accidental>`,`<step>F</step><alter>${n}</alter><octave>4</octave>`)})).concat(Array.from({length:15},(_,i)=>({label:`key ${i-7} fifths`,attributes:`<attributes><key><fifths>${i-7}</fifths></key></attributes>`})));
const dynamics=['pppppp','ppppp','pppp','ppp','pp','p','mp','mf','f','ff','fff','ffff','fp','sf','sfz','sffz','rfz','fz'].map(d=>({label:d,markup:`<direction placement="above"><direction-type><dynamics><${d}/></dynamics></direction-type></direction>`}));
const articulations=['staccato','tenuto','accent','strong-accent','staccatissimo','detached-legato','spiccato','scoop','plop','doit','falloff','breath-mark','caesura'].map(a=>({label:a,music:note('quarter',`<notations><articulations><${a}/></articulations></notations>`)})).concat(['fermata','trill-mark','mordent','inverted-mordent','turn'].map(a=>({label:a,music:note('quarter',`<notations>${a==='fermata'?'<fermata/>':`<ornaments><${a}/></ornaments>`}</notations>`)})));
export const categories=[
 {id:'chords-basic',tags:["Chords","Basic forms"],name:'Chords: basic forms',kind:'chord',examples:basic.map(s=>chord(`C${s}`,s))},
 {id:'chords-aliases',tags:["Chords","Alternate spellings","Minor"],name:'Chords: m, −, Δ and maj spellings',kind:'chord',examples:aliases.map(s=>chord(`A${s}`,s,17))},
 {id:'chords-minor-spellings',tags:["Chords","Minor","Accidentals"],name:'Chords: minor spellings on B♭, B𝄫 and C𝄪',kind:'chord',examples:minorSpellings},
 {id:'chords-extensions',tags:["Chords","Extensions","Accidentals"],name:'Chords: extensions and alterations',kind:'chord',examples:alterations.map(s=>chord(`C${s}`,s))},
 {id:'chords-bass',tags:["Chords","Inversions","Enharmonic spellings"],name:'Chords: inversions and enharmonic spellings',kind:'chord',examples:spellings},
 {id:'notes',tags:["Notes","Dots","Noteheads"],name:'Notes, flags, dots and noteheads',kind:'music',examples:notes},
 {id:'rests',tags:["Rests"],name:'Rests',kind:'music',examples:rests},
 {id:'clefs',tags:["Clefs"],name:'Clefs',kind:'music',examples:clefs},
 {id:'meters',tags:["Time signatures"],name:'Time signatures',kind:'music',examples:meters},
 {id:'accidentals',tags:["Accidentals","Key signatures","Microtones"],name:'Accidentals, microtones and key signatures',kind:'music',examples:accidentals},
 {id:'dynamics',tags:["Dynamics"],name:'Dynamics',kind:'music',examples:dynamics},
 {id:'articulations',tags:["Articulations & ornaments","Ornaments"],name:'Articulations and ornaments',kind:'music',examples:articulations},
 {id:'text',tags:["Text","Numbers","Roman numerals"],name:'Letters, numbers, Roman numerals and text',kind:'text',examples:textExamples},
];
export function sourceFor(category){return category.kind==='music'?xml(category.id,category.examples):native(category.id,category.examples,category.kind==='text'?2:4);}
const musicFonts=['Leland','Bravura','Emmentaler','Gonville','MuseJazz','Petaluma','Finale Maestro','Finale Broadway'];
export const profiles=[
 ...musicFonts.map((font,i)=>({id:`music-${i+1}`,name:font,kind:'music',settings:{musicalSymbolFont:font,musicalTextFont:`${font} Text`,dynamicsFont:font}})),
 ...[
  ['Standard / Edwin',{}],
  ['Jazz / MuseJazz Text',{chordStyle:'jazz',chordDescriptionFile:'chords_jazz.xml',chordSymbolAFontFace:'MuseJazz Text'}],
  ['Standard / 70% superscript',{chordExtensionMag:.7,chordExtensionAdjust:-.5,chordModifierMag:.7,chordModifierAdjust:-.5}],
  ['Standard / stacked alterations',{verticallyStackModifiers:1,chordStackedModifierMag:.7}],
  ['Standard / Termes',{chordSymbolAFontFace:'TeX Gyre Termes'}],
  ['Standard / Heros',{chordSymbolAFontFace:'TeX Gyre Heros'}],
  ['Jazz / Edwin',{chordStyle:'jazz',chordDescriptionFile:'chords_jazz.xml'}],
  ['Standard / lowercase minor',{lowerCaseMinorChords:1,lowerCaseBassNotes:1}],
 ].map(([name,settings],i)=>({id:`chord-${i+1}`,name,kind:'chord',settings})),
 ...['Edwin','MuseJazz Text','Petaluma Text','Leland Text','TeX Gyre Termes','TeX Gyre Heros','Roboto','Noto Sans'].map((font,i)=>({id:`text-${i+1}`,name:font,kind:'text',settings:{staffTextFontFace:font}})),
];
export function styleFor(profile){const values={pageWidth:11.69,pageHeight:8.27,pagePrintableWidth:10.69,pageEvenLeftMargin:.5,pageOddLeftMargin:.5,pageEvenTopMargin:.4,pageOddTopMargin:.4,pageEvenBottomMargin:.4,pageOddBottomMargin:.4,enableVerticalSpread:0,lastSystemFillLimit:0,minSystemDistance:6.5,maxSystemDistance:6.5,titleFontFace:'Edwin',titleFontSize:16,staffTextFontFace:'Edwin',staffTextFontSize:8,chordSymbolAFontFace:'Edwin',chordSymbolAFontSize:14,chordStyle:'std',chordDescriptionFile:'chords_std.xml',chordsXmlFile:0,...profile.settings};return `<?xml version="1.0"?><museScore version="4.70"><Style>${Object.entries(values).map(([k,v])=>`<${k}>${esc(v)}</${k}>`).join('')}</Style></museScore>`;}
