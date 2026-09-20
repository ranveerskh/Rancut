import React,{useEffect,useRef,useState} from 'react';
import FramingWorkspace from './FramingWorkspace.jsx';
import {defaultFraming,validateFraming} from './framing.js';
export default function FramingDialog({initial,duration,loadFrame,onApply,onClose}){
 const ref=useRef(),[value,setValue]=useState(()=>initial||defaultFraming()),[ready,setReady]=useState(false);
 useEffect(()=>{ref.current.showModal();return()=>ref.current?.close();},[]);
 return <dialog ref={ref} className="workflowDialog framingDialog54" onCancel={onClose}>
 <header><div><h2>Set base & maximum close-up</h2><p>Both boxes are 16:9. Keep headroom inside the close-up. Zoom will stay between these framings.</p></div><button onClick={onClose}>×</button></header>
 <FramingWorkspace value={value} onChange={setValue} loadFrame={loadFrame} sourceKey="creator" duration={duration} onReady={setReady}/>
 <footer><button onClick={onClose}>Cancel</button><button disabled={!ready} onClick={()=>onApply(validateFraming(value))}>Save framing</button></footer></dialog>;
}
