const {existsSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const binary=process.env.RANCUT_FFMPEG||require('ffmpeg-static');
if(!binary||!existsSync(binary)||spawnSync(binary,['-version'],{windowsHide:true}).status!==0){
 console.error('Tests require a working FFmpeg binary; no silent export-test skips. Run npm ci, or set RANCUT_FFMPEG to an absolute FFmpeg path.');
 process.exit(1);
}
