class Config {

    constructor(baseurl, username, password, serviceDeskId, queueId, interval, crowdTokenKey, chromeExtensionPassword) {
        this.baseurl = baseurl;
        this.username = username;
        this.password = password;
        this.serviceDeskId = serviceDeskId;
        this.queueId = queueId;
        this.interval = interval;
        this.crowdTokenKey = crowdTokenKey;
        this.chromeExtensionPassword = chromeExtensionPassword;
      }

    getFormValues() {
      this.baseurl = document.getElementById("baseurl").value;
        this.username = document.getElementById("username").value;
        this.password = document.getElementById("password").value;
        //this.serviceDeskId = document.getElementById("serviceDeskId").innerText;
        //this.queueId = document.getElementById("queueId").innerText;
        this.serviceDeskId = document.getElementById("serviceDeskId").value;
        this.queueId = document.getElementById("queueId").value;
        this.interval = document.getElementById("interval").value;
        this.crowdTokenKey = document.getElementById("crowdTokenKey").value;
    }

    setFormValues() {
        document.getElementById("baseurl").value = this.baseurl;
        document.getElementById("username").value = this.username;
        document.getElementById("password").value = this.password;
        //this.serviceDeskId = document.getElementById("serviceDeskId").innerText;
        //this.queueId = document.getElementById("queueId").innerText;
        document.getElementById("serviceDeskId").value = this.serviceDeskId;
        document.getElementById("queueId").value = this.queueId;
        document.getElementById("interval").value = this.interval;
        document.getElementById("crowdTokenKey").value = this.crowdTokenKey;
    }

    loadConfigFromString(string) {
      var c = JSON.parse(string);
      this.baseurl = c.baseurl;
      this.username = c.username;
      this.password = c.password;
      this.serviceDeskId = c.serviceDeskId;
      this.queueId = c.queueId;
      this.interval = c.interval;
      this.crowdTokenKey = c.crowdTokenKey;
      this.chromeExtensionPassword = c.chromeExtensionPassword;
    }
}

module.exports = Config