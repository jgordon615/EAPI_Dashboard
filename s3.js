function Secure(webRequest, publicKey, privateKey, userToken) {
	var now = new Date();
	var h = now.getUTCHours();
	var date = (now.getUTCMonth() + 1) + "/" + now.getUTCDate() + "/" + now.getUTCFullYear() + " " + (h - (h > 12 ? 12 : 0)) + ":" + now.getUTCMinutes() + ":" + now.getUTCSeconds() + " " + (h > 12 ? "PM" : "AM");

	if (!webRequest.requestHeaders) {
		webRequest.requestHeaders = [];
	}

	webRequest.requestHeaders.push({
		name: "x-eapi-date",
		value: date
	});

	if (userToken) {
		webRequest.requestHeaders.push({
			name: "x-eapi-usertoken",
			value: userToken
		});
	}

	var hash = CreateHash(webRequest, privateKey);
	var auth = "EAPI " + publicKey + ":" + hash;

	webRequest.requestHeaders.push({
		name: "authorization",
		value: auth
	});
	
	return webRequest;
}

function CreateHash(webRequest, privateKey) {
	var plainText = BuildSecurityContext(webRequest);
	var cypherText = Crypto.HMAC(Crypto.SHA256, plainText, privateKey); //Sha256mac(privateKey, plainText);

	consoleLogOnCurrentTab("PlainText: " + plainText.replace(/\n/g, "\\\\n"));
	//console.log("PlainText: " + plainText.replace(/\n/g, "\\n"));
	//console.log("CipherText: " + cypherText);
	//console.log("PrivateKey: " + privateKey.toString());

	return cypherText;
}

function BuildSecurityContext(webRequest) {
	var template
		= "{0}\n"   //verb
		+ "{1}\n"   //contentmd5
		+ "{2}\n"   //contenttype
		+ "\n"
		+ "{3}\n"   //eapiHeaders
		+ "{4}";    //resource

	// Since this is only for the omnibox, there will never be POSTed data
	// so we skip the MD5 portion of the S3 algorithm.
	var contentMd5 = "";

	var eapiHeaders = [],
		foundContentType = false;

	for (var i = 0; i<webRequest.requestHeaders.length; i++){
		var header = webRequest.requestHeaders[i];
		
		if (header.name.match(/^x-eapi/)) {
			eapiHeaders.push(header.name + ":" + header.value);
		}
		
		if (header.name.match(/Content-Type/i)) {
			foundContentType = true;
			plainText = plainText.replace(/\{2\}/g, header.value);
		}
		
		if (header.name === "Accept") {
			header.value = "*/*";
		}
	}
	eapiHeaders.sort();

	var plainText = template;

	plainText = plainText.replace(/\{0\}/g, webRequest.method);
	plainText = plainText.replace(/\{1\}/g, contentMd5);

	if (!foundContentType) {
		webRequest.requestHeaders.push({
			name: "Content-Type",
			value: "application/json"
		});
		plainText = plainText.replace(/\{2\}/g, "application/json");
	}
	
	plainText = plainText.replace(/\{3\}/g, eapiHeaders.join("\n"));
	
	var url = parseUri(webRequest.url);
	plainText = plainText.replace(/\{4\}/g, url.relative.trim());

	return plainText;
}