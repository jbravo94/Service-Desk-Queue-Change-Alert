// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu, Tray} = require('electron');
const path = require('path');
const express = require('express');
const rest = express();
const port = 33457;
const fs = require('fs');
const https = require('https');
const os = require("os");

const currentOSUserName = os.userInfo().username;

// https://github.com/atom/node-keytar
// https://github.com/atom/node-keytar/issues/215
// $(npm bin)/electron-rebuild
const keytar = require('keytar');

// https://nodejs.org/api/crypto.html#crypto_crypto_generatekeypair_type_options_callback
const crypto = require('crypto');

// https://github.com/digitalbazaar/forge#x509
var forge = require('node-forge');

console.log("Fetching Password.");

keytar.getPassword("ServiceDeskQueueChangeAlert", currentOSUserName).then((pw) => {

  console.log(pw)
  if (!pw) {
    console.log("Generating Password.");
    // https://www.codota.com/code/javascript/modules/node-forge
    keytar.setPassword("ServiceDeskQueueChangeAlert", currentOSUserName, "pw");
    pw = "pw";
  }
  console.log("Password is " + pw + " for user " + currentOSUserName);

});


const password = crypto.randomBytes(64).toString('hex').toUpperCase();;


var keys = forge.pki.rsa.generateKeyPair(2048);


let certificate = forge.pki.createCertificate();
let {privateKey} = keys;

var encKey = forge.pki.encryptRsaPrivateKey(privateKey, password);


certificate.publicKey = keys.publicKey;
certificate.serialNumber = crypto.randomBytes(16).toString('hex').toUpperCase();
certificate.validity.notBefore = new Date();
certificate.validity.notBefore.setDate(certificate.validity.notBefore.getDate() - 1);
certificate.validity.notAfter = new Date();
certificate.validity.notAfter.setFullYear(certificate.validity.notAfter.getFullYear() + 2);


var attrs = [{
  name: 'commonName',
  value: 'localhost'
}];

const extensions = [{
  name: 'basicConstraints',
  cA: true
}, {
  name: 'keyUsage',
  keyCertSign: true,
  digitalSignature: true,
  nonRepudiation: true,
  keyEncipherment: true,
  dataEncipherment: true
}, {
  name: 'extKeyUsage',
  serverAuth: true,
  clientAuth: true,
  codeSigning: true,
  emailProtection: true,
  timeStamping: true
}, {
  name: 'nsCertType',
  client: true,
  server: true,
  email: true,
  objsign: true,
  sslCA: true,
  emailCA: true,
  objCA: true
}, {
  name: 'subjectAltName',
  altNames: [{
    type: 6, // URI
    value: 'https://localhost:33457/dev'
  }, {
    type: 7, // IP
    ip: '127.0.0.1'
  }]
}, {
  name: 'subjectKeyIdentifier'
}];

certificate.setSubject(attrs);
certificate.setIssuer(attrs);
certificate.setExtensions(extensions);

certificate.sign(privateKey, forge.md.sha256.create());


let certPEM = forge.pki.certificateToPem(certificate);
let privateKeyPEM = encKey;//forge.pki.privateKeyToPem(encKey);

let publicKeyPEM = forge.pki.publicKeyToPem(keys.publicKey);
console.log("rrr");

fs.writeFileSync('./privatekey.pem', privateKeyPEM);
fs.writeFileSync('./cert.pem', certPEM);
fs.writeFileSync('./publickey.pem', publicKeyPEM);
fs.writeFileSync('./password.txt', password);

rest.get('/dev', function(req, res) {
  res.send('hello world');
});

https.createServer({
  key: fs.readFileSync('./privatekey.pem'),
  cert: fs.readFileSync('./cert.pem'),
  passphrase: fs.readFileSync('./password.txt', "utf8")
}, rest)
.listen(port, () => console.log(`Chrome extension connector listening on port ${port}!`));

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

