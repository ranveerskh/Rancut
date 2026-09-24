import React,{useEffect,useState} from 'react';
import {startUpdateCheck} from './update-startup.js';
export default function UpdateNotice({onOpen}){
 const [info,setInfo]=useState(null),[dismissed,setDismissed]=useState('');
 useEffect(()=>startUpdateCheck(window.rancut,setInfo),[]);
 if(!info?.available&&!info?.blocked)return null;
 const noticeKey=`${info.latest}:${!!info.warning}:${!!info.blocked}`;
 if(dismissed===noticeKey)return null;
 return <div className="updateNotice" role="status" aria-live="polite"><span>{info.blocked?'Update required for Auto Edit.':info.warning?`Required update: ${info.daysRemaining} days remaining.`:`RanCut ${info.latest} is available.`}</span><div><button onClick={onOpen}>View update</button><button aria-label="Dismiss update notification" onClick={()=>setDismissed(noticeKey)}>Later</button></div></div>;
}
