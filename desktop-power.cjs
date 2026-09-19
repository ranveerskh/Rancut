// Dependency injection allows lifecycle tests without a Windows desktop.
module.exports=function createExportPower(blocker){
 let id=null;
 const release=()=>{if(id!==null){blocker.stop(id);id=null;}};
 return {start(){if(id===null)id=blocker.start('prevent-display-sleep');return blocker.isStarted(id);},release,active:()=>id!==null};
};
