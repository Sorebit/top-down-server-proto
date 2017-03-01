'use strict';

var config = require('./config.json')
var Util = require('./util.js')

var WebSocketServer = require('ws').Server;
var http = require('http');
var path = require('path');

var express = require('express');
var app = express();
app.use(express.static(path.join(__dirname, '/../public')));

var server = http.createServer(app);
var serverPort = process.env.PORT || config.port;
server.listen(serverPort, function() {
  Util.log('Server listening on port', serverPort);
});

var players = [];
players.count = 0;
var sockets = [];
sockets.count = 0;

// Drop connection of @ws
function drop(ws, reason) {
	Util.log('Dropping connection.');
	const array = new Int32Array(1);
	array[0] = reason;
	ws.send(array)
	ws.close();
}

var wss = new WebSocketServer({server: server});
wss.on('connection', function (ws) {
	// Get id from secure websocket key as it is unique for every client
	var id = ws.upgradeReq.headers['sec-websocket-key'];
	Util.log('New connection:', id);

	if(sockets.count >= config.max_clients) {
		Util.log('Server is full');
		drop(ws, config.headers.error_full);
		return;
	}

	// Remember  socket
	if(sockets[id]) {
		Util.logError('There already exists a socket with id:', id);
		drop(ws, config.headers.error_id);
		return;
	}
	sockets[id] = ws;
	sockets.count++;

	// Construct player
	var self = new Player(id);
	players[id] = self;
	players.count++;

	Util.log('"' + self.id + '"', '(' + self.x, self.y + ') [' + Math.round(self.dx), Math.round(self.dy) + ']');
	Util.log('Current clients:', sockets.count, '/', config.max_clients);

	// Test interval that tosses everyone around
	var testInt = setInterval(function() {
		const array = new Int32Array(3);

		if(self.x + self.dx < 0 || self.x + self.dx > 400)
			self.dx *= -1;
		if(self.y + self.dy < 0 || self.y + self.dy > 400)
			self.dy *= -1;

		self.x += self.dx;
		self.y += self.dy;

		array[0] = config.headers.position;
		array[1] = self.x;
		array[2] = self.y;

		ws.send(array);
	}, 40);

	// Close connection
	ws.on('close', function () {
		Util.log('Close connection: ', id);
		if(sockets[id]) {
			delete sockets[id];
			sockets.count--;
		}
		if(players[id]) {	
			delete players[id];
			players.count--;
		}
		Util.log('Current clients:', sockets.count, '/', config.max_clients);

		clearInterval(testInt);
	});
});

// Player object
function Player(id) {
	if(!id) {
		Util.logError('Player constructor requires an id.');
		return;
	}
	this.id = id;

	this.x = Util.rand(10, 390, true);
	this.y = Util.rand(10, 390, true);
	this.dx = Util.rand(5, 7);
	this.dy = Util.rand(5, 7);
	this.color = {
		r: Util.rand(0, 255, true), 
		g: Util.rand(0, 255, true),
		b: Util.rand(0, 255, true)
	}
}
