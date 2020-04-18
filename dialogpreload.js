// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const fs = require('fs');
const https = require('https');
const URL = require('url').URL;

const { shell } = require('electron');

const Config = require('./config');

function closeCurrentWindow() {
  var window = require('electron').remote.getCurrentWindow();
  window.close();
};

window.addEventListener('DOMContentLoaded', () => {

  document.getElementById('close').addEventListener('click', () => {
    closeCurrentWindow();
  });

  fs.readFile('config.json', 'utf8', function (err, contents) {

    if (err) {
      alert("An error occured while reading JSON Object to File.");
      return console.log(err);
    }

    var config = new Config();
    config.loadConfigFromString(contents);

    document.getElementById('openQueue').addEventListener('click', () => {

      var headers = {
        'Content-Type': 'application/json'
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
        path: `/rest/servicedeskapi/servicedesk/${config.serviceDeskId}`,
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

          var url = `${config.baseurl}/projects/${body.projectKey}/queues/custom/${config.queueId}`;
          shell.openExternal(url);

          setTimeout(function () {
            closeCurrentWindow();
          }, 1000);

        })
      });

      req.on('error', (e) => {
        console.error(e);
      });

      req.end();
    });
  });
});