import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/timeline.js';
import {buildAutoEdit} from '../src/auto-edit.js';
import {refineAuto} from '../src/refine-auto.js';
import {readFile} from 'node:fs/promises';
const o={mainId:'m',green:false,normalize:false,trim:false,style:'dynamic',transition:'whoosh',sound:true,bgmId:'b',bgmDb:-24,duck:true};
function fixture(){const s=T.emptyProject();s.media=[{id:'m',type:'video',name:'Main',duration:10},{id:'b',type:'audio',name:'Music',duration:3}];let p=buildAutoEdit(s,o);p=T.splitClips(p,p.clips.find(c=>c.trackId==='V2').id,5);p.autoEditOptions=structuredClone(o);return p;}
test('BGM-only refinement preserves all clips, timing, IDs and custom edits',()=>{const p=fixture();p.clips[0].fx.color.exposure=.5;const before=structuredClone(p);const q=refineAuto(p,{...o,bgmDb:-12});assert.deepEqual(q.clips,p.clips);assert.equal(q.tracks.find(t=>t.id==='A2').gainDb,-12);assert.deepEqual(p,before);assert.equal(JSON.parse(JSON.stringify(q)).autoEditOptions.bgmDb,-12);});
test('crop only changes the main mask, never scale or cut boundaries',()=>{const p=fixture(),crop={left:.05,right:.1,top:0,bottom:0},q=refineAuto(p,{...o,crop});for(const c of p.clips){const next=q.clips.find(n=>n.id===c.id);if(c.trackId==='V2')assert.deepEqual(next,{...c,fx:{...c.fx,crop}});else assert.deepEqual(next,c);}});
test('style refinement retains existing video/audio clips and manual locked shots',()=>{const p=fixture();const q=refineAuto(p,{...o,style:'simple'});assert.deepEqual(q.clips.filter(c=>!c.fx.scene),p.clips.filter(c=>!c.fx.scene));assert.equal(q.creatorPreset.name,'Simple');});
test('recutting and locked track updates are rejected without mutation',()=>{const p=fixture(),before=structuredClone(p);assert.throws(()=>refineAuto(p,{...o,trim:true}),/Rebuild/);assert.deepEqual(p,before);p.tracks.find(t=>t.id==='A2').locked=true;assert.throws(()=>refineAuto(p,{...o,bgmDb:-8}),/Unlock/);});
test('theme cannot override timeline inline row sizing',async()=>{const css=await readFile('src/ui56.css','utf8');assert(!/grid-template-rows:[^;}]*!important/.test(css));});
