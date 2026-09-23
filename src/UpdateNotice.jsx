import React,{useEffect,useState} from 'react';
export default function UpdateNotice({onOpen}){
 const [info,setInfo]=useState(null),[dismissed,setDismissed]=useState('');
 useEffect(()=>{window.rancut?.updateStatus?.().then(setInfo).catch(()=>{});return window.rancut?.onUpdate?.(setInfo);},[]);
 if(!info?.available&&!info?.blocked)return null;
 const noticeKey=`${info.latest}:${!!info.warning}:${!!info.blocked}`;
 if(dismissed===noticeKey)return null;
 return <div className="updateNotice" role="status"><span>{info.blocked?'Update required for Auto Edit.':info.warning?`Required update: ${info.daysRemaining} days remaining.`:`RanCut ${info.latest} is available.`}</span><div><button onClick={onOpen}>View update</button><button aria-label="Dismiss update notification" onClick={()=>setDismissed(noticeKey)}>Later</button></div></div>;
}
