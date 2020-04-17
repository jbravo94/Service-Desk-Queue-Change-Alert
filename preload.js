// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const fs = require('fs');
const Config = require('./config');
const { BrowserWindow } = require('electron').remote;
var https = require('https');
const URL = require('url').URL;
const express = require('express');
const rest = express();
const port = 33457;

const basicAuth = require('express-basic-auth');

rest.use(basicAuth({
    users: { 'chromeext': 'supersecret' }
}));

rest.use(express.json());

var intervalObj = null;
var issueQueueCount = null;
var previousIssueQueueCount = null;
var win = null;

var DEV_MODE = false;
var DEV_INTERVAL = DEV_MODE ? 1 : 60;

var config = new Config();

function loadConfig(callback) {
  fs.readFile('config.json', 'utf8', function (err, contents) {

    if (err) {
      alert("An error occured while reading JSON Object to File.");
      return console.log(err);
    }

    config.loadConfigFromString(contents);
    callback();

  });
}

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }

  loadConfig(function(){
    config.setFormValues();
    enableInterval();
  });

  document.getElementById("save").addEventListener('click', () => {

    var config = new Config();
    config.getFormValues();

    fs.writeFile("config.json", JSON.stringify(config), 'utf8', function (err) {
      if (err) {
        alert("An error occured while writing JSON Object to File.");
        return console.log(err);
      }

      alert("Config has been saved.");
    });
  });

  
  $('#enableFunctionality').change(function () {

    if ($(this).is(':checked')) {

      enableInterval();
      
    } else {
      clearInterval(intervalObj);
    }
  });


function enableInterval() {
  intervalObj = setInterval(() => {

    var headers = {
      'Content-Type': 'application/json',
      'X-ExperimentalApi': 'opt-in'
    };

    if (config.crowdTokenKey) {
      var cookie = `crowd.token_key=${config.crowdTokenKey}`;
      headers['Cookie'] = cookie;
    } else {
      headers["Authorization"] = "Basic " + btoa(config.username + ":" + config.password);
    }

    var hostname = new URL(config.baseurl).hostname;

    const options = {
      hostname: hostname,
      port: 443,
      path: `/rest/servicedeskapi/servicedesk/${config.serviceDeskId}/queue/${config.queueId}?includeCount=true`,
      method: 'GET',
      headers: headers
    };

    var bodyBuffer = [];

    const req = https.request(options, (res) => {
      console.log('statusCode:', res.statusCode);
      console.log('headers:', res.headers);

      res.on('data', (d) => {

        bodyBuffer = bodyBuffer.concat(d);
      });

      res.on('end', () => {

        var body = JSON.parse(bodyBuffer.toString());
        console.log(body);
        console.log('No more data in response.');

        processResponse(body.issueCount);

      })
    });

    req.on('error', (e) => {
      alert.error(JSON.stringify(e));
    });

    req.end();
  }, config.interval * DEV_INTERVAL * 1000);
}
})

function processResponse(issueQueueCount) {
  if (previousIssueQueueCount != null && issueQueueCount > previousIssueQueueCount) {
    if (win == null) {
      openDialog();
    } else {
      console.log("Windows already open.");
    }
  }
  previousIssueQueueCount = issueQueueCount;
}

function openDialog() {
  //https://www.christianengvall.se/electron-show-messagebox/

  win = new BrowserWindow({
    width: 540,
    height: 200,
    center: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: `${__dirname}/dialogpreload.js`
    }
  });

  win.on('closed', () => {
    win = null
  })

  win.loadURL(`file://${__dirname}/dialog.html`)
}

rest.post('/setcrowdtokenkey', function (req, res) {

  if (req.body && req.body.crowdtokenkey) {

    const token = req.body.crowdtokenkey;

    fs.readFile('config.json', 'utf8', function (err, contents) {

      if (err) {
        console.log("An error occured while writing JSON Object to File.");
        throw new Error(err);
      }

      var configC = new Config();
      configC.loadConfigFromString(contents);
      configC.crowdTokenKey = token;

      fs.writeFile("config.json", JSON.stringify(configC), 'utf8', function (err) {
        if (err) {
          console.log("An error occured while writing JSON Object to File.");
          throw new Error(err);
        }
  
        config = configC;
        config.setFormValues();

        console.log("Config has been saved.");
        res.send({message: "OK"});
      });

    });
  
  } else {
    throw new Error("Token missing in payload.");
  }
});

rest.listen(port, () => console.log(`Chrome extension connector listening on port ${port}!`));
