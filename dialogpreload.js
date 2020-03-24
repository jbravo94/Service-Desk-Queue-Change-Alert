// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const fs = require('fs');
const { shell } = require('electron')
const Config = require('./config');

const URL = require('url').URL;

function closeCurrentWindow() {
  var window = require('electron').remote.getCurrentWindow();
  window.close();
};

window.addEventListener('DOMContentLoaded', () => {

  document.getElementById('close').addEventListener('click', () => {
    closeCurrentWindow();
  });

  fs.readFile('config.json', 'utf8', function(err, contents) {

    if (err) {
      alert("An error occured while reading JSON Object to File.");
      return console.log(err);
    }

    var config = new Config();
    config.loadConfigFromString(contents);

    document.getElementById('openQueue').addEventListener('click', () => {

      var https = require('https');

      //var cookie = `JSESSIONID=${config.jsessionid}; crowd.token_key="cKzuvexMtAZwEOUUr3UKSgAAAAAAAIACamhlaW56bA"; celix-proxy.sid=s%3A-l8mZQCXwNlTXoYwYQLKlGGFJTTSKXKx.CTa749G7a94%2Fbd1GA6cFn%2FErf6jquUzIR3l%2BDCb9fiI`;
      
      //var client = https.createClient(443, 'jira.celix.at');
      
      var headers = {
        'Content-Type': 'application/json'
      };


      if (config.crowdTokenKey) {
        var cookie = `crowd.token_key=${config.crowdTokenKey}`;
        headers['Cookie'] = cookie;
      } else {
        headers["Authorization"] = "Basic " + btoa(config.username + ":" + config.password);
      }

      
      //var request = client.request('GET', `/rest/servicedeskapi/servicedesk/${config.serviceDeskId}/queue/${config.queueId}?includeCount=true`, headers);
      

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
          
          setTimeout(function() {
            closeCurrentWindow();
          }, 1000);

        })
      });
      
      req.on('error', (e) => {
        console.error(e);
      });

      req.end();

      /*var headers = {};

      if (config.crowdTokenKey) {
        headers["cookie"] = `JSESSIONID=${config.jsessionid}`;
      } else {
        headers["Authorization"] = "Basic " + btoa(config.username + ":" + config.password);
      }

      $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        headers: headers,
        success: function(res) {
          
          console.log(res);

          var url = `${config.baseurl}/projects/${res.projectKey}/queues/custom/${config.queueId}`;
          shell.openExternal(url);
          
          setTimeout(function() {
          closeCurrentWindow();
          }, 1000);

        },
        error: function(res) {
          
          alert(JSON.stringify(res));

        }
    });*/

      
    });
});

});