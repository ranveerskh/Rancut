import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {JSDOM,VirtualConsole} from 'jsdom';
const wait=ms=>new Promise(r=>setTimeout(r,ms));async function until(fn){for(let i=0;i<100;i++){if(fn())return;await wait(20);}throw Error('Frame UI timeout');}
test('shared framing UI seeks, preserves boxes, updates mask at selected time and blocks failed preview',async()=>{
 const entry=`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import Frame from './src/FramingWorkspace.jsx';import {defaultFraming} from './src/framing.js';
 function App(){const [f,setF]=useState(defaultFraming()),[crop,setCrop]=useState({});window.framing=f;return <Frame value={f} onChange={setF} crop={crop} onCrop={setCrop} duration={300} initialTime={120} mediaKey="main" sourceKey={JSON.stringify(crop)} loadFrame={async t=>{window.times.push(t);if(t===122)throw Error('Decode failed');return {raw:'raw-'+t,scene:'scene-'+t};}}/>}window.times=[];createRoot(document.getElementById('root')).render(<App/>);`;
 const b=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));const dom=new JSDOM('<div id="root"></div>',{runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});const w=dom.window,d=w.document;
 w.HTMLElement.prototype.setPointerCapture=function(){};w.structuredClone=structuredClone;w.Image=class{width=1920;height=1080;decode(){return Promise.resolve();}};w.HTMLCanvasElement.prototype.getContext=()=>({clearRect(){},drawImage(){}});
 const button=name=>[...d.querySelectorAll('button')].find(b=>b.textContent===name);
 const set=(label,value)=>{const el=d.querySelector('[aria-label="'+label+'"]');assert(el,label);Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new w.Event('input',{bubbles:true}));};
 try{
 w.eval(b.outputFiles[0].text);await until(()=>d.querySelector('img'));assert.equal(d.querySelector('img').src,'raw-120');assert(d.querySelector('.frameSelection'));
 button('Normal base · 16:9').click();await wait(30);set('Zoom % value','125');await wait(30);assert.equal(w.framing.base.w,.8);const stage=d.querySelector('.framingStage');stage.getBoundingClientRect=()=>({width:960,height:540,left:0,top:0});const box=d.querySelector('.frameSelection');box.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,clientX:100,clientY:100}));box.dispatchEvent(new w.MouseEvent('pointermove',{bubbles:true,clientX:120,clientY:120}));box.dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true}));await wait(30);assert(w.framing.base.x>.1&&w.framing.base.y>0);const saved=JSON.stringify(w.framing);
 set('Source seconds','121');await wait(30);button('Show frame').click();await until(()=>d.querySelector('img')?.src==='scene-121');assert.equal(JSON.stringify(w.framing),saved);
 button('Clean edges').click();await wait(30);set('Mask left value','.1');await until(()=>w.times.length>=3);await wait(30);assert.equal(w.times.at(-1),121);assert.equal(JSON.stringify(w.framing),saved);
 set('Source seconds','122');await wait(30);button('Show frame').click();await until(()=>d.querySelector('[role="alert"]'));assert(d.querySelector('.framingSliders').disabled);assert.equal(d.querySelector('img'),null);
 set('Source seconds','121');await wait(30);button('Show frame').click();await until(()=>d.querySelector('img'));button('Max close-up · 16:9').click();await wait(30);assert(d.querySelector('.baseGuide'));assert.equal(d.querySelector('.frameSelection').style.width,d.querySelector('.frameSelection').style.height);
 button('Preview Style').click();await wait(40);assert(d.querySelector('[aria-label="Style output preview"]'));assert.deepEqual(errors,[]);
 }finally{w.close();}
});
