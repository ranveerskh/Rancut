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

test('JPEG frame export accepts compressed browser frames', {skip:!binary||!existsSync(binary)}, async()=>{
  const temp=await mkdtemp(path.join(os.tmpdir(),'rancut-jpeg-test-'));
  const api=await createApi({ffmpeg:binary,exportDir:path.join(temp,'exports'),settingsPath:path.join(temp,'settings.json')});
  const server=createServer(api.middleware);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}/api/`;
  const post=async(path,data,binaryData=false)=>{const r=await fetch(base+path,{method:'POST',headers:{'X-RanCut':'1','Content-Type':binaryData?'application/octet-stream':'application/json'},body:binaryData?data:JSON.stringify(data)});const j=await r.json();assert.equal(r.status,200,JSON.stringify(j));return j;};
  try{
    const jpg=spawnSync(binary,['-v','error','-f','lavfi','-i','color=c=red:s=64x64','-frames:v','1','-f','image2pipe','-c:v','mjpeg','pipe:1']);
    assert.equal(jpg.status,0,jpg.stderr.toString());
    const job=await post('export',{width:64,height:64,fps:30,frames:6,frameFormat:'jpeg',quality:'High',audio:[]});
    await post(`export/${job.id}/frame?index=0`,jpg.stdout,true);await post(`export/${job.id}/frame?index=1`,jpg.stdout,true);
    const packet=Buffer.concat(Array.from({length:4},()=>{const header=Buffer.alloc(4);header.writeUInt32BE(jpg.stdout.length);return Buffer.concat([header,jpg.stdout]);}));
    const batch=await post(`export/${job.id}/frame-batch?start=2&count=4`,packet,true);assert.equal(batch.received,6);
    await post(`export/${job.id}/finish`,{});
    let state;for(let i=0;i<100;i++){state=await (await fetch(base+`export/${job.id}/status`)).json();if(['complete','failed'].includes(state.state))break;await new Promise(r=>setTimeout(r,50));}
    assert.equal(state.state,'complete',state.error);assert((await stat(state.savedPath)).size>500);
  }finally{await new Promise(r=>server.close(r));await api.cleanup();await rm(temp,{recursive:true,force:true});}
});
