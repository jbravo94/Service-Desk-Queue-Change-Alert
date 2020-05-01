const os = require("os");
const keytar = require('keytar');
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
    certificate.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(16)).toUpperCase();
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


const getPasswordFromOSKeyStore = function () {
    return keytar.getPassword(appIdentifier, currentOSUserName);
};

const getPrivateKeyAndCertificate = async function () {

    var pw = await getPasswordFromOSKeyStore();

    if (!pw) {
        const password = forge.util.bytesToHex(forge.random.getBytesSync(64)).toUpperCase();

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


const getKeyFromPassword = function (password) {
    return forge.pkcs5.pbkdf2(password, "33457", 16, 16);
}

const encryptString = function (password, someBytes) {

    const key = getKeyFromPassword(password);

    // encrypt some bytes using CBC mode
    // (other modes include: ECB, CFB, OFB, CTR, and GCM)
    // Note: CBC and ECB modes use PKCS#7 padding as default
    var cipher = forge.cipher.createCipher('AES-CBC', key);
    cipher.start({iv: "3345733457334573"});
    cipher.update(forge.util.createBuffer(someBytes));
    cipher.finish();
    var encrypted = cipher.output;
    // outputs encrypted hex

    var encryptedHexString = forge.util.bytesToHex(encrypted.getBytes())
    return encryptedHexString;
}

const decryptString = function (password, encryptedHexString) {

    const encrypted = forge.util.hexToBytes(encryptedHexString);
    const key = getKeyFromPassword(password);

    // decrypt some bytes using CBC mode
    // (other modes include: CFB, OFB, CTR, and GCM)
    var decipher = forge.cipher.createDecipher('AES-CBC', key);
    decipher.start({iv: "3345733457334573"});
    decipher.update(forge.util.createBuffer(encrypted, 'raw'));
    var result = decipher.finish(); // check 'result' for true/false
    // outputs decrypted hex
    const decryptedString = decipher.output.toString();

    return decryptedString;
}
    

module.exports = {
    startServerWithCrypto: startServerWithCrypto,
    getPasswordFromOSKeyStore: getPasswordFromOSKeyStore,
    encryptString: encryptString,
    decryptString: decryptString,
};