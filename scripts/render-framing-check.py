"""Native Mesa/EGL pixel checks of the actual application shader.
Requires optional QA packages: moderngl, Pillow, numpy.
This does not test Chromium media decoding or Windows/RTX.
"""
import json,sys
from pathlib import Path
import moderngl
import numpy as np
from PIL import Image,ImageDraw
data=json.loads(Path(sys.argv[1]).read_text())
out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
ctx=moderngl.create_standalone_context(backend='egl')
vs='#version 330\n'+data['vertex'].replace('attribute ','in ').replace('varying ','out ')
fs='#version 330\nout vec4 fragColor;\n'+data['fragment'].replace('precision highp float;','').replace('varying ','in ').replace('texture2D','texture').replace('gl_FragColor','fragColor')
program=ctx.program(vertex_shader=vs,fragment_shader=fs)
vertices=np.array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1],dtype='f4')
vao=ctx.simple_vertex_array(program,ctx.buffer(vertices.tobytes()),'pos')
W,H=960,540
im=Image.new('RGBA',(W,H),(35,45,60,255));d=ImageDraw.Draw(im)
for x in range(0,W,80):d.line((x,0,x,H),fill=(70,90,110,255),width=2)
for y in range(0,H,60):d.line((0,y,W,y),fill=(70,90,110,255),width=2)
# A red circular head and a blue chest give measurable aspect and headroom.
d.ellipse((420,35,540,155),fill=(240,45,35,255))
d.rectangle((395,165,565,325),fill=(35,120,230,255))
d.rectangle((415,326,545,520),fill=(95,130,160,255))
im.save(out/'source.png')
tex=ctx.texture((W,H),4,im.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes());tex.filter=(moderngl.LINEAR,moderngl.LINEAR);tex.repeat_x=False;tex.repeat_y=False;tex.use()
fbo=ctx.simple_framebuffer((W,H),components=4);fbo.use()
def uniform(k,v):
 if k in program:program[k].value=v
for k,v in {'tex':0,'mode':1,'fit':(1.,1.),'opacity':1.,'saturation':1.,'contrast':0.,'exposure':0.,'temp':0.,'tint':0.,'crop':(0.,0.,0.,0.)}.items():uniform(k,v)
results=[];frames=[]
for item in data['shots']:
 p=item['pose'];uniform('scale',p['scale']/100);uniform('offset',(p['x']/250,-p['y']/250));vao.render()
 img=Image.frombytes('RGBA',(W,H),fbo.read(components=4)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
 arr=np.array(img);red=(arr[:,:,0]>180)&(arr[:,:,1]<80)&(arr[:,:,2]<80);ys,xs=np.where(red)
 assert len(xs)>100,'Head disappeared'
 bw,bh=xs.max()-xs.min()+1,ys.max()-ys.min()+1
 assert abs(bw/bh-1)<.035,'Body/head aspect ratio distorted'
 assert ys.min()>0,'Head clipped at top'
 assert arr[:,:,3].min()==255,'Unexpected transparent edge'
 # Center of red circle must match JS camera coordinates within 2 pixels.
 ex=W*(.5+(.5-.5)*p['scale']/100+p['x']/250)
 ey=H*(.5+((95/H)-.5)*p['scale']/100+p['y']/250)
 assert abs((xs.min()+xs.max())/2-ex)<2 and abs((ys.min()+ys.max())/2-ey)<2,'Preview/export coordinate mismatch'
 filename=item['name'].replace(' ','-')+'-'+str(item['time'])+'.png';img.save(out/filename)
 frames.append((item,img));results.append({**item,'headWidth':int(bw),'headHeight':int(bh),'headTop':int(ys.min())})
for name,direction in [('Slow zoom in',1),('Slow zoom out',-1)]:
 sizes=[r['headWidth'] for r in results if r['name']==name]
 assert all((b-a)*direction>5 for a,b in zip(sizes,sizes[1:])),name+' did not change visibly'
# Source mask cuts only edges; it must not rescale the subject.
uniform('mode',0);uniform('scale',1.);uniform('offset',(0.,0.));uniform('crop',(.1,.1,0.,0.));vao.render()
masked=Image.frombytes('RGBA',(W,H),fbo.read(components=4)).transpose(Image.Transpose.FLIP_TOP_BOTTOM);a=np.array(masked)
assert a[:,0,3].max()==0 and a[:,-1,3].max()==0
assert np.max(np.abs(a[50:140,440:520,:3].astype(int)-np.array(im)[50:140,440:520,:3].astype(int)))<=1
masked.save(out/'mask-no-distortion.png')
sheet=Image.new('RGB',(960,6*202),(12,18,24));draw=ImageDraw.Draw(sheet)
for i,(item,img) in enumerate(frames):
 x=(i%3)*320;y=(i//3)*202
 sheet.paste(img.convert('RGB').resize((320,180)),(x,y+22));draw.text((x+6,y+5),item['name']+' · '+str(item['time'])+'s',fill='white')
sheet.save(out/'framing-contact-sheet.png')
report={'renderer':ctx.info['GL_RENDERER'],'frames':len(results),'checks':['proportional head','headroom','opaque borders','JS/shader coordinates','visible zoom in and out','mask leaves interior unchanged'],'results':results}
(out/'render-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='results'}))
