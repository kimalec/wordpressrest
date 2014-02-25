var fs = require('fs');
var url = require('url');
var http = require('http');
var request = require('request');
var querystring = require('querystring');
var DuplexBufferStream = require('duplexbufferstream');

var WordPressRest = function(options) {
    this.client_id = options.client_id || '33813';
    this.client_secret = options.client_secret || 'vFFYBzQXLUvLLhpnAAOKSB6xnuBa50SneYs5M17GhVVanPzek8OknY54SCEE2UzC';
    this.redirect_uri = options.redirect_uri || 'http://localhost:3000/wordpress/authorized';
    this.protocol = options.protocol || 'https';
    this.host = options.host || 'public-api.wordpress.com';
    this.restversion = options.restversion || '/rest/v1';
    this.oauth = options.oauth || {
	authorize: '/oauth2/authorize',
	access_token: '/oauth2/token',
    };
    this.proxy = options.proxy || null;
    this.db = options.db;
    this.access_token = null;

    this.isAuthorized = function() {
	return this.access_token ? true : false;
    };

    this.call_wordpress_authorize = function(req, res) {
	    var url_object = new url.Url();
	    url_object.protocol = this.protocol;
	    url_object.host = this.host;
	    url_object.pathname = this.oauth.authorize;
	    url_object.query = {'client_id': this.client_id,
				'redirect_uri': this.redirect_uri,
				'response_type': 'code'};
	    request({'uri': url.format(url_object), 'proxy': this.proxy}).pipe(res);
    };

    this.authorize = function(req, res) {
	var dbfilecontent = new DuplexBufferStream();
	this.db.readStream.pipe(dbfilecontent);
	dbfilecontent.on('finish', function(dbfilecontent, req, res) {
	    var buffer = dbfilecontent.read();
	    if(buffer && buffer.length)
		this.access_token = JSON.parse(buffer.toString()).access_token;
	    if(this.access_token) {
		res.end(JSON.stringify({'status': 'authorized'}));
	    }
	    else {
		this.call_wordpress_authorize(req, res);
	    }
	}.bind(this, dbfilecontent, req, res));
    };

    this.get_access_token = function(req, res) {
	var code = querystring.parse(url.parse(req.url).query).code;
	var url_object = new url.Url();

	if(!code) {
	    res.end(JSON.stringify({'oath': 'denied'}))
	}
	else {
	    url_object.protocol = this.protocol;
	    url_object.host = this.host;
	    url_object.pathname = this.oauth.access_token;
	    var post = {'client_id': this.client_id,
			'redirect_uri': this.redirect_uri,
			'client_secret': this.client_secret,
			'code': code,
			'grant_type': 'authorization_code'
		       };

	    request({'method': 'post',
		     'uri': url.format(url_object),
		     'proxy': this.proxy,
		     'form': post}, function(req, res, error, response, body) {
			 if(error) throw JSON.stringify(error);
			 if(response.statusCode != 200) throw JSON.stringify(response);
			 this.access_token = JSON.parse(body).access_token;
			 this.db.writeStream.end(JSON.stringify({access_token: this.access_token}));
			 res.end(JSON.stringify({'oath': 'authorized'}));
		     }.bind(this, req, res));
	}
    };

    this.call_wordpress = function(req, res, pathname, options) {
	var url_object = new url.Url();
	var request_params = null;

	url_object.protocol = this.protocol;
	url_object.host = this.host;
	url_object.pathname = this.restversion + pathname;
	request_params = { 'proxy': this.proxy,
			   'method': req.method,
			   'headers': {
			       'User-Agent': 'request.js',
			       'Authorization': 'Bearer ' + this.access_token
			   }
			 };
	if(req.method == 'GET') url_object.query = options;
	if(req.method == 'POST') request_params.form = options;
	request_params.uri = url.format(url_object);
	request(request_params).pipe(res);
    };

    this.verify = function(req, res, pathname, options) {
	if(!this.access_token) {
	    var redirect_url = url.parse(req.url);
	    redirect_url.host = req.headers.host;
	    redirect_url.pathname = '/wordpress/authorize';
	    res.end(JSON.stringify({'type': 'redirect', 'location': url.format(redirect_url)}));
	}
	else {
	    this.call_wordpress(req, res, pathname, options);
	}
    };
};

exports = module.exports = WordPressRest;
