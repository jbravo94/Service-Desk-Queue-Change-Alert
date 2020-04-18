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
const fs = require('fs');
const appIdentifier = "ServiceDeskQueueChangeAlert";
const privateKeyFileName = "privatekey.pem";
const publicKeyFileName = "publickey.pem";
const certificateFileName = "cert.pem";


const getCrypto = function(password) {

return {
    encryptedPrivateKeyPEM: fs.readFileSync('./' + privateKeyFileName),
    certificatePEM: fs.readFileSync('./' + certificateFileName),
    password: password
};

};

const checkCrypto = function() {
    return fs.existsSync('./' + privateKeyFileName) 
    && fs.existsSync('./' + publicKeyFileName) 
    && fs.existsSync('./' + certificateFileName);
};

const generateCrypto = function(password) {

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

fs.writeFileSync('./' + privateKeyFileName, privateKeyPEM);
fs.writeFileSync('./' + certificateFileName, certPEM);
fs.writeFileSync('./' + publicKeyFileName, publicKeyPEM);
//fs.writeFileSync('./password.txt', password);
/*fs.readFileSync('./privatekey.pem'),
  cert: fs.readFileSync('./cert.pem'),
  passphrase: fs.readFileSync('./password.txt', "utf8")*/
return {
    encryptedPrivateKeyPEM: encKey,
    certificatePEM: certPEM,
    password: password
};

};

const getPrivateKeyAndCertificate = async function() {
    console.log("Fetching Password.");

    var pw = await keytar.getPassword(appIdentifier, currentOSUserName);

        console.log(pw)
        if (!pw) {
            console.log("Generating Password.");
            const password = crypto.randomBytes(64).toString('hex').toUpperCase();;

            // https://www.codota.com/code/javascript/modules/node-forge
            await keytar.setPassword(appIdentifier, currentOSUserName, password);
            pw = password;
        }
        console.log("Password is " + pw + " for user " + currentOSUserName);

        if(checkCrypto()) {
            return getCrypto(pw);
        } else {
            return generateCrypto(pw);
        }

    
};

const startServerWithCrypto = async function(callback) {
    const { encryptedPrivateKeyPEM, certificatePEM, password } = await getPrivateKeyAndCertificate();
    console.log(encryptedPrivateKeyPEM);
    console.log(certificatePEM);
    console.log(password);
    callback( encryptedPrivateKeyPEM, certificatePEM, password );
};

module.exports = startServerWithCrypto;