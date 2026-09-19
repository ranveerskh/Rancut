import {soundBytes} from './sounds.js';
import * as T from './timeline.js';
import {validPose,identityPose,motionAt} from './scene-core.js';
export const builtInStyle={format:'rancut-style',version:1,name:'Storytelling',shots:[
 {name:'Normal',from:identityPose(),to:identityPose()},
 {name:'Close up',from:{scale:118,x:0,y:0},to:{scale:118,x:0,y:0}},
 {name:'Slow zoom',from:{scale:104,x:0,y:0},to:{scale:116,x:0,y:0}},
 {name:'Left',from:{scale:115,x:-12,y:0},to:{scale:119,x:-12,y:0}},
 {name:'Right',from:{scale:115,x:12,y:0},to:{scale:119,x:12,y:0}}
]};
export function validateStyle(v){
 if(v?.format!=='rancut-style'||v.version!==1||typeof v.name!=='string'||!v.name.trim()||v.name.length>80||!Array.isArray(v.shots)||v.shots.length<1||v.shots.length>20)throw Error('Invalid Style preset.');
 for(const s of v.shots)if(typeof s.name!=='string'||s.name.length>80||!validPose(s.from)||!validPose(s.to))throw Error('Style scale must be 100–180%; X/Y must be −30…30.');
 return structuredClone(v);
}
export function applyStyle(p,sourceTrack,preset,seed=1,options={}){
 preset=validateStyle(preset);const source=p.tracks.find(t=>t.id===sourceTrack);
 if(source?.type!=='video')throw Error('Choose your main video track.');
 const allCuts=p.clips.filter(c=>c.trackId===sourceTrack);
 const allowed=options.ids?new Set(options.ids):null;
 const cuts=allCuts.filter(c=>!allowed||allowed.has(c.id)).sort((a,b)=>a.start-b.start);if(!cuts.length)throw Error('Add clips to the main track first.');
 let q=structuredClone(p),track=q.tracks.find(t=>t.creatorStyle);
 if(track?.locked)throw Error('Unlock the Style track first.');
 if(!track){q=T.addTrack(q,'adjustment');track=q.tracks[0];track.creatorStyle=true;track.name='Style';}
 const old=q.clips.filter(c=>c.trackId===track.id);
 const touches=c=>cuts.some(x=>c.start<T.end(x)-T.EPS&&T.end(c)>x.start+T.EPS);
 const preserved=allowed?old.filter(c=>!touches(c)):[];
 const keep=old.filter(c=>c.styleLocked&&(!allowed||touches(c)));
 if(allowed&&old.some(c=>touches(c)&&!cuts.some(x=>Math.abs(x.start-c.start)<T.EPS&&Math.abs(x.duration-c.duration)<T.EPS)))throw Error('Style boundaries changed. Apply to all cuts first, or remove the mismatched Style segment.');
 let last=-1,n=seed>>>0;
 const clips=cuts.map(c=>{
   const fixed=keep.find(s=>Math.abs(s.start-c.start)<T.EPS&&Math.abs(s.duration-c.duration)<T.EPS);if(fixed)return fixed;
   n=(Math.imul(n,1664525)+1013904223)>>>0;let index=n%preset.shots.length;if(index===last&&preset.shots.length>1)index=(index+1)%preset.shots.length;last=index;
   const shot=preset.shots[index];return {id:T.uid('style'),kind:'adjustment',mediaId:null,trackId:track.id,name:shot.name,start:c.start,duration:c.duration,sourceIn:0,linkedId:null,fx:{...T.fxDefault(),scene:{from:shot.from,to:shot.to,span:c.duration,offset:0,includeLogo:!!options.includeLogo}},styleLocked:false};
 });
 if(keep.some(c=>!clips.includes(c)))throw Error('A locked Style segment no longer matches the main cuts. Unlock it before regenerating.');
 q.clips=[...q.clips.filter(c=>c.trackId!==track.id),...preserved,...clips];q.creatorPreset=preset;q.creatorSource=sourceTrack;
 return T.finish(p,q);
}
export function captureStyle(p,name='My Style'){
 const track=p.tracks.find(t=>t.creatorStyle);if(!track)throw Error('Apply a Style layer first.');
 const seen=new Set(),shots=[];
 for(const c of p.clips.filter(c=>c.trackId===track.id).sort((a,b)=>a.start-b.start)){
  if(!c.fx?.scene)continue;
  const pose=t=>{const {scale,x,y}=motionAt(c,t);return {scale,x,y};},from=pose(c.start),to=pose(T.end(c)),key=JSON.stringify([from,to]);
  if(seen.has(key))continue;seen.add(key);shots.push({name:c.name,from,to});
 }
 if(shots.length>20)throw Error('This layer has more than 20 distinct framings. Save the project to preserve it exactly.');
 return validateStyle({format:'rancut-style',version:1,name,shots});
}
export const transitionKinds=['paper','whoosh','shutter','glitch','fade'];
export function transitionPreset(kind='whoosh'){return {format:'rancut-transition',version:1,name:kind==='fade'?'Fade through black':kind,kind,duration:.5,sound:kind!=='fade',gainDb:-12,soundKind:kind==='fade'?'whoosh':kind};}
export function validateTransition(v){
 if(v?.format!=='rancut-transition'||v.version!==1||!transitionKinds.includes(v.kind)||!Number.isFinite(v.duration)||v.duration<.1||v.duration>2||!Number.isFinite(v.gainDb)||v.gainDb< -60||v.gainDb>6||typeof v.sound!=='boolean'||typeof v.name!=='string'||v.name.length>80)throw Error('Invalid transition preset.');
 if(v.customSound){const s=v.customSound;if(typeof s.data!=='string'||s.data.length>1500000||!/^[A-Za-z0-9+/]*={0,2}$/.test(s.data)||!Number.isFinite(s.duration)||s.duration<=0||s.duration>5)throw Error('Invalid embedded WAV sound.');soundBytes(s);}
 else if(!transitionKinds.includes(v.soundKind))throw Error('Invalid sound choice.');
 return structuredClone(v);
}
export function cutPairs(p,trackId){const cs=p.clips.filter(c=>c.trackId===trackId).sort((a,b)=>a.start-b.start);return cs.slice(1).map((right,i)=>({left:cs[i],right})).filter(x=>Math.abs(T.end(x.left)-x.right.start)<T.EPS);}
export function attachTransition(p,rightId,preset){
 const right=p.clips.find(c=>c.id===rightId);if(!right||p.tracks.find(t=>t.id===right.trackId)?.type!=='video'||!cutPairs(p,right.trackId).some(x=>x.right.id===rightId))throw Error('Choose an actual cut between touching video clips.');
 const q=T.finish(p,{...p,clips:p.clips.map(c=>c.id===rightId?{...c,transition:{...validateTransition(preset),id:c.transition?.id||T.uid('transition')}}:c)});const events=transitionEvents(q),current=events.find(e=>e.rightId===rightId);if(events.some(e=>e.rightId!==rightId&&e.start<current.start+current.duration-T.EPS&&current.start<e.start+e.duration-T.EPS))throw Error('Another scene transition overlaps this cut. Remove it or shorten its duration first.');return q;
}
export function transitionEvents(p){
 const out=[];for(const tr of p.tracks.filter(t=>t.type==='video'&&!t.hidden))for(const {left,right} of cutPairs(p,tr.id)){
  const v=right.transition;if(!v)continue;
  const duration=Math.min(v.duration,left.duration,right.duration),start=right.start-duration/2;
  out.push({...v,start,duration,cut:right.start,rightId:right.id,trackId:tr.id});
 }
 return out.sort((a,b)=>a.cut-b.cut);
}
const soundTimelineCache=new WeakMap();
export function withTransitionAudio(p){
 if(p._transitionAudio)return p;
 if(soundTimelineCache.has(p))return soundTimelineCache.get(p);
 const q={...p,_transitionAudio:true,tracks:[...p.tracks],media:[...p.media],clips:[...p.clips]};
 for(const v of transitionEvents(p).filter(v=>v.sound)){
  const sound=v.customSound||{kind:v.soundKind,duration:.5},length=sound.duration;
  const start=Math.max(0,v.cut-length/2),sourceIn=Math.max(0,length/2-v.cut),duration=Math.min(length-sourceIn,T.duration(p)-start);
  if(duration<=0)continue;
  const id='sound_'+v.id,trackId='soundtrack_'+v.id;
  q.tracks.push({id:trackId,type:'audio',muted:false});q.media.push({id,type:'audio',name:v.name+' sound',duration:length,sound});
  q.clips.push({id,mediaId:id,trackId,start,sourceIn,duration,fx:{...T.fxDefault(),gainDb:v.gainDb,fadeMs:5}});
 }
 soundTimelineCache.set(p,q);return q;
}
export function unlinkSound(p,rightId){
 const c=p.clips.find(c=>c.id===rightId),virtual=withTransitionAudio(p),sound=virtual.clips.find(x=>x.id==='sound_'+c?.transition?.id);if(!sound)throw Error('This transition has no active sound to unlink.');
 const media={...virtual.media.find(m=>m.id===sound.mediaId),id:T.uid('sfxmedia')};let q=T.addTrack(p,'audio');
 q={...q,media:[...q.media,media],clips:[...q.clips.map(x=>x.id===rightId?{...x,transition:{...x.transition,sound:false}}:x),{...sound,id:T.uid('sfx'),mediaId:media.id,name:media.name,trackId:q.tracks.at(-1).id,linkedId:null}]};
 return T.finish(p,q);
}
