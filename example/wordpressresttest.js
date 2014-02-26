var fs = require('fs');
var os = require('os');
var url = require('url');
var http = require('http');
var path = require('path');
var querystring = require('querystring');
var WordPressRest = require('../lib/wordpressrest');
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
