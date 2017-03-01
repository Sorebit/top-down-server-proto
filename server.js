'use strict';

var config = require('./config.json')

var WebSocketServer = require('ws').Server;
var http = require('http');
var path = require('path');

var express = require('express');
var app = express();
app.use(express.static(path.join(__dirname, '/public')));

var server = http.createServer(app);
var serverPort = process.env.PORT || config.port;
server.listen(serverPort, function() {
  console.log("Server listening on port " + serverPort);
});

var wss = new WebSocketServer({server: server});
wss.on('connection', function (ws) {
	console.log('started client interval');

	var x = Math.random() * 400;
	var y = Math.random() * 400;
	var dx = 5 + Math.random() * 2;
	var dy = 5 + Math.random() * 2;

	var testInt = setInterval(function() {

		const array = new Float32Array(3);

		if(x + dx < 0 || x + dx > 400)
			dx *= -1;
		if(y + dy < 0 || y + dy > 400)
			dy *= -1;

		x += dx;
		y += dy;

		array[0] = config.headers.position;
		array[1] = x;
		array[2] = y;

		ws.send(array);
	}, 40);

	ws.on('close', function () {
		console.log('stopping client interval');
		clearInterval(testInt);
		// clearInterval(memInt);
	});
});
