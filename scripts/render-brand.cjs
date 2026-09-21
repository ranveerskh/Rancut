// Render the exact supplied artwork through a rounded SVG mask; never redraw it.
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
async function main(){
 const image=fs.readFileSync(path.join(root,'public/rancut-icon.png')).toString('base64');
 const svg=fs.readFileSync(path.join(root,'assets/icon-mask.svg'),'utf8').replace('../public/rancut-icon.png','data:image/png;base64,'+image);
 await sharp(Buffer.from(svg)).resize(512,512).png().toFile(path.join(root,'public/brand-icon.png'));
 await sharp(Buffer.from(svg)).resize(256,256).png().toFile(path.join(root,'assets/icon.png'));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
