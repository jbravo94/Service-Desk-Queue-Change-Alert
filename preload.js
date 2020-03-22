// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const fs = require('fs');
const Config = require('./config');
const { dialog, BrowserWindow } = require('electron').remote;
const { app } = require('electron').remote;
const { net } = require('electron').remote;
//const Cookies = require('./js.cookie-2.2.1.min.js');

const { session } = require('electron').remote;

const URL = require('url').URL;


var intervalObj = null;

var issueQueueCount = null;
var previousIssueQueueCount = null;

var win = null;

var DEV_MODE = true;
var DEV_INTERVAL = DEV_MODE ? 1 : 60;

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }

  fs.readFile('config.json', 'utf8', function(err, contents) {
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

$('#enableFunctionality').change(function() {

  if($(this).is(':checked')) {

    fs.readFile('config.json', 'utf8', function(err, contents) {
      var config = new Config();
      config.loadConfigFromString(contents);
    
      intervalObj = setInterval(() => {

      

      var url = `${config.baseurl}/rest/servicedeskapi/servicedesk/${config.serviceDeskId}/queue/${config.queueId}?includeCount=true`


      const filter = {
        urls: ['http://*/*', 'https://*/*']
      };
      /*
        session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
            details.requestHeaders['X-ExperimentalApi'] = 'opt-in';
            details.requestHeaders["Authorization"] = "Basic " + btoa(config.username + ":" + config.password);
            callback({ cancel: false, requestHeaders: details.requestHeaders })
        })

        const cookie = { url: 'https://jira.celix.at', name: 'JSESSIONID', value: config.jsessionid };
        session.defaultSession.cookies.set(cookie);

        const request = net.request({"url": url,
        "method": "GET",
        "session": session
      })
      request.on('response', (response) => {
        console.log(`STATUS: ${response.statusCode}`)
        console.log(`HEADERS: ${JSON.stringify(response.headers)}`)
        response.on('data', (chunk) => {
          console.log(`BODY: ${chunk}`)
        })
        response.on('end', () => {
          console.log('No more data in response.')
        })
      })
      request.end()*/

      var https = require('https');

      //var cookie = `JSESSIONID=${config.jsessionid}; crowd.token_key="cKzuvexMtAZwEOUUr3UKSgAAAAAAAIACamhlaW56bA"; celix-proxy.sid=s%3A-l8mZQCXwNlTXoYwYQLKlGGFJTTSKXKx.CTa749G7a94%2Fbd1GA6cFn%2FErf6jquUzIR3l%2BDCb9fiI`;
      
      //var client = https.createClient(443, 'jira.celix.at');
      
      var headers = {
          'Content-Type': 'application/json',
          'X-ExperimentalApi': 'opt-in'
      };


      var hostname = new URL(config.baseurl).hostname;


      if (config.crowdTokenKey) {
        var cookie = `crowd.token_key=${config.crowdTokenKey}`;
        headers['Cookie'] = cookie;
      } else {
        headers["Authorization"] = "Basic " + btoa(config.username + ":" + config.password);
      }

      var hostname = new URL(config.baseurl).hostname;

      //var request = client.request('GET', `/rest/servicedeskapi/servicedesk/${config.serviceDeskId}/queue/${config.queueId}?includeCount=true`, headers);
      
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


      
      
      /*var headers = {
      };

      headers["Authorization"] = "Basic " + btoa(config.username + ":" + config.password);

      console.log("TTT");

      var burl = "https://jira.celix.at/rest/api/2/search?maxResults=-1&fields=summary&jql=project%20%3D%20CSD%20AND%20assignee%20is%20EMPTY%20and%20resolution%20is%20EMPTY%20";
      
      
      $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        headers: headers,
        success: function(res) {
          
          console.log(res);

          //processResponse(res.total);
          processResponse(res.issueCount);

        },
        error: function(res) {
          
          alert(JSON.stringify(res));

        }
      });*/

      
      /*var headers = {'X-ExperimentalApi': 'opt-in'};



      if (config.jsessionid) {
        //headers["cookie"] = `JSESSIONID=${config.jsessionid}`;
        //document.cookie = `JSESSIONID=${config.jsessionid}`;
        //Cookies.set('JSESSIONID', config.jsessionid);

        const cookie = { url: 'https://jira.celix.at', name: 'JSESSIONID', value: config.jsessionid }
        session.defaultSession.cookies.set(cookie)
          .then(() => {
            // success
          }, (error) => {
            console.error(error)
          })

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

          processResponse(res);

        },
        error: function(res) {
          
          alert(JSON.stringify(res));

        }
      });

      */


      }, config.interval * DEV_INTERVAL * 1000);
    });

    
  } else {
    clearInterval(intervalObj);
  }

});


})


function processResponse(issueQueueCount) {
  //var issueQueueCount = res.issueCount;
            if(previousIssueQueueCount != null &&  issueQueueCount !== previousIssueQueueCount) {
          
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


// Oder eine lokale HTML Datei
win.loadURL(`file://${__dirname}/dialog.html`)


  /*const options = {
    type: 'question',
    //icon: 'window.png'
    buttons: ['Close', 'Open queue'],
    defaultId: 0,
    title: 'Question',
    message: 'Do you want to do this?',
    detail: 'It does not really matter'
  };

  dialog.showMessageBox(new BrowserWindow({
    show: false,
    alwaysOnTop: true
  }), options, (response) => {
    console.log(response);
  });*/
}