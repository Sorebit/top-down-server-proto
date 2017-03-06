'use strict';

// Packet setup code seems a little repetitive, I wonder what I could do with that.

var Config = require('./config.json');
var Util = require('./util.js');
var Player = require('./player.js');
var IdHandler = require('./id.js');
var Id = new IdHandler();

var WebSocket = require('ws');
var WebSocketServer = WebSocket.Server;
var http = require('http');
var path = require('path');

var express = require('express');
var app = express();
app.use(express.static(path.join(__dirname, '/../public')));

var server = http.createServer(app);
var serverPort = process.env.PORT || Config.port;
server.listen(serverPort, function() {
	Util.log('Server listening on port', serverPort);
	start();
});

// Players are identified by id and have a socket reference (which has a player reference, too)
var players = [];

var wss = new WebSocketServer({server: server});

// Main client handler
wss.on('connection', function(ws) {
	// Remember socket
	if(wss.clients.length > Config.max_clients) {
		Util.log('New connection. Server is full');
		wss.drop(ws, Config.headers.error_full);
		return;
	}

	Util.log('New connection', '(' + wss.clients.length, '/', Config.max_clients + ')');

	// Construct player
	var id = Id.next();
	var self = new Player(id, ws);
	players[id] = self;
	ws.player = self;

	// Send initial game state
	sendInitial(self);

	// Broadcast appearance of a new player
	broadcastPlayerNew(self);

	// Handle connection closing
	ws.on('close', function() {
		Util.log('Close connection', '(' + wss.clients.length, '/', Config.max_clients + ')');
		if(players[id]) {
			delete players[id];
		}

		broadcastPlayerLeft(self);
		Id.free(id);
	});
});

// Handle WebSocketServer errors (although I never saw any)
wss.on('error', function(e) {
	console.error(e);
	Util.logError(e);
});

// Send @data to socket @ws with error checking
wss.send = function(ws, data) {
	if(ws.readyState !== WebSocket.OPEN) {
		return;
	}
	ws.send(data, function(error) {
		if(error) {
			console.error(error);
			Util.logError(error);
		}
	});
}

// Broadcast @data to every socket except @exclude
wss.broadcast = function(data, exclude) {
	wss.clients.forEach(function each(client) {
		if(typeof exclude === 'undefined' || client !== exclude) {
			wss.send(client, data);
		}
	});
};

// Drop connection of @ws, send a header-only (@reason) packet 
wss.drop = function(ws, reason) {
	Util.log('Dropping connection.');
	// Packet structue : [header]
	var data = new ArrayBuffer(Config.header_size);
	var dv = new DataView(data);
	dv.setUint8(0, reason, false);
	wss.send(ws, data);
	ws.close();
}

// Send initial game state to @ws
function sendInitial(player) {
	// Packet structue : [header, playerCount, receiverId, id[i], color[i], x[i], y[i]]
	var data = new ArrayBuffer(Config.header_size + 2 + wss.clients.length*(Config.color_size + 3));
	var dv = new DataView(data);

	dv.setUint8(0, Config.headers.initial_state, false); // Header
	dv.setUint8(Config.header_size + 0, wss.clients.length, false); // playerCount
	dv.setUint8(Config.header_size + 1, player.id, false); // receiverId

	var i = 0;
	wss.clients.forEach(function each(client) {
		var off = Config.header_size + 2 + i * (Config.color_size + 3);
		var p = client.player;
		dv.setUint8(off + 0, p.id, false); // id[i]
		dv.setUint8(off + 1, p.pos.x, false); // x[i]
		dv.setUint8(off + 2, p.pos.y, false); // y[i]
		Util.setString16(dv, off + 3, p.colorString); // color[i]
		i++;
	});

	wss.send(player.socket, data);
}

// Broadcast a player joined to everyone except the player themself
function broadcastPlayerNew(player) {
	// Packet structue : [header, playerCount, id, x, y, color]
	var data = new ArrayBuffer(Config.header_size + 4 + Config.color_size);
	var dv = new DataView(data);
	dv.setUint8(0, Config.headers.player_new, false); // Headet
	dv.setUint8(Config.header_size + 0, wss.clients.length, false); // playerCount
	dv.setUint8(Config.header_size + 1, player.id, false); // id
	dv.setUint8(Config.header_size + 2, player.pos.x, false); // x
	dv.setUint8(Config.header_size + 3, player.pos.y, false); // y
	Util.setString16(dv, Config.header_size + 4, player.colorString); // color
	wss.broadcast(data, player.socket);
}

// Broadcast a player left to everyone except the player themself
function broadcastPlayerLeft(player) {
	// Packet structue : [header, playerCount, id]
	var data = new ArrayBuffer(Config.header_size + 2);
	var dv = new DataView(data);
	dv.setUint8(0, Config.headers.player_left);
	dv.setUint8(Config.header_size + 0, wss.clients.length);
	dv.setUint8(Config.header_size + 1, player.id);
	wss.broadcast(data, player.socket);
}

// Start server loop
function start() {
	Util.log('Starting server loop.');
	// Test loop that tosses everyone around
	var update = setInterval(function() {
		var data = new ArrayBuffer(Config.header_size + 1 + wss.clients.length * 9);
		var dv = new DataView(data);
		dv.setUint8(0, Config.headers.position, false);
		dv.setUint8(1, wss.clients.length, false);

		// Update players
		var i = 0;
		wss.clients.forEach(function each(client) {
			if(typeof client.player === 'undefined') {
				Util.logError('Undefined player in update. Skipping.');
				return;
			}
			var p = client.player;

			if(p.pos.x + p.dx < 0 || p.pos.x + p.dx > 400)
				p.dx *= -1;
			if(p.pos.y + p.dy < 0 || p.pos.y + p.dy > 400)
				p.dy *= -1;

			p.pos.x += p.dx;
			p.pos.y += p.dy;

			var off = Config.header_size + 1 + i*9;
			dv.setUint8(off, p.id, false);
			dv.setFloat32(off + 1 + 0, p.pos.x, false);
			dv.setFloat32(off + 1 + 4, p.pos.y, false);
			i++;
		});

		wss.broadcast(data);
	}, 1000 / 30);
}