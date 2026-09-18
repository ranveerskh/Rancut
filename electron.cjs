const {app,BrowserWindow,dialog}=require('electron');
const http=require('node:http');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
let server,api,window;
if(!app.requestSingleInstanceLock())app.quit();
app.on('second-instance',()=>{window?.show();window?.focus();});
app.whenReady().then(async()=>{
 try{
  const {createApi}=await import(pathToFileURL(path.join(__dirname,'server.mjs')).href);api=await createApi();
  server=http.createServer((req,res)=>api.middleware(req,res,()=>{
   const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const root=path.join(__dirname,'dist');const file=path.resolve(root,'.'+(relative==='/'?'/index.html':relative));
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end('Not found');return;}
   const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]||'application/octet-stream';res.setHeader('Content-Type',type);fs.createReadStream(file).pipe(res);
  }));
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(5174,'127.0.0.1',resolve);});const port=server.address().port;
  window=new BrowserWindow({width:1440,height:960,minWidth:950,minHeight:650,title:'RanCut',backgroundColor:'#080a0e',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,partition:'persist:rancut'}});window.setMenuBarVisibility(false);window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(`http://127.0.0.1:${port}/`))event.preventDefault();});
  window.webContents.session.on('will-download',(_,item)=>{item.setSaveDialogOptions({title:'Save RanCut export',defaultPath:path.join(app.getPath('videos'),item.getFilename())});});
  await window.loadURL(`http://127.0.0.1:${port}`);
 }catch(e){dialog.showErrorBox('RanCut could not start',e.stack||e.message);app.quit();}
});
app.on('window-all-closed',()=>app.quit());
let closing=false;app.on('before-quit',event=>{if(closing)return;event.preventDefault();closing=true;server?.close();Promise.resolve(api?.cleanup()).finally(()=>app.quit());});
