import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
import {readFileSync} from 'node:fs';
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));

const bundle = await build({entryPoints:['src/license-client.js'],bundle:true,write:false,format:'iife',globalName:'License',logLevel:'silent'});
const key = 'RC-YEARLY-12345678-12345678-12345678-12345678';
const active = {ok:true,active:true,plan:'yearly',expiresAt:'2099-01-01T00:00:00Z',activationId:'activation-1'};

function setup(respond, savedKey = '', storageMode = 'available') {
  const values = new Map(savedKey ? [['rancut.license.key', savedKey]] : []);
  const calls = [];
  const context = vm.createContext({AbortController,setTimeout,clearTimeout,crypto:globalThis.crypto,
    fetch:async(url,options)=>{
      const body=JSON.parse(options.body);calls.push(body);
      const result=await respond(body);
      return {ok:result.status===undefined||result.status===200,status:result.status||200,json:async()=>result.data};
    },
  });
  if(storageMode==='available') context.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  if(storageMode==='blocked') Object.defineProperty(context,'localStorage',{get(){throw Error('Storage blocked');}});
  vm.runInContext(bundle.outputFiles[0].text,context);
  return {client:context.License,calls,values};
}

test('license read is safe without storage; authorization remains blocked',async()=>{
  for(const mode of ['absent','blocked']){
    const {client,calls}=setup(()=>{throw Error('Unexpected network');},'',mode);
    assert.equal(client.getSavedLicenseKey(),'');
    await assert.rejects(client.authorizeAutoEdit(),/storage/i);
    assert.equal(calls.length,0);
  }
});

test('trial allowance and denial follow server responses using the same installation',async()=>{
  let uses=0;
  const {client,calls}=setup(()=>({data:{ok:true,allowed:++uses<=2,used:Math.min(uses,2),remaining:Math.max(0,2-uses)}}));
  assert.equal((await client.authorizeAutoEdit()).allowed,true);
  assert.equal((await client.authorizeAutoEdit()).allowed,true);
  assert.equal((await client.authorizeAutoEdit()).allowed,false);
  assert.equal(new Set(calls.map(c=>c.installationHash)).size,1);
  assert.match(calls[0].installationHash,/^[A-Za-z0-9._:-]{32,128}$/);
  assert(calls.every(c=>c.action==='consume_trial'));
});

test('active license authorizes Auto Edit without using trial quota',async()=>{
  const {client,calls}=setup(()=>({data:active}),key);
  const access=await client.authorizeAutoEdit();
  assert.equal(access.allowed,true);assert.equal(access.licensed,true);
  assert.equal(calls.length,1);assert.equal(calls[0].action,'license_status');
});

test('inactive license uses the server-controlled trial allowance',async()=>{
  const {client,calls}=setup(body=>({data:body.action==='license_status'?{ok:true,active:false}:{ok:true,allowed:false,used:2,remaining:0}}),key);
  assert.equal((await client.authorizeAutoEdit()).allowed,false);
  assert.deepEqual(calls.map(c=>c.action),['license_status','consume_trial']);
});

test('activation saves normalized key only after success and returns active status',async()=>{
  const {client,values}=setup(()=>({data:active}));
  const result=await client.activateLicense(' '+key.toLowerCase()+' ');
  assert.equal(result.active,true);assert.equal(values.get('rancut.license.key'),key);
  client.clearSavedLicenseKey();assert.equal(client.getSavedLicenseKey(),'');
});

test('rejected activation preserves the previous key',async()=>{
  const {client}=setup(()=>({status:403,data:{ok:false,code:'expired_key',message:'This license is expired or revoked'}}),key);
  await assert.rejects(client.activateLicense('RC-BETA-12345678-12345678-12345678-12345678'),/expired or revoked/);
  assert.equal(client.getSavedLicenseKey(),key);
});

test('malformed successful HTTP responses never grant access or save a key',async()=>{
  for(const data of [{directory:'/exports',ffmpeg:true},{ok:true,allowed:'true'},null]){
    const {client}=setup(()=>({data}));
    await assert.rejects(client.authorizeAutoEdit(),/Invalid response/);
    await assert.rejects(client.activateLicense(key),/Invalid response/);
    assert.equal(client.getSavedLicenseKey(),'');
  }
});

test('network failure and server errors never fall back to unlocked access',async()=>{
  for(const respond of [()=>{throw Error('Network unavailable');},()=>({status:500,data:{message:'Service unavailable'}})]){
    const {client}=setup(respond,key);
    await assert.rejects(client.authorizeAutoEdit(),/unavailable/);
  }
});

test('feature requests submit only a bounded safe context to the platform inbox',async()=>{
  const {client,calls}=setup(body=>({data:{ok:true,feedback:{id:'12345678-1234-1234-1234-123456789012',feedback_type:body.feedbackType,status:'open',created_at:'2099-01-01T00:00:00Z'}}}));
  const result=await client.submitFeedback({type:'Feature request',message:'Please add a cleaner feedback inbox.',diagnostics:{encoder:'h264_nvenc',mode:'gpu',renderer:'NVIDIA RTX',clips:12,missing:0,secret:'must not leave app'}});
  assert.equal(result.status,'open');
  assert.equal(calls.length,1);assert.equal(calls[0].action,'submit_feedback');assert.equal(calls[0].feedbackType,'feature');assert.equal(calls[0].message,'Please add a cleaner feedback inbox.');
  assert.deepEqual(calls[0].appContext,{version,encoder:'h264_nvenc',mode:'gpu',renderer:'NVIDIA RTX',clips:12,missing:0});
  await assert.rejects(client.submitFeedback({type:'Feature request',message:'no'}),/little more detail/);
  assert.equal(calls.length,1);
});
