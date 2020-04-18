const os = require("os");
const keytar = require('keytar');
const crypto = require('crypto');
const forge = require('node-forge');
const fs = require('fs');

const currentOSUserName = os.userInfo().username;

const appIdentifier = "ServiceDeskQueueChangeAlert";
const privateKeyFileName = "privatekey.pem";
const publicKeyFileName = "publickey.pem";
const certificateFileName = "cert.pem";

const getCrypto = function (password) {
    return {
        encryptedPrivateKeyPEM: fs.readFileSync('./' + privateKeyFileName),
        certificatePEM: fs.readFileSync('./' + certificateFileName),
        password: password
    };
};

const checkCrypto = function () {
    return fs.existsSync('./' + privateKeyFileName)
        && fs.existsSync('./' + publicKeyFileName)
        && fs.existsSync('./' + certificateFileName);
};

const generateCrypto = function (password) {

    var keys = forge.pki.rsa.generateKeyPair(2048);

    let certificate = forge.pki.createCertificate();
    let { privateKey } = keys;

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
            value: 'https://localhost:33457/setcrowdtokenkey'
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
    let privateKeyPEM = encKey;

    let publicKeyPEM = forge.pki.publicKeyToPem(keys.publicKey);

    fs.writeFileSync('./' + privateKeyFileName, privateKeyPEM);
    fs.writeFileSync('./' + certificateFileName, certPEM);
    fs.writeFileSync('./' + publicKeyFileName, publicKeyPEM);

    return {
        encryptedPrivateKeyPEM: encKey,
        certificatePEM: certPEM,
        password: password
    };

};

const getPrivateKeyAndCertificate = async function () {

    var pw = await keytar.getPassword(appIdentifier, currentOSUserName);

    if (!pw) {
        const password = crypto.randomBytes(64).toString('hex').toUpperCase();;

        // https://www.codota.com/code/javascript/modules/node-forge
        await keytar.setPassword(appIdentifier, currentOSUserName, password);
        pw = password;
    }

    if (checkCrypto()) {
        return getCrypto(pw);
    } else {
        return generateCrypto(pw);
    }
};

const startServerWithCrypto = async function (callback) {
    const { encryptedPrivateKeyPEM, certificatePEM, password } = await getPrivateKeyAndCertificate();

    callback(encryptedPrivateKeyPEM, certificatePEM, password);
};

module.exports = startServerWithCrypto;