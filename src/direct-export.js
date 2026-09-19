// Finite POST packets work on the local HTTP/1 server. Streaming fetch bodies
// are deliberately avoided: Chromium requires HTTP/2 for those requests.
export async function exportDirectFrames({config,canvas,frames,fps,draw,send,signal,report=()=>{},Encoder=globalThis.VideoEncoder,Frame=globalThis.VideoFrame}){
 let error=null,chunks=[],bytes=0;
 const check=()=>{if(signal?.aborted)throw Error('Export cancelled.');if(error)throw error;};
 const encoder=new Encoder({output(chunk){try{const data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);bytes+=data.length;if(bytes>32*1024*1024)throw Error('Direct export packet exceeded memory limit.');chunks.push(data);}catch(e){error=e;}},error(e){error=e;}});
 const waitFlush=()=>new Promise((resolve,reject)=>{let settled=false;const done=error=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve();};const abort=()=>done(Error('Export cancelled.'));const timer=setTimeout(()=>done(Error('Direct encoder timed out.')),30000);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}try{Promise.resolve(encoder.flush()).then(()=>done(),done);}catch(e){done(e);}});
 let drawMs=0,sendMs=0,count=0;
 try{encoder.configure(config);
  for(let start=0;start<frames;start+=8){check();const length=Math.min(8,frames-start);
   for(let n=start;n<start+length;n++){check();const began=performance.now();await draw(n/fps);drawMs+=performance.now()-began;
    const frame=new Frame(canvas,{timestamp:Math.round(n*1000000/fps),duration:Math.round(1000000/fps)});
    try{encoder.encode(frame,{keyFrame:n===start});}finally{frame.close();}count++;
   }
   await waitFlush();check();if(!bytes)throw Error('Direct encoder returned no data.');
   const began=performance.now();await send(start,length,new Blob(chunks,{type:'application/octet-stream'}));sendMs+=performance.now()-began;chunks=[];bytes=0;
   report({frames:count,draw:drawMs/count,upload:sendMs/count,direct:true});
  }
 }finally{try{encoder.close();}catch{}chunks=[];}
}
