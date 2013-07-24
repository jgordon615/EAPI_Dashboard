(function() {
	var qry = { active: true, currentWindow:true, windowType: "normal" };

	function Environment(name, address) {
		var that = this;
		this.name = ko.observable(name || "");
		this.address = ko.observable(address || "");
	}
	function ApiKey(publicKey, privateKey) {
		var that = this;
		this.publicKey = ko.observable(publicKey || "");
		this.privateKey = ko.observable(privateKey || "");
	}
	function loadDefaultEnvironments() {
		return [
			new Environment("devapi", "https://devapi.takecarehealth.com/testharness"),
			new Environment("dev-qa", "http://phl-qa-web01.hwwin.local:3000/"),
			new Environment("bpo1", "http://bna-os-qa02.bpohwwin.com:3000/testharness"),
			new Environment("bpo2", "http://tch-s8mp-3wb.bpohwwin.com:443/testharness"),
			new Environment("api", "https://api.takecarehealth.com/testharness")
		];
	}
	
	function initEnvironments() {
		var loaded = localStorage.getItem("environments");
		if (loaded) {
			vm.environments = ko.mapping.fromJSON(loaded);
		} else {
			vm.environments = new ko.observableArray(loadDefaultEnvironments());
		}
	}
	
	function setApiKey(key) {
		chrome.tabs.query(qry, function (tabs) {
			if (tabs && tabs.length > 0){
				var tab = tabs[0];
				
				var script = "document.getElementById('uxPublicKey').value = '" + key.publicKey() + "';" +
							 "document.getElementById('uxPrivateKey').value = '" + key.privateKey() + "';";
				
				chrome.tabs.executeScript(tab.id, { code: script }, function(results) {
					window.close();
				});
			}
		}); 
	}
	
	function initApiKeys() {
		var loaded = localStorage.getItem("apiKeys");
		if (loaded) {
			vm.apiKeys = ko.mapping.fromJSON(loaded);
		} else {
			vm.apiKeys = new ko.observableArray([]);
		}
		
		vm.setApiKey = setApiKey;
	}
	var vm = {
		optionsUrl: chrome.extension.getURL("options.html")
	};
	
	initEnvironments();
	initApiKeys();
	
	$(document).ready(function() {
		chrome.tabs.query(qry, function (tabs) {
			if (tabs && tabs.length > 0){
				var tab = tabs[0];
				
				vm.showApiKeys = !!tab.url.match(/static\/s3\/S3FromJavascript\.htm/);
				ko.applyBindings(vm);
			}
		});
		
		
	});
}());