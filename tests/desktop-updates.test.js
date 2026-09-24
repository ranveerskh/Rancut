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
async function setup(t,fetchImpl){const dir=await mkdtemp(path.join(tmpdir(),'rancut-updates-'));t.after(()=>rm(dir,{recursive:true,force:true}));return {dir,up:createUpdater({version:'0.6.1',userData:dir,downloads:dir,endpoint:'https://example.test',fetchImpl})};}
const metadata=()=>Response.json({ok:true,release,requiredRelease:release});
test('required update grace has exact boundaries and optional releases never block',()=>{
 const start=Date.parse(release.publishedAt);
 for(const [day,warning,blocked] of [[6,false,false],[7,true,false],[29,true,false],[30,true,true]]){const p=policy('0.6.1',release,start+day*DAY);assert.equal(p.warning,warning);assert.equal(p.blocked,blocked);}
 assert.equal(policy('0.7.0',release,start+31*DAY).blocked,false);
 assert.equal(policy('0.6.1',{...release,required:false},start+50*DAY).blocked,false);
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
 await up.check();await assert.rejects(up.download(),/Untrusted/);assert.equal(calls,2);
});
test('download can be cancelled and partial bytes are removed',async t=>{
 const {up,dir}=await setup(t,async(url,options)=>{if(options.method)return metadata();if(String(url).includes('api.github.com'))return Response.json({assets:[]});return new Response(new ReadableStream({start(c){c.enqueue(bytes.subarray(0,2));options.signal.addEventListener('abort',()=>c.error(Error('aborted')));}}));});
 await up.check();const downloading=up.download();setTimeout(()=>up.cancel(),25);await assert.rejects(downloading,/cancelled/);assert.equal((await up.status()).phase,'cancelled');assert.deepEqual(await readdir(path.join(dir,'RanCut Updates')),[]);
});
test('required policy survives offline restart; missing backend does not invent a lock',async t=>{
 const {up,dir}=await setup(t,async()=>metadata());await up.check();
 const offline=createUpdater({version:'0.6.1',userData:dir,downloads:dir,endpoint:'https://example.test',fetchImpl:async()=>{throw Error('offline');}});
 assert.equal((await offline.check()).blocked,true);await assert.rejects(offline.assertAllowed(),/30 days/);
 const fresh=await setup(t,async()=>{throw Error('not deployed');});assert.equal((await fresh.up.check()).blocked,false);assert.equal(await fresh.up.assertAllowed(),true);
});

test('empty release channel reports current version instead of setup failure',async t=>{
 const {up}=await setup(t,async(url,options)=>Response.json({ok:true,release:null,requiredRelease:null}));
 const result=await up.check();assert.equal(result.releaseState,'none');assert.equal(result.error,'');assert.equal(result.available,false);assert.equal(result.current,'0.6.1');assert.equal(result.checked,true);
});

test('public GitHub metadata is used as an optional update fallback',async t=>{
 const metadataRelease={...release,version:'0.7.0',required:false,publishedAt:new Date().toISOString()};
 const github={tag_name:'v0.7.0',published_at:metadataRelease.publishedAt,assets:[
  {name:'release-metadata.json',browser_download_url:'https://github.com/ranveerskh/Rancut/releases/download/v0.7.0/release-metadata.json'},
  {name:'RanCut-0.7.0-Setup.exe',browser_download_url:metadataRelease.downloadUrl}
 ]};
 const {up}=await setup(t,async(url,options)=>{
  if(options?.method==='POST')return Response.json({ok:true,release:null,requiredRelease:null});
  if(String(url).includes('api.github.com'))return Response.json(github);
  return Response.json({version:'0.7.0',downloadUrl:metadataRelease.downloadUrl,sha256:metadataRelease.sha256,size:metadataRelease.size});
 });
 const result=await up.check();assert.equal(result.source,'github');assert.equal(result.latest,'0.7.0');assert.equal(result.available,true);assert.equal(result.requiredVersion,undefined);
});

test('a stale Platform release does not hide a newer published GitHub installer',async t=>{
 const platformRelease={...release,version:'0.6.1',downloadUrl:'https://github.com/ranveerskh/Rancut/releases/download/v0.6.1/RanCut-0.6.1-Setup.exe',required:false};
 const githubRelease={...release,required:false,publishedAt:new Date().toISOString()};
 const github={tag_name:'v0.7.0',published_at:githubRelease.publishedAt,assets:[
  {name:'release-metadata.json',browser_download_url:'https://github.com/ranveerskh/Rancut/releases/download/v0.7.0/release-metadata.json'},
  {name:'RanCut-0.7.0-Setup.exe',browser_download_url:githubRelease.downloadUrl}
 ]};
 const {up}=await setup(t,async(url,options)=>{
  if(options?.method==='POST')return Response.json({ok:true,release:platformRelease,requiredRelease:null});
  if(String(url).includes('api.github.com'))return Response.json(github);
  return Response.json({version:'0.7.0',downloadUrl:githubRelease.downloadUrl,sha256:githubRelease.sha256,size:githubRelease.size,publishedAt:githubRelease.publishedAt});
 });
 const result=await up.check();assert.equal(result.source,'github');assert.equal(result.latest,'0.7.0');assert.equal(result.available,true);assert.equal(result.checked,true);
});
