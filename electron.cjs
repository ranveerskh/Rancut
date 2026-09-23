const {app,BrowserWindow,dialog,ipcMain,shell,powerSaveBlocker,powerMonitor,Notification}=require('electron');
const http=require('node:http');const path=require('node:path');const fs=require('node:fs');const {pathToFileURL}=require('node:url');
// Hybrid-GPU laptops otherwise commonly put Chromium/WebGL on the integrated GPU.
// NVENC selection is separate, so explicitly request the high-performance GPU
// before Electron creates its GPU process.
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('enable-gpu-rasterization');
const power=require('./desktop-power.cjs')(powerSaveBlocker);
let remembered={},rememberPath,rememberWrite=Promise.resolve();
let server,api,window,allowClose=false,waiting=false,closing=false,closeTimer,pendingInstall=null,finishing=false;
const finishClose=async()=>{
 if(finishing)return;finishing=true;clearTimeout(closeTimer);
 try{if(pendingInstall){const launch=pendingInstall;pendingInstall=null;await launch();}power.release();allowClose=true;window?.destroy();}
 catch(error){waiting=false;dialog.showErrorBox('Update installation could not start',error.message);}
 finally{finishing=false;}
};
if(!app.requestSingleInstanceLock()){app.quit();}else{
 app.on('second-instance',()=>{if(window?.isMinimized())window.restore();window?.show();window?.focus();});
 app.whenReady().then(async()=>{try{
  rememberPath=path.join(app.getPath('userData'),'media-paths.json');
  try{remembered=JSON.parse(await fs.promises.readFile(rememberPath,'utf8'));}catch{}
  const releaseConfig=require('./release-config.json');
  const {createApi}=await import(pathToFileURL(path.join(__dirname,'server.mjs')).href);
  api=await createApi({exportDir:path.join(app.getPath('videos'),'RanCut Exports'),settingsPath:path.join(app.getPath('userData'),'output-settings.json')});
  server=http.createServer((req,res)=>api.middleware(req,res,()=>{
   try{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname),root=path.join(__dirname,'dist'),file=path.resolve(root,'.'+(relative==='/'?'/index.html':relative));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
    const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpeg':'image/jpeg','.jpg':'image/jpeg'}[path.extname(file)]||'application/octet-stream';res.setHeader('Content-Type',type);fs.createReadStream(file).pipe(res);
   }catch{res.writeHead(400);res.end('Invalid path');}
  }));
  // Stable origin retains project recovery and preset storage between launches.
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(5174,'127.0.0.1',resolve);});
  window=new BrowserWindow({width:1440,height:960,minWidth:950,minHeight:650,title:'RanCut',icon:path.join(__dirname,'assets/icon.png'),backgroundColor:'#0b0e18',webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,partition:'persist:rancut',backgroundThrottling:false}});
  window.setMenuBarVisibility(false);window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('http://127.0.0.1:5174/'))event.preventDefault();});
  window.webContents.on('will-prevent-unload',event=>event.preventDefault());
  window.on('close',event=>{if(allowClose)return;event.preventDefault();if(waiting)return;waiting=true;window.webContents.send('prepare-close');closeTimer=setTimeout(()=>{waiting=false;pendingInstall=null;dialog.showMessageBox(window,{type:'warning',message:'RanCut has not finished saving. The window has been kept open.',detail:'Save a project file before trying to close again.'});},15000);});
  const valid=event=>{if(event.sender!==window?.webContents||event.senderFrame!==window.webContents.mainFrame)throw Error('Invalid window');};
  const updater=require('./desktop-updates.cjs')({version:app.getVersion(),userData:app.getPath('userData'),downloads:app.getPath('downloads'),endpoint:releaseConfig.apiUrl,githubRepo:releaseConfig.githubRepo,notify:state=>{if(window&&!window.isDestroyed())window.webContents.send('update-progress',state);}});
  await updater.init();
  ipcMain.handle('check-updates',async event=>{valid(event);return updater.check();});
  ipcMain.handle('update-status',async event=>{valid(event);return updater.status();});
  ipcMain.handle('update-allowed',async event=>{valid(event);return updater.assertAllowed();});
  ipcMain.handle('open-update',async event=>{valid(event);return updater.download();});
  ipcMain.handle('cancel-update',event=>{valid(event);updater.cancel();});
  ipcMain.handle('install-update',async event=>{valid(event);if(waiting)throw Error('Waiting for the project to finish saving.');if(process.platform!=='win32')throw Error('Windows installer requires Windows.');await updater.installer();pendingInstall=async()=>{const installer=await updater.installer();const error=await shell.openPath(installer);if(error)throw Error(error);};window.close();return true;});
  window.webContents.once('did-finish-load',()=>{updater.check().catch(()=>{});});
  const updateTimer=setInterval(()=>updater.check().catch(()=>{}),24*60*60*1000);updateTimer.unref();
  ipcMain.handle('export-power',(event,active)=>{valid(event);if(active===true)return power.start();power.release();return false;});
  ipcMain.handle('notify-export',event=>{valid(event);if(Notification.isSupported())new Notification({title:'RanCut export complete',body:'Your MP4 is saved in the output folder.'}).show();});
  ipcMain.handle('remember-media',async(event,filePath)=>{valid(event);if(typeof filePath!=='string'||!path.isAbsolute(filePath))throw Error('No local file path.');
   const item=await api.registerLocalFile(filePath);remembered[filePath]={size:item.size,lastModified:item.lastModified};
   rememberWrite=rememberWrite.catch(()=>{}).then(()=>fs.promises.writeFile(rememberPath,JSON.stringify(remembered)));await rememberWrite;return item;});
  ipcMain.handle('reconnect-media',async(event,items)=>{valid(event);if(!Array.isArray(items)||items.length>2000)throw Error('Invalid media list.');
   const result=[];for(const item of items){const saved=remembered[item.sourcePath];if(!saved||saved.size!==item.size)continue;
    try{const info=await fs.promises.stat(item.sourcePath);if(info.size!==saved.size||Math.abs(info.mtimeMs-saved.lastModified)>2)continue;
     result.push({id:item.id,...await api.registerLocalFile(item.sourcePath),mediaId:item.id});}catch{}}
   return result;});
  powerMonitor.on('suspend',()=>{if(power.active())window?.webContents.send('system-suspend');});
  window.webContents.on('render-process-gone',()=>power.release());
  ipcMain.on('close-failed',event=>{if(event.sender!==window?.webContents)return;clearTimeout(closeTimer);waiting=false;pendingInstall=null;dialog.showMessageBox(window,{type:'error',buttons:['Keep editing','Close without local save'],defaultId:0,cancelId:0,noLink:true,message:'Your project could not be saved.',detail:'Keep editing to download a project backup with Save. Closing without a local save may lose your latest changes.'}).then(result=>{if(result.response===1)finishClose();}).catch(()=>{});});
  ipcMain.on('ready-close',event=>{if(event.sender===window?.webContents)finishClose();});
  ipcMain.handle('choose-output',async event=>{if(event.sender!==window?.webContents)throw Error('Invalid window');const result=await dialog.showOpenDialog(window,{title:'Choose export folder',defaultPath:api.getOutputDirectory(),properties:['openDirectory','createDirectory']});if(!result.canceled)await api.setOutputDirectory(result.filePaths[0]);return api.getOutputDirectory();});
  ipcMain.handle('open-output',async event=>{if(event.sender!==window?.webContents)throw Error('Invalid window');const dir=api.getOutputDirectory();await fs.promises.mkdir(dir,{recursive:true});const error=await shell.openPath(dir);if(error)throw Error(error);});
  window.webContents.session.on('will-download',(_,item)=>item.setSaveDialogOptions({defaultPath:path.join(app.getPath('documents'),item.getFilename())}));
  await window.loadURL('http://127.0.0.1:5174');
 }catch(e){dialog.showErrorBox('RanCut could not start',e.message);app.quit();}});
 app.on('window-all-closed',()=>app.quit());
 app.on('before-quit',event=>{if(closing)return;event.preventDefault();if(window&&!window.isDestroyed()&&!allowClose){window.close();return;}closing=true;power.release();server?.closeAllConnections();server?.close();const deadline=setTimeout(()=>app.exit(0),3500);Promise.resolve(api?.cleanup()).catch(()=>{}).finally(()=>{clearTimeout(deadline);app.exit(0);});});
}
