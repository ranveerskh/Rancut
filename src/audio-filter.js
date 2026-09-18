export function audioFilter(a,input,index){
 const f=Math.min((a.fadeMs??5)/1000,a.duration/2);
 const fade=f?`,afade=t=in:st=0:d=${f},afade=t=out:st=${a.duration-f}:d=${f}`:'';
 return `[${input}:a:0]atrim=start=${a.sourceIn}:duration=${a.duration},asetpts=PTS-STARTPTS,aresample=48000,volume=${a.gainDb}dB${fade},adelay=${Math.round(a.start*48000)}S:all=1[a${index}]`;
}
