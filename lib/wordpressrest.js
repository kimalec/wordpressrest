var fs = require('fs');
var url = require('url');
var http = require('http');
var https = require('https');
var request = require('tunnel');
var querystring = require('querystring');

var WordPressRest = function(options) {
    this.wordpress_client_id = options.wordpress_client_id || '33813';
    this.wordpress_client_secret = options.wordpress_client_secret || 'vFFYBzQXLUvLLhpnAAOKSB6xnuBa50SneYs5M17GhVVanPzek8OknY54SCEE2UzC';
    this.wordpress_redirect_uri = options.wordpress_redirect_uri || 'http://127.0.0.1:3000/wordpress/authorized';
    this.wordpress_tokens = options.wordpress_tokens || null;
    this.wordpress_protocol = options.wordpress_protocol || 'https';
    this.wordpress_host = options.wordpress_host || 'public-api.wordpress.com';
    this.wordpress_oauth2_authorize_uri = options.wordpress_oauth2_authorize_uri || '/oauth2/authorize',
    this.wordpress_oauth2_access_token_uri = options.wordpress_oauth2_access_token_uri || '/oauth2/token',
    this.proxy = options.proxy || process.env['http_proxy'];

    this.request = function(req, form, callback) {
	var wurl = url.parse(req.url, true);
	delete req.headers['host'];
	req.headers['Transfer-Encoding'] = 'chunked';
	if(form) req.headers['Content-Type'] = 'application/x-www-form-urlencoded';
	if(this.proxy) {
	    var proxyinitfunc = null;
	    var proxyurl = url.parse(this.proxy, true);
	    proxyurl.protocol = proxyurl.protocol || 'http:';
	    if(proxyurl.protocol == 'https:' && wurl.protocol == 'https:') proxyinitfunc = tunnel.httpsOverhttps;
	    if(proxyurl.protocol == 'https:' && wurl.protocol == 'http:') proxyinitfunc = tunnel.httpOverhttps;
	    if(proxyurl.protocol == 'http:' && wurl.protocol == 'https:') proxyinitfunc = tunnel.httpsOverhttp;
	    if(proxyurl.protocol == 'http:' && wurl.protocol == 'http:') proxyinitfunc = tunnel.httpOverhttp;
	    var proxy = proxyinitfunc({
		proxy: {
		    host: proxyurl.hostname,
		    port: proxyurl.port
		}
	    });
	}
	var clientrequest = (wurl.protocol == 'https:' ? https : http).request({
	    'hostname': wurl.hostname,
	    'port': wurl.port,
	    'method': req.method,
	    'path': wurl.path,
	    'headers': req.headers,
	    'agent': proxy
	});
	req.on('data', function(chunk){
	    this.write(chunk);
	}.bind(clientrequest));
	req.on('end', function(form){
	    if(form) {
		var query = querystring.stringify(form);
		this.write(query);
	    }
	    this.end();
	}.bind(clientrequest, form));
	clientrequest.on('response', function(callback, clientresponse){
	    callback(clientresponse);
	}.bind(this, callback));
    };

    this.authorize = function(req, callback) {
	var wurl = url.parse(req.url, true);
	wurl.protocol = this.wordpress_protocol;
	wurl.host = this.wordpress_host;
	wurl.pathname = this.wordpress_oauth2_authorize_uri;
	var query = {'client_id': this.wordpress_client_id,
		      'redirect_uri': this.wordpress_redirect_uri,
		      'response_type': 'code'
		     };
	for(var k in wurl.query) {
	    query[k] = wurl.query[k];
	}
	wurl.query = query;
	req.url = url.format(wurl);
	req.method = 'GET';
	this.request(req, null, callback);
    };

    this.get_access_token = function(req, callback){
	var wurl = url.parse(req.url, true);

	if(wurl.query.error) {
	    res.end(JSON.stringify({'oath2': query}))
	}
	else {
	    wurl.protocol = this.wordpress_protocol;
	    wurl.host = this.wordpress_host;
	    wurl.pathname = this.wordpress_oauth2_access_token_uri;
	    var post = {'client_id': this.wordpress_client_id,
			'redirect_uri': this.wordpress_redirect_uri,
			'client_secret': this.wordpress_client_secret,
			'grant_type': 'authorization_code'
		       };
	    for(var k in wurl.query) {
		post[k] = wurl.query[k];
	    }
	    if(post.refresh_token) {
		delete post.redirect_uri;
		post.grant_type = 'refresh_token';
	    }
	    req.url = url.format(wurl);
	    req.method = 'POST';
	    this.request(req, post, callback);
	}
    };

    this.call_wordpress = function(req, form, callback) {
	var wurl = url.parse(req.url, true);
	wurl.protocol = wurl.protocol || this.wordpress_protocol;
	wurl.host = wurl.host || this.wordpress_host;
	req.url = url.format(wurl);
	req.headers['Authorization'] = 'Bearer ' + this.wordpress_tokens.access_token;
	this.request(req, form, callback);
    };
};

exports = module.exports = WordPressRest;
