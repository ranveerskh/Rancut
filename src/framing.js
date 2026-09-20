// Boxes are fractions of a 16:9 composition, so equal normalized width/height
// represents a 16:9 crop at every render resolution.
export const limit=(v,a,b)=>Math.max(a,Math.min(b,v));
export const defaultFraming=()=>({version:1,base:{x:.04,y:0,w:.92},close:{x:.19,y:.01,w:.62}});
export function validBox(b){return b&&['x','y','w'].every(k=>Number.isFinite(b[k]))&&b.w>=.25&&b.w<=1&&b.x>=0&&b.y>=0&&b.x+b.w<=1.000001&&b.y+b.w<=1.000001;}
export function validateFraming(f){
 if(f?.version!==1||!validBox(f.base)||!validBox(f.close))throw Error('Invalid 16:9 framing.');
 const {base:b,close:c}=f;
 if(c.x<b.x-1e-6||c.y<b.y-1e-6||c.x+c.w>b.x+b.w+1e-6||c.y+c.w>b.y+b.w+1e-6)throw Error('Close-up must stay inside the base frame.');
 return structuredClone(f);
}
export function clampBox(b,parent={x:0,y:0,w:1}){
 const w=limit(b.w,.25,parent.w);return {w,x:limit(b.x,parent.x,parent.x+parent.w-w),y:limit(b.y,parent.y,parent.y+parent.w-w)};
}
export function updateBox(f,key,b){const q=structuredClone(f);q[key]=clampBox(b,key==='close'?q.base:undefined);q.close=clampBox(q.close,q.base);return q;}
export function boxPose(b){return {scale:100/b.w,x:250*(.5-b.x-b.w/2)/b.w,y:250*(.5-b.y-b.w/2)/b.w};}
export function poseBox(p){const w=100/p.scale;return {w,x:.5-p.x*w/250-w/2,y:.5-p.y*w/250-w/2};}
const mixBox=(a,b,u)=>Object.fromEntries(['x','y','w'].map(k=>[k,a[k]+(b[k]-a[k])*u]));
export const shotKinds=['Normal','Close-up','Slow zoom in','Slow zoom out','Left framing','Right framing'];
export function framingShot(f,name='Normal',gentle=false,duration=5){
 validateFraming(f);const base=f.base,max=f.close,close=gentle?mixBox(base,max,.55):max;
 let a=base,b=base;
 if(name==='Close-up')a=b=close;
 if(name==='Slow zoom in'){a=base;b=close;}
 if(name==='Slow zoom out'){a=close;b=base;}
 if(name==='Left framing'||name==='Right framing'){
  // Pan only in available head-safe horizontal slack. No lateral animation.
  const w=(base.w+max.w)/2,lo=Math.max(base.x,max.x+max.w-w),hi=Math.min(max.x,base.x+base.w-w);
  a=b={w,x:name==='Left framing'?hi:lo,y:limit(max.y,base.y,base.y+base.w-w)};
 }
 // Tiny clips use a steady shot instead of rushing an animation.
 if(duration<1.2)b=a;
 return {from:boxPose(a),to:boxPose(b)};
}
export function shotSequence(mode,count){
 const names=mode==='Simple'?['Normal','Slow zoom in','Close-up','Slow zoom out']:shotKinds;
 return Array.from({length:count},(_,i)=>names[i%names.length]);
}
