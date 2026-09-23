import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),createUpdater=require('../desktop-updates.cjs');
const {policy,validateRelease}=require('../update-policy.cjs');
const bytes=Buffer.from('MZ installer fixture'),DAY=86400000;
const release={version:'0.7.0',downloadUrl:'https://github.com/ranveerskh/Rancut/releases/download/v0.7.0/RanCut-0.7.0-Setup.exe',sha256:createHash('sha256').update(bytes).digest('hex'),size:bytes.length,publishedAt:new Date(Date.now()-31*DAY).toISOString(),required:true};
async function setup(t,fetchImpl){const dir=await mkdtemp(path.join(tmpdir(),'rancut-updates-'));t.after(()=>rm(dir,{recursive:true,force:true}));return {dir,up:createUpdater({version:'0.6.0',userData:dir,downloads:dir,endpoint:'https://example.test',fetchImpl})};}
const metadata=()=>Response.json({ok:true,release,requiredRelease:release});
test('required update grace has exact boundaries and optional releases never block',()=>{
 const start=Date.parse(release.publishedAt);
 for(const [day,warning,blocked] of [[6,false,false],[7,true,false],[29,true,false],[30,true,true]]){const p=policy('0.6.0',release,start+day*DAY);assert.equal(p.warning,warning);assert.equal(p.blocked,blocked);}
 assert.equal(policy('0.7.0',release,start+31*DAY).blocked,false);
 assert.equal(policy('0.6.0',{...release,required:false},start+50*DAY).blocked,false);
 assert.throws(()=>validateRelease({...release,downloadUrl:'https://evil.test/setup.exe'}));
 assert.throws(()=>validateRelease({...release,sha256:'bad'}));
});
test('native downloader verifies a direct EXE and rechecks installer tampering',async t=>{
 const {up}=await setup(t,async(url,options)=>options.method?metadata():new Response(bytes));
 await up.check();assert.equal((await up.download()).phase,'ready');const file=await up.installer();assert.deepEqual(await readFile(file),bytes);
 await writeFile(file,'tampered');await assert.rejects(up.installer(),/changed/);
});
test('hash failure removes partial installer and cannot launch it',async t=>{
 const {up,dir}=await setup(t,async(url,options)=>options.method?metadata():new Response(Buffer.from('MZ bad installer!!!!!')));
 await up.check();await assert.rejects(up.download(),/mismatch|verification/);assert.equal((await up.status()).phase,'error');
 assert.deepEqual(await readdir(path.join(dir,'RanCut Updates')),[]);await assert.rejects(up.installer(),/verify/);
});
test('untrusted redirect is rejected before fetching destination',async t=>{
 let calls=0;const {up}=await setup(t,async(url,options)=>{if(options.method)return metadata();calls++;return new Response(null,{status:302,headers:{location:'https://evil.test/setup.exe'}});});
 await up.check();await assert.rejects(up.download(),/Untrusted/);assert.equal(calls,1);
});
test('download can be cancelled and partial bytes are removed',async t=>{
 const {up,dir}=await setup(t,async(url,options)=>{if(options.method)return metadata();return new Response(new ReadableStream({start(c){c.enqueue(bytes.subarray(0,2));options.signal.addEventListener('abort',()=>c.error(Error('aborted')));}}));});
 await up.check();const downloading=up.download();setTimeout(()=>up.cancel(),25);await assert.rejects(downloading,/cancelled/);assert.equal((await up.status()).phase,'cancelled');assert.deepEqual(await readdir(path.join(dir,'RanCut Updates')),[]);
});
test('required policy survives offline restart; missing backend does not invent a lock',async t=>{
 const {up,dir}=await setup(t,async()=>metadata());await up.check();
 const offline=createUpdater({version:'0.6.0',userData:dir,downloads:dir,endpoint:'https://example.test',fetchImpl:async()=>{throw Error('offline');}});
 assert.equal((await offline.check()).blocked,true);await assert.rejects(offline.assertAllowed(),/30 days/);
 const fresh=await setup(t,async()=>{throw Error('not deployed');});assert.equal((await fresh.up.check()).blocked,false);assert.equal(await fresh.up.assertAllowed(),true);
});
