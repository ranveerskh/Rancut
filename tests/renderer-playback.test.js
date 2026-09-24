import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../src/renderer.js';

test('pause invalidates a media load that has not started playback yet',async()=>{
 const oldDocument=globalThis.document,players=[];
 globalThis.document={createElement(){
  const listeners=new Map();
  const el={paused:true,currentTime:0,readyState:0,playCalls:0,addEventListener(name,fn){const set=listeners.get(name)||new Set();set.add(fn);listeners.set(name,set);},removeEventListener(name,fn){listeners.get(name)?.delete(fn);},pause(){this.paused=true;},load(){setTimeout(()=>{this.readyState=2;for(const fn of [...(listeners.get('loadeddata')||[])])fn();},10);},play(){this.playCalls++;this.paused=false;return Promise.resolve();}};
  players.push(el);return el;
 }};
 try{
  const renderer=Object.create(Renderer.prototype);renderer.pool=new Map();renderer.images=new Map();renderer.audio=null;renderer.playEpoch=0;
  const pending=renderer.source({id:'clip',trackId:'V1',start:0,sourceIn:0,duration:5,fx:{}},{type:'video',url:'video.mp4',duration:5},1,true,false,false,renderer.playEpoch);
  renderer.pause();
  assert.equal(await pending,null);
  assert.equal(players[0].playCalls,0);
  assert.equal(players[0].paused,true);
 }finally{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
});
