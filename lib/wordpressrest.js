var fs = require('fs');
var url = require('url');
var http = require('http');
var request = require('request');
var querystring = require('querystring');
var DuplexBufferStream = require('duplexbufferstream');

var WordPressRest = function(options) {
    this.wordpress_client_id = options.wordpress_client_id || '33813';
    this.wordpress_client_secret = options.wordpress_client_secret || 'vFFYBzQXLUvLLhpnAAOKSB6xnuBa50SneYs5M17GhVVanPzek8OknY54SCEE2UzC';
    this.wordpress_redirect_uri = options.wordpress_redirect_uri || 'http://localhost:3000/wordpress/authorized';
    this.wordpress_access_token = options.wordpress_access_token || null;
    this.wordpress_protocol = options.wordpress_protocol || 'https';
    this.wordpress_host = options.wordpress_host || 'public-api.wordpress.com';
    this.wordpress_restversion = options.wordpress_restversion || '/rest/v1';
    this.wordpress_oauth2_authorize_uri = options.wordpress_oauth2_authorize_uri || '/oauth2/authorize',
    this.wordpress_oauth2_access_token_uri = options.wordpress_oauth2_access_token_uri || '/oauth2/token',
    this.proxy = options.proxy || process.env['http_proxy'];

    this.authorize = function(req, res) {
	if(this.wordpress_access_token) {
	    res.end(JSON.stringify({'oauth2': 'authorized'}));
	}
	else {
	    var url_object = new url.Url();
	    url_object.protocol = this.wordpress_protocol;
	    url_object.host = this.wordpress_host;
	    url_object.pathname = this.wordpress_oauth2_authorize_uri;
	    url_object.query = {'client_id': this.wordpress_client_id,
				'redirect_uri': this.wordpress_redirect_uri,
				'response_type': 'code'};
	    request({'uri': url.format(url_object), 'proxy': this.proxy}).pipe(res);
	}
    };

    this.get_access_token = function(req, res) {
	var code = querystring.parse(url.parse(req.url).query).code;
	var url_object = new url.Url();

	if(!code) {
	    res.end(JSON.stringify({'oath2': 'denied'}))
	}
	else {
	    url_object.protocol = this.wordpress_protocol;
	    url_object.host = this.wordpress_host;
	    url_object.pathname = this.wordpress_oauth2_access_token_uri;
	    var post = {'client_id': this.wordpress_client_id,
			'redirect_uri': this.wordpress_redirect_uri,
			'client_secret': this.wordpress_client_secret,
			'code': code,
			'grant_type': 'authorization_code'
		       };

	    request({'method': 'post',
		     'uri': url.format(url_object),
		     'proxy': this.proxy,
		     'form': post}, function(req, res, error, response, body) {
			 if(error) throw JSON.stringify(error);
			 if(response.statusCode != 200) throw JSON.stringify(response);
			 this.wordpress_access_token = JSON.parse(body).access_token;
			 res.end(JSON.stringify({'wordpress_access_token': this.wordpress_access_token}));
		     }.bind(this, req, res));
	}
    };

    this.call_wordpress = function(req, res, pathname, options) {
	var url_object = new url.Url();
	var request_params = null;

	url_object.protocol = this.wordpress_protocol;
	url_object.host = this.wordpress_host;
	url_object.pathname = this.wordpress_restversion + pathname;
	request_params = { 'proxy': this.proxy,
			   'method': req.method,
			   'headers': {
			       'User-Agent': 'request.js',
			       'Authorization': 'Bearer ' + this.wordpress_access_token
			   }
			 };
	if(req.method == 'GET') url_object.query = options;
	if(req.method == 'POST') request_params.form = options;
	request_params.uri = url.format(url_object);
	request(request_params).pipe(res);
    };
};

exports = module.exports = WordPressRest;
