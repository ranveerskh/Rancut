import * as T from './timeline.js';

export function expandedIds(p, ids) {
  return new Set(ids.flatMap(id => T.pair(p, id)));
}
export function selectFrom(p,id,all=true){
 const anchor=p.clips.find(c=>c.id===id);if(!anchor)throw Error('Select the starting clip first.');
 return p.clips.filter(c=>c.start>=anchor.start-T.EPS&&(all||c.trackId===anchor.trackId)&&pairUnlocked(c)).map(c=>c.id);
 function pairUnlocked(c){return pairTracks(c).every(t=>t&&!t.locked);}
 function pairTracks(c){return [...expandedIds(p,[c.id])].map(id=>p.tracks.find(t=>t.id===p.clips.find(x=>x.id===id)?.trackId));}
}
export function moveGroup(p, ids, anchorId, targetTrack, start) {
  const group=expandedIds(p,ids), anchor=p.clips.find(c=>c.id===anchorId);
  if(!anchor||!group.size)return p;
  const source=p.tracks.find(t=>t.id===anchor.trackId),target=p.tracks.find(t=>t.id===targetTrack);
  if(source.type!==target?.type)throw Error('Choose a track of the same type.');
  const members=p.clips.filter(c=>group.has(c.id));
  const delta=T.quant(Math.max(start-anchor.start,-Math.min(...members.map(c=>c.start))),p.fps);
  // Commit the complete group once: no intermediate overlaps or double linked moves.
  return T.finish(p,{...p,clips:p.clips.map(c=>group.has(c.id)?{...c,start:T.quant(c.start+delta,p.fps),trackId:c.id===anchorId?targetTrack:c.trackId}:c)});
}
export function gapsOnTrack(p,trackId) {
  let cursor=0;const gaps=[];
  for(const c of p.clips.filter(c=>c.trackId===trackId).sort((a,b)=>a.start-b.start)){
    if(c.start>cursor+T.EPS)gaps.push([cursor,c.start]);cursor=Math.max(cursor,T.end(c));
  }
  return gaps;
}
export function deleteTimelineGap(p,gap) {
  const track=p.tracks.find(t=>t.id===gap.trackId);
  if(!track)throw Error('Gap track no longer exists.');
  if(track.locked)throw Error(`Unlock ${track.id} before deleting its gap.`);
  const range=gapsOnTrack(p,gap.trackId).find(([a,b])=>Math.abs(a-gap.range[0])<T.EPS&&Math.abs(b-gap.range[1])<T.EPS);
  if(!range)throw Error('Gap changed; select it again.');
  return scopedRemove(p,[range],{scope:'all',ripple:true});
}
export function scopedRemove(p,ranges,{scope='all',ids=[],ripple=true}={}) {
  const chosen=scope==='all'?new Set(p.clips.filter(c=>!p.tracks.find(t=>t.id===c.trackId).locked).map(c=>c.id)):expandedIds(p,ids);
  if(!chosen.size)throw Error('Select clips first.');
  // Linked pairs stay atomic even when a counterpart is locked.
  for(const c of p.clips)if(chosen.has(c.id)&&c.linkedId)chosen.add(c.linkedId);
  const sub={...p,clips:p.clips.filter(c=>chosen.has(c.id)),markers:scope==='all'?p.markers:[]};
  const edited=T.removeRanges(sub,ranges,{ripple});
  return T.finish(p,{...p,clips:[...p.clips.filter(c=>!chosen.has(c.id)),...edited.clips],markers:scope==='all'?edited.markers:p.markers});
}
export function pasteEffects(p,ids,copied,section='all'){
  const chosen=new Set(ids);
  return T.finish(p,{...p,clips:p.clips.map(c=>{
    if(!chosen.has(c.id))return c;
    const fx=structuredClone({...T.fxDefault(),...c.fx});
    for(const key of section==='all'?['chroma','color','transform','blur']:[section])fx[key]=structuredClone(copied[key]);
    return {...c,fx};
  })});
}
export const fadeDuration=c=>Math.min(Math.max(0,c.fx?.fadeMs??5)/1000,c.duration/2);
export function envelope(c,t){const f=fadeDuration(c);return f?T.clamp(Math.min((t-c.start)/f,(T.end(c)-t)/f),0,1):1;}
