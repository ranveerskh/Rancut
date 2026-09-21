import {validateFraming} from './framing.js';
import {validPose} from './scene-core.js';
import {validateTransition} from './creator.js';
import {soundBytes} from './sounds.js';
export const VERSION='0.5.7';
export const uid=(p='c')=>`${p}_${crypto.randomUUID()}`;
export const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export const end=c=>c.start+c.duration;
export const quant=(t,fps)=>Math.round(t*fps)/fps;
export const EPS=1e-7;
export const fxDefault=()=>({chroma:{enabled:false,engine:'sample',key:'#13470e',threshold:.14,softness:.4,choke:.35,feather:.5,spill:.94,decontam:1,matte:false},color:{exposure:0,contrast:0,saturation:100,temp:0,tint:0},transform:{x:0,y:0,scale:100,opacity:100},crop:{left:0,right:0,top:0,bottom:0},blur:0,gainDb:0});
export const emptyProject=()=>({schema:1,version:VERSION,name:'Untitled',fps:30,width:1920,height:1080,tracks:[{id:'V1',type:'video',hidden:false,muted:false,locked:false},{id:'A1',type:'audio',hidden:false,muted:false,locked:false}],clips:[],markers:[],media:[]});
export const duration=p=>Math.max(0,...p.clips.map(end));
export const activeAt=(p,t)=>p.clips.filter(c=>t>=c.start-EPS&&t<end(c)-EPS);
export const track=p=>new Map(p.tracks.map(t=>[t.id,t]));
export function mergeRanges(ranges){const out=[];for(const [a,b] of ranges.filter(([a,b])=>b>a+EPS).sort((x,y)=>x[0]-y[0])){const last=out.at(-1);if(last&&a<=last[1]+EPS)last[1]=Math.max(b,last[1]);else out.push([a,b]);}return out;}
export function validate(p){
 if(p.schema!==1||!Array.isArray(p.clips)||!Array.isArray(p.tracks)||!Array.isArray(p.media)||!Array.isArray(p.markers))throw Error('Invalid project file.');
 if(![24,25,30,50,60].includes(p.fps)||![p.width,p.height].every(n=>Number.isInteger(n)&&n>=64&&n<=7680))throw Error('Invalid project format.');
 if(p.creatorFraming)validateFraming(p.creatorFraming);
 for(const m of p.media)if(m.sound)soundBytes(m.sound);
 const ts=track(p),ids=new Set(),ms=new Map(p.media.map(m=>[m.id,m]));if(ts.size!==p.tracks.length)throw Error('Duplicate track IDs.');
 for(const t of p.tracks)if(!['video','audio','adjustment'].includes(t.type))throw Error('Invalid track type.');
 for(const t of p.tracks){if(t.gainDb!==undefined&&(!Number.isFinite(t.gainDb)||t.gainDb< -60||t.gainDb>12))throw Error('Invalid track volume.');if(t.duckDb!==undefined&&(!Number.isFinite(t.duckDb)||t.duckDb< -60||t.duckDb>0))throw Error('Invalid BGM ducking level.');}
 for(const c of p.clips){
  if(c.transition)validateTransition(c.transition);
  if(c.fx?.scene){const m=c.fx.scene;if(m.framing)validateFraming(m.framing);if(!validPose(m.from)||!validPose(m.to)||!Number.isFinite(m.span)||m.span<=0||!Number.isFinite(m.offset)||m.offset<0)throw Error('Invalid Style motion.');}
  const crop={...fxDefault().crop,...c.fx?.crop};if(!['left','right','top','bottom'].every(k=>Number.isFinite(crop[k])&&crop[k]>=0&&crop[k]<.9)||crop.left+crop.right>=.95||crop.top+crop.bottom>=.95)throw Error('Invalid crop settings.');
  if(c.fx?.subject){const s=c.fx.subject;if(!['x','y','width','height','headroom'].every(k=>Number.isFinite(s[k]))||s.x<0||s.y<0||s.width<=0||s.height<=0||s.x+s.width>1||s.y+s.height>1||s.headroom<0||s.headroom>.5)throw Error('Invalid subject frame.');}
  if(ids.has(c.id))throw Error('Duplicate clip IDs.');ids.add(c.id);
  if(!ts.has(c.trackId)||![c.start,c.duration,c.sourceIn].every(Number.isFinite)||c.start<0||c.duration<1/p.fps-EPS||c.sourceIn<0)throw Error('Invalid clip timing.');
  const m=ms.get(c.mediaId),t=ts.get(c.trackId);
  if(c.kind!=='adjustment'&&!m)throw Error('Missing media reference.');
  if(c.kind==='adjustment'&&t.type!=='adjustment'||c.kind!=='adjustment'&&t.type==='adjustment'||t.type==='video'&&m?.type==='audio'||t.type==='audio'&&m?.type==='image')throw Error('Clip is on an incompatible track.');
  if(m&&m.type!=='image'&&c.sourceIn+c.duration>m.duration+1/p.fps+EPS)throw Error('Trim extends beyond the source media.');
 }
 for(const t of p.tracks){const cs=p.clips.filter(c=>c.trackId===t.id).sort((a,b)=>a.start-b.start);for(let i=1;i<cs.length;i++)if(cs[i].start<end(cs[i-1])-EPS)throw Error(`Overlap on ${t.id}. Move to an empty area or add a track.`);}
 for(const c of p.clips)if(c.linkedId){const b=p.clips.find(b=>b.id===c.linkedId);if(!b||b.linkedId!==c.id||b.mediaId!==c.mediaId||Math.abs(c.start-b.start)>EPS||Math.abs(c.duration-b.duration)>EPS||Math.abs(c.sourceIn-b.sourceIn)>EPS)throw Error('Linked audio/video boundaries must match.');}
 return p;
}
export function assertLocks(before,after){const ts=track(before);for(const c of before.clips)if(ts.get(c.trackId)?.locked){const n=after.clips.find(x=>x.id===c.id);if(JSON.stringify(c)!==JSON.stringify(n))throw Error(`Unlock ${c.trackId} first. Linked edits are all-or-nothing.`);}for(const c of after.clips)if(ts.get(c.trackId)?.locked&&!before.clips.some(x=>x.id===c.id))throw Error(`Track ${c.trackId} is locked.`);return after;}
export function finish(before,after){assertLocks(before,after);return validate(after);}
export function pair(p,id){const c=p.clips.find(c=>c.id===id);return c?[c.id,c.linkedId].filter(Boolean):[];}
function piece(c,a,b,start,p){const image=p.media.find(m=>m.id===c.mediaId)?.type==='image'||c.kind==='adjustment';const copied=structuredClone(c);if(a>c.start+EPS)delete copied.transition;if(copied.fx?.scene)copied.fx.scene.offset+=(a-c.start);return {...copied,id:uid(),start,duration:b-a,sourceIn:image?0:c.sourceIn+a-c.start,linkedId:null,_old:c.id,_a:a,_b:b};}
function relink(p,clips){const original=new Map(p.clips.map(c=>[c.id,c]));for(const c of clips){const old=original.get(c._old);if(old?.linkedId){const other=clips.find(x=>x._old===old.linkedId&&Math.abs(x._a-c._a)<EPS&&Math.abs(x._b-c._b)<EPS);c.linkedId=other?.id||null;}}return clips.map(({_old,_a,_b,...c})=>c);}
export function mapTime(t,ranges){return t-ranges.reduce((sum,[a,b])=>sum+Math.max(0,Math.min(t,b)-a),0);}
export function removeRanges(p,raw,{ripple=true,ids=null}={}){
 const ranges=mergeRanges(raw.map(([a,b])=>[Math.max(0,quant(a,p.fps)),Math.max(0,quant(b,p.fps))]));if(!ranges.length)return p;
 const out=[];
 for(const c of p.clips){
  if(!ripple&&ids&&!ids.includes(c.id)){out.push({...c,_old:c.id,_a:c.start,_b:end(c)});continue;}
  const local=ranges.filter(([a,b])=>a<end(c)-EPS&&b>c.start+EPS);const bounds=[c.start,...local.flat().filter(t=>t>c.start&&t<end(c)),end(c)].sort((a,b)=>a-b);
  for(let i=0;i<bounds.length-1;i++){const a=bounds[i],b=bounds[i+1];if(b-a<1/p.fps-EPS||ranges.some(([x,y])=>(a+b)/2>=x&&(a+b)/2<y))continue;out.push(piece(c,a,b,ripple?mapTime(a,ranges):a,p));}
 }
 const after={...p,clips:relink(p,out),markers:ripple?p.markers.map(m=>({...m,time:mapTime(m.time,ranges)})):p.markers};
 // Preserve identity for unchanged pieces; locked clips are not touched by a no-op.
 for(const n of after.clips){const old=p.clips.find(c=>c.trackId===n.trackId&&c.mediaId===n.mediaId&&c.start===n.start&&Math.abs(c.duration-n.duration)<EPS&&Math.abs(c.sourceIn-n.sourceIn)<EPS);if(old){const generated=n.id;n.id=old.id;for(const x of after.clips)if(x.linkedId===generated)x.linkedId=old.id;}}
 return finish(p,after);
}
export function splitClips(p,id,time){const ids=pair(p,id),t=quant(time,p.fps),out=[];for(const c of p.clips){if(ids.includes(c.id)&&t>c.start+EPS&&t<end(c)-EPS)out.push(piece(c,c.start,t,c.start,p),piece(c,t,end(c),t,p));else out.push({...c,_old:c.id,_a:c.start,_b:end(c)});}return finish(p,{...p,clips:relink(p,out)});}
export function moveClip(p,id,target,start){const c=p.clips.find(c=>c.id===id);if(!c)return p;const source=track(p).get(c.trackId),dest=track(p).get(target);if(source.type!==dest?.type)throw Error('Move clips between tracks of the same type.');const delta=quant(Math.max(0,start),p.fps)-c.start,ids=pair(p,id);return finish(p,{...p,clips:p.clips.map(x=>ids.includes(x.id)?{...x,start:x.start+delta,trackId:x.id===id?target:x.trackId}:x)});}
export function deleteClips(p,id){const ids=pair(p,id);return finish(p,{...p,clips:p.clips.filter(c=>!ids.includes(c.id))});}
export function trimClip(p,id,edge,time,ripple){const c=p.clips.find(c=>c.id===id);if(!c)return p;const t=quant(time,p.fps),ids=pair(p,id);if(edge==='left'&&t>c.start&&t<end(c))return removeRanges(p,[[c.start,t]],{ripple,ids});if(edge==='right'&&t>c.start&&t<end(c))return removeRanges(p,[[t,end(c)]],{ripple,ids});throw Error('Place the trim inside this clip.');}
export function globalCropLeft(p,time){const t=quant(Math.max(0,time),p.fps);if(t<=EPS)return p;if(p.tracks.some(x=>x.locked))throw Error('Unlock all tracks before cropping every layer.');return removeRanges(p,[[0,t]],{ripple:true});}
export function closeGaps(p,trackId){const cs=p.clips.filter(c=>c.trackId===trackId).sort((a,b)=>a.start-b.start);let cursor=0;const ranges=[];for(const c of cs){if(c.start>cursor+EPS)ranges.push([cursor,c.start]);cursor=Math.max(cursor,end(c));}if(!ranges.length)throw Error('No removable gap found.');return removeRanges(p,ranges,{ripple:true});}
export function resizeClip(p,id,edge,time,ripple){
 const c=p.clips.find(c=>c.id===id);if(!c)return p;const t=quant(Math.max(0,time),p.fps),ids=pair(p,id),oldEnd=end(c);
 if((edge==='right'&&t<oldEnd)||(edge==='left'&&t>c.start))return trimClip(p,id,edge,t,ripple);
 if(edge==='left'){const d=t-c.start;return finish(p,{...p,clips:p.clips.map(x=>ids.includes(x.id)?{...x,start:t,duration:x.duration-d,sourceIn:p.media.find(m=>m.id===x.mediaId)?.type==='image'||x.kind==='adjustment'?0:x.sourceIn+d}:x)});}
 const delta=t-oldEnd;if(delta<=EPS)return p;
 let clips=[];
 for(const x of p.clips){
  if(ids.includes(x.id)){clips.push({...x,duration:x.duration+delta,_old:x.id,_a:x.start,_b:end(x)});continue;}
  if(!ripple){clips.push({...x,_old:x.id,_a:x.start,_b:end(x)});continue;}
  if(x.start>=oldEnd-EPS)clips.push({...x,start:x.start+delta,_old:x.id,_a:x.start,_b:end(x)});
  else if(end(x)>oldEnd+EPS){
   if(p.media.find(m=>m.id===x.mediaId)?.type==='image'||x.kind==='adjustment')clips.push({...x,duration:x.duration+delta,_old:x.id,_a:x.start,_b:end(x)});
   else clips.push(piece(x,x.start,oldEnd,x.start,p),piece(x,oldEnd,end(x),oldEnd+delta,p));
  }else clips.push({...x,_old:x.id,_a:x.start,_b:end(x)});
 }
 return finish(p,{...p,clips:relink(p,clips),markers:ripple?p.markers.map(m=>({...m,time:m.time>=oldEnd?m.time+delta:m.time})):p.markers});
}
export function addTrack(p,type){const prefix=type==='audio'?'A':type==='adjustment'?'ADJ':'V';const nums=p.tracks.filter(t=>t.id.startsWith(prefix)).map(t=>Number(t.id.slice(prefix.length))||0);const t={id:prefix+(Math.max(0,...nums)+1),type,hidden:false,muted:false,locked:false};return {...p,tracks:type==='audio'?[...p.tracks,t]:type==='video'?[...p.tracks.filter(x=>x.creatorStyle),t,...p.tracks.filter(x=>!x.creatorStyle)]:[t,...p.tracks]};}
export function addMediaClip(p,mediaId,trackId,start){const m=p.media.find(m=>m.id===mediaId);if(!m)throw Error('Media not found.');const t=track(p).get(trackId);if(!t)throw Error('Track not found.');const c={id:uid(),mediaId,trackId,name:m.name,start:quant(Math.max(0,start),p.fps),duration:Math.max(1/p.fps,Math.floor(m.duration*p.fps)/p.fps),sourceIn:0,fx:fxDefault(),linkedId:null};let after={...p,clips:[...p.clips,c]};if(m.type==='video'&&t.type==='video'&&m.hasAudio!==false){let a=p.tracks.find(t=>t.type==='audio'&&!t.locked&&!p.clips.some(x=>x.trackId===t.id&&x.start<end(c)-EPS&&end(x)>c.start+EPS));if(!a){after=addTrack(after,'audio');a=after.tracks.at(-1);}const audio={...structuredClone(c),id:uid(),trackId:a.id,linkedId:c.id};c.linkedId=audio.id;after.clips.push(audio);}return finish(p,after);}

export function duplicateClips(p,ids,{count=1,until=null}={}){
 const chosen=new Set(ids.flatMap(id=>pair(p,id)));if(!chosen.size)throw Error('Select one or more clips to duplicate.');
 const seed=p.clips.filter(c=>chosen.has(c.id)).sort((a,b)=>a.start-b.start);if(!seed.length)throw Error('Selected clips no longer exist.');
 for(const c of seed)if(track(p).get(c.trackId)?.locked)throw Error(`Unlock ${c.trackId} first.`);
 const first=Math.min(...seed.map(c=>c.start)),last=Math.max(...seed.map(end)),span=last-first;if(span<=EPS)throw Error('Cannot duplicate an empty selection.');
 const maxCopies=until===null?Math.max(1,Math.min(200,Math.floor(count))):Math.max(1,Math.min(1000,Math.ceil(Math.max(0,until-last)/span)));
 let out=[...p.clips],previous=new Map();
 for(let n=1;n<=maxCopies;n++){
  const copies=[];for(const c of seed){const start=c.start+span*n;if(until!==null&&start>=until-EPS)continue;const duration=until===null?c.duration:Math.min(c.duration,until-start);if(duration<1/p.fps-EPS)continue;const next={...structuredClone(c),id:uid('copy'),start,duration,linkedId:null};copies.push(next);previous.set(c.id,next);}
  for(const c of copies){const original=seed.find(x=>x.id===c.id)||null;const linked=seed.find(x=>previous.get(x.id)===c)?.linkedId;if(linked)c.linkedId=previous.get(linked)?.id||null;}
  out.push(...copies);
 }
 return finish(p,{...p,clips:out});
}
export function extendClipTo(p,id,until){const c=p.clips.find(x=>x.id===id);if(!c)throw Error('Select a clip first.');const target=quant(Math.max(end(c),until),p.fps);const meta=p.media.find(m=>m.id===c.mediaId);if(meta?.type!=='image'&&c.kind!=='adjustment')throw Error('Extend is for images, still backgrounds and adjustment layers. Use Repeat for video or audio.');if(track(p).get(c.trackId)?.locked)throw Error(`Unlock ${c.trackId} first.`);return finish(p,{...p,clips:p.clips.map(x=>x.id===id?{...x,duration:target-x.start}:x)});}
