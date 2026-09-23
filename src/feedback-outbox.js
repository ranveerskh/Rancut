import {submitFeedback} from './license-client.js';
const KEY='rancut.feedback.outbox.v1';let busy=false;
export function pendingFeedback(){try{const items=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(items)?items.filter(x=>x&&typeof x.submissionId==='string'&&typeof x.message==='string'):[];}catch{return [];}}
function save(items){localStorage.setItem(KEY,JSON.stringify(items));globalThis.dispatchEvent?.(new Event('feedback-outbox'));}
export function queueFeedback(input){
 const message=String(input.message||'').trim();if(message.length<5||message.length>4000)throw Error('Enter between 5 and 4000 characters.');
 const items=pendingFeedback();if(items.length>=20)throw Error('20 requests are pending. Retry or remove one first.');
 const id=crypto.randomUUID();items.push({submissionId:id,type:input.type,message,createdAt:new Date().toISOString(),error:''});save(items);return id;
}
export function discardFeedback(id){save(pendingFeedback().filter(x=>x.submissionId!==id));}
export async function retryFeedback(){
 if(busy)return;busy=true;
 try{for(const item of pendingFeedback()){
  try{await submitFeedback(item);save(pendingFeedback().filter(x=>x.submissionId!==item.submissionId));}
  catch(error){save(pendingFeedback().map(x=>x.submissionId===item.submissionId?{...x,error:/Unknown action|feedback_requests/i.test(error.message)?'Platform setup pending. The request is queued for retry.':error.message}:x));break;}
 }}finally{busy=false;}
}
export function startFeedbackRetry(){const retry=()=>retryFeedback().catch(()=>{});retry();window.addEventListener('online',retry);const timer=setInterval(retry,60000);return()=>{clearInterval(timer);window.removeEventListener('online',retry);};}
