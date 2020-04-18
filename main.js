// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu, Tray} = require('electron');
const path = require('path');
const express = require('express');
const rest = express();
const port = 33457;
const https = require('https');

const startServerWithCrypto = require('./authFactory');



rest.get('/dev', function(req, res) {
  res.send('hello world');
});

startServerWithCrypto(

  (encKey, cert, password ) => https.createServer({
    key: encKey,
    cert: cert,
    passphrase: password
  }, rest)
  .listen(port, () => console.log(`Chrome extension connector listening on port ${port}!`))
);


function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 650,
    height: 250,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'Icon-48.png'),
    title: "Service Desk Queue Change Alert"
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  mainWindow.on('minimize',function(event){
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', function (event) {
      if(!app.isQuitting){
          event.preventDefault();
          mainWindow.hide();
      }

      return false;
  });
  mainWindow.setMenu(null);

  var appIcon = null;
  appIcon = new Tray(path.join(__dirname, 'Icon-16.png'));
  var contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click:  function(){
        mainWindow.show();
    } },
    { label: 'Quit', click:  function(){
        app.isQuitting = true;
        app.quit();
    } }
  ]);
  appIcon.setToolTip('Service Desk Queue Change Alert');
  appIcon.setContextMenu(contextMenu);

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

