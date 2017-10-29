'use strict';

var Config = require('./config.json');
var Util = require('./util');
var PacketBuffer = require('./buffer');
var Player = require('./player');
var IdHandler = require('./id');
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
var wss = new WebSocketServer({ server: server });
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

	ws.on('message', function(data, flags) {
		var ab = Util.bufferToArrayBuffer(data);
		handleIncomingMessage(ws, ab);
	});

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
		Util.handleSocketError(e);
	});
});

// Handle WebSocketServer errors (although I never saw any)
wss.on('error', function(e) {
	Util.error('Unhandled WebSocketServer error occured:');
	console.error(e);
});

// Send @data to socket @ws with error checking
wss.send = function(ws, data) {
	if(ws.readyState !== WebSocket.OPEN) {
		return;
	}
	ws.send(data, function(e) {
		Util.handleSocketError(e);
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
	var packet = new PacketBuffer(Config.header_size);
	packet.setUint8(reason);
	wss.send(ws, packet.build());
	ws.close();
}

// Send initial game state to @ws
function sendInitial(player) {
	// Packet structue : [header, playerCount, receiverId, id[i], x[i], y[i], color.{r, g, b}[i] ]
	const size = Config.header_size + 2 + wss.clients.size * (4 + 2 * Config.position_size);
	var packet = new PacketBuffer(size);

	packet.setUint8(Config.headers.initial_state); // Header
	packet.setUint8(wss.clients.size); // playerCount
	packet.setUint8(player.id); // receiverId

	for(let client of wss.clients) {
		var player = client.player;
		packet.setUint8(player.id);
		packet.setFloat32(player.pos.x, player.pos.y);
		packet.setUint8(player.color.r, player.color.g, player.color.b);
	};

	wss.send(player.socket, packet.build());
}

// Broadcast a player joined to everyone except the player themself
function broadcastPlayerNew(player) {
	// Packet structue : [header, playerCount, id, x, y, color]
	const size = Config.header_size + 5 + 2 * Config.position_size;
	var packet = new PacketBuffer(size);
	packet.setUint8(Config.headers.player_new); // Header
	packet.setUint8(wss.clients.size); // playerCount

	packet.setUint8(player.id);
	packet.setFloat32(player.pos.x, player.pos.y);
	packet.setUint8(player.color.r, player.color.g, player.color.b);

	wss.broadcast(packet.build(), player.socket);
}

// Broadcast a player left to everyone except the player themself
function broadcastPlayerLeft(player) {
	// Packet structue : [header, playerCount, id]
	var packet = new PacketBuffer(Config.header_size + 2);
	packet.setUint8(Config.headers.player_left);
	packet.setUint8(wss.clients.size);
	packet.setUint8(player.id);
	wss.broadcast(packet.build(), player.socket);
}

// Handle message received from client
function handleIncomingMessage(sender, ab) {
	var packet = new PacketBuffer(0, ab);
	const header = packet.getUint8();
	// for(let i in Config.headers) {
	// 	if(Config.headers[i] == header)
	// 		console.log('[' + sender.player.id + ']', i);
	// }
	if(header >= 0x31 && header <= 0x34) {
		const dir = ['w', 's', 'a', 'd'][header - 0x31];
		if(dir === 'w')
			sender.player.moving.up = true;
		else if(dir === 's')
			sender.player.moving.down = true;
		else if(dir === 'a')
			sender.player.moving.left = true;
		else if(dir === 'd')
			sender.player.moving.right = true;
	}

	if(header >= 0x41 && header <= 0x44) {
		const dir = ['w', 's', 'a', 'd'][header - 0x41];
		if(dir === 'w')
			sender.player.moving.up = false;
		else if(dir === 's')
			sender.player.moving.down = false;
		else if(dir === 'a')
			sender.player.moving.left = false;
		else if(dir === 'd')
			sender.player.moving.right = false;
	}
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
		// Packet structue : [header, deltaCount, id[i], x[i], y[i]]
		const size = Config.header_size + 1 + wss.clients.size * (1 + 2 * Config.position_size);
		var packet = new PacketBuffer(size);
		packet.setUint8(Config.headers.position);
		packet.setUint8(wss.clients.size);

		// Later on packets should be build around positions that *have changed*

		for(let client of wss.clients) {
			// Socket closed while trying to update 
			if(client.readyState !== WebSocket.OPEN) {
				return;
			}
			// Undefined player in update. Skipping.
			if(typeof client.player === 'undefined') {
				return;
			}

			var player = client.player;

			player.dx = 0;
			player.dy = 0;

			if(player.moving.up)
				player.dy -= 7.0;
			if(player.moving.down)
				player.dy += 7.0;
			if(player.moving.left)
				player.dx -= 7.0;
			if(player.moving.right)
				player.dx += 7.0;

			if(player.pos.x + player.dx < 0 || player.pos.x + player.dx > 400)
				player.dx *= -1;
			if(player.pos.y + player.dy < 0 || player.pos.y + player.dy > 400)
				player.dy *= -1;

			player.pos.x += player.dx;
			player.pos.y += player.dy;

			packet.setUint8(player.id);
			packet.setFloat32(player.pos.x, player.pos.y);
		};

		wss.broadcast(packet.build());

	}, Config.tick_interval);
}