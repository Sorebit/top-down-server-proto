'use strict';

// Packet setup code seems a little repetitive, I wonder what I could do about that.
// Errors occur when clients disconnect
// Send colors in rgb Uint8 (3 bytes) instead of String16 (14 bytes)

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
});

// Players are identified by id and have a socket reference (which has a player reference, too)
var players = [];

// Server is paused by default, because noone is connected while initialization
var wss = new WebSocketServer({server: server});
wss.pause = true;

// Main client handler
wss.on('connection', function(ws) {
	// Set server back in running mode
	if(wss.pause) {
		wss.pause = false;
		start();
	}

	// Don't let more clients in than it is specified in config 
	if(wss.clients.size > Config.max_clients) {
		Util.log('New connection. Server is full');
		wss.drop(ws, Config.headers.error_full);
		return;
	}

	// If nothing failed create the player
	Util.log('New connection', '(' + wss.clients.size, '/', Config.max_clients + ')');

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
		Util.log('Close connection', '(' + wss.clients.size, '/', Config.max_clients + ')');
		if(players[id]) {
			delete players[id];
		}

		broadcastPlayerLeft(self);
		Id.free(id);
	});
	// Handle errors
	ws.on('error', function(e) {
		Util.error('WebSocket error occured:');
		console.error(e);
	});
});

// Handle WebSocketServer errors (although I never saw any)
wss.on('error', function(e) {
	Util.error('WebSocketServer error occured:');
	console.error(e);
});

// Send @data to socket @ws with error checking
wss.send = function(ws, data) {
	if(ws.readyState !== WebSocket.OPEN) {
		return;
	}
	ws.send(data, function(error) {
		if(error) {
			Util.error('WebSocket error occured:');
			console.error(error);
		}
	});
}

// Broadcast @data to every socket except @exclude
wss.broadcast = function(data, exclude) {
	for(let client of wss.clients) {
		if(client !== exclude) {
			wss.send(client, data);
		}
	};
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
	// Packet structue : [header, playerCount, receiverId, id[i], x[i], y[i], color[i]]
	var data = new ArrayBuffer(Config.header_size + 2 + wss.clients.size*(1 + 2 * Config.position_size + Config.color_size));
	var dv = new DataView(data);

	dv.setUint8(0, Config.headers.initial_state, false); // Header
	dv.setUint8(Config.header_size + 0, wss.clients.size, false); // playerCount
	dv.setUint8(Config.header_size + 1, player.id, false); // receiverId

	var i = 0;
	var off = Config.header_size + 2;
	for(let client of wss.clients) {
		var p = client.player;
		off = Util.setIdPos(dv, off, p); // id, x, y
		off = Util.setString16(dv, off, p.colorString); // color
		i++;
	};

	wss.send(player.socket, data);
}

// Broadcast a player joined to everyone except the player themself
function broadcastPlayerNew(player) {
	// Packet structue : [header, playerCount, id, x, y, color]
	var data = new ArrayBuffer(Config.header_size + 1 + 1 + 2 * Config.position_size + Config.color_size);
	var dv = new DataView(data);
	dv.setUint8(0, Config.headers.player_new, false); // Headet
	dv.setUint8(Config.header_size, wss.clients.size, false); // playerCount

	var off = Config.header_size + 1;
	off = Util.setIdPos(dv, off, player); // id, x, y
	off = Util.setString16(dv, off, player.colorString); // color

	wss.broadcast(data, player.socket);
}

// Broadcast a player left to everyone except the player themself
function broadcastPlayerLeft(player) {
	// Packet structue : [header, playerCount, id]
	var data = new ArrayBuffer(Config.header_size + 2);
	var dv = new DataView(data);
	dv.setUint8(0, Config.headers.player_left);
	dv.setUint8(Config.header_size + 0, wss.clients.size);
	dv.setUint8(Config.header_size + 1, player.id);
	wss.broadcast(data, player.socket);
}

// Start server loop
function start() {
	Util.log('Starting server loop.');
	// Test loop that tosses everyone around
	var update = setInterval(function() {
		// If there are no clients connected stop the server loop and reset IDs
		if(wss.clients.size === 0) {
			if(!Id.updated) {
				Util.log('Resetting IDs');
				Id.reset();
			}
			if(!wss.pause) {			
				Util.log('No clients connected. Stop server loop.');
				wss.pause = true;
				clearInterval(update);
			}
			return;
		}
		// Update players
		var data = new ArrayBuffer(Config.header_size + 1 + wss.clients.size * (1 + 2 * Config.position_size));
		var dv = new DataView(data);
		dv.setUint8(0, Config.headers.position, false);
		dv.setUint8(1, wss.clients.size, false);

		var i = 0;
		for(let client of wss.clients) {
			if(client.readyState !== WebSocket.OPEN) {
				Util.error('Socket closed while trying to update');
				return;
			}
			if(typeof client.player === 'undefined') {
				Util.error('Undefined player in update. Skipping.');
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
			Util.setIdPos(dv, off, p);
			i++;
		};

		wss.broadcast(data);
	}, Config.tick_interval);
}