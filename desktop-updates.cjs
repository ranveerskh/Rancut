const fs=require('node:fs/promises');
const path=require('node:path');
const {createReadStream}=require('node:fs');
const {createHash}=require('node:crypto');
const {validateRelease,policy}=require('./update-policy.cjs');

module.exports=function createUpdater({version,userData,downloads,endpoint,notify=()=>{},fetchImpl=fetch}){
 const cache=path.join(userData,'update-policy.json');let release=null,required=null,lastClock=0,controller=null,verified=null;
 let state={phase:'idle',received:0,total:0,error:''};let loaded=false;
 const emit=patch=>{state={...state,...patch};notify(snapshot());};
 function snapshot(){const now=Math.max(Date.now(),lastClock);return {...state,current:version,latest:release?.version,release,...policy(version,release,now),blocked:policy(version,required,now).blocked,warning:policy(version,required,now).warning,daysRemaining:policy(version,required,now).daysRemaining,requiredVersion:required?.version};}
 async function init(){if(loaded)return;loaded=true;try{const saved=JSON.parse(await fs.readFile(cache,'utf8'));release=saved.release?validateRelease(saved.release):null;required=saved.required?validateRelease(saved.required):null;lastClock=Number(saved.lastClock)||0;}catch{} }
 async function save(){lastClock=Math.max(lastClock,Date.now());await fs.mkdir(userData,{recursive:true});const temp=cache+'.tmp';await fs.writeFile(temp,JSON.stringify({release,required,lastClock}));await fs.rename(temp,cache);}
 async function check(){await init();try{
  const res=await fetchImpl(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'public_release',appVersion:version}),signal:AbortSignal.timeout(12000)});
  const body=await res.json();if(!res.ok||body.ok!==true)throw Error(body.message||'Update service unavailable.');
  if(body.release){release=validateRelease(body.release);required=body.requiredRelease?validateRelease(body.requiredRelease):null;await save();emit({error:''});}
  else emit({error:'No installer published yet. Release Manager setup is pending.'});
 }catch(e){emit({error:'Update connection pending: '+e.message});}return snapshot();}
 async function status(){await init();return snapshot();}
 async function assertAllowed(){await init();await save();if(snapshot().blocked)throw Error('This version is over 30 days behind a required update. Download the update to use Auto Edit. Your projects and exports remain available.');return true;}
 async function download(){await init();if(controller)throw Error('Download already running.');if(!release||!snapshot().available)throw Error('No newer installer is ready.');
  const target=validateRelease(release);controller=new AbortController();const active=controller;const timeout=setTimeout(()=>active.abort(),30*60*1000);
  const directory=path.join(downloads,'RanCut Updates');const final=path.join(directory,`RanCut-${target.version}-Setup.exe`),part=final+'.partial';let file;
  verified=null;emit({phase:'downloading',received:0,total:target.size,error:''});
  try{await fs.mkdir(directory,{recursive:true});
   // Fetch only a main-process validated URL. Redirects may go to GitHub's asset CDN.
   let url=target.downloadUrl,res;
   for(let i=0;i<6;i++){res=await fetchImpl(url,{signal:active.signal,redirect:'manual'});if(![301,302,303,307,308].includes(res.status))break;
    const next=new URL(res.headers.get('location'),url);if(next.protocol!=='https:'||next.username||next.password||!['github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(next.hostname))throw Error('Untrusted installer redirect.');await res.body?.cancel();url=next.href;}
   if(!res.ok||!res.body)throw Error('Installer download failed.');
   file=await fs.open(part,'w');const hash=createHash('sha256');let bytes=0,head=Buffer.alloc(0),lastProgress=0;
   for await(const chunk of res.body){if(active.signal.aborted)throw Error('Download cancelled.');const data=Buffer.from(chunk);if(head.length<2)head=Buffer.concat([head,data]).subarray(0,2);bytes+=data.length;if(bytes>target.size)throw Error('Installer size mismatch.');hash.update(data);let offset=0;while(offset<data.length){const r=await file.write(data,offset,data.length-offset);offset+=r.bytesWritten;}if(Date.now()-lastProgress>100){emit({received:bytes});lastProgress=Date.now();}}
   await file.close();file=null;if(bytes!==target.size||hash.digest('hex')!==target.sha256||head.toString('ascii')!=='MZ')throw Error('Installer verification failed. Retry the download.');
   await fs.rename(part,final);verified={path:final,release:target};emit({phase:'ready',received:bytes,error:''});return snapshot();
  }catch(e){await file?.close().catch(()=>{});await fs.unlink(part).catch(()=>{});emit({phase:active.signal.aborted?'cancelled':'error',error:active.signal.aborted?'Download cancelled.':e.message});throw Error(state.error);}
  finally{clearTimeout(timeout);controller=null;}
 }
 async function installer(){
  if(!verified)throw Error('Download and verify the installer first.');
  const hash=createHash('sha256');let size=0;
  for await(const data of createReadStream(verified.path)){size+=data.length;hash.update(data);}
  if(size!==verified.release.size||hash.digest('hex')!==verified.release.sha256)throw Error('Installer changed after download. Download again.');
  return verified.path;
 }
 return {init,check,status,download,installer,assertAllowed,cancel:()=>controller?.abort()};
};
