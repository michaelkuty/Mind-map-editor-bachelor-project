var container = require('vertx/container');
var console = require('vertx/console');

var config = container.config;

for (var app in config) {

	app_config = config[app]

	if (app.indexOf(".js") > -1) {
		//deployVerticle
		container.deployVerticle(app, app_config, app_config.workers, function(err, ID){
			if (err) {
				console.error(err.printStackTrace())
			} else {}
		});
	} else {
		//deployModule
		if (app.indexOf("mongo") > -1) {
			container.deployModule(app, app_config, app_config.workers, function(err, ID){
				if (err) {
					console.error(err.printStackTrace());
				} else {
			    	load('utils/static_data.js');
			    	console.log("static data loaded")
					}
			});
        } else {

			container.deployModule(app, app_config, app_config.workers, function(err, ID){
				if (err) {
					console.error(err.printStackTrace());
				} else {}
			});

        }   
	}
}