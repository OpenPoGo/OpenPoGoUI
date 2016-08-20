(function() {

    function getURLParameter(sParam) {
        var sPageURL = window.location.search.substring(1);
        var sURLVariables = sPageURL.split('&');
        for (var i = 0; i < sURLVariables.length; i++)
        {
            var sParameterName = sURLVariables[i].split('=');
            if (sParameterName[0] == sParam)
            {
                return sParameterName[1];
            }
        }
    }

    var defaultConfig = {
        locale: "en",
        websocket: "http://localhost:8000",
        followPlayer: false,
        noPopup: false,
        noConfirm: false,
        memory: {
            limit: false,
            maxCaught: 50,
            mathPath: 10000,
            maxPokestops: 250
        },
        version: "online"
    };

    var service = {};

    if (typeof require === 'function') {
        console.log("Load config from disk");

        var path = require("path");
        var fs = require("fs"); 
        var { remote } = require("electron");

        var configfile = path.join(remote.app.getPath("userData"), "settings.json");

        service.load = function() {
            var config =  Object.assign({}, defaultConfig);
            try {
                var json = fs.readFileSync(configfile, 'utf-8')
                if (json) Object.assign(config, JSON.parse(json));
                
                if (config.websocket.startsWith("ws")) config.websocket = defaultConfig.websocket;

                // no ui, so force memory settings
                config.memory = defaultConfig.memory;
                config.version = "app";
            } catch(err) {
                configService.save(defaultConfig);
                config =  Object.assign({}, defaultConfig);
            }

            return config;
        }

        service.save = function(config) {
            fs.writeFileSync(configfile, JSON.stringify(config));
        }
    } else {
        console.log("Load config from storage");

        service.load = function() {
            var config = Object.assign({}, defaultConfig);
            var json = localStorage.getItem("config");
            if (json) Object.assign(config, JSON.parse(json));

            if (config.websocket.startsWith("ws")) config.websocket = defaultConfig.websocket;

            var host = getURLParameter("websocket");
            if (host) config.websocket = host;

            // no ui, so force memory settings
            config.memory = defaultConfig.memory;

            return config;
        }

        service.save = function(config) {
            localStorage.setItem("config", JSON.stringify(config));
        }
    }

    window.configService = service;

}());