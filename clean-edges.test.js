import test from 'node:test';
import assert from 'node:assert/strict';
import {fragment} from '../src/renderer.js';
import {fxDefault} from '../src/timeline.js';

test('clean picture edges discard outside pixels without remapping the source UV',()=>{
 const crop={...fxDefault().crop,left:.1,right:.08,top:.04,bottom:.05};
 assert.equal(crop.left+crop.right,.18);
 assert.match(fragment,/uv\.x<crop\.x\|\|uv\.x>1\.-crop\.y/);
 assert.doesNotMatch(fragment,/uv=vec2\(crop\.x,crop\.z\)\+uv/);
});
