require('dotenv').config({silent: true});

var express = require('express');
var app = express();
var http = require('http');
app.use(express.static(__dirname + "/src", { index: "index.html" }));

httpserver = http.createServer(app);

httpserver.listen(8080, "0.0.0.0", function() {
    var addr = httpserver.address();
    console.log("Server listening at ", addr.address + ":" + addr.port);
});
