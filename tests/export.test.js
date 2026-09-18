import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createApi} from '../server.mjs';
const require=createRequire(import.meta.url),binary=process.env.RANCUT_FFMPEG||require('ffmpeg-static');
test('actual MP4 export accepts fades and encodes mixed audio', {skip:!binary||!existsSync(binary)},async()=>{
 const api=await createApi({ffmpeg:binary}),server=createServer(api.middleware);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/api/`;
 const post=async(path,data,binaryData=false)=>{const r=await fetch(base+path,{method:'POST',headers:{'X-RanCut':'1','Content-Type':binaryData?'application/octet-stream':'application/json'},body:binaryData?data:JSON.stringify(data)});const j=await r.json();assert.equal(r.status,200,JSON.stringify(j));return j;};
 try{
 const wav=spawnSync(binary,['-v','error','-f','lavfi','-i','sine=frequency=1000:duration=1','-f','wav','pipe:1']);assert.equal(wav.status,0);
 const png=spawnSync(binary,['-v','error','-f','lavfi','-i','color=c=green:s=64x64','-frames:v','1','-threads','1','-f','image2pipe','-c:v','png','pipe:1']);assert.equal(png.status,0);
 const media=await post('media',wav.stdout,true),job=await post('export',{width:64,height:64,fps:30,frames:6,quality:'Good',audio:[{serverId:media.id,start:0,sourceIn:0,duration:.1,gainDb:0,fadeMs:5},{serverId:media.id,start:.1,sourceIn:.1,duration:.1,gainDb:-3,fadeMs:20}]});
 for(let i=0;i<6;i++)await post(`export/${job.id}/frame?index=${i}`,png.stdout,true);
 await post(`export/${job.id}/finish`,{});let result;
 for(let i=0;i<100;i++){result=await(await fetch(base+`export/${job.id}/status`)).json();if(['complete','failed'].includes(result.state))break;await new Promise(r=>setTimeout(r,50));}
 assert.equal(result.state,'complete',result.error);const output=await fetch(base+`export/${job.id}/download`);assert.equal(output.headers.get('content-type'),'video/mp4');const bytes=Buffer.from(await output.arrayBuffer());assert(bytes.length>1000);
 const decoded=spawnSync(binary,['-v','error','-i','pipe:0','-map','0:a:0','-f','f32le','pipe:1'],{input:bytes});assert.equal(decoded.status,0,decoded.stderr.toString());assert(decoded.stdout.length>0);
 }finally{await new Promise(r=>server.close(r));await api.cleanup();}
});
