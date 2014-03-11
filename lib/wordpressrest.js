var fs = require('fs');
var url = require('url');
var http = require('http');
var request = require('request');
var DuplexBufferStream = require('duplexbufferstream');

var WordPressRest = function(options) {
    this.wordpress_client_id = options.wordpress_client_id || '33813';
    this.wordpress_client_secret = options.wordpress_client_secret || 'vFFYBzQXLUvLLhpnAAOKSB6xnuBa50SneYs5M17GhVVanPzek8OknY54SCEE2UzC';
    this.wordpress_redirect_uri = options.wordpress_redirect_uri || 'http://localhost:3000/wordpress/authorized';
    this.wordpress_tokens = options.wordpress_tokens || null;
    this.wordpress_protocol = options.wordpress_protocol || 'https';
    this.wordpress_host = options.wordpress_host || 'public-api.wordpress.com';
    this.wordpress_oauth2_authorize_uri = options.wordpress_oauth2_authorize_uri || '/oauth2/authorize',
    this.wordpress_oauth2_access_token_uri = options.wordpress_oauth2_access_token_uri || '/oauth2/token',
    this.proxy = options.proxy || process.env['http_proxy'];

    this.authorize = function(req, res) {
	var query = url.parse(req.url, true).query;
	var url_object = new url.Url();
	url_object.protocol = this.wordpress_protocol;
	url_object.host = this.wordpress_host;
	url_object.pathname = this.wordpress_oauth2_authorize_uri;
	url_object.query = {'client_id': this.wordpress_client_id,
			    'redirect_uri': this.wordpress_redirect_uri,
			    'response_type': 'code'
			   };

	for(var k in query) {
	    url_object.query[k] = query[k];
	}

	request({'uri': url.format(url_object), 'proxy': this.proxy}).pipe(res);
    };

    this.get_access_token = function(req, res) {
	var query = url.parse(req.url, true).query;
	var url_object = new url.Url();

	if(query.error) {
	    res.end(JSON.stringify({'oath2': query}))
	}
	else {
	    url_object.protocol = this.wordpress_protocol;
	    url_object.host = this.wordpress_host;
	    url_object.pathname = this.wordpress_oauth2_access_token_uri;
	    var post = {'client_id': this.wordpress_client_id,
			'redirect_uri': this.wordpress_redirect_uri,
			'client_secret': this.wordpress_client_secret,
			'grant_type': 'authorization_code'
		       };

	    for(var k in query) {
		post[k] = query[k];
	    }

	    if(post.refresh_token) {
		delete post.redirect_uri;
		post.grant_type = 'refresh_token';
	    }

	    request({'method': 'post',
		     'uri': url.format(url_object),
		     'proxy': this.proxy,
		     'form': post}, function(req, res, error, response, body) {
			 if(error) throw JSON.stringify(error);
			 if(response.statusCode != 200) throw JSON.stringify(response);
			 this.wordpress_tokens = JSON.parse(body);
			 res.end(JSON.stringify({'wordpress_tokens': this.wordpress_tokens}));
		     }.bind(this, req, res));
	}
    };

    this.call_wordpress = function(req, res, pathname, options) {
	var url_object = new url.Url();
	var request_params = null;

	url_object.protocol = this.wordpress_protocol;
	url_object.host = this.wordpress_host;
	url_object.pathname = pathname;
	request_params = { 'proxy': this.proxy,
			   'method': req.method,
			   'headers': {
			       'User-Agent': 'request.js',
			       'Authorization': 'Bearer ' + this.wordpress_tokens.access_token
			   }
			 };
	if(req.method == 'GET') url_object.query = options;
	if(req.method == 'POST') request_params.form = options;
	request_params.uri = url.format(url_object);
	request(request_params).pipe(res);
    };
};

exports = module.exports = WordPressRest;
