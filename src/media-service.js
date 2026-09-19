import {stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
export async function serveMedia(req,res,file,type='video/mp4'){
 const {size}=await stat(file);res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Type',type);res.setHeader('Cache-Control','no-store');
 let start=0,end=size-1;
 if(req.headers.range){const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
  if(!match){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
  start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),size-1):size-1;
  if(!Number.isSafeInteger(start)||start>end){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
  res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);
 }
 res.setHeader('Content-Length',Math.max(0,end-start+1));
 if(req.method==='HEAD'){res.end();return;}await pipeline(createReadStream(file,{start,end}),res);
}
export function proxyArgs(source,target,height){
 if(![720,1080].includes(height))throw Error('Choose 720p or 1080p proxy.');
 return ['-y','-v','error','-threads','2','-i',source,'-map','0:v:0','-an','-vf',`scale=w=-2:h='min(${height},ih)':flags=fast_bilinear`,'-c:v','libx264','-preset','ultrafast','-crf','23','-pix_fmt','yuv420p','-threads','2','-movflags','+faststart',target];
}
