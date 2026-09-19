// Composite pass: Style motion affects the entire already-keyed scene.
export const compositePass=`
 if(mode>0){
 vec2 uv=v;
 if(mode==1){uv=(v-.5-offset)/scale+.5;if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.)))){gl_FragColor=vec4(0.);return;}}
 float progress=transProgress;float pulse=1.-abs(progress*2.-1.);
 if(mode==3&&transKind==2){float travel=progress<.5?pow(progress*2.,2.):-pow((1.-progress)*2.,2.);uv.x+=travel;}
 if(mode==3&&transKind==4){float band=floor(v.y*24.);uv.x+=sin(band*7.+floor(progress*25.))*pulse*.08;}
 vec4 c=texture2D(tex,clamp(uv,0.,1.));
 if(mode==3&&transKind==2){if(uv.x<0.||uv.x>1.)c=vec4(0.,0.,0.,1.);else{vec2 d=vec2(pulse*.025,0.);c=(c+texture2D(tex,clamp(uv-d,0.,1.))+texture2D(tex,clamp(uv+d,0.,1.)))/3.;}}
 vec3 rgb=c.a>.0001?c.rgb/c.a:vec3(0.);
 if(mode==1){gl_FragColor=vec4(grade(rgb)*c.a,c.a);return;}
 if(mode==3){
 if(transKind==1){float edge=.012*sin(v.y*85.)+.006*sin(v.y*213.);float cover=progress<.5?step(v.x+edge,progress*2.*1.04):step((progress-.5)*2.*1.04,v.x+edge);float grain=fract(sin(dot(v,vec2(127.1,311.7)))*43758.5453);rgb=mix(rgb,vec3(.93,.91,.85)+grain*.035,cover);c.a=max(c.a,cover);}
 if(transKind==3){float cover=step(min(v.y,1.-v.y),pulse*.51);rgb=mix(rgb,vec3(.025),cover);c.a=1.;}
 if(transKind==4){rgb=mix(rgb,vec3(.8,.95,1.),pow(pulse,16.)*.9);c.a=1.;}
 if(transKind==5){rgb*=1.-pulse;c.a=1.;}
 }
 gl_FragColor=vec4(rgb,c.a);return;
 }
`;
