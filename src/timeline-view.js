import {clamp} from './timeline.js';

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
