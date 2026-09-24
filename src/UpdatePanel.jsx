import React,{useEffect,useState} from 'react';

export default function UpdatePanel(){
 const [info,setInfo]=useState({phase:'idle',checked:false}),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{
  let mounted=true;
  const unsubscribe=window.rancut?.onUpdate?.(next=>{if(mounted)setInfo(next);});
  window.rancut?.updateStatus?.().then(next=>{if(mounted)setInfo(current=>current.checked&&!next.checked?current:next);}).catch(error=>{if(mounted)setMessage(error.message);});
  return()=>{mounted=false;unsubscribe?.();};
 },[]);
 async function run(fn){setBusy(true);setMessage('');try{if(!fn)throw Error('Updates are available in the desktop app.');const result=await fn();if(result&&typeof result==='object')setInfo(result);}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 const current=info.current||'0.6.3';
 const upToDate=!!info.checked&&!info.available&&!info.blocked;
 const noRelease=upToDate&&info.releaseState==='none';
 const statusText=message||info.error||(upToDate?`RanCut ${current} is current.`:info.phase==='idle'&&!info.checked?'Checking for the latest installer…':'');
 return <>
  <div className="helpEyebrow">UPDATES</div>
  <h3>Keep RanCut current</h3>
  <p>Installed: {current}{info.latest&&` · Latest: ${info.latest}`}</p>
  <p className="helpMuted">Automatic update check: at startup and daily while the app is open.</p>
  <button disabled={busy||info.phase==='downloading'} onClick={()=>run(window.rancut?.checkUpdates)}>Check for updates</button>
  {noRelease&&<div className="helpCallout"><b>No newer installer release found</b><span>A GitHub code push or Actions build alone does not publish an in-app update. Publish a higher-version GitHub Release with its RanCut Setup.exe and release-metadata.json assets.</span></div>}
  {upToDate&&!noRelease&&<div className="helpCallout"><b>You’re up to date</b><span>RanCut {current} is the newest published installer.</span></div>}
  {info.available&&<div className="helpCallout"><b>RanCut {info.latest}</b><span>{info.release?.notes||'A newer installer is ready.'}</span><span>{Math.round((info.release?.size||0)/1048576)} MB{info.source==='github'?' · GitHub release':' · RanCut platform'}</span>{info.phase!=='downloading'&&info.phase!=='ready'&&<button disabled={busy} onClick={()=>run(window.rancut?.openUpdate)}>Download update</button>}</div>}
  {info.phase==='downloading'&&<><progress max={info.total||1} value={info.received||0}/><p>{Math.floor(100*(info.received||0)/(info.total||1))}% downloaded</p><button onClick={()=>run(window.rancut?.cancelUpdate)}>Cancel download</button></>}
  {info.phase==='ready'&&<div className="helpCallout"><b>Installer verified</b><span>Saved in Downloads / RanCut Updates. Save your work before installing; Windows may request permission.</span><button disabled={busy} onClick={()=>run(window.rancut?.installUpdate)}>Install now</button></div>}
  {(info.warning||info.blocked)&&<p>{info.blocked?'Update required to use Auto Edit.':`Required update: ${info.daysRemaining} days remaining.`} Projects, saving and exports stay available.</p>}
  <p role="status">{statusText}</p>
 </>;
}
