module.exports = sluggish;

/**
 * Sluggish attempts to imitate Express' api.
 */
function sluggish(){
	this.routes = {};	
}

/**
 * escape slashes:	 '/' 		=>  '\/'
 * manage params: ':word' 	=>  '(.+)'
 * 
 * example: /users/:id/posts => \/users\/(.*)\/posts
 * 
 * @param {*} url 
 */
var getRegexFromPath = function(path){

	if (path.substring(0, 1) == '/') { 
		path = path.substring(1);
	}

	var words = path.split('/');
	var regexString = "^";
	var params = [];

	words.forEach(function(word) {
		regexString += "\/";
		
		if(word.charAt(0) === ':'){ //word is variable

			regexString += "(.+)";
			params.push(word.substring(1)); // memorise variable names
		}
		else{ //word is not a variable

			regexString += word;
		}
	}, this);

	regexString += "$";

	return {
		regex: new RegExp(regexString, "g"),
		params: params
	}
}

sluggish.prototype.addRoute = function(path, handler, method){
	if(!(path in this.routes)){
		var regexData = getRegexFromPath(path);

		this.routes[path] = {
			"regex": regexData.regex,
			"params": regexData.params
		};
	}

	this.routes[path][method] = handler;
}

sluggish.prototype.get = function(path, handler){
	this.addRoute(path, handler, "GET");
}

sluggish.prototype.post = function(path, handler){
	this.addRoute(path, handler, "POST");
}

sluggish.prototype.put = function(path, handler){
	this.addRoute(path, handler, "PUT");
}

sluggish.prototype.patch = function(path, handler){
	this.addRoute(path, handler, "PATCH");
}

sluggish.prototype.delete = function(path, handler){
	this.addRoute(path, handler, "DELETE");
}

sluggish.prototype.routerHandler = function(req, res){
	var path = req.url;
	var method = req.method;
	var handler = null;

	//try find a route
	var match = null;
	var route = null;
	for (var key in this.routes) {

		route = this.routes[key];

		var regex = route.regex;
		regex.lastIndex = 0; //reset the regex;

		match = regex.exec(path);

		if(match)
			break;
	}

	//check if a route was found
	if(!match){
		res.writeHead(404, {'Content-Type': 'application/json'});
		res.end();
		return;
	}

	//check if the route allows the specified method
	if(!(method in route)){
		res.writeHead(405, {'Content-Type': 'application/json'});
		res.end();
		return;
	}

	//add params to the request object
	req.params = {};
	for (var index = 0; index < route.params.length; index++) {
		req.params[route.params[index]] = match[index+1];		
	}

	//call the handler
	var handler = route[method];
	handler(req, res);
}

sluggish.prototype.listen = function(port){
	var http = require("http");

	http.createServer(this.routerHandler.bind(this)).listen(port);
}
