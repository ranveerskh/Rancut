import React,{useEffect,useRef,useState} from 'react';
import * as T from './timeline.js';

const clamp01=n=>T.clamp(n,0,1);
export default function FrameDialog({kind='crop',image,initial,onApply,onClose}){
 const ref=useRef(),stage=useRef();
 const base=kind==='crop'?{left:0,right:0,top:0,bottom:0}:{x:.25,y:.08,width:.5,height:.84,headroom:.08};
 const [value,setValue]=useState({...base,...initial}),[error,setError]=useState('');
 useEffect(()=>{ref.current.showModal();return()=>ref.current?.close();},[]);
 const update=(key,n)=>setValue(v=>({...v,[key]:clamp01(Number(n)||0)}));
 const pointer=e=>{if(e.button!==0)return;const box=stage.current.getBoundingClientRect(),sx=(e.clientX-box.left)/box.width,sy=(e.clientY-box.top)/box.height,start={...value};
  const move=ev=>{const x=clamp01((ev.clientX-box.left)/box.width),y=clamp01((ev.clientY-box.top)/box.height);if(kind==='crop'){setValue({...start,left:Math.min(sx,x),right:1-Math.max(sx,x),top:Math.min(sy,y),bottom:1-Math.max(sy,y)});}else{setValue({...start,x:Math.min(sx,x),y:Math.min(sy,y),width:Math.max(.05,Math.abs(x-sx)),height:Math.max(.05,Math.abs(y-sy))});}};
  const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});};
 const apply=()=>{try{if(kind==='crop'&&(value.left+value.right>=.95||value.top+value.bottom>=.95))throw Error('Keep some visible picture area.');if(kind==='subject'&&(value.x+value.width>1||value.y+value.height>1))throw Error('Keep the complete subject box inside the frame.');onApply(value);}catch(e){setError(e.message);}};
 const box=kind==='crop'?{left:value.left,top:value.top,width:1-value.left-value.right,height:1-value.top-value.bottom}:{left:value.x,top:value.y,width:value.width,height:value.height};
 return <dialog className="workflowDialog frameDialog" ref={ref} onCancel={onClose}><header><div><h2>{kind==='crop'?'Crop picture':'Protect person framing'}</h2><p>{kind==='crop'?'Drag a box around the area to keep.':'Drag a box around the person/body you never want the automated Style to crop.'}</p></div><button onClick={onClose}>×</button></header><div className="workflowBody"><div ref={stage} className="frameStage" onPointerDown={pointer}>{image?<img src={image} alt="Current video frame"/>:<div className="frameFallback">Preview frame unavailable — use the numbers below.</div>}<div className="frameBox" style={{left:(box.left*100)+'%',top:(box.top*100)+'%',width:(box.width*100)+'%',height:(box.height*100)+'%'}}/></div><small>{kind==='subject'?'Leave a little space above the head. Styles will stay conservative; review every strong zoom.':'The cropped edges become transparent, so your background remains visible.'}</small><div className="frameNumbers">{(kind==='crop'?['left','right','top','bottom']:['x','y','width','height','headroom']).map(k=><label key={k}>{k}<input type="number" min="0" max="1" step=".01" value={value[k]} onChange={e=>update(k,e.target.value)}/></label>)}</div>{error&&<p className="exportError">{error}</p>}</div><footer><button onClick={onClose}>Cancel</button><button className="primary" onClick={apply}>{kind==='crop'?'Apply crop':'Use protected framing'}</button></footer></dialog>;
}
