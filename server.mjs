import {audioFilter} from './src/audio-filter.js';
import {spawn} from 'node:child_process';
import {createReadStream,createWriteStream,existsSync} from 'node:fs';
import {mkdtemp,rm,writeFile,stat} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const MAX_FILE=50*1024**3;
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
async function body(req,max=4*1024**2){let size=0;const chunks=[];for await(const b of req){size+=b.length;if(size>max)throw Error('Request too large.');chunks.push(b);}return Buffer.concat(chunks);}
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
export async function createApi({ffmpeg,exportDir}={}){
 ffmpeg=ffmpeg||process.env.RANCUT_FFMPEG;try{ffmpeg||=require('ffmpeg-static');}catch{}if(ffmpeg?.includes('app.asar'))ffmpeg=ffmpeg.replace('app.asar','app.asar.unpacked');if(ffmpeg&&!existsSync(ffmpeg))ffmpeg=null;
 const root=await mkdtemp(path.join(os.tmpdir(),'rancut-'));const files=new Map(),jobs=new Map();const children=new Set();
 const start=(args)=>{if(!ffmpeg)throw Error('FFmpeg missing. Run npm install or use the Windows package.');const c=spawn(ffmpeg,args,{windowsHide:true});children.add(c);c.once('close',()=>children.delete(c));c.err='';c.stderr.on('data',b=>{c.err=(c.err+b.toString()).slice(-5000);});c.done=new Promise((resolve,reject)=>{c.once('error',reject);c.once('close',code=>code===0?resolve():reject(Error(c.err||'FFmpeg stopped.')));});c.done.catch(()=>{});return c;};
 async function analyse(file){const c=start(['-hide_banner','-v','error','-i',file.path,'-vn','-ac','2','-ar','8000','-f','f32le','-']);let pending=Buffer.alloc(0),count=0,winCount=0,sumL=0,sumR=0,lo=0,hi=0;const peaks=[],levels=[];
  for await(const chunk of c.stdout){const buf=Buffer.concat([pending,chunk]);const length=buf.length-buf.length%8;for(let i=0;i<length;i+=8){const l=buf.readFloatLE(i),r=buf.readFloatLE(i+4);lo=Math.min(lo,l,r);hi=Math.max(hi,l,r);sumL+=l*l;sumR+=r*r;count++;winCount++;if(count===40){peaks.push(+lo.toFixed(4),+hi.toFixed(4));lo=hi=0;count=0;}if(winCount===400){levels.push(Math.max(-96,10*Math.log10(Math.max(sumL,sumR)/winCount+1e-12)));sumL=sumR=winCount=0;}}pending=buf.subarray(length);}
  await c.done;if(count)peaks.push(lo,hi);if(winCount)levels.push(Math.max(-96,10*Math.log10(Math.max(sumL,sumR)/winCount+1e-12)));if(!peaks.length)throw Error('No audio samples.');return {peaks,levels,peakStep:.005,windowSec:.05};}
 const middleware=async(req,res,next=()=>json(res,404,{error:'Not found'}))=>{
  if(!req.url.startsWith('/api/'))return next();
  try{
   const host=req.headers.host||'';if(!/^(localhost|127\.0\.0\.1):\d+$/.test(host))return json(res,403,{error:'Local access only.'});
   if(req.headers.origin&&req.headers.origin!==`http://${host}`)return json(res,403,{error:'Origin not allowed.'});
   if(req.method==='POST'&&req.headers['x-rancut']!=='1')return json(res,403,{error:'Missing local request header.'});
   const u=new URL(req.url,`http://${host}`),parts=u.pathname.split('/').filter(Boolean);
   if(req.method==='GET'&&parts[1]==='health')return json(res,200,{ffmpeg:!!ffmpeg,version:'0.3.8'});
   if(req.method==='POST'&&parts[1]==='media'){
    const id=randomUUID(),dest=path.join(root,id+'.media');let size=0;const stream=createWriteStream(dest);
    try{req.on('data',b=>{size+=b.length;if(size>MAX_FILE)req.destroy(Error('File exceeds 50 GB.'));});await pipeline(req,stream);}catch(e){await rm(dest,{force:true});throw e;}
    files.set(id,{path:dest,size});return json(res,200,{id});
   }
   if(req.method==='POST'&&parts[1]==='analyse'){
    const {id}=JSON.parse(await body(req));const file=files.get(id);if(!file)throw Error('Media needs to be imported again.');file.analysis??=analyse(file);try{return json(res,200,await file.analysis);}catch(e){file.analysis=null;throw e;}
   }
   if(req.method==='POST'&&parts[1]==='export'&&parts.length===2){
    if([...jobs.values()].some(j=>['frames','finishing'].includes(j.state)))throw Error('An export is already running.');
    const cfg=JSON.parse(await body(req));if(!finite(cfg.width,64,7680)||!finite(cfg.height,64,7680)||cfg.width%2||cfg.height%2||![24,25,30,50,60].includes(cfg.fps)||!Number.isInteger(cfg.frames)||cfg.frames<1||cfg.frames>216000)throw Error('Invalid export format.');
    if(!Array.isArray(cfg.audio)||cfg.audio.length>2000)throw Error('Invalid audio timeline.');for(const a of cfg.audio)if(!files.has(a.serverId)||!finite(a.start,0,14400)||!finite(a.sourceIn,0,14400)||!finite(a.duration,.001,14400)||!finite(a.gainDb,-60,12)||!finite(a.fadeMs??5,0,20))throw Error('Missing audio source or invalid timing.');
    const id=randomUUID(),dir=path.join(root,id);await import('node:fs/promises').then(fs=>fs.mkdir(dir));const silent=path.join(dir,'silent.mp4');
    const proc=start(['-y','-v','error','-f','image2pipe','-framerate',String(cfg.fps),'-c:v','png','-i','-','-an','-c:v','libx264','-preset','fast','-crf',cfg.quality==='Maximum'?'16':cfg.quality==='Good'?'22':'18','-pix_fmt','yuv420p',silent]);
    const j={id,dir,cfg,silent,proc,state:'frames',received:0,busy:false,error:null};jobs.set(id,j);proc.done.catch(e=>{if(j.state!=='cancelled'){j.state='failed';j.error=e.message;}});return json(res,200,{id});
   }
   const j=jobs.get(parts[2]);if(parts[1]==='export'&&!j)throw Error('Export not found.');
   if(req.method==='POST'&&parts[3]==='frame'){
    if(j.state!=='frames'||j.busy||Number(u.searchParams.get('index'))!==j.received||j.received>=j.cfg.frames)throw Error('Unexpected frame order.');j.busy=true;
    try{const png=await body(req,48*1024**2);if(png.length<24||png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||png.readUInt32BE(16)!==j.cfg.width||png.readUInt32BE(20)!==j.cfg.height)throw Error('Invalid frame size.');if(!j.proc.stdin.write(png))await Promise.race([once(j.proc.stdin,'drain'),j.proc.done.then(()=>{throw Error('Encoder stopped.');})]);j.received++;return json(res,200,{received:j.received});}finally{j.busy=false;}
   }
   if(req.method==='POST'&&parts[3]==='cancel'){j.state='cancelled';j.proc?.kill();await j.proc?.done.catch(()=>{});await rm(j.dir,{recursive:true,force:true});return json(res,200,{ok:true});}
   if(req.method==='POST'&&parts[3]==='finish'){
    if(j.state!=='frames'||j.received!==j.cfg.frames)throw Error('Not all frames were received.');j.state='finishing';j.proc.stdin.end();
    (async()=>{try{await j.proc.done;if(j.state==='cancelled')return;const audio=j.cfg.audio,inputs=[...new Set(audio.map(a=>a.serverId))],args=['-y','-v','error','-i',j.silent];for(const id of inputs)args.push('-i',files.get(id).path);let filters=[];
      for(let i=0;i<audio.length;i++){const a=audio[i],idx=inputs.indexOf(a.serverId)+1;filters.push(audioFilter(a,idx,i));}
      if(audio.length){filters.push(audio.map((a,i)=>`[a${i}]`).join('')+`amix=inputs=${audio.length}:normalize=0:dropout_transition=0,alimiter=limit=0.99:level=false:latency=true,apad[out]`);const f=path.join(j.dir,'audio.txt');await writeFile(f,filters.join(';\n'));args.push('-filter_complex_script',f,'-map','0:v:0','-map','[out]','-c:a','aac','-b:a','192k');}
      else args.push('-map','0:v:0');
      j.output=path.join(j.dir,'RanCut-v0.3.8.mp4');args.push('-c:v','copy','-t',String(j.cfg.frames/j.cfg.fps),'-movflags','+faststart',j.output);if(j.state==='cancelled')return;j.proc=start(args);await j.proc.done;if(j.state!=='cancelled')j.state='complete';
    }catch(e){if(j.state!=='cancelled'){j.state='failed';j.error=e.message;}}})();return json(res,200,{state:j.state});
   }
   if(req.method==='GET'&&parts[3]==='status')return json(res,200,{state:j.state,error:j.error,received:j.received});
   if(req.method==='GET'&&parts[3]==='download'){
    if(j.state!=='complete')throw Error('Export is not ready.');res.setHeader('Content-Type','video/mp4');res.setHeader('Content-Disposition','attachment; filename="RanCut-v0.3.8.mp4"');res.setHeader('Content-Length',(await stat(j.output)).size);await pipeline(createReadStream(j.output),res);return;
   }
   return next();
  }catch(e){if(!res.headersSent)json(res,422,{error:e.message||'Local processing failed.'});else res.destroy();}
 };
 return {middleware,cleanup:async()=>{for(const c of children)c.kill();await Promise.allSettled([...children].map(c=>c.done));await rm(root,{recursive:true,force:true});}};
}
