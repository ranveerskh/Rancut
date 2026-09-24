// DOM integration, not a real Chromium / GPU test. Media rendering is mocked.
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';
import {IDBFactory} from 'fake-indexeddb';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check){for(let n=0;n<150;n++){if(check())return;await sleep(20);}throw Error('UI condition timed out');}
test('Home supports named projects, rename, duplicate, trash, restore and persisted reopen',async()=>{
 const bundle=await build({entryPoints:['src/main.jsx'],bundle:true,write:false,outdir:'unused',format:'iife',logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'mock-gpu',setup(b){b.onLoad({filter:/renderer\.js$/},()=>({loader:'js',contents:'export class Renderer {gpuInfo(){return {renderer:"Mock"}} pause(){} resetMedia(){} dispose(){} draw(){return Promise.resolve()} meter(){return -60}}'}));}}]});
 const db=new IDBFactory(),errors=[];let dom;
 const boot=async()=>{
  const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  dom=new JSDOM('<div id="root"></div>',{url:'http://127.0.0.1:5174',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const w=dom.window;Object.assign(w,{indexedDB:db,structuredClone,TextEncoder,TextDecoder,AbortSignal,ResizeObserver:class{observe(){}disconnect(){}},fetch:async()=>({ok:true,json:async()=>({directory:'/exports',ffmpeg:true})}),confirm:()=>true});
  w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});w.HTMLCanvasElement.prototype.toDataURL=()=>'';
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  w.URL.createObjectURL=()=> 'blob:mock';w.URL.revokeObjectURL=()=>{};
  w.eval(bundle.outputFiles.find(x=>x.path.endsWith('.js')).text);
  await until(()=>w.document.querySelector('.projectHome')&&!w.document.querySelector('.projectHome [role="status"]')&&w.document.querySelector('.projectHome input'));
  return w;
 };
 try{
 let w=await boot();const doc=()=>w.document;
 const click=(label,within=doc())=>{const button=[...within.querySelectorAll('button')].find(x=>x.textContent.trim()===label);assert(button,'Missing button: '+label);assert(!button.disabled,'Disabled: '+label);button.click();};
 const fill=(selector,value)=>{const el=doc().querySelector(selector);Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new w.Event('input',{bubbles:true}));};
 fill('[aria-label="New project name"]','Episode one');await sleep(30);click('+ New project');await until(()=>!doc().querySelector('.projectHome'));assert(doc().querySelector('.saveBadge').textContent.includes('Episode one'));
 click('Projects');await until(()=>doc().querySelector('.projectCard'));assert(doc().querySelector('.projectCard h3').textContent.includes('Episode one'));
 click('Rename');await until(()=>doc().querySelector('[aria-label="Rename project"]'));fill('[aria-label="Rename project"]','Episode renamed');await sleep(30);click('Save name');await until(()=>doc().querySelector('.projectCard h3')?.textContent.includes('Episode renamed'));
 click('Duplicate');await until(()=>doc().querySelectorAll('.projectCard').length===2);
 click('Trash',doc().querySelector('.projectCard'));await until(()=>doc().querySelectorAll('.projectCard').length===1);
 const nameField=doc().querySelector('[aria-label="New project name"]');await until(()=>doc().activeElement===nameField);fill('[aria-label="New project name"]','Project after trash');assert.equal(nameField.value,'Project after trash');click('+ New project');await until(()=>!doc().querySelector('.projectHome'));click('Projects');await until(()=>doc().querySelectorAll('.projectCard').length===2);
 click('Trash',doc().querySelector('.homeFilters'));await until(()=>doc().querySelector('.projectCardActions button')?.textContent==='Restore project');click('Restore project');await until(()=>doc().querySelectorAll('.projectCard').length===0);click('Your projects');await until(()=>doc().querySelectorAll('.projectCard').length===3);
 const copy=[...doc().querySelectorAll('.projectCard')].find(c=>c.textContent.includes('— copy'));click('Trash',copy);await until(()=>doc().querySelectorAll('.projectCard').length===2);click('Trash',doc().querySelector('.homeFilters'));await until(()=>doc().querySelector('[aria-label="Select all trashed projects"]'));doc().querySelector('[aria-label="Select all trashed projects"]').click();await sleep(25);w.confirm=()=>false;click('Delete permanently');await sleep(30);assert.equal(doc().querySelectorAll('.projectCard').length,1);w.confirm=()=>true;click('Delete permanently');await until(()=>doc().querySelectorAll('.projectCard').length===0);click('Your projects');await until(()=>doc().querySelectorAll('.projectCard').length===2);
 click('Help & About');await until(()=>doc().querySelector('dialog[open]'));click('About',doc().querySelector('dialog'));await sleep(30);assert(doc().querySelector('dialog').textContent.includes('Build 64'));click('Account',doc().querySelector('dialog'));await sleep(20);
 assert(doc().querySelector('[aria-label="License key"]'),'Account must offer license activation');
 const activate=[...doc().querySelector('dialog').querySelectorAll('button')].find(b=>b.textContent==='Activate');
 assert(activate?.disabled,'An empty key cannot be activated');
 assert(doc().querySelector('dialog [role="status"]').textContent.includes('No active license'));
 click('Done',doc().querySelector('dialog'));
 dom.window.close();w=await boot();await until(()=>doc().querySelectorAll('.projectCard').length===2);assert(doc().querySelector('.projectHome'),'Startup must not jump into editor');
 [...doc().querySelectorAll('.projectCard')].find(card=>card.querySelector('h3')?.textContent.includes('Episode renamed')).querySelector('.projectCover').click();await until(()=>!doc().querySelector('.projectHome'));assert(doc().querySelector('.saveBadge').textContent.includes('Episode renamed'));assert.deepEqual(errors,[]);
 }finally{dom?.window.close();}
});
