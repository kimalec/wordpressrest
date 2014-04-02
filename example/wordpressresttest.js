var fs = require('fs');
var url = require('url');
var http = require('http');
var WordPressRest = require('../lib/wordpressrest');

var dbfilename = 'wordpressrest.js.db';
try { var wordpress_tokens = JSON.parse(fs.readFileSync(dbfilename)).wordpress_tokens; } catch(e) {}
var wordpressrest = new WordPressRest({'wordpress_tokens': wordpress_tokens});

var server = http.createServer(function(req, res) {
    var pathname = url.parse(req.url).pathname;

    console.log(pathname);

    if(pathname.match("/wordpress/authorize$")) {
	wordpressrest.authorize(req, function(response){
	    this.writeHead(response.statusCode, response.headers);
	    response.pipe(this);
	}.bind(res));
    }
    else if(pathname.match("/wordpress/authorized$")) {
	delete req.headers['accept-encoding'];
	wordpressrest.get_access_token(req, function(res, dbfilename, response) {
	    if(response.statusCode != 200) {
		res.writeHead(response.statusCode, response.headers);
		response.pipe(res);
	    }
	    else {
		var body = [];
		response.on('data', function(chunk) {
		    this.push(chunk);
		}.bind(body));
		response.on('end', function(res, body, dbfilename) {
		    var tokens = JSON.parse(Buffer.concat(body).toString());
		    if(this.wordpress_tokens) {
			for(var k in tokens) {
			    this.wordpress_tokens[k] = tokens[k]
			}
		    }
		    else {
			this.wordpress_tokens = tokens;
		    }
		    fs.writeFile(dbfilename, JSON.stringify({'wordpress_tokens': this.wordpress_tokens}));
		    res.end(JSON.stringify({'oauth2': 'authorized'}));
		}.bind(this, res, body, dbfilename));
	    }
	}.bind(wordpressrest, res, dbfilename));
    }
    else if(pathname.match("/wordpress")) {
	if(!wordpressrest.wordpress_tokens) {
	    var redirect_url = new url.Url();
	    redirect_url.pathname = '/wordpress/authorize';
	    res.writeHead(303, {
		'Location': url.format(redirect_url)
	    });
	    res.end();
	}
	else {
	    var wurl = url.parse(req.url, true);
	    wurl.pathname = pathname.substring(pathname.indexOf('/', 1));
	    delete wurl.protocol;
	    delete wurl.host;
	    req.url = url.format(wurl);
	    wordpressrest.call_wordpress(req, null, function(response){
		this.writeHead(response.statusCode, response.headers);
		response.pipe(this);
	    }.bind(res));
	}
    }
    else {
	res.end('nothing here!!');
    }
}).listen(3000);
