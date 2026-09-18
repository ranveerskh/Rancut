import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {mkdtemp,rm,stat} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createApi} from '../server.mjs';

const require=createRequire(import.meta.url),binary=process.env.RANCUT_FFMPEG||require('ffmpeg-static');

test('direct H264 stream export accepts hardware-style encoded input', {skip:!binary||!existsSync(binary)}, async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'rancut-h264-test-'));
 const api=await createApi({ffmpeg:binary,exportDir:path.join(temp,'exports'),settingsPath:path.join(temp,'settings.json')});
 const server=createServer(api.middleware);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}/api/`;
 const post=async(path,data,type='application/json')=>{const r=await fetch(base+path,{method:'POST',headers:{'X-RanCut':'1','Content-Type':type},body:type==='application/json'?JSON.stringify(data):data});const j=await r.json();assert.equal(r.status,200,JSON.stringify(j));return j;};
 try{
  const h264=spawnSync(binary,['-v','error','-f','lavfi','-i','testsrc=size=64x64:rate=30','-frames:v','2','-c:v','libx264','-preset','ultrafast','-f','h264','pipe:1']);
  assert.equal(h264.status,0,h264.stderr.toString());
  const job=await post('export',{width:64,height:64,fps:30,frames:2,frameFormat:'h264',quality:'High',audio:[]});
  const encoded=await post(`export/${job.id}/encoded`,h264.stdout,'video/h264');assert.equal(encoded.received,2);
  await post(`export/${job.id}/finish`,{});
  let state;for(let i=0;i<100;i++){state=await (await fetch(base+`export/${job.id}/status`)).json();if(['complete','failed'].includes(state.state))break;await new Promise(r=>setTimeout(r,50));}
  assert.equal(state.state,'complete',state.error);assert((await stat(state.savedPath)).size>500);
 }finally{await new Promise(r=>server.close(r));await api.cleanup();await rm(temp,{recursive:true,force:true});}
});
