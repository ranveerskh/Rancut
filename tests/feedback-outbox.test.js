import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {build} from 'esbuild';
const bundle=await build({entryPoints:['src/feedback-outbox.js'],bundle:true,write:false,format:'iife',globalName:'Outbox',logLevel:'silent'});
test('feedback survives backend failure and retries the same submission without sending secrets',async()=>{
 const store=new Map([['rancut.license.key','SECRET-LICENSE']]);let online=false;const calls=[];
 const ctx=vm.createContext({crypto,AbortController,setTimeout,clearTimeout,Event,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},fetch:async(url,options)=>{calls.push(JSON.parse(options.body));if(!online)throw Error('Unknown action');return {ok:true,json:async()=>({ok:true,feedback:{id:'server-id'}})};}});
 vm.runInContext(bundle.outputFiles[0].text,ctx);const out=ctx.Outbox;
 const id=out.queueFeedback({type:'Feature request',message:'Please add another timeline view.',licenseKey:'secret',media:['private.mp4']});
 await out.retryFeedback();assert.equal(out.pendingFeedback().length,1);assert.match(out.pendingFeedback()[0].error,/setup pending/);
 online=true;await out.retryFeedback();assert.equal(out.pendingFeedback().length,0);assert.equal(calls[0].submissionId,id);assert.equal(calls[1].submissionId,id);assert(!JSON.stringify(calls).includes('SECRET-LICENSE'));assert(!JSON.stringify(calls).includes('private.mp4'));
});
