// Project documents and bounded recovery history are committed atomically.
export const HISTORY_LIMIT=5;
export function savedEntry(previous,{id,project,thumbnail},now=Date.now(),checkpoint=false){
 if(!id||!project||!Array.isArray(project.clips))throw Error('Invalid project document.');
 const changed=previous&&JSON.stringify(previous.project)!==JSON.stringify(project);
 let backups=previous?.backups||[];
 if(changed&&(checkpoint||now-(previous.checkpointAt||0)>=60000))backups=[{at:previous.updatedAt,project:previous.project},...backups].slice(0,HISTORY_LIMIT);
 return {...previous,id,name:project.name||'Untitled project',project,thumbnail:thumbnail||previous?.thumbnail||'',updatedAt:now,createdAt:previous?.createdAt||now,checkpointAt:backups!==previous?.backups?now:previous?.checkpointAt||now,backups,deleted:false};
}
export function projectOrder(items,query='',trash=false){return items.filter(x=>!!x.deleted===trash&&x.name.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||b.updatedAt-a.updatedAt);}
const open=()=>new Promise((resolve,reject)=>{const r=indexedDB.open('rancut-projects',2);r.onupgradeneeded=()=>{for(const name of ['projects','catalog'])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Close other RanCut windows to update project storage.'));});
async function transaction(mode,run){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('catalog',mode);let result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Project save cancelled.'));run(tx.objectStore('catalog'),value=>result=value);});}finally{db.close();}}
export const listProjects=()=>transaction('readonly',(s,done)=>{const r=s.getAll();r.onsuccess=()=>done(r.result);});
export const getProject=id=>transaction('readonly',(s,done)=>{const r=s.get(id);r.onsuccess=()=>done(r.result);});
export const saveProjectEntry=(data,checkpoint=false)=>transaction('readwrite',(s,done)=>{const r=s.get(data.id);r.onsuccess=()=>{const entry=savedEntry(r.result,data,Date.now(),checkpoint);s.put(entry,data.id);done(entry);};});
export const editProjectEntry=(id,change)=>transaction('readwrite',(s,done)=>{const r=s.get(id);r.onsuccess=()=>{if(!r.result)return;const next={...r.result,...change};if(change.name)next.project={...next.project,name:change.name};s.put(next,id);done(next);};});
