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
	var data = new ArrayBuffer(config.header_size);
	var dv = new DataView(data);
	dv.setUint8(0, reason, false);
	ws.send(data)
	ws.close();
}

function emit_initial(ws, player) {
	var data = new ArrayBuffer(config.header_size + 7*2);
	var dv = new DataView(data);
	dv.setUint8(0, config.headers.initial_state, false);
	var color = '#' + player.color.r.toString(16) + player.color.g.toString(16) + player.color.b.toString(16);
	Util.setString16(dv, config.header_size, color);
	ws.send(data);
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

	// Remember socket
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

	emit_initial(ws, self);

	// Test interval that tosses everyone around
	var testInt = setInterval(function() {
		var data = new ArrayBuffer(config.header_size + 4 * 2);
		var dv = new DataView(data);

		if(self.x + self.dx < 0 || self.x + self.dx > 400)
			self.dx *= -1;
		if(self.y + self.dy < 0 || self.y + self.dy > 400)
			self.dy *= -1;

		self.x += self.dx;
		self.y += self.dy;

		dv.setUint8(0, config.headers.position, false);
		dv.setFloat32(config.header_size + 0, self.x, false);
		dv.setFloat32(config.header_size + 4, self.y, false);

		ws.send(data);
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
		r: Util.rand(140, 240, true),
		g: Util.rand(140, 240, true),
		b: Util.rand(140, 240, true)
	}
}
