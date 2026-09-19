import {clamp} from './timeline.js';
export const MIN_ZOOM=.001;
export function fitZoom(width,duration){return clamp(Math.max(1,width)/(Math.max(12,duration)+2),MIN_ZOOM,2400);}
export function boxSelection(p,area,zoom){
 const ids=[];let top=30;
 for(const tr of p.tracks){const height=tr.type==='audio'?80:50;
  if(!tr.locked&&top<area.top+area.height&&top+height>area.top){for(const c of p.clips)if(c.trackId===tr.id&&c.start*zoom<area.left+area.width&&(c.start+c.duration)*zoom>area.left)ids.push(c.id);}
  top+=height;
 }
 return ids;
}

// Keep the playhead inside the visible lane area, including paused seeks.
export function followScroll({time,zoom,left,width,total,enabled=true,suspended=false}) {
  if(!enabled||suspended||width<=0)return left;
  const x=time*zoom;
  if(x>=left+width*.78||x<left+Math.min(20,width*.1))return clamp(x-width*.25,0,Math.max(0,total-width));
  return left;
}
export function scaledPeak(lo,hi,db=0) {
  const gain=10**(db/20),low=lo*gain,high=hi*gain;
  return {lo:clamp(low,-1,1),hi:clamp(high,-1,1),clipped:low < -1||high > 1};
}
