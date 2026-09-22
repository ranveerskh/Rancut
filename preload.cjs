const {contextBridge,ipcRenderer,webUtils}=require('electron');
contextBridge.exposeInMainWorld('rancut',{
 desktop:true,
 checkUpdates:()=>ipcRenderer.invoke('check-updates'),
 openRelease:()=>ipcRenderer.invoke('open-release'),
 openUpdate:url=>ipcRenderer.invoke('open-update',url),
 filePath:file=>webUtils.getPathForFile(file),
 rememberFile:file=>ipcRenderer.invoke('remember-media',webUtils.getPathForFile(file)),
 reconnect:items=>ipcRenderer.invoke('reconnect-media',items),
 exportPower:active=>ipcRenderer.invoke('export-power',active),
 notifyExport:()=>ipcRenderer.invoke('notify-export'),
 onSuspend:callback=>{const listener=()=>callback();ipcRenderer.on('system-suspend',listener);return()=>ipcRenderer.removeListener('system-suspend',listener);},
 chooseOutputFolder:()=>ipcRenderer.invoke('choose-output'),
 openOutputFolder:()=>ipcRenderer.invoke('open-output'),
 onPrepareClose:callback=>{const listener=async()=>{try{await callback();ipcRenderer.send('ready-close');}catch{ipcRenderer.send('close-failed');}};ipcRenderer.on('prepare-close',listener);return()=>ipcRenderer.removeListener('prepare-close',listener);}
});
