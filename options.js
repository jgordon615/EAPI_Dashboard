(function() {
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
			new Environment("devapi", "https://devapi.takecarehealth.com/testharness")
		];
	}
	
	function initEnvironments() {
		vm.newEnvironment = function() {
			vm.environments.push(new Environment());
		};
		vm.deleteEnvironment = function(env) {
			vm.environments.remove(env);
		};
		
		vm.saveEnvironments = function() {
			var toSave = ko.mapping.toJSON(vm.environments);
			localStorage.setItem("environments", toSave);
			alert("Save successful");
		};
		
		vm.resetEnvironments = function() {
			if (confirm("Are you sure?\n\nThis will delete all environments and restore the defaults.")) {
				vm.environments(loadDefaultEnvironments());
				vm.saveEnvironments();
			}
		};

		var loaded = localStorage.getItem("environments");
		if (loaded) {
			vm.environments = ko.mapping.fromJSON(loaded);
		} else {
			vm.environments = new ko.observableArray(loadDefaultEnvironments());
			vm.saveEnvironments();
		}
	}
	
	function initApiKeys() {
		var loaded = localStorage.getItem("apiKeys");
		if (loaded) {
			vm.apiKeys = ko.mapping.fromJSON(loaded);
		} else {
			vm.apiKeys = new ko.observableArray([]);
		}
		
		var active = localStorage.getItem("activeApiKey");
		vm.activeApiKey = new ko.observable(active || "");
		
		
		vm.newApiKey = function() {
			vm.apiKeys.push(new ApiKey());
		};
		vm.deleteApiKey = function(key) {
			vm.apiKeys.remove(key);
		};
		
		vm.saveApiKeys = function() {
			var toSave = ko.mapping.toJSON(vm.apiKeys);
			localStorage.setItem("apiKeys", toSave);
			localStorage.setItem("activeApiKey", vm.activeApiKey());
			alert("Save successful");
		};
		
		vm.resetApiKeys = function() {
			if (confirm("Are you sure?\n\nThis will delete all your ApiKeys.")) {
				vm.activeApiKey("");
				vm.apiKeys([]);
				vm.saveApiKeys();
			}
		};
		
		vm.couchLocation = ko.observable("");
		vm.loadApiKeysFromCouch = function() {
			var url = (vm.couchLocation() || "http://localhost:5984") + "/apikeys/_design/keys/_view/byPublic";
			
			if (!url.match(/^http/i)) {
				alert("Invalid CouchDB url.  It doesn't start with http or https");
				return;
			}
			
			$.ajax({
				url: url,
				success: function(data) {
					vm.apiKeys([]);
					
					for(var i=0; i<data.rows.length; i++){
						var row = data.rows[i];
						var pub = row.key;
						var priv = row.value.privateKey;
						
						vm.apiKeys.push(new ApiKey(pub, priv));
					}
					
					vm.saveApiKeys();
				},
				error: function(jqXHR, textStatus, errorThrown) {
					console.log("jqXHR", jqXHR);
					console.log("textStatus", textStatus);
					console.log("errorThrown", errorThrown);
					
					alert("Attempt to load couch data failed.\n\nURL: " + url);
				},
				dataType: 'json'
			});
		};
	}
	var vm = {};
	
	initEnvironments();
	initApiKeys();
	
	
	$(document).ready(function() {
		ko.applyBindings(vm);
	});
}());