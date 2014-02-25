### WordPressRest

A simple wrapper around wordpress REST api

### Example

##### wordpress.js

	var fs = require('fs');
	var url = require('url');
	var http = require('http');
	var path = require('path');
	var querystring = require('querystring');
	var WordPressRest = require('../lib/wordpressrest');
	var DuplexBufferStream = require('duplexbufferstream');
	
	var dbfilename = process.env['HOME'] + '/.wordpressrest.js.db';
	var fd = fs.openSync(dbfilename, 'a+');
	var readStream = fs.createReadStream(dbfilename, {'fd': fd, 'autoClose': false});
	var writeStream = fs.createWriteStream(dbfilename, {'fd': fd, 'autoClose': false});
	var wordpressrest = new WordPressRest({db:
					       {
						   'readStream': readStream,
						   'writeStream': writeStream
					       },
					       proxy: process.env['http_proxy']
					      });
	
	var server = http.createServer(function(req, res) {
	    var pathname = url.parse(req.url).pathname;
	    var apiresult = new DuplexBufferStream();
	
	    console.log(pathname);
	    apiresult.pipe(res);
	
	    if(pathname.match("/wordpress/authorize$")) {
		wordpressrest.authorize(req, apiresult);
	    }
	    else if(pathname.match("/wordpress/authorized$")) {
		wordpressrest.get_access_token(req, apiresult);
	    }
	    else if(pathname.match("/wordpress")) {
		pathname = pathname.substring(pathname.indexOf('/', 1));
	
		if(req.method == 'POST') {
		    var data = new DuplexBufferStream();
		    req.pipe(data);
		    data.on('finish', function(data, req, apiresult, pathname) {
			options = querystring.parse(data.read().toString());
			wordpressrest.verify(req, apiresult, pathname, options);
		    }.bind(this, data, req, apiresult, pathname));
		}
		else {
		    options = querystring.parse(url.parse(req.url).query);
		    wordpressrest.verify(req, apiresult, pathname, options);
		}
	    }
	    else {
		apiresult.end('nothing here!!');
	    }
	}).listen(3000);
