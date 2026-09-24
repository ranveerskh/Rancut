import {effectiveGain} from './audio-mix.js';
import {sourceForRender} from './export-config.js';
import {motionAt,sceneTrackOrder} from './scene-core.js';
import {transitionEvents,withTransitionAudio} from './creator.js';
import {soundRuntime} from './sounds.js';
import {compositePass} from './composite-shader.js';
import {envelope,fadeDuration} from './editing.js';
import {activeAt,fxDefault,clamp} from './timeline.js';
export const vertex=`attribute vec2 pos;varying vec2 v;void main(){v=pos*.5+.5;gl_Position=vec4(pos,0.,1.);}`;
export const fragment=`precision highp float;varying vec2 v;uniform sampler2D tex;uniform int mode;uniform vec2 fit;uniform vec2 offset;uniform float scale;uniform float opacity;uniform vec2 pixel;uniform float blur;uniform vec4 crop;
uniform bool keyOn;uniform bool matte;uniform vec3 key;uniform float threshold;uniform float softness;uniform float choke;uniform float feather;uniform float spill;uniform float decontam;
uniform float exposure;uniform float contrast;uniform float saturation;uniform float temp;uniform float tint;uniform int transKind;uniform float transProgress;
vec3 grade(vec3 c){c*=pow(2.,exposure);c=(c-.5)*(1.+contrast)+.5;float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,saturation);c+=vec3(temp*.06-tint*.018,tint*.035,-temp*.06-tint*.018);return clamp(c,0.,1.);}
float rawAlpha(vec2 uv){vec4 c=texture2D(tex,uv);float excess=(c.g-max(c.r,c.b))/max(c.g,.035);float t=clamp((excess-threshold)/max(softness,.02),0.,1.);return (1.-t*t*(3.-2.*t))*c.a;}
float cleanAlpha(vec2 uv){float a=rawAlpha(uv),lo=a;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)lo=min(lo,rawAlpha(uv+pixel*vec2(float(x),float(y))));return mix(a,lo,choke);}
void main(){
 ${compositePass}
 vec2 uv=(v-.5-offset)/(fit*scale)+.5;if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.)))){gl_FragColor=vec4(0.);return;}if(uv.x<crop.x||uv.x>1.-crop.y||uv.y<crop.w||uv.y>1.-crop.z){gl_FragColor=vec4(0.);return;}
 vec4 c=texture2D(tex,uv);if(blur>.01){vec2 d=pixel*blur;c=c*.4+(texture2D(tex,uv+vec2(d.x,0.))+texture2D(tex,uv-vec2(d.x,0.))+texture2D(tex,uv+vec2(0.,d.y))+texture2D(tex,uv-vec2(0.,d.y)))*.15;}
 float a=c.a;vec3 rgb=c.rgb;
 if(keyOn){a=cleanAlpha(uv);if(feather>0.){vec2 d=pixel*max(.5,feather);float b=(cleanAlpha(uv+vec2(d.x,0.))+cleanAlpha(uv-vec2(d.x,0.))+cleanAlpha(uv+vec2(0.,d.y))+cleanAlpha(uv-vec2(0.,d.y)))*.25;a=mix(a,b,min(.65,feather*.43));}
 rgb=clamp((rgb-(1.-a)*key*decontam)/max(1.-(1.-a)*decontam,.025),0.,1.);rgb.g-=max(rgb.g-max(rgb.r,rgb.b),0.)*spill;}
 if(matte){gl_FragColor=vec4(vec3(a),1.);return;}gl_FragColor=vec4(grade(rgb),a*opacity);
}`;
function shader(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function waitEvent(el,event,timeout=20000){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>done(Error('Media decode timed out.')),timeout);const good=()=>done(),bad=()=>done(Error('This media could not be decoded.'));function done(err){clearTimeout(timer);el.removeEventListener(event,good);el.removeEventListener('error',bad);err?reject(err):resolve();}el.addEventListener(event,good,{once:true});el.addEventListener('error',bad,{once:true});});}
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.pool=new Map();this.images=new Map();this.audio=null;this.level=0;this.drawing=false;this.disposed=false;this.playEpoch=0;const gl=this.gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL is unavailable. Enable browser graphics acceleration.');const p=this.program=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vertex));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);const buffer=this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(p,'pos');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);this.locs={};this.texture=this.makeTexture();this.targets=[];gl.uniform1i(this.loc('tex'),0);}
 loc(n){return this.locs[n]??(this.locs[n]=this.gl.getUniformLocation(this.program,n));}
 gpuInfo(){const g=this.gl,ext=g.getExtension('WEBGL_debug_renderer_info');return {vendor:ext?g.getParameter(ext.UNMASKED_VENDOR_WEBGL):g.getParameter(g.VENDOR),renderer:ext?g.getParameter(ext.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)};}
 f(n,v){this.gl.uniform1f(this.loc(n),v);}i(n,v){this.gl.uniform1i(this.loc(n),v);}v2(n,a,b){this.gl.uniform2f(this.loc(n),a,b);}
 makeTexture(){const g=this.gl,t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);return t;}
 resize(w,h){if(this.canvas.width===w&&this.canvas.height===h&&this.targets.length)return;const g=this.gl;for(const t of this.targets){g.deleteTexture(t.tex);g.deleteFramebuffer(t.fbo);}this.canvas.width=w;this.canvas.height=h;this.targets=[0,1].map(()=>{const tex=this.makeTexture();g.texImage2D(g.TEXTURE_2D,0,g.RGBA,w,h,0,g.RGBA,g.UNSIGNED_BYTE,null);const fbo=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,fbo);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,tex,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('GPU cannot allocate this export size.');return{tex,fbo};});}
 async resumeAudio(){if(!this.audio){const ctx=new AudioContext(),mix=ctx.createGain(),analyser=ctx.createAnalyser();analyser.fftSize=1024;mix.connect(analyser);analyser.connect(ctx.destination);this.audio={ctx,mix,analyser,values:new Float32Array(analyser.fftSize)};}await this.audio.ctx.resume();}
 pause(){this.playEpoch++;for(const e of this.pool.values())e.el.pause();}
 meter(){if(!this.audio)return -60;const a=this.audio;a.analyser.getFloatTimeDomainData(a.values);let peak=0;for(const v of a.values)peak=Math.max(peak,Math.abs(v));return Math.max(-60,20*Math.log10(Math.max(peak,1e-5)));}
 async source(c,m,t,play,audioTrack=false,fast=false,playEpoch=this.playEpoch){
  if(!m?.url)return null;
  if(m.type==='image'){let entry=this.images.get(m.id);if(!entry||entry.url!==m.url){const im=new Image();im.src=m.url;entry={im,url:m.url,promise:im.decode()};this.images.set(m.id,entry);}await entry.promise;return entry.im;}
  const key=(audioTrack?'a:':'v:')+c.trackId;let e=this.pool.get(key);
  if(!e){const el=document.createElement(audioTrack?'audio':'video');el.preload='auto';el.playsInline=true;el.muted=!audioTrack;e={el,url:null,clip:null};this.pool.set(key,e);}
  if(e.url!==m.url){e.el.pause();e.url=m.url;e.el.src=m.url;e.el.load();await waitEvent(e.el,'loadeddata');if(play&&playEpoch!==this.playEpoch)return null;}
  if(play&&playEpoch!==this.playEpoch)return null;
  const time=clamp(t-c.start+c.sourceIn,0,Math.max(0,m.duration-.001));
  const cut=e.clip!==c.id;e.clip=c.id;
  if(Math.abs(e.el.currentTime-time)>(play&&!cut?(fast?.5:.15):.001)){const pending=waitEvent(e.el,'seeked');e.el.currentTime=time;await pending;if(play&&playEpoch!==this.playEpoch)return null;}
  if(audioTrack&&this.audio){if(!e.node){e.node=this.audio.ctx.createMediaElementSource(e.el);e.gain=this.audio.ctx.createGain();e.node.connect(e.gain);e.gain.connect(this.audio.mix);}const now=this.audio.ctx.currentTime,gain=10**((c.fx?.gainDb??0)/20),f=fadeDuration(c),param=e.gain.gain;param.cancelScheduledValues(now);param.setValueAtTime(gain*envelope(c,t),now);if(play&&f){const into=t-c.start,remaining=c.start+c.duration-t;if(into<f)param.linearRampToValueAtTime(gain,now+f-into);if(remaining>f)param.setValueAtTime(gain,now+remaining-f);param.linearRampToValueAtTime(0,now+Math.max(0,remaining));}e.el.muted=false;}
  else if(audioTrack)e.el.muted=true;
  if(play){if(e.el.paused)await e.el.play().catch(()=>{});}else e.el.pause();return e.el;
 }
 uniforms(fx){const d=fxDefault(),f={...d,...fx},k={...d.chroma,...f.chroma},c={...d.color,...f.color},tr={...d.transform,...f.transform},crop={...d.crop,...f.crop};this.i('keyOn',k.enabled?1:0);this.i('matte',k.matte?1:0);const hex=k.key||'#13470e';this.gl.uniform3f(this.loc('key'),...([1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)));for(const n of ['threshold','softness','choke','feather','spill','decontam'])this.f(n,k[n]);this.f('scale',tr.scale/100);this.f('opacity',tr.opacity/100);this.v2('offset',tr.x/250,-tr.y/250);this.gl.uniform4f(this.loc('crop'),crop.left,crop.right,crop.top,crop.bottom);this.f('blur',f.blur||0);this.f('exposure',c.exposure);this.f('contrast',c.contrast/100);this.f('saturation',c.saturation/100);this.f('temp',c.temp/100);this.f('tint',c.tint/100);}
 async draw(p,media,t,{play=false,width=1280,exact=false,fast=false}={}){
  if(this.disposed)return false;if(this.drawing&&!exact)return false;this.drawing=true;const playEpoch=this.playEpoch;
  try{
   const transition=transitionEvents(p).find(v=>t>=v.start&&t<v.start+v.duration);p=withTransitionAudio(p);
   const active=activeAt(p,t),sources=new Map();const visible=sceneTrackOrder(p,t);
   const used=new Set();
   for(const c of active){const tr=p.tracks.find(x=>x.id===c.trackId);if(!tr)continue;const a=tr.type==='audio';if(exact&&a)continue;if(a?tr.muted:tr.hidden)continue;if(c.kind==='adjustment')continue;used.add((a?'a:':'v:')+c.trackId);const meta=p.media.find(m=>m.id===c.mediaId),m=meta?.sound?soundRuntime(meta):media.find(m=>m.id===c.mediaId);sources.set(c.id,await this.source(a?{...c,fx:{...c.fx,gainDb:effectiveGain(p,c,t)}}:c,sourceForRender(m,{exact,audio:a}),t,play,a,fast,playEpoch));}
   for(const [k,e] of this.pool)if(!used.has(k)){e.el.pause();if(k.startsWith('a:soundtrack_')){e.el.removeAttribute('src');e.el.load();e.node?.disconnect();e.gain?.disconnect();this.pool.delete(k);}}
   const w=Math.round(width/2)*2,h=Math.round((w*p.height/p.width)/2)*2;this.resize(w,h);const g=this.gl;g.viewport(0,0,w,h);g.useProgram(this.program);g.activeTexture(g.TEXTURE0);let target=0;g.bindFramebuffer(g.FRAMEBUFFER,this.targets[target].fbo);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);
   for(const tr of visible){const c=active.find(c=>c.trackId===tr.id);if(!c)continue;this.uniforms(c.kind==='adjustment'?{...c.fx,transform:motionAt(c,t)}:c.fx);
    if(c.kind==='adjustment'){const next=1-target;g.disable(g.BLEND);g.bindFramebuffer(g.FRAMEBUFFER,this.targets[next].fbo);g.bindTexture(g.TEXTURE_2D,this.targets[target].tex);this.i('mode',1);g.drawArrays(g.TRIANGLES,0,6);target=next;continue;}
    const src=sources.get(c.id);if(!src)continue;const sw=src.videoWidth||src.naturalWidth,sh=src.videoHeight||src.naturalHeight;if(!sw||!sh)continue;
    g.bindFramebuffer(g.FRAMEBUFFER,this.targets[target].fbo);g.enable(g.BLEND);g.blendFuncSeparate(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA,g.ONE,g.ONE_MINUS_SRC_ALPHA);g.bindTexture(g.TEXTURE_2D,this.texture);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,src);this.i('mode',0);const aspect=sw/sh,project=p.width/p.height;this.v2('fit',aspect>project?1:aspect/project,aspect>project?project/aspect:1);this.v2('pixel',1/sw,1/sh);g.drawArrays(g.TRIANGLES,0,6);
   }
   g.bindFramebuffer(g.FRAMEBUFFER,null);g.disable(g.BLEND);g.bindTexture(g.TEXTURE_2D,this.targets[target].tex);this.i('mode',transition?3:2);this.i('transKind',transition?({paper:1,whoosh:2,shutter:3,glitch:4,fade:5}[transition.kind]):0);this.f('transProgress',transition?(t-transition.start)/transition.duration:0);g.drawArrays(g.TRIANGLES,0,6);return true;
  }finally{this.drawing=false;}
 }
 captureRGBA(){const size=this.canvas.width*this.canvas.height*4;if(this.frameBytes?.length!==size)this.frameBytes=new Uint8Array(size);this.gl.readPixels(0,0,this.canvas.width,this.canvas.height,this.gl.RGBA,this.gl.UNSIGNED_BYTE,this.frameBytes);if(this.gl.getError()!==this.gl.NO_ERROR)throw Error('GPU frame read failed. Try a smaller export resolution.');return this.frameBytes;}
 captureJPEG(quality=.96){return new Promise((resolve,reject)=>this.canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not compress the export frame.')),'image/jpeg',quality));}
 sample(clip){const e=this.pool.get('v:'+clip.trackId);if(!e||e.clip!==clip.id||e.el.readyState<2)return null;const c=document.createElement('canvas');c.width=640;c.height=Math.round(640*e.el.videoHeight/e.el.videoWidth);c.getContext('2d').drawImage(e.el,0,0,c.width,c.height);return c;}
 resetMedia(){this.pause();for(const e of this.pool.values()){e.el.removeAttribute('src');e.el.load();e.node?.disconnect();e.gain?.disconnect();}this.pool.clear();this.images.clear();}
 dispose(){this.disposed=true;this.pause();for(const e of this.pool.values()){e.el.removeAttribute('src');e.el.load();e.node?.disconnect();e.gain?.disconnect();}this.audio?.ctx.close();this.pool.clear();const g=this.gl;for(const x of this.targets){g.deleteTexture(x.tex);g.deleteFramebuffer(x.fbo);}g.deleteTexture(this.texture);g.deleteProgram(this.program);g.deleteBuffer(this.buffer);}
}
