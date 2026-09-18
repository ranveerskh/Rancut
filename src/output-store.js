import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
export async function outputStore({defaultDirectory,settingsPath}){
 let directory=defaultDirectory;
 try{const saved=JSON.parse(await readFile(settingsPath,'utf8'));if(typeof saved.outputDirectory==='string'&&path.isAbsolute(saved.outputDirectory))directory=saved.outputDirectory;}catch{}
 return {get:()=>directory,async set(value){if(typeof value!=='string'||!path.isAbsolute(value)||value.includes('\0'))throw Error('Choose an absolute output folder path.');const next=path.resolve(value);await mkdir(next,{recursive:true});await access(next,constants.W_OK);await mkdir(path.dirname(settingsPath),{recursive:true});await writeFile(settingsPath,JSON.stringify({outputDirectory:next}));directory=next;return next;},async prepare(){await mkdir(directory,{recursive:true});await access(directory,constants.W_OK);return directory;}};
}
