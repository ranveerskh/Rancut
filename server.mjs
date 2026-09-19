import {serveMedia,proxyArgs} from './src/media-service.js';
import {outputStore} from './src/output-store.js';
import {audioFilter} from './src/audio-filter.js';
import {spawn} from 'node:child_process';
import {createReadStream,createWriteStream,existsSync} from 'node:fs';
import {mkdtemp,rm,writeFile,stat,rename} from 'node:fs/promises';
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
export async function createApi({ffmpeg,exportDir,settingsPath}={}){
 ffmpeg=await resolveFfmpeg(ffmpeg);const encoderInfo=await detectEncoders(ffmpeg);
 const output=await outputStore({defaultDirectory:exportDir||path.join(os.homedir(),'Videos','RanCut Exports'),settingsPath:settingsPath||path.join(os.homedir(),'.rancut','settings.json')});
 const root=await mkdtemp(path.join(os.tmpdir(),'rancut-'));const files=new Map(),jobs=new Map();const children=new Set();
 const start=(args)=>{if(!ffmpeg)throw Error('FFmpeg missing. Run npm install or use the Windows package.');const c=spawn(ffmpeg,args,{windowsHide:true});children.add(c);c.once('close',()=>children.delete(c));c.err='';c.stderr.on('data',b=>{c.err=(c.err+b.toString()).slice(-5000);});c.done=new Promise((resolve,reject)=>{c.once('error',reject);c.once('close',code=>code===0?resolve():reject(Error(c.err||'FFmpeg stopped.')));});c.done.catch(()=>{});c.stdin.on('error',()=>{});return c;};
 async function analyse(file){const c=start(['-hide_banner','-v','error','-i',file.path,'-vn','-ac','2','-ar','8000','-f','f32le','-']);let pending=Buffer.alloc(0),count=0,winCount=0,sumL=0,sumR=0,lo=0,hi=0;const peaks=[],levels=[];
  for await(const chunk of c.stdout){const buf=Buffer.concat([pending,chunk]);const length=buf.length-buf.length%8;for(let i=0;i<length;i+=8){const l=buf.readFloatLE(i),r=buf.readFloatLE(i+4);lo=Math.min(lo,l,r);hi=Math.max(hi,l,r);sumL+=l*l;sumR+=r*r;count++;winCount++;if(count===40){peaks.push(+lo.toFixed(4),+hi.toFixed(4));lo=hi=0;count=0;}if(winCount===400){levels.push(Math.max(-96,10*Math.log10(Math.max(sumL,sumR)/winCount+1e-12)));sumL=sumR=winCount=0;}}pending=buf.subarray(length);}
  await c.done;if(count)peaks.push(lo,hi);if(winCount)levels.push(Math.max(-96,10*Math.log10(Math.max(sumL,sumR)/winCount+1e-12)));if(!peaks.length)throw Error('No audio samples.');return {peaks,levels,peakStep:.005,windowSec:.05};}
 const proxyJobs=new Map();let shuttingDown=false;let proxyTail=Promise.resolve();
 const registerLocalFile=async(filePath)=>{const info=await stat(filePath);if(!info.isFile())throw Error('Not a media file.');const id=randomUUID();files.set(id,{path:filePath,size:info.size});return {id,size:info.size,lastModified:info.mtimeMs,url:'/api/source/'+id};};
 const middleware=async(req,res,next=()=>json(res,404,{error:'Not found'}))=>{
  if(!req.url.startsWith('/api/'))return next();
  try{
   const host=req.headers.host||'';if(!/^(localhost|127\.0\.0\.1):\d+$/.test(host))return json(res,403,{error:'Local access only.'});
   if(req.headers.origin&&req.headers.origin!==`http://${host}`)return json(res,403,{error:'Origin not allowed.'});
   if(req.method==='POST'&&req.headers['x-rancut']!=='1')return json(res,403,{error:'Missing local request header.'});
   const u=new URL(req.url,`http://${host}`),parts=u.pathname.split('/').filter(Boolean);
   if(['GET','HEAD'].includes(req.method)&&parts[1]==='source'){
    const file=files.get(parts[2]);if(!file)throw Error('Media not registered.');const ext=path.extname(file.path).toLowerCase(),type=({'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mov':'video/quicktime','.mp3':'audio/mpeg','.wav':'audio/wav','.m4a':'audio/mp4','.webm':'video/webm'})[ext]||'video/mp4';return await serveMedia(req,res,file.path,type);
   }
   if(req.method==='POST'&&parts[1]==='proxy'){
    if([...jobs.values()].some(j=>['frames','finishing'].includes(j.state)))throw Error('Wait for export to finish before making proxies.');
    const {id,height}=JSON.parse(await body(req));const file=files.get(id);if(!file)throw Error('Import media first.');if(![720,1080].includes(height))throw Error('Invalid proxy size.');
    const key=id+'-'+height;let proxy=proxyJobs.get(key);if(!proxy||proxy.state==='failed'){proxy={state:'queued',path:path.join(root,key+'.mp4')};proxyJobs.set(key,proxy);
     proxyTail=proxyTail.catch(()=>{}).then(async()=>{if(shuttingDown){proxy.state='failed';return;}proxy.state='working';try{const c=start(proxyArgs(file.path,proxy.path,height));await c.done;proxy.state='ready';}catch(e){proxy.state='failed';proxy.error=e.message;}});}
    return json(res,200,{key,state:proxy.state});
   }
   if(req.method==='GET'&&parts[1]==='proxy'){
    const proxy=proxyJobs.get(parts[2]);if(!proxy)throw Error('Proxy not found.');
    if(parts[3]==='file'){if(proxy.state!=='ready')throw Error('Proxy is not ready.');return await serveMedia(req,res,proxy.path);}
    return json(res,200,{state:proxy.state,error:proxy.error,url:proxy.state==='ready'?'/api/proxy/'+parts[2]+'/file':null});
   }
   if(req.method==='GET'&&parts[1]==='output')return json(res,200,{directory:output.get()});
   if(req.method==='POST'&&parts[1]==='output'){const cfg=JSON.parse(await body(req));if([...jobs.values()].some(j=>['frames','finishing'].includes(j.state)))throw Error('Wait for the current export before changing folder.');return json(res,200,{directory:await output.set(cfg.directory)});}
 if(req.method==='GET'&&parts[1]==='health')return json(res,200,{ffmpeg:!!ffmpeg,version:'0.5.1',encoder:encoderInfo.selected,hardwareEncoders:encoderInfo.hardware,encoderMode:encoderInfo.mode,gpu:encoderInfo.gpu,ffmpegSource:encoderInfo.ffmpegSource});
   if(req.method==='POST'&&parts[1]==='media'){
    const id=randomUUID(),dest=path.join(root,id+'.media');let size=0;const stream=createWriteStream(dest);
    try{req.on('data',b=>{size+=b.length;if(size>MAX_FILE)req.destroy(Error('File exceeds 50 GB.'));});await pipeline(req,stream);}catch(e){await rm(dest,{force:true});throw e;}
    files.set(id,{path:dest,size});return json(res,200,{id});
   }
   if(req.method==='POST'&&parts[1]==='analyse'){
    const {id}=JSON.parse(await body(req));const file=files.get(id);if(!file)throw Error('Media needs to be imported again.');file.analysis??=analyse(file);try{return json(res,200,await file.analysis);}catch(e){file.analysis=null;throw e;}
   }
   if(req.method==='POST'&&parts[1]==='export'&&parts.length===2){
    if([...jobs.values()].some(j=>['frames','finishing'].includes(j.state)))throw Error('An export is already running.');if([...proxyJobs.values()].some(j=>['queued','working'].includes(j.state)))throw Error('Wait for proxy preparation to finish before exporting.');
    const cfg=JSON.parse(await body(req));if(!finite(cfg.width,64,7680)||!finite(cfg.height,64,7680)||cfg.width%2||cfg.height%2||![24,25,30,50,60].includes(cfg.fps)||!Number.isInteger(cfg.frames)||cfg.frames<1||cfg.frames>216000||!['jpeg','rgba','h264'].includes(cfg.frameFormat||'jpeg'))throw Error('Invalid export format.');
    if(!Array.isArray(cfg.audio)||cfg.audio.length>2000)throw Error('Invalid audio timeline.');for(const a of cfg.audio)if(!files.has(a.serverId)||!finite(a.start,0,14400)||!finite(a.sourceIn,0,14400)||!finite(a.duration,.001,14400)||!finite(a.gainDb,-60,12)||!finite(a.fadeMs??5,0,20))throw Error('Missing audio source or invalid timing.');
    const outputDirectory=await output.prepare();const id=randomUUID(),dir=path.join(root,id);await import('node:fs/promises').then(fs=>fs.mkdir(dir));const silent=path.join(dir,'silent.mp4');
    const raw=cfg.frameFormat==='rgba',jpeg=cfg.frameFormat==='jpeg',h264=cfg.frameFormat==='h264';const input=raw?['-f','rawvideo','-pixel_format','rgba','-video_size',`${cfg.width}x${cfg.height}`]:h264?['-f','h264']:['-f','image2pipe','-c:v',jpeg?'mjpeg':'png'];
    const encoder=cfg.encoder==='cpu'?'libx264':(cfg.encoder&&encoderInfo.available.includes(cfg.encoder)?cfg.encoder:encoderInfo.selected);
    const proc=start(['-y','-v','error',...input,'-framerate',String(cfg.fps),'-i','-',...(raw?['-vf','vflip']:[]),...(h264?['-c:v','copy']:videoEncoderArgs(encoder,cfg.quality)),...(h264?[]:['-pix_fmt','yuv420p']),silent]);
    const fileName=`RanCut-${new Date().toISOString().replace(/[:.]/g,'-')}-${id.slice(0,6)}.mp4`;
    const j={id,dir,cfg,silent,proc,outputDirectory,finalPath:path.join(outputDirectory,fileName),partialPath:path.join(outputDirectory,'.'+fileName+'.partial.mp4'),state:'frames',received:0,busy:false,encoded:false,error:null};jobs.set(id,j);proc.done.catch(e=>{if(j.state!=='cancelled'){j.state='failed';j.error=e.message;}});return json(res,200,{id});
   }
   const j=jobs.get(parts[2]);if(parts[1]==='export'&&!j)throw Error('Export not found.');
   if(req.method==='POST'&&parts[3]==='encoded-chunk'){
    const startIndex=Number(u.searchParams.get('start')),count=Number(u.searchParams.get('count'));
    if(j.cfg.frameFormat!=='h264'||j.state!=='frames'||j.busy||startIndex!==j.received||!Number.isInteger(count)||count<1||count>8||j.received+count>j.cfg.frames)throw Error('Unexpected encoded packet.');
    j.busy=true;try{const packet=await body(req,32*1024**2);if(packet.length<4||j.proc.stdin.destroyed)throw Error('Empty packet or stopped encoder.');
     if(!j.proc.stdin.write(packet))await Promise.race([once(j.proc.stdin,'drain'),j.proc.done.then(()=>{throw Error('Encoder stopped.');})]);
     j.received+=count;return json(res,200,{received:j.received});
    }finally{j.busy=false;}
   }
   if(req.method==='POST'&&parts[3]==='encoded'){
    if(j.cfg.frameFormat!=='h264'||j.state!=='frames'||j.busy)throw Error('Unexpected encoded video.');j.busy=true;
    try{let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(j.proc.stdin.destroyed)throw Error('Encoder stopped.');if(!j.proc.stdin.write(chunk))await Promise.race([once(j.proc.stdin,'drain'),j.proc.done.then(()=>{throw Error('Encoder stopped.');})]);}j.proc.stdin.end();await j.proc.done;j.received=j.cfg.frames;j.encoded=true;return json(res,200,{received:j.received,bytes});}finally{j.busy=false;}
   }
   if(req.method==='POST'&&parts[3]==='frame-batch'){
    const startIndex=Number(u.searchParams.get('start')),count=Number(u.searchParams.get('count'));
    if(j.state!=='frames'||j.busy||!Number.isInteger(startIndex)||startIndex!==j.received||!Number.isInteger(count)||count<1||count>8||j.received+count>j.cfg.frames)throw Error('Unexpected frame batch.');j.busy=true;
    try{
     if(j.cfg.frameFormat!=='jpeg')throw Error('Frame batching requires JPEG export.');
     const packet=await body(req,count*24*1024**2+count*4);let offset=0;const frames=[];
     for(let i=0;i<count;i++){if(offset+4>packet.length)throw Error('Invalid frame batch.');const size=packet.readUInt32BE(offset);offset+=4;if(size<4||size>24*1024**2||offset+size>packet.length)throw Error('Invalid frame batch.');const frame=packet.subarray(offset,offset+size);offset+=size;if(frame[0]!==0xff||frame[1]!==0xd8)throw Error('Invalid JPEG frame.');frames.push(frame);}
     if(offset!==packet.length)throw Error('Invalid frame batch.');if(j.proc.stdin.destroyed)throw Error('Encoder stopped.');
     for(const frame of frames)if(!j.proc.stdin.write(frame))await Promise.race([once(j.proc.stdin,'drain'),j.proc.done.then(()=>{throw Error('Encoder stopped.');})]);
     j.received+=frames.length;return json(res,200,{received:j.received});
    }finally{j.busy=false;}
   }
   if(req.method==='POST'&&parts[3]==='frame'){
    if(j.state!=='frames'||j.busy||Number(u.searchParams.get('index'))!==j.received||j.received>=j.cfg.frames)throw Error('Unexpected frame order.');j.busy=true;
    try{const raw=j.cfg.frameFormat==='rgba',jpeg=j.cfg.frameFormat==='jpeg',frame=await body(req,raw?j.cfg.width*j.cfg.height*4:jpeg?24*1024**2:48*1024**2);const valid=raw?frame.length===j.cfg.width*j.cfg.height*4:jpeg?(frame.length>3&&frame[0]===0xff&&frame[1]===0xd8):(frame.length>=24&&frame.subarray(0,8).toString('hex')==='89504e470d0a1a0a'&&frame.readUInt32BE(16)===j.cfg.width&&frame.readUInt32BE(20)===j.cfg.height);if(!valid)throw Error('Invalid frame size.');if(j.proc.stdin.destroyed)throw Error('Encoder stopped.');if(!j.proc.stdin.write(frame))await Promise.race([once(j.proc.stdin,'drain'),j.proc.done.then(()=>{throw Error('Encoder stopped.');})]);j.received++;return json(res,200,{received:j.received});}finally{j.busy=false;}
   }
   if(req.method==='POST'&&parts[3]==='cancel'){j.state='cancelled';await stop(j.proc);await rm(j.partialPath,{force:true});await rm(j.dir,{recursive:true,force:true});return json(res,200,{ok:true});}
   if(req.method==='POST'&&parts[3]==='finish'){
    if(j.state!=='frames'||j.received!==j.cfg.frames)throw Error('Not all frames were received.');j.state='finishing';if(!j.encoded)j.proc.stdin.end();
    (async()=>{try{await j.proc.done;if(j.state==='cancelled')return;const audio=j.cfg.audio,inputs=[...new Set(audio.map(a=>a.serverId))],args=['-y','-v','error','-i',j.silent];for(const id of inputs)args.push('-i',files.get(id).path);let filters=[];
      for(let i=0;i<audio.length;i++){const a=audio[i],idx=inputs.indexOf(a.serverId)+1;filters.push(audioFilter(a,idx,i));}
      if(audio.length){filters.push(audio.map((a,i)=>`[a${i}]`).join('')+`amix=inputs=${audio.length}:normalize=0:dropout_transition=0,alimiter=limit=0.99:level=false:latency=true,apad[out]`);const f=path.join(j.dir,'audio.txt');await writeFile(f,filters.join(';\n'));args.push('-filter_complex_script',f,'-map','0:v:0','-map','[out]','-c:a','aac','-b:a','192k');}
      else args.push('-map','0:v:0');
      j.output=j.partialPath;args.push('-c:v','copy','-t',String(j.cfg.frames/j.cfg.fps),'-movflags','+faststart',j.output);if(j.state==='cancelled')return;j.proc=start(args);await j.proc.done;if(j.state!=='cancelled'){await rename(j.partialPath,j.finalPath);j.output=j.finalPath;j.state='complete';}
    }catch(e){if(j.state!=='cancelled'){j.state='failed';j.error=e.message;await rm(j.partialPath,{force:true});}}})();return json(res,200,{state:j.state});
   }
   if(req.method==='GET'&&parts[3]==='status')return json(res,200,{state:j.state,error:j.error,received:j.received,savedPath:j.state==='complete'?j.finalPath:null,outputDirectory:j.outputDirectory});
   if(req.method==='GET'&&parts[3]==='download'){
    if(j.state!=='complete')throw Error('Export is not ready.');res.setHeader('Content-Type','video/mp4');res.setHeader('Content-Disposition','attachment; filename="RanCut-v0.5.1.mp4"');res.setHeader('Content-Length',(await stat(j.output)).size);await pipeline(createReadStream(j.output),res);return;
   }
   return next();
  }catch(e){if(!res.headersSent)json(res,422,{error:e.message||'Local processing failed.'});else res.destroy();}
 };
 const stop=async c=>{if(!c)return;c.kill();let timer;await Promise.race([c.done.catch(()=>{}),new Promise(r=>{timer=setTimeout(()=>{c.kill('SIGKILL');r();},2000);})]);clearTimeout(timer);};
 return {middleware,registerLocalFile,getOutputDirectory:output.get,setOutputDirectory:output.set,encoderInfo,cleanup:async()=>{shuttingDown=true;for(const j of jobs.values())if(j.state!=='complete')j.state='cancelled';await Promise.allSettled([...children].map(stop));await proxyTail.catch(()=>{});for(const j of jobs.values())if(j.state!=='complete')await rm(j.partialPath,{force:true}).catch(()=>{});await rm(root,{recursive:true,force:true});}};
}

async function resolveFfmpeg(preferred){
 const candidates=[];
 const add=value=>{if(!value)return;value=value.includes('app.asar')?value.replace('app.asar','app.asar.unpacked'):value;if(!candidates.includes(value))candidates.push(value);};
 add(process.env.RANCUT_FFMPEG);add(preferred);try{add(require('ffmpeg-static'));}catch{}
 for(const value of await pathCommands('ffmpeg'))add(value);
 const runnable=[];
 for(const candidate of candidates){if(candidate.includes(path.sep)&&!existsSync(candidate))continue;if(!await canRun(candidate,['-hide_banner','-version']))continue;runnable.push(candidate);if(await hasHardwareEncoder(candidate))return candidate;}
 return runnable[0]||null;
}
async function pathCommands(command){
 try{const tool=process.platform==='win32'?'where':'which',c=spawn(tool,[command],{windowsHide:true});let text='';c.stdout.on('data',b=>{text+=b.toString();});await new Promise((resolve,reject)=>{c.once('error',reject);c.once('close',code=>code===0?resolve():reject(Error('not found')));});return text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);}catch{return [];}
}
async function canRun(command,args=[]){
 try{const c=spawn(command,args,{windowsHide:true});return await new Promise(resolve=>{c.once('error',()=>resolve(false));c.once('close',code=>resolve(code===0));});}catch{return false;}
}
async function hasHardwareEncoder(ffmpeg){
 try{const c=spawn(ffmpeg,['-hide_banner','-encoders'],{windowsHide:true});let text='';c.stdout.on('data',b=>{text+=b.toString();});const ok=await new Promise(resolve=>{c.once('error',()=>resolve(false));c.once('close',code=>resolve(code===0));});if(!ok)return false;const listed=['h264_nvenc','h264_amf','h264_qsv','h264_videotoolbox'].filter(x=>new RegExp('\\b'+x+'\\b').test(text));for(const candidate of listed)if(await canUseEncoder(ffmpeg,candidate))return true;return false;}catch{return false;}
}
async function detectNvidia(){
 const commands=['nvidia-smi'];if(process.platform==='win32')commands.push('C:\\Windows\\System32\\nvidia-smi.exe');
 for(const command of commands){try{const c=spawn(command,['--query-gpu=name,driver_version','--format=csv,noheader,nounits'],{windowsHide:true});let text='',error='';c.stdout.on('data',b=>{text+=b.toString();});c.stderr.on('data',b=>{error+=b.toString();});const code=await new Promise(resolve=>{c.once('error',()=>resolve(-1));c.once('close',resolve);});if(code===0&&text.trim()){const [name,driver]=text.trim().split(/\r?\n/)[0].split(',').map(x=>x.trim());return {present:true,name:name||'NVIDIA GPU',driver:driver||null};}}catch{}}
 return {present:false,name:null,driver:null};
}
async function detectEncoders(ffmpeg){
 const gpu=await detectNvidia();
 if(!ffmpeg)return {selected:'libx264',mode:'cpu',available:['libx264'],hardware:[],gpu,ffmpegSource:null};
 try{
  const c=spawn(ffmpeg,['-hide_banner','-encoders'],{windowsHide:true});let text='';c.stdout.on('data',b=>{text+=b.toString();});await new Promise((resolve,reject)=>{c.once('error',reject);c.once('close',code=>code===0?resolve():reject(Error('encoder probe failed')));});
  const listed=['h264_nvenc','h264_amf','h264_qsv','h264_videotoolbox'].filter(x=>new RegExp('\\b'+x+'\\b').test(text));
  const available=[];for(const candidate of listed)if(await canUseEncoder(ffmpeg,candidate))available.push(candidate);
  const selected=available[0]||'libx264';return {selected,mode:selected==='libx264'?'cpu':'gpu',available:['libx264',...available],hardware:available,gpu,ffmpegSource:ffmpeg};
 }catch{return {selected:'libx264',mode:'cpu',available:['libx264'],hardware:[],gpu,ffmpegSource:ffmpeg};}
}
async function canUseEncoder(ffmpeg,encoder){
 try{const c=spawn(ffmpeg,['-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=black:s=256x256:d=0.1','-frames:v','1','-an','-c:v',encoder,'-pix_fmt','yuv420p','-f','null','-'],{windowsHide:true});let error='';c.stderr.on('data',b=>{error+=b.toString();});await new Promise((resolve,reject)=>{c.once('error',reject);c.once('close',code=>code===0?resolve():reject(Error(error||'encoder unavailable')));});return true;}catch{return false;}
}
function videoEncoderArgs(encoder,quality){
 const cq=quality==='Maximum'?'16':quality==='Good'?'22':'18';
 if(encoder==='libx264')return ['-c:v','libx264','-preset','fast','-crf',cq];
 if(encoder==='h264_nvenc')return ['-c:v','h264_nvenc','-preset','p4','-rc','vbr','-cq',cq,'-b:v','0'];
 if(encoder==='h264_amf')return ['-c:v','h264_amf','-quality','quality','-qp_i',cq,'-qp_p',cq];
 if(encoder==='h264_qsv')return ['-c:v','h264_qsv','-preset','medium','-global_quality',cq];
 if(encoder==='h264_videotoolbox')return ['-c:v','h264_videotoolbox','-q:v',cq];
 return ['-c:v','libx264','-preset','fast','-crf',cq];
}
