import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {defaultFraming,validateFraming,updateBox,boxPose,poseBox,framingShot,shotKinds} from '../src/framing.js';
import {motionAt} from '../src/scene-core.js';
import {applyStyle,captureStyle,validateStyle} from '../src/creator.js';
import {creatorStyles} from '../src/creator-workflow.js';
import {buildAutoEdit} from '../src/auto-edit.js';
import * as T from '../src/timeline.js';
import * as P from '../src/project-store.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,a+' != '+b);
function project(){let p=T.emptyProject();p.media=[{id:'v',type:'video',name:'Main',duration:36}];p=T.addMediaClip(p,'v','V1',0);for(let at=6;at<36;at+=6){const c=p.clips.find(c=>c.trackId==='V1'&&c.start<at&&T.end(c)>at);p=T.splitClips(p,c.id,at);}return p;}
test('16:9 boxes roundtrip at boundaries; close-up stays inside edited base',()=>{
 let f=defaultFraming();for(let w of [.25,.4,.62,.92,1])for(let x of [0,(1-w)/2,1-w]){const b={x,y:1-w,w},q=poseBox(boxPose(b));for(const k of ['x','y','w'])near(b[k],q[k]);}
 f=updateBox(f,'base',{x:.2,y:.15,w:.5});validateFraming(f);assert(f.close.w<=.5);f=updateBox(f,'close',{x:-1,y:2,w:.3});validateFraming(f);assert(f.close.x>=f.base.x);assert.throws(()=>validateFraming({...f,close:{x:0,y:0,w:.8}}));assert.throws(()=>validateFraming({...f,base:{x:NaN,y:0,w:.8}}));
});
test('every animated frame preserves selected close-up region and visibly zooms in/out',()=>{
 const f=defaultFraming();for(const name of shotKinds){const poses=framingShot(f,name,false,6),c={start:0,duration:6,fx:{scene:{...poses,span:6,offset:0}}};
 for(let t=0;t<=6;t+=.05){const b=poseBox(motionAt(c,t)),m=f.close;assert(b.x<=m.x+1e-7&&b.y<=m.y+1e-7&&b.x+b.w>=m.x+m.w-1e-7&&b.y+b.w>=m.y+m.w-1e-7);}
 if(name==='Slow zoom in')assert(poses.to.scale>poses.from.scale+40);
 if(name==='Slow zoom out')assert(poses.from.scale>poses.to.scale+40);
 }
 const short=framingShot(f,'Slow zoom in',false,.8);assert.deepEqual(short.from,short.to);
 const simple=framingShot(f,'Close-up',true),dynamic=framingShot(f,'Close-up');assert(simple.from.scale<dynamic.from.scale);
});
test('balanced framed styles keep source, mask, manual locks and selected scope intact',()=>{
 const p=project(),before=structuredClone(p),f=defaultFraming();p.clips[0].fx.crop.left=.08;
 const q=applyStyle(p,'V1',creatorStyles[1],42,{framing:f}),styles=q.clips.filter(c=>c.fx.scene);assert.deepEqual(styles.map(c=>c.name),shotKinds);
 assert.equal(q.clips.find(c=>c.id===p.clips[0].id).fx.crop.left,.08);assert.equal(before.clips.length,p.clips.length);
 styles[1].styleLocked=true;const locked=structuredClone(styles[1]);const r=applyStyle(q,'V1',creatorStyles[0],99,{framing:f});assert.deepEqual(r.clips.find(c=>c.id===locked.id),locked);
 const ids=[p.clips.find(c=>c.trackId==='V1').id],scoped=applyStyle(r,'V1',creatorStyles[1],2,{ids,framing:f});
 for(const c of r.clips.filter(c=>c.fx.scene&&c.start>0))assert.deepEqual(scoped.clips.find(x=>x.id===c.id),c);
 assert.deepEqual(T.validate(JSON.parse(JSON.stringify(q))).creatorFraming,f);
});
test('captured styles retain exact absolute poses when imported and applied',()=>{
 const f=defaultFraming(),q=applyStyle(project(),'V1',creatorStyles[1],1,{framing:f}),preset=validateStyle(JSON.parse(JSON.stringify(captureStyle(q))));
 const one={...preset,shots:[preset.shots[2]]},r=applyStyle(project(),'V1',one,1,{framing:f});
 for(const c of r.clips.filter(c=>c.fx.scene)){assert.deepEqual(c.fx.scene.from,one.shots[0].from);assert.deepEqual(c.fx.scene.to,one.shots[0].to);}
});
test('Auto Edit and Creator use identical framing poses; skip styles retains chosen normal base',()=>{
 const p=project(),f=defaultFraming(),options={mainId:'v',green:false,normalize:false,trim:false,style:'dynamic',framing:f};
 const a=buildAutoEdit(p,options,null),b=applyStyle(a,'V2',creatorStyles[1],42,{framing:f});
 assert.deepEqual(a.clips.filter(c=>c.fx.scene).map(c=>c.fx.scene.from),b.clips.filter(c=>c.fx.scene).map(c=>c.fx.scene.from));
 const normal=buildAutoEdit(p,{...options,style:'none'},null);assert.deepEqual(normal.clips.find(c=>c.fx.scene).fx.scene.from,boxPose(f.base));
});
test('batch Trash restores/deletes only trashed documents; purged legacy never reappears',async()=>{
 for(const id of ['trash-a','trash-b','keep','legacy-recovery'])await P.saveProjectEntry({id,project:T.emptyProject()});
 for(const id of ['trash-a','trash-b','legacy-recovery'])await P.editProjectEntry(id,{deleted:true});
 await P.trashProjects(['trash-a','trash-b'],'restore');assert.equal((await P.getProject('trash-a')).deleted,false);assert.equal((await P.getProject('trash-b')).deleted,false);
 await P.editProjectEntry('trash-a',{deleted:true});await P.trashProjects(['trash-a','keep','legacy-recovery'],'delete');
 assert.equal(await P.getProject('trash-a'),undefined);assert(await P.getProject('keep'));assert((await P.getProject('legacy-recovery')).purged);
 assert(!P.projectOrder(await P.listProjects(),'',true).some(x=>x.id==='legacy-recovery'));assert(!P.projectOrder(await P.listProjects()).some(x=>x.id==='legacy-recovery'));
});
