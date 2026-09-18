const {app,BrowserWindow,dialog,ipcMain,shell}=require('electron');
const http=require('node:http');const path=require('node:path');const fs=require('node:fs');const {pathToFileURL}=require('node:url');
let server,api,window,allowClose=false,waiting=false,closing=false,closeTimer;
const finishClose=()=>{clearTimeout(closeTimer);allowClose=true;window?.destroy();};
if(!app.requestSingleInstanceLock()){app.quit();}else{
 app.on('second-instance',()=>{if(window?.isMinimized())window.restore();window?.show();window?.focus();});
 app.whenReady().then(async()=>{try{
  const {createApi}=await import(pathToFileURL(path.join(__dirname,'server.mjs')).href);
  api=await createApi({exportDir:path.join(app.getPath('videos'),'RanCut Exports'),settingsPath:path.join(app.getPath('userData'),'output-settings.json')});
  server=http.createServer((req,res)=>api.middleware(req,res,()=>{
   try{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname),root=path.join(__dirname,'dist'),file=path.resolve(root,'.'+(relative==='/'?'/index.html':relative));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
    const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]||'application/octet-stream';res.setHeader('Content-Type',type);fs.createReadStream(file).pipe(res);
   }catch{res.writeHead(400);res.end('Invalid path');}
  }));
  // Stable origin retains project recovery and preset storage between launches.
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(5174,'127.0.0.1',resolve);});
  window=new BrowserWindow({width:1440,height:960,minWidth:950,minHeight:650,title:'RanCut',backgroundColor:'#080a0e',webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,partition:'persist:rancut',backgroundThrottling:false}});
  window.setMenuBarVisibility(false);window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('http://127.0.0.1:5174/'))event.preventDefault();});
  window.webContents.on('will-prevent-unload',event=>event.preventDefault());
  window.on('close',event=>{if(allowClose)return;event.preventDefault();if(waiting)return;waiting=true;window.webContents.send('prepare-close');closeTimer=setTimeout(finishClose,1800);});
  ipcMain.on('ready-close',event=>{if(event.sender===window?.webContents)finishClose();});
  ipcMain.handle('choose-output',async event=>{if(event.sender!==window?.webContents)throw Error('Invalid window');const result=await dialog.showOpenDialog(window,{title:'Choose export folder',defaultPath:api.getOutputDirectory(),properties:['openDirectory','createDirectory']});if(!result.canceled)await api.setOutputDirectory(result.filePaths[0]);return api.getOutputDirectory();});
  ipcMain.handle('open-output',async event=>{if(event.sender!==window?.webContents)throw Error('Invalid window');const dir=api.getOutputDirectory();await fs.promises.mkdir(dir,{recursive:true});const error=await shell.openPath(dir);if(error)throw Error(error);});
  window.webContents.session.on('will-download',(_,item)=>item.setSaveDialogOptions({defaultPath:path.join(app.getPath('documents'),item.getFilename())}));
  await window.loadURL('http://127.0.0.1:5174');
 }catch(e){dialog.showErrorBox('RanCut could not start',e.message);app.quit();}});
 app.on('window-all-closed',()=>app.quit());
 app.on('before-quit',event=>{if(closing)return;event.preventDefault();if(window&&!window.isDestroyed()&&!allowClose){window.close();return;}closing=true;server?.closeAllConnections();server?.close();const deadline=setTimeout(()=>app.exit(0),3500);Promise.resolve(api?.cleanup()).catch(()=>{}).finally(()=>{clearTimeout(deadline);app.exit(0);});});
}
