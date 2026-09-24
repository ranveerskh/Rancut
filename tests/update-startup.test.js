import test from 'node:test';
import assert from 'node:assert/strict';
import {startUpdateCheck} from '../src/update-startup.js';

const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

test('startup subscribes first, checks immediately, and ignores stale cached status',async()=>{
 let statusResolve,listener,checks=0,unsubscribed=false;
 const updates=[];
 const api={
  onUpdate(fn){listener=fn;return()=>{unsubscribed=true;};},
  updateStatus(){return new Promise(resolve=>{statusResolve=resolve;});},
  checkUpdates(){checks++;return Promise.resolve({checked:true,available:true,latest:'0.6.4'});},
 };
 let state=null;
 const stop=startUpdateCheck(api,update=>{state=typeof update==='function'?update(state):update;updates.push(state);});
 assert.equal(typeof listener,'function');
 assert.equal(checks,1);
 await tick();
 assert.equal(state.latest,'0.6.4');
 listener({checked:true,available:true,latest:'0.6.5'});
 statusResolve({checked:false,available:false,current:'0.6.4'});
 await tick();
 assert.equal(state.latest,'0.6.5');
 stop();
 listener({checked:true,available:true,latest:'0.6.6'});
 assert.equal(state.latest,'0.6.5');
 assert.equal(unsubscribed,true);
 assert(updates.length>=2);
});
