// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const fs = require('fs');
const https = require('https');
const express = require('express');
const basicAuth = require('express-basic-auth');
const forge = require('node-forge');

const URL = require('url').URL;

const { BrowserWindow, shell } = require('electron').remote;

const Config = require('./config');
const { startServerWithCrypto, getPasswordFromOSKeyStore } = require('./authFactory');

const rest = express();
const port = 33457;

var intervalObj = null;
var issueQueueCount = null;
var previousIssueQueueCount = null;
var win = null;

var DEV_MODE = false;
var DEV_INTERVAL = DEV_MODE ? 1 : 60;
var config = new Config();

var plainChromeExtensionPassword = null;

rest.use(express.json());

function loadConfig(callback) {
  fs.readFile('config.json', 'utf8', function (err, contents) {

    if (err) {
      alert("An error occured while reading JSON Object to File.");
      return console.log(err);
    }

    config.loadConfigFromString(contents);

    // verify with decryption

    /*


//var key = forge.pkcs5.pbkdf2('password', port, numIterations, 16);


// encrypt some bytes using CBC mode
// (other modes include: ECB, CFB, OFB, CTR, and GCM)
// Note: CBC and ECB modes use PKCS#7 padding as default
var cipher = forge.cipher.createCipher('AES-CBC', key);
cipher.start({iv: port});
cipher.update(forge.util.createBuffer(someBytes));
cipher.finish();
var encrypted = cipher.output;
// outputs encrypted hex
console.log(encrypted.toHex());

// decrypt some bytes using CBC mode
// (other modes include: CFB, OFB, CTR, and GCM)
var decipher = forge.cipher.createDecipher('AES-CBC', key);
decipher.start({iv: iv});
decipher.update(encrypted);
var result = decipher.finish(); // check 'result' for true/false
// outputs decrypted hex
console.log(decipher.output.toHex());
    */

    plainChromeExtensionPassword = config.chromeExtensionPassword;

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

  loadConfig(function () {
    config.setFormValues();
    enableInterval();
  });

  document.getElementById("save").addEventListener('click', () => {

    var config = new Config();
    config.getFormValues();

    config.save(null, function() {alert("Config has been saved.");});
  });

  $('#installChromeExtension').click(function () {
    const chromeExtensionUrl = 'https://chrome.google.com/webstore/detail/oaihfnoiihagifdgcdagfkecnafncefh';
    shell.openExternal(chromeExtensionUrl);
    //shell.openItem('./extension/cookieextractor.crx');
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
        alert.error("Error occured: " + JSON.stringify(e));
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

  if (!plainChromeExtensionPassword) {
    throw new Error("Chrome extension not authorized. Aborted.");
  }

  alert("dd");


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

      configC.save(null, function() {
        config = configC;
        config.setFormValues();

        console.log("Config has been saved.");
        res.send({ message: "OK" });
      });

    });

  } else {
    throw new Error("Token missing in payload.");
  }
});

// TODO
// https://github.com/jaredhanson/oauth2orize
// https://developer.chrome.com/apps/app_identity#non

// https://oauth.net/code/nodejs/
// https://developer.okta.com/blog/2019/08/22/okta-authjs-pkce/?utm_campaign=text_website_all_multiple_dev_dev_oauth-pkce_null&utm_source=oauthio&utm_medium=cpc

var newsalt = '';

rest.post('/authorizechromeextension', function (req, res) {
  newsalt = '';
  if (req.body && req.body.salt) {
    console.log(req.body.salt);
    var md = forge.md.sha256.create();

    newsalt = forge.util.bytesToHex(forge.random.getBytesSync(10)).toUpperCase();
    var digest = md.update(req.body.salt).digest().toHex();

    var stringtocompare = forge.util.bytesToHex(forge.random.getBytesSync(4)).toUpperCase();

    res.send({
      newsalt: newsalt,
      digest: digest,
      stringtocompare: stringtocompare
    });

    alert(stringtocompare.split('').join(' '));
  }

});

rest.post('/authorizechromeextensiontoken', function (req, res) {

  if (req.body) {

    var data = req.body;

    var respdigest = data.digest;
    var md = forge.md.sha256.create();
    var newdigest = md.update(newsalt).digest().toHex();

    var salt = data.salt;

    if (respdigest === newdigest) {
      var newpassword = forge.util.bytesToHex(forge.random.getBytesSync(16)).toUpperCase();

      var md2 = forge.md.sha256.create();

      var prepayload = { salt: salt, password: newpassword };

      var digest = md2.update(prepayload).digest().toHex();

      var payload = {
        salt: prepayload.salt,
        password: prepayload.password,
        digest: digest
      };


      fs.readFile('config.json', 'utf8', function (err, contents) {

        if (err) {
          console.log("An error occured while writing JSON Object to File.");
          throw new Error(err);
        }

        var configC = new Config();
        configC.loadConfigFromString(contents);
        configC.chromeExtensionPassword = newpassword;

        configC.save(null, function() {
            rest.use(basicAuth({
            users: {
              'chromeext': plainChromeExtensionPassword
            },
            challenge: true
          }));
        });

  

      });


      newsalt = '';
      res.send(payload);
    }

  }
  newsalt = '';
  res.send({ message: "Digests not matching. Aborted." });
});

rest.get('/test', function (req, res) {
  res.send('hello world');
});

rest.use('/extension', express.static(__dirname + '/extension'));

// const filehosting = express();

// filehosting.use('/extension', express.static(__dirname + '/extension'));

/*
filehosting.get('/cookieextractor.crx', function (req, res) {
  res.download('./cookieextractor.crx', 'cookieextractor.crx'); 
});
*/

// http://localhost:33458/cookieextractor/updates.xml

// filehosting.listen(filehostingport, () => console.log(`Chrome extension hosting listening on port ${filehostingport}!`))

loadConfig(function () {

  if (plainChromeExtensionPassword) {
    rest.use(basicAuth({
      users: {
        'chromeext': plainChromeExtensionPassword
      },
      challenge: true
    }));
  } else {
    rest.use(basicAuth({
      users: {
        'authorize': 'supersecret'
      },
      challenge: true
    }));
  }

  startServerWithCrypto(
    (encKey, cert, password) => https.createServer({
      key: encKey,
      cert: cert,
      passphrase: password
    }, rest)
      .listen(port, () => console.log(`Chrome extension connector listening on port ${port}!`))
  );



});