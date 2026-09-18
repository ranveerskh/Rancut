const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('rancut',{
 desktop:true,
 chooseOutputFolder:()=>ipcRenderer.invoke('choose-output'),
 openOutputFolder:()=>ipcRenderer.invoke('open-output'),
 onPrepareClose:callback=>{const listener=async()=>{try{await callback();}finally{ipcRenderer.send('ready-close');}};ipcRenderer.on('prepare-close',listener);return()=>ipcRenderer.removeListener('prepare-close',listener);}
});
