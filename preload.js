// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const fs = require('fs');
const Config = require('./config');
const { BrowserWindow } = require('electron').remote;
var https = require('https');
const URL = require('url').URL;


var intervalObj = null;
var issueQueueCount = null;
var previousIssueQueueCount = null;
var win = null;

var DEV_MODE = false;
var DEV_INTERVAL = DEV_MODE ? 1 : 60;

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }

  fs.readFile('config.json', 'utf8', function (err, contents) {
    var config = new Config();
    config.loadConfigFromString(contents);
    config.setFormValues();

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

      fs.readFile('config.json', 'utf8', function (err, contents) {
        var config = new Config();
        config.loadConfigFromString(contents);

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
            console.error(e);
          });

          req.end();
        }, config.interval * DEV_INTERVAL * 1000);
      });
    } else {
      clearInterval(intervalObj);
    }
  });
})

function processResponse(issueQueueCount) {
  if (previousIssueQueueCount != null && issueQueueCount !== previousIssueQueueCount) {
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