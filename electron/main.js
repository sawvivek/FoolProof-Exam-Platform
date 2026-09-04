const {app,BrowserWindow,session} = require('electron');
const path=require('path');
const url=process.env.FP_FRONTEND_URL||'http://localhost:5173';
function createWindow(){
 const win=new BrowserWindow({width:1440,height:900,backgroundColor:'#07101f',show:false,autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,devTools:false}});
 win.once('ready-to-show',()=>win.show());
 win.loadURL(url);
 win.webContents.on('before-input-event',(event,input)=>{
   const blocked=(input.key==='F12'||(input.control&&input.shift&&['I','J','C'].includes(input.key))||(input.alt&&input.key==='Left')||(input.alt&&input.key==='Right'));
   if(blocked)event.preventDefault();
 });
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 return win;
}
app.whenReady().then(()=>{session.defaultSession.setPermissionRequestHandler((_webContents,permission,callback)=>{callback(['media'].includes(permission));});createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
