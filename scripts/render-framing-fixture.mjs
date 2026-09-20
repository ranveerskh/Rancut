import {writeFileSync} from 'node:fs';
import {vertex,fragment} from '../src/renderer.js';
import {defaultFraming,framingShot,shotKinds} from '../src/framing.js';
import {motionAt} from '../src/scene-core.js';
const framing=defaultFraming(),shots=[];
for(const name of shotKinds){const scene={...framingShot(framing,name,false,4),span:4,offset:0};for(const time of [0,2,4])shots.push({name,time,pose:motionAt({start:0,duration:4,fx:{scene}},time)});}
writeFileSync(process.argv[2]||'/tmp/rancut-framing.json',JSON.stringify({vertex,fragment,framing,shots}));
