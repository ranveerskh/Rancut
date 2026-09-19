const cache=new Map();
export function wavBytes(samples,rate=24000){
 const b=new ArrayBuffer(44+samples.length*2),v=new DataView(b);const text=(offset,s)=>[...s].forEach((c,i)=>v.setUint8(offset+i,c.charCodeAt(0)));
 text(0,'RIFF');v.setUint32(4,b.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,samples.length*2,true);
 samples.forEach((n,i)=>v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,n))*32767),true));return new Uint8Array(b);
}
export function synthesizedSound(kind){
 const rate=24000,samples=new Float32Array(rate/2);let seed=4321,low=0;
 for(let i=0;i<samples.length;i++){
  const u=i/(samples.length-1),t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/4294967296*2-1;low=low*.86+noise*.14;
  const e=Math.sin(Math.PI*u)**2;
  samples[i]=kind==='paper'?(noise-low)*e*(.25+.55*Math.sin(t*86)**8):kind==='shutter'?noise*Math.exp(-Math.abs(u-.5)*40)*.7:kind==='glitch'?(Math.sign(Math.sin(t*2700))+noise)*e*(Math.sin(t*180)>0?.2:.02):low*e*1.8;
 }return wavBytes(samples,rate);
}
export function soundBytes(sound){
 if(!sound.data)return synthesizedSound(sound.kind);
 const bytes=Uint8Array.from(atob(sound.data),c=>c.charCodeAt(0));if(bytes.length<44)throw Error('Invalid embedded WAV.');
 const v=new DataView(bytes.buffer),tag=(a,b)=>String.fromCharCode(...bytes.slice(a,b));
 if(tag(0,4)!=='RIFF'||tag(8,12)!=='WAVE'||tag(36,40)!=='data'||v.getUint16(20,true)!==1||v.getUint16(22,true)!==1||v.getUint16(34,true)!==16||v.getUint32(40,true)!==bytes.length-44)throw Error('Invalid embedded PCM WAV.');
 const rate=v.getUint32(24,true),duration=(bytes.length-44)/2/rate;
 if(rate<8000||rate>96000||Math.abs(duration-sound.duration)>.002)throw Error('Embedded sound duration mismatch.');return bytes;
}
export function soundRuntime(meta){
 const key=JSON.stringify(meta.sound);let m=cache.get(key);if(!m){const bytes=soundBytes(meta.sound),v=new DataView(bytes.buffer),rate=v.getUint32(24,true),peaks=[];for(let i=44;i<bytes.length;i+=Math.round(rate*.005)*2){let lo=0,hi=0;for(let j=i;j<Math.min(bytes.length,i+Math.round(rate*.005)*2);j+=2){const x=v.getInt16(j,true)/32768;lo=Math.min(lo,x);hi=Math.max(hi,x);}peaks.push(lo,hi);}const file=new Blob([bytes],{type:'audio/wav'});m={file,url:URL.createObjectURL(file),peaks,peakStep:.005,audioState:'ready'};cache.set(key,m);}return {...meta,...m};
}
export function disposeSounds(){for(const m of cache.values())URL.revokeObjectURL(m.url);cache.clear();}
export async function importSound(file){
 if(file.size>10*1024*1024)throw Error('Choose an audio file under 10 MB and 5 seconds.');
 const ctx=new AudioContext();try{const audio=await ctx.decodeAudioData(await file.arrayBuffer());if(audio.duration>5||audio.duration<=0)throw Error('Sound must be 5 seconds or shorter.');const mono=new Float32Array(audio.length);for(let channel=0;channel<audio.numberOfChannels;channel++){const data=audio.getChannelData(channel);for(let i=0;i<mono.length;i++)mono[i]+=data[i]/audio.numberOfChannels;}const bytes=wavBytes(mono,audio.sampleRate);let raw='';for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));return {name:file.name.slice(0,80),duration:audio.duration,data:btoa(raw)};}finally{await ctx.close();}
}
