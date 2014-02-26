### WordPressRest

A simple wrapper around wordpress REST api

### Options

* `wordpress_client_id` - registered wordpress app's client_id (default: 33813)
* `wordpress_client_secret` - registered wordpress app's client_secret (default: vFFYBzQXLUvLLhpnAAOKSB6xnuBa50SneYs5M17GhVVanPzek8OknY54SCEE2UzC)
* `wordpress_redirect_uri` - redirect url registered with wordpress app (default: http://localhost:3000/wordpress/authorized)
* `wordpress_access_token` - wordpress app's access_token (if null, user's will be redirected to wordpress) (default: null)
* `wordpress_protocol` - protocol to use to connect to wordpress (default: https)
* `wordpress_host` = hostname to use to connect to wordpress (default: public-api.wordpress.com)
* `wordpress_restversion` - rest version to use when calling wordpress api (default: /rest/v1)
* `wordpress_oauth2_authorize_uri` - Oauth2 authorize uri specified in wordpress api (default: /oauth2/authorize)
* `wordpress_oauth2_access_token_uri` - Oauth2 access_token url specified in wordpress api (default: /oauth2/token)
* `proxy` - if behind firewall http_proxy value to use (default: taken from 'http_proxy' environment variable)

### Example

##### wordpress.js

	var fs = require('fs');
	var os = require('os');
	var url = require('url');
	var http = require('http');
	var path = require('path');
	var querystring = require('querystring');
	var WordPressRest = require('wordpressrest');
	var DuplexBufferStream = require('duplexbufferstream');
	
	var dbfilename = process.env['HOME'] + '/.wordpressrest.js.db';
	try { var wordpress_access_token = JSON.parse(fs.readFileSync(dbfilename)).wordpress_access_token; } catch(e) {}
	var wordpressrest = new WordPressRest({'wordpress_access_token': wordpress_access_token});
	
	var server = http.createServer(function(req, res) {
	    var pathname = url.parse(req.url).pathname;
	    var apiresult = new DuplexBufferStream();
	
	    console.log(pathname);
	
	    if(pathname.match("/wordpress/authorize$")) {
		apiresult.pipe(res);
		wordpressrest.authorize(req, apiresult);
	    }
	    else if(pathname.match("/wordpress/authorized$")) {
		apiresult.on('finish', function(res, apiresult) {
		    var apiresultbuf = apiresult.read();
		    wordpress_access_token = JSON.parse(apiresultbuf.toString()).wordpress_access_token;
		    if(wordpress_access_token) {
			fs.writeFileSync(dbfilename, JSON.stringify({'wordpress_access_token': wordpress_access_token}));
			res.end(JSON.stringify({'oauth2': 'authorized'}));
		    }
		    else {
			res.end(apiresultbuf.toString());
		    }
		}.bind(this, res, apiresult));
		wordpressrest.get_access_token(req, apiresult);
	    }
	    else if(pathname.match("/wordpress")) {
		if(!wordpressrest.wordpress_access_token) {
		    var redirect_url = new url.Url();
		    redirect_url.pathname = '/wordpress/authorize';
		    res.writeHead(303, {
			'Location': url.format(redirect_url)
		    });
		    res.end();
		}
		else {
		    pathname = pathname.substring(pathname.indexOf('/', 1));
		    apiresult.pipe(res);
		    if(req.method == 'POST') {
			var data = new DuplexBufferStream();
			req.pipe(data);
			data.on('finish', function(data, req, apiresult, pathname) {
			    options = querystring.parse(data.read().toString());
			    wordpressrest.call_wordpress(req, apiresult, pathname, options);
			}.bind(this, data, req, apiresult, pathname));
		    }
		    else {
			options = querystring.parse(url.parse(req.url).query);
			wordpressrest.call_wordpress(req, apiresult, pathname, options);
		    }
		}
	    }
	    else {
		res.end('nothing here!!');
	    }
	}).listen(3000);
