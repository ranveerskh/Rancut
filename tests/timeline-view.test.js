import test from 'node:test';
import assert from 'node:assert/strict';
import {followScroll,scaledPeak} from '../src/timeline-view.js';
import * as T from '../src/timeline.js';
import * as E from '../src/editing.js';
test('follow keeps playhead visible after forward seek, reverse seek and changing zoom',()=>{
 const base={time:10,zoom:80,left:0,width:800,total:10000};assert.equal(followScroll(base),600);
 assert.equal(followScroll({...base,time:1,left:1200}),0);
 assert.equal(followScroll({...base,time:5,zoom:240}),1000);
 assert.equal(followScroll({...base,time:2}),0);
 assert.equal(followScroll({...base,time:200}),9200);
});
test('follow suspension and OFF preserve manual view; resume restores follow',()=>{
 const base={time:20,zoom:80,left:100,width:800,total:10000};assert.equal(followScroll({...base,suspended:true}),100);assert.equal(followScroll({...base,enabled:false}),100);assert.equal(followScroll(base),1400);assert.equal(followScroll({...base,width:0}),100);
});
test('waveform amplitude follows linear gain from dB and clips only at canvas limits',()=>{
 assert.deepEqual(scaledPeak(-.5,.5,0),{lo:-.5,hi:.5,clipped:false});
 const half=scaledPeak(-.5,.5,-6.020599913);assert(Math.abs(half.hi-.25)<1e-9);assert(Math.abs(half.lo+.25)<1e-9);
 assert.deepEqual(scaledPeak(-.8,.8,12),{lo:-1,hi:1,clipped:true});
 const quiet=scaledPeak(-1,1,-60);assert.equal(quiet.hi,.001);assert.equal(quiet.lo,-.001);
});
function fixture(){let p=T.emptyProject();p.media=[{id:'v',name:'v',type:'video',duration:10},{id:'bg',name:'bg',type:'image',duration:12}];p=T.addMediaClip(p,'v','V1',0);p=T.splitClips(p,p.clips[0].id,4);const right=p.clips.find(c=>c.start===4&&c.trackId==='V1');p=T.moveClip(p,right.id,'V1',6);p=T.addTrack(p,'video');return T.addMediaClip(p,'bg','V2',0);}
test('selected empty gap delete closes linked A/V and spanning background together',()=>{
 const p=fixture(),before=structuredClone(p),q=E.deleteTimelineGap(p,{trackId:'V1',range:[4,6]});assert.deepEqual(p,before);assert.equal(T.duration(q),10);assert.deepEqual(E.gapsOnTrack(q,'V1'),[]);assert.deepEqual(E.gapsOnTrack(q,'A1'),[]);T.validate(q);assert.equal(q.clips.filter(c=>c.trackId==='V2').reduce((s,c)=>s+c.duration,0),10);
});
test('gap deletion rejects stale/trailing intervals and locked reference/linked tracks',()=>{
 const p=fixture();assert.throws(()=>E.deleteTimelineGap(p,{trackId:'V1',range:[3,6]}),/changed/);assert.throws(()=>E.deleteTimelineGap(p,{trackId:'V1',range:[12,14]}),/changed/);p.tracks.find(t=>t.id==='V1').locked=true;assert.throws(()=>E.deleteTimelineGap(p,{trackId:'V1',range:[4,6]}),/Unlock/);p.tracks.find(t=>t.id==='V1').locked=false;p.tracks.find(t=>t.id==='A1').locked=true;assert.throws(()=>E.deleteTimelineGap(p,{trackId:'V1',range:[4,6]}),/Unlock/);
});
