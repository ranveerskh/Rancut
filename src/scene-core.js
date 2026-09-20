export const identityPose=()=>({scale:100,x:0,y:0});
export function validPose(p){return p&&Number.isFinite(p.scale)&&p.scale>=100&&p.scale<=400&&['x','y'].every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<=375);}
export function motionAt(c,time){
 const m=c.fx?.scene;if(!m)return c.fx?.transform||identityPose();
 let u=Math.max(0,Math.min(1,((time-c.start)+(m.offset||0))/(m.span||c.duration)));
 u=u*u*(3-2*u);
 const pose=Object.fromEntries(['scale','x','y'].map(k=>[k,m.from[k]+(m.to[k]-m.from[k])*u]));
 // Keep the scene inside its canvas when zooming and shifting.
 const margin=(pose.scale/100-1)*125;
 pose.x=Math.max(-margin,Math.min(margin,pose.x));pose.y=Math.max(-margin,Math.min(margin,pose.y));
 return {...pose,opacity:100};
}

export function sceneTrackOrder(p,time){
 const tracks=p.tracks.filter(t=>t.type!=='audio'&&!t.hidden).slice().reverse();
 const includeLogo=p.clips.some(c=>c.fx?.scene?.includeLogo&&time>=c.start&&time<c.start+c.duration&&tracks.some(t=>t.id===c.trackId));
 return includeLogo?tracks:[...tracks.filter(t=>!t.fixedOverlay),...tracks.filter(t=>t.fixedOverlay)];
}
