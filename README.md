### WordPressRest

A simple wrapper around wordpress REST api

### Example

##### wordpress.js

	var fs = require('fs');
	var url = require('url');
	var http = require('http');
	var path = require('path');
	var querystring = require('querystring');
	var WordPressRest = require('wordpressrest');
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
	
	var setup_apiresult_handler = function(req, res, apiresult, pathname) {
	    apiresult.on('finish', function(req, res, apiresult, pathname) {
		var apiresultobj = JSON.parse(apiresult.read().toString());
		if(apiresultobj.type == 'redirect') {
		    res.writeHead(303, {
			'Location': apiresultobj.location
		    });
		    res.end();
		}
		else if(apiresultobj.type == 'html') {
		    res.end(apiresultobj.html);
		}
		else if(apiresultobj.type == 'json') {
		    if(fs.existsSync(path.join(__dirname, 'views', pathname))) {
			res.render(pathname, JSON.parse(apiresultobj.json));
		    }
		    else {
			res.end(apiresultobj.json);
		    }
		}
	    }.bind(this, req, res, apiresult, pathname));
	}
	
	var server = http.createServer(function(req, res) {
	    var pathname = url.parse(req.url).pathname;
	    var apireq = req;
	    var apiresult = new DuplexBufferStream();
	
	    console.log(pathname);
	    setup_apiresult_handler(req, res, apiresult, pathname);
	
	    if(pathname.match("/wordpress/authorize$")) {
		wordpressrest.authorize(apireq, apiresult);
	    }
	    else if(pathname.match("/wordpress/authorized$")) {
		wordpressrest.get_access_token(apireq, apiresult);
	    }
	    else if(pathname.match("/wordpress")) {
		pathname = pathname.substring(pathname.indexOf('/', 1));
	
		if(req.method == 'POST') {
		    var data = new DuplexBufferStream();
		    req.pipe(data);
		    data.on('finish', function(data, apireq, apiresult, pathname) {
			options = querystring.parse(data.read().toString());
			wordpressrest.verify(apireq, apiresult, pathname, options);
		    }.bind(this, data, apireq, apiresult, pathname));
		}
		else {
		    options = querystring.parse(url.parse(req.url).query);
		    wordpressrest.verify(apireq, apiresult, pathname, options);
		}
	    }
	    else {
		apiresult.end(JSON.stringify({'type': 'html', 'html': 'nothing here!!'}));
	    }
	}).listen(3000);
