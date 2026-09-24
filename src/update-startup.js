export function startUpdateCheck(api,onState){
 let mounted=true;
 const apply=next=>{
  if(!mounted||!next||typeof next!=='object')return;
  onState(current=>current?.checked&&!next.checked?current:next);
 };
 const unsubscribe=api?.onUpdate?.(apply);
 if(typeof api?.updateStatus==='function')api.updateStatus().then(apply).catch(()=>{});
 if(typeof api?.checkUpdates==='function')api.checkUpdates().then(apply).catch(()=>{});
 return()=>{mounted=false;unsubscribe?.();};
}
