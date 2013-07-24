"use strict";
var urls = null;

var loaded = localStorage.getItem("environments");
if (loaded) {
	var envs = JSON.parse(loaded);
	
	urls = envs.map(function(x) { 
		var add = parseUri(x.address);
		return "*://" + add.host + "/*"; 
	});
	
	urls.push("*://ssotest.walgreens.com/*");
	urls.push("*://sso.walgreens.com/*");
	
	console.log(urls);
} else {
	urls = ["<all_urls>"];
}


if (urls.length > 0) {
	chrome.webRequest.onBeforeSendHeaders.addListener(
		injectS3Header, 
		{ 
			urls: urls/*, 
			types: ["main_frame"]*/
		}, 
		["blocking", "requestHeaders"]
	);
}

function executeScriptOnCurrentTab(script) {
	var qry = { active: true, currentWindow:true };
	chrome.tabs.query(qry, function (tabs) {
		if (tabs && tabs.length > 0){
			var tab = tabs[0];
			console.log(script);
			chrome.tabs.executeScript(tab.id, { code: script });
		}
	}); 
}
function consoleLogOnCurrentTab(message) {
	var script = "console.log(\"" + message + "\");";
	executeScriptOnCurrentTab(script);
}

function injectS3Header(details) {
    var applyS3 = true,
        listenForResponse = true;
    if (
  		details.url.match(/\/login/)
    ) {
        applyS3 = false;
    } else if ( // Totally ignore these requests
		details.url.match(/sso\.walgreens\.com/) ||
		details.url.match(/ssotest\.walgreens\.com/) ||
		details.url.match(/\/auth/) ||
		details.url.match(/\/static\//)
	) {
	    return;
	}
	
	if (listenForResponse) {
		console.log("Adding listener", details.tabId, details.url);
    	chrome.webRequest.onCompleted.addListener(requestCompleteHandler({
    		forUrl: details.url,
    		callingTabId: details.tabId
    	}), { urls: urls });
	}
	
	if (applyS3) {
    	var activeApiKeyName = localStorage.getItem("activeApiKey");
    	var key;
    	
    	var loaded = localStorage.getItem("apiKeys");
    	if (loaded) {
    		var keys = JSON.parse(loaded);
    		var matchingKeys = keys.filter(function(x) { return x.publicKey === activeApiKeyName; });
    		if (matchingKeys && matchingKeys.length > 0)
    			key = matchingKeys[0];
    	}
    
    	if (!key) {
    		consoleLogOnCurrentTab("EAPI Dashboard: No active API key set.  Use the OPTIONS page to set one.");
    		return null;
    	}
    	
    	var newHeaders = Secure(details, key.publicKey, key.privateKey, localStorage.getItem("userToken") || "");
	    return { requestHeaders: newHeaders.requestHeaders };
    }
     
    return null;
}

function requestCompleteHandler(options) {
	function cleanUp(tabId, handler) {
		if (tabId) {
			setTimeout(function() {
				chrome.tabs.remove(tabId);
			}, 100);
		}
		if (handler) {
			chrome.webRequest.onCompleted.removeListener(handler);
		}
	}
	return function requestComplete(details) {
		if (details.url.match(/favicon\.ico/)) {
			return;
		}
		
		console.log("COMPLETE", details.statusCode, details.url);

		if (details.url.match(/\/login\?REF=/)) {
			console.log("Login Success!");
			var script = "document.body.innerHTML.match(/\"token\"\: \"[a-z0-9]{8}(?:-[a-z0-9]{4}){3}-[a-z0-9]{12}\"/i)";
			
			chrome.tabs.executeScript(details.tabId, { code: script }, function(response) {
				if (response && response[0]) {
					var str = "{" + response[0] + "}";
					var json = JSON.parse(str);
					localStorage.setItem("userToken", json.token);
					
					console.log("Extracted user token: " + json.token);
					
					if (options.callingTabId) {
						chrome.tabs.reload(options.callingTabId);
					}
				}
				return cleanUp(details.tabId, null);
			});
			return cleanUp(null, requestComplete);
		}
		
		if (details.statusCode === 401) {
			
			var txt = "401 Returned from server: " + details.statusLine + " " + details.url;
			consoleLogOnCurrentTab(txt);
			
			if (confirm(txt + "\n\nAttempt to authenticate now?")) {
				var requestUrl = parseUri(details.url);
				var authUrl = requestUrl.protocol + "://" + requestUrl.authority + "/auth";
				chrome.tabs.create({ 
					url: authUrl,
					active: false,
					openerTabId: options.callingTabId
				});
			}

			return cleanUp(null, requestComplete);
		}
		
		console.log("Request reached the end of handler.", details);
		return cleanUp(null, requestComplete);
	}
}