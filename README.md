### WordPressRest

A simple wrapper around wordpress REST api

### Options

* `wordpress_client_id` registered wordpress app's client_id (default: 33813)
* `wordpress_client_secret` registered wordpress app's client_secret (default: vFFYBzQXLUvLLhpnAAOKSB6xnuBa50SneYs5M17GhVVanPzek8OknY54SCEE2UzC)
* `wordpress_redirect_uri` redirect url registered with wordpress app (default: http://localhost:3000/wordpress/authorized)
* `wordpress_access_token` wordpress app's access_token (if null, user's will be redirected to wordpress) (default: null)
* `wordpress_protocol` protocol to use to connect to wordpress (default: https)
* `wordpress_host` hostname to use to connect to wordpress (default: public-api.wordpress.com)
* `wordpress_oauth2_authorize_uri` Oauth2 authorize uri specified in wordpress api (default: /oauth2/authorize)
* `wordpress_oauth2_access_token_uri` Oauth2 access_token url specified in wordpress api (default: /oauth2/token)
* `proxy` if behind firewall http_proxy value to use (default: taken from 'http_proxy' environment variable)

### Example

See https://github.com/mohan43u/wordpressrest/blob/master/example/wordpressresttest.js