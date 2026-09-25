import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {baseStylePose,applyStyle,builtInStyle} from '../src/creator.js';
import {motionAt} from '../src/scene-core.js';
import * as T from '../src/timeline.js';

test('base zoom is proportional, top anchored, and allows belly to leave frame',()=>{
 const p=baseStylePose({scale:100,x:0,y:0},null,108);
 assert.equal(p.scale,108);
 const screenY=y=>.5+(y-.5)*p.scale/100+p.y/250;
 assert(Math.abs(screenY(0))<1e-9);
 assert(screenY(1)>1);
 assert(baseStylePose({scale:118,x:0,y:0},null,108).scale>p.scale);
 assert.throws(()=>baseStylePose({scale:100,x:0,y:0},null,NaN));
});
test('protected head survives zoom and pan at endpoints and intermediate frames',()=>{
 const subject={x:.38,y:.07,width:.25,height:.34,headroom:.04};
 const from=baseStylePose({scale:116,x:-12,y:0},subject,108);
 const to=baseStylePose({scale:125,x:12,y:0},subject,108);
 const clip={start:0,duration:5,fx:{scene:{from,to,span:5,offset:0}}};
 for(let t=0;t<=5;t+=.1){
  const p=motionAt(clip,t),z=p.scale/100;
  for(const x of [subject.x,subject.x+subject.width])assert(.5+(x-.5)*z+p.x/250>=-1e-7&&.5+(x-.5)*z+p.x/250<=1+1e-7);
  for(const y of [subject.y-subject.headroom,subject.y+subject.height])assert(.5+(y-.5)*z+p.y/250>=-1e-7&&.5+(y-.5)*z+p.y/250<=1+1e-7);
 }
 assert(to.scale>120);
});
test('style stores base and head protection; preserves source and locked edits',()=>{
 let p=T.emptyProject();p.media=[{id:'v',type:'video',name:'v',duration:5}];p=T.addMediaClip(p,'v','V1',0);
 const subject={x:.3,y:.08,width:.4,height:.4,headroom:.04};
 const before=structuredClone(p),q=applyStyle(p,'V1',builtInStyle,1,{subject,baseScale:110});
 assert.deepEqual(p,before);
 const style=q.clips.find(c=>c.fx.scene);assert.equal(style.fx.scene.baseScale,110);assert.deepEqual(style.fx.scene.subject,subject);
 style.styleLocked=true;const r=applyStyle(q,'V1',builtInStyle,2,{baseScale:120});
 assert.deepEqual(r.clips.find(c=>c.id===style.id),style);
});

test('frame dialog chooses a source time, preserves crop and blocks apply on failed seek',async()=>{
 const entry=`import React from 'react';import {createRoot} from 'react-dom/client';import Frame from './src/FrameDialog.jsx';
 window.times=[];window.applied=null;createRoot(document.getElementById('root')).render(React.createElement(Frame,{
 image:'data:image/png;base64,AA',initialTime:120,duration:300,initial:{left:.1,right:.05,top:0,bottom:0},
 loadFrame:async t=>{window.times.push(t);if(t===122)throw Error('Decode failed');return 'frame-'+t;},
 onClose:()=>{},onApply:v=>window.applied=v}));`;
 const bundle=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
 const dom=new JSDOM('<div id="root"></div>',{runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const wait=()=>new Promise(r=>setTimeout(r,25));
 const button=label=>[...d.querySelectorAll('button')].find(b=>b.textContent===label);
 try{
 w.eval(bundle.outputFiles[0].text);await wait();
 assert(d.querySelector('[aria-label="Choose video frame"]'));
 button('+1 sec').click();await wait();assert.deepEqual(Array.from(w.times),[121]);
 assert.equal(d.querySelector('img').getAttribute('src'),'frame-121');
 button('Apply clean edges').click();await wait();assert.equal(w.applied.left,.1);
 button('+1 sec').click();await wait();assert(button('Apply clean edges').disabled);assert(d.body.textContent.includes('Decode failed'));
 button('−1 sec').click();await wait();assert(!button('Apply clean edges').disabled);
 }finally{w.close();}
});
