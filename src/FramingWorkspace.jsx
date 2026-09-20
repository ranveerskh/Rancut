import React,{useEffect,useRef,useState} from 'react';
import {defaultFraming,updateBox,boxPose,poseBox,framingShot,shotKinds,limit} from './framing.js';
import {motionAt} from './scene-core.js';

function Control({name,value,min,max,step=.01,onChange}){
 return <label className="frameControl"><span>{name}</span><input aria-label={name} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)}/><input aria-label={name+' value'} type="number" min={min} max={max} step={step} value={Number(value.toFixed(3))} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n))onChange(limit(n,min,max));}}/></label>;
}
// Shared by Auto Edit and Creator Styles. Decoding happens only on frame/load
// changes, never for each slider movement; canvas crops the cached scene.
export default function FramingWorkspace({value,onChange,crop={},onCrop,loadFrame,sourceKey='',mediaKey='',duration=0,initialTime=0,style='Dynamic',disabled=false,onReady}){
 const [mode,setMode]=useState(onCrop?'mask':'base'),[time,setTime]=useState(initialTime),[shownTime,setShownTime]=useState(initialTime);
 const [images,setImages]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[shot,setShot]=useState('Slow zoom in'),[playing,setPlaying]=useState(false),[progress,setProgress]=useState(0);
 const serial=useRef(0),latest=useRef(loadFrame),stage=useRef(),output=useRef(),drag=useRef(null);
 latest.current=loadFrame;
 const f=value||defaultFraming(),box=mode==='close'?f.close:f.base;
 const refresh=async(at=time)=>{const n=++serial.current;setBusy(true);setError('');onReady?.(false);
  try{const result=await latest.current(at);if(!result)throw Error('No preview frame is available.');
   const decode=async url=>{if(!url)throw Error('Missing preview image.');const im=new Image();im.src=url;await im.decode();return im;};
   const scene=await decode(result.scene||result),raw=result.raw?await decode(result.raw):scene;
   if(n===serial.current){setImages({scene,raw});setShownTime(at);onReady?.(true);}
  }catch(e){if(n===serial.current){setError(e.message);setImages(null);}}
  finally{if(n===serial.current)setBusy(false);}
 };
 const selectedTime=useRef(initialTime);selectedTime.current=time;
 useEffect(()=>{setTime(initialTime);selectedTime.current=initialTime;},[mediaKey]);
 useEffect(()=>{const timer=setTimeout(()=>refresh(selectedTime.current),180);return()=>{clearTimeout(timer);serial.current++;};},[sourceKey]);
 useEffect(()=>{if(!playing)return;let id;const begin=performance.now();const tick=now=>{const u=Math.min(1,(now-begin)/4000);setProgress(u);if(u<1)id=requestAnimationFrame(tick);else setPlaying(false);};id=requestAnimationFrame(tick);return()=>cancelAnimationFrame(id);},[playing]);
 const animated=framingShot(f,style==='None'?'Normal':shot,style.toLowerCase()==='simple',4);
 const previewBox=playing||mode==='preview'?poseBox(motionAt({start:0,duration:4,fx:{scene:{...animated,span:4,offset:0}}},progress*4)):box;
 useEffect(()=>{const c=output.current;if(!c||!images)return;const ctx=c.getContext('2d');c.width=960;c.height=540;
  const im=images.scene,b=mode==='mask'?f.base:previewBox;
  ctx.clearRect(0,0,960,540);ctx.drawImage(im,b.x*im.width,b.y*im.height,b.w*im.width,b.w*im.height,0,0,960,540);
 },[images,f,mode,progress,shot,playing,style]);
 const mask={left:0,right:0,top:0,bottom:0,...crop};
 const active=mode==='mask'?{x:mask.left,y:mask.top,w:1-mask.left-mask.right,h:1-mask.top-mask.bottom}:{...box,h:box.w};
 const setBox=b=>onChange(updateBox(f,mode==='close'?'close':'base',b));
 const down=(e,resize=false)=>{if(disabled||busy||!images||mode==='preview')return;e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);const r=stage.current.getBoundingClientRect();drag.current={x:e.clientX,y:e.clientY,r,box:{...active},resize};};
 const move=e=>{const d=drag.current;if(!d)return;const dx=(e.clientX-d.x)/d.r.width,dy=(e.clientY-d.y)/d.r.height;
  if(mode==='mask'){
   const w=d.resize?limit(d.box.w+dx,.06,1-d.box.x):d.box.w,h=d.resize?limit(d.box.h+dy,.06,1-d.box.y):d.box.h;
   const x=d.resize?d.box.x:limit(d.box.x+dx,0,1-w),y=d.resize?d.box.y:limit(d.box.y+dy,0,1-h);
   onCrop?.({left:x,right:1-x-w,top:y,bottom:1-y-h});
  }else setBox(d.resize?{...d.box,w:d.box.w+Math.max(dx,dy)}:{...d.box,x:d.box.x+dx,y:d.box.y+dy});
 };
 const stop=()=>{drag.current=null;};
 const sceneImage=mode==='mask'?images?.raw:images?.scene;
 const updateMask=(k,n)=>{const other={left:'right',right:'left',top:'bottom',bottom:'top'}[k];onCrop({...mask,[k]:limit(n,0,Math.min(.89,.94-mask[other]))});};
 return <section className="framingWorkspace">
 <nav className="frameTabs">{(onCrop?['mask','base','close','preview']:['base','close','preview']).map(k=><button disabled={disabled} type="button" key={k} className={mode===k?'chosen':''} onClick={()=>{setPlaying(false);setMode(k);}}>{({mask:'Clean edges',base:'Normal base · 16:9',close:'Max close-up · 16:9',preview:'Style preview'})[k]}</button>)}</nav>
 <div className="frameMainView">{mode==='preview'?<canvas ref={output} aria-label="Style output preview"/>:<div className="framingStage" ref={stage} style={{aspectRatio:mode==='mask'&&sceneImage?sceneImage.width/sceneImage.height:16/9,'--frame-ratio':mode==='mask'&&sceneImage?sceneImage.width/sceneImage.height:16/9}}>
 {sceneImage?<img draggable={false} src={sceneImage.src} alt="Framing source"/>:<p>{busy?'Loading frame…':'Choose source media to preview.'}</p>}
 {sceneImage&&<>{mode==='close'&&<div className="baseGuide" style={{left:f.base.x*100+'%',top:f.base.y*100+'%',width:f.base.w*100+'%',height:f.base.w*100+'%'}}/>}<div className="frameSelection" aria-label="Drag framing box" style={{left:active.x*100+'%',top:active.y*100+'%',width:active.w*100+'%',height:active.h*100+'%'}} onPointerDown={e=>down(e)} onPointerMove={move} onPointerUp={stop} onLostPointerCapture={stop}><span>{mode==='mask'?'Keep area':mode==='base'?'Normal 16:9':'Maximum 16:9'}</span><button type="button" aria-label="Resize framing box" className="frameResize" onPointerDown={e=>down(e,true)} onPointerMove={move} onPointerUp={stop} onLostPointerCapture={stop}/></div></>}
 </div>}</div>
 {mode!=='preview'&&<div className="frameOutputRow"><canvas ref={output} aria-label="Live framing result"/><small>{mode==='mask'?'Mask removes source edges; the composite refreshes automatically.':'Live output · 16:9. Position the head with some space above. Belly may leave the frame.'}</small></div>}
 <div className="frameSeekRow"><input aria-label="Video frame time" type="range" min="0" max={Math.max(0,duration-.034)} step=".033333" value={time} onChange={e=>setTime(+e.target.value)} onPointerUp={e=>refresh(+e.currentTarget.value)} onKeyUp={e=>refresh(+e.currentTarget.value)}/><input aria-label="Source seconds" type="number" min="0" max={Math.max(0,duration-.034)} value={time} onChange={e=>setTime(limit(+e.target.value||0,0,Math.max(0,duration-.034)))}/><button type="button" disabled={busy||disabled} onClick={()=>refresh()}>Show frame</button><small>Shown {Math.floor(shownTime/60)}:{(shownTime%60).toFixed(2).padStart(5,'0')}</small></div>
 <fieldset disabled={disabled||busy||!images} className="framingSliders">
 {mode==='mask'?['left','right','top','bottom'].map(k=><Control key={k} name={'Mask '+k} min={0} max={.89} value={mask[k]} onChange={n=>updateMask(k,n)}/>):mode!=='preview'?<><Control name="Position X" min={0} max={1-box.w} value={box.x} onChange={x=>setBox({...box,x})}/><Control name="Position Y" min={0} max={1-box.w} value={box.y} onChange={y=>setBox({...box,y})}/><Control name="Zoom %" min={mode==='close'?100/f.base.w:100} max={400} step={1} value={100/box.w} onChange={z=>{const w=100/z;setBox({...box,w,x:box.x+(box.w-w)/2});}}/></>:<><select disabled={style==='None'} aria-label="Preview shot" value={shot} onChange={e=>{setPlaying(false);setShot(e.target.value);setProgress(0);}}>{shotKinds.map(k=><option key={k}>{k}</option>)}</select><Control name="Shot progress" min={0} max={1} value={progress} onChange={n=>{setPlaying(false);setProgress(n);}}/></>}
 <div className="frameActions">{mode==='mask'?<button type="button" onClick={()=>onCrop({left:0,right:0,top:0,bottom:0})}>Reset mask</button>:mode!=='preview'?<><button type="button" onClick={()=>setBox(mode==='close'?f.base:{x:0,y:0,w:1})}>Fit</button><button type="button" onClick={()=>{const im=images.raw,r=im.width/im.height/(16/9),w=Math.min(1,r,1/r);setBox({x:(1-w)/2,y:(1-w)/2,w});}}>Fill</button><button type="button" onClick={()=>setBox(defaultFraming()[mode==='close'?'close':'base'])}>Reset frame</button></>:null}<button type="button" onClick={()=>{setMode('preview');setProgress(0);setPlaying(true);}}>Preview Style</button></div>
 </fieldset>{busy&&<p role="status">Loading selected frame…</p>}{error&&<p className="exportError" role="alert">{error}</p>}
 </section>;
}
