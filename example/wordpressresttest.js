var fs = require('fs');
var url = require('url');
var http = require('http');
var WordPressRest = require('../lib/wordpressrest');
var querystring = require('querystring');
var DuplexBufferStream = require('duplexbufferstream');

var dbfilename = process.env['HOME'] + '/.wordpressrest.js.db';
var fd = fs.openSync(dbfilename, 'a+');
var readStream = fs.createReadStream(dbfilename, {'fd': fd, 'autoClose': false});
var writeStream = fs.createWriteStream(dbfilename, {'fd': fd, 'autoClose': false});
var wordpressrest = new WordPressRest({db: {
				   'readStream': readStream,
				   'writeStream': writeStream
			       },
			       proxy: process.env['http_proxy']
			      });

var server = http.createServer(function(req, res) {
    console.log(req.url);
    var pathname = url.parse(req.url).pathname;
    if(pathname.match("/wordpress/authorize$")) {
	wordpressrest.authorize(req, res);
    } else if(pathname.match("/wordpress/authorized$")) {
	wordpressrest.get_access_token(req, res);
    } else if(pathname.match("/wordpress")) {
	pathname = pathname.substring(pathname.indexOf('/', 1));
	if(req.method == 'POST') {
	    var data = new DuplexBufferStream();
	    req.pipe(data);
	    data.on('finish', function(data, req, res, pathname) {
		options = querystring.parse(data.read().toString());
		wordpressrest.verify(req, res, pathname, options);
	    }.bind(this, data, req, res, pathname));
	}
	else {
	    options = querystring.parse(url.parse(req.url).query);
	    wordpressrest.verify(req, res, pathname, options);
	}
    } else {
	res.end('nothing here!!');
    }
}).listen(3000);
