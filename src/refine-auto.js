import * as T from './timeline.js';
import * as C from './creator.js';
import {creatorStyles,voiceGain,applyTransitions} from './creator-workflow.js';
export const recutKeys=['mainId','voiceId','trim','clean','allShort','maxDuration','threshold','minPause','padding'];
export const changedOptions=(a,b)=>Object.keys(b).filter(k=>JSON.stringify(a?.[k])!==JSON.stringify(b[k]));
export function refineAuto(p,o,analysis){
 const changes=changedOptions(p.autoEditOptions,o),has=(...keys)=>keys.some(k=>changes.includes(k));
 if(changes.some(k=>recutKeys.includes(k)))throw Error('Source or cut settings changed. Use Rebuild as new copy.');
 let q=structuredClone(p);const main=p.creatorSource||'V2';
 const unlocked=id=>{const tr=q.tracks.find(t=>t.id===id);if(tr?.locked)throw Error('Unlock '+id+' first.');return tr;};
 if(!q.clips.some(c=>c.trackId===main))throw Error('Main track is missing.');
 if(has('crop','green','subject')){unlocked(main);q.clips=q.clips.map(c=>c.trackId!==main?c:{...c,fx:{...c.fx,...(has('crop')?{crop:{...T.fxDefault().crop,...o.crop}}:{}),...(has('subject')?{subject:o.subject}:{}),...(has('green')?{chroma:{...c.fx.chroma,enabled:o.green,key:o.key||c.fx.chroma.key}}:{})}});}
 const replaceLayer=(id,name,type,mediaId,fx={})=>{
  const tr=unlocked(id);if(tr&&tr.name!==name)throw Error('Track '+id+' was renamed; edit that track manually to preserve custom work.');
  q.clips=q.clips.filter(c=>c.trackId!==id);if(!mediaId)return;
  const m=q.media.find(m=>m.id===mediaId);if(!m||type==='audio'&&m.type==='image'||name==='Logo'&&m.type!=='image'||type==='video'&&m.type==='audio')throw Error('Invalid '+name+' source.');
  if(!tr){const track={id,name,type,...(name==='Logo'?{fixedOverlay:true}:{})};if(type==='audio')q.tracks.push(track);else if(name==='Background'){const i=q.tracks.findIndex(t=>t.id===main);q.tracks.splice(i+1,0,track);}else q.tracks.unshift(track);}
  const end=T.duration(p),chunk=m.type==='image'?end:Math.floor(m.duration*p.fps)/p.fps;
  if(chunk<=0||Math.ceil(end/chunk)>1000)throw Error('Source is too short.');
  for(let start=0;start<end-T.EPS;start=T.quant(start+chunk,p.fps))q.clips.push({id:T.uid(),mediaId,name:m.name,trackId:id,start,duration:Math.min(chunk,end-start),sourceIn:0,linkedId:null,fx:{...T.fxDefault(),...fx}});
 };
 if(has('backgroundId','green'))replaceLayer('V1','Background','video',o.green?o.backgroundId:'');
 if(has('logoId'))replaceLayer('V3','Logo','video',o.logoId,{transform:{scale:18,x:96,y:96,opacity:100}});
 if(has('bgmId'))replaceLayer('A2','BGM','audio',o.bgmId);
 if(has('bgmId','bgmDb','duck')){unlocked('A2');q.tracks=q.tracks.map(t=>t.id==='A2'?{...t,gainDb:o.bgmDb,duckAgainst:o.duck?'A1':null,duckDb:-10}:t);}
 if(has('normalize')){unlocked('A1');q.tracks=q.tracks.map(t=>t.id==='A1'?{...t,gainDb:o.normalize?voiceGain(analysis):0}:t);}
 if(has('style','framing','includeLogo','subject','baseScale')){
  const preset=o.style==='none'?{...creatorStyles[0],name:'Base only',shots:[creatorStyles[0].shots[0]]}:creatorStyles[o.style==='dynamic'?1:0];
  q=C.applyStyle(q,main,preset,42,{framing:o.framing,includeLogo:o.includeLogo,subject:o.subject,baseScale:o.baseScale});
 }
 if(has('transition','sound')){unlocked(main);if(o.transition==='none')q.clips=q.clips.map(c=>c.trackId===main?{...c,transition:undefined}:c);else if(C.cutPairs(q,main).length)q=applyTransitions(q,{trackId:main,all:true,replace:true,preset:{...C.transitionPreset(o.transition),sound:!!o.sound}});}
 q.autoEditOptions=structuredClone(o);return T.finish(p,q);
}
