'use strict';

// Packet processing code seems a little repetitive, I wonder what I could do with this.

// Configuration
const Config = {
	// Server port
	port: 3000,
	// Packet headers
	headers: {
		handshake: 0x01,
		initial_state: 0x10,
		player_new: 0x11,
		player_left: 0x12,
		position: 0x20,
		error_server: 0xE0,
		error_full: 0xE1
	},
	// Header size in bytes
	header_size: 1,
	color_size: 14,
	text_color_fill: '#fff',
	text_color_stroke: '#444',

};

var host = window.document.location.host.replace(/:.*/, '');
var ws = new WebSocket('ws://' + host + ':' + Config.port);
ws.binaryType = 'arraybuffer';

var serverFull = false;
var playerCount = 0;

var can = document.getElementById('result');
var ctx = can.getContext('2d');

can.width = 400;
can.height = 400;

function Player(id, color) {
	if(isNaN(id)) {
		console.error('Player constructor requires an id.');
		return;		
	}
	this.id = id;
	this.color = color;
	this.x = 0;
	this.y = 0;
}

var player;
var players = [];

function textFull(msg) {
	ctx.lineWidth = 2;
	ctx.clearRect(0, 0, can.width, can.height);
	ctx.font = '36px Arial';
	ctx.textAlign = 'center';
	ctx.strokeStyle = Config.text_color_stroke;
	ctx.strokeText(msg, can.width / 2, can.height / 2);
	ctx.fillStyle = Config.text_color_fill;
	ctx.fillText(msg, can.width / 2, can.height / 2);
}

function textPlayers() {
	ctx.fillStyle = 'rgba(40, 40, 40, 0.1)';
	ctx.fillRect(0, 0, 40, 40);
	ctx.lineWidth = 2;
	ctx.font = '24px Arial';
	ctx.textAlign = 'center';
	ctx.strokeStyle = Config.text_color_stroke;
	ctx.strokeText(playerCount, 20, 30);
	ctx.fillStyle = Config.text_color_fill;
	ctx.fillText(playerCount, 20, 30);
}

// Handle server messages
ws.onmessage = function(event) {
	var data = event.data;
	var dv = new DataView(data);
	var header = dv.getUint8(0, false);

	// Position update
	if(header === Config.headers.position) {
		handlePositionUpdate(dv);
	// Initial server state after joining
	} else if(header === Config.headers.initial_state) {
		handleInitialState(dv);
	// Player connected
	} else if(header === Config.headers.player_new) {
		handleNewPlayer(dv);
	// Player left
	} else if(header === Config.headers.player_left) {
		console.log('A player has disconnected.');
		playerCount = dv.getUint8(Config.header_size, false);
		var id = dv.getUint8(Config.header_size + 1, false);
		delete player[id];
	// Server error
	} else if(header === Config.headers.error_server) {
		textFull('Server error.');
	// Server full
	} else if(header === Config.headers.error_full) {
		textFull('Server full.');
		serverFull = true;
	// Unknown packet type
	} else {
		console.error('Unknown message header:', header);
	}

}

ws.onclose = function(event) {
	console.log('Socket closed.');
	if(!serverFull) {
		textFull('Server closed.');
	}
}

function handleNewPlayer(dv) {
	playerCount = dv.getUint8(Config.header_size, false);
	var id = dv.getUint8(Config.header_size + 1, false);
	var x = dv.getUint8(Config.header_size + 2, false);
	var y = dv.getUint8(Config.header_size + 3, false);
	var color = Util.getString16(dv, Config.header_size + 4, Config.header_size + 4 + Config.color_size);
	players[id] = new Player(id, color);
	players[id].x = x;
	players[id].y = y;
	console.log('A player has connected.');
}

function handleInitialState(dv) {
	playerCount = dv.getUint8(Config.header_size + 0, false);
	var pId = dv.getUint8(Config.header_size + 1, false);
	for(var i = 0; i < playerCount; i++) {
		var off = Config.header_size + 2 + i*(Config.color_size + 3);
		var id = dv.getUint8(off + 0, false);
		var x = dv.getUint8(off + 1, false);
		var y = dv.getUint8(off + 2, false);
		var color = Util.getString16(dv, off + 3, off + 3 + Config.color_size);
		if(id === pId) {
			player = new Player(id, color);
			players[id] = player;
		} else {
			players[id] = new Player(id, color);
		}
		players[id].x = x;
		players[id].y = y;
	}

	textPlayers();
}

function handlePositionUpdate(dv) {
	ctx.lineWidth = 2;
	ctx.clearRect(0, 0, can.width, can.height);

	var count = dv.getUint8(Config.header_size, false);
	for(var i = 0; i < count; i++) {
		var off = Config.header_size + 1 + i*9;
		var id = dv.getUint8(off, false);
		var x = dv.getFloat32(off + 1 + 0, false);
		var y = dv.getFloat32(off + 1 + 4, false);

		// Draw a lighter circle around player
		if(id === player.id) {
			ctx.beginPath();
			ctx.arc(x, y, 18, 0, 2 * Math.PI, false);
			ctx.strokeStyle = '#aaa';
			ctx.stroke();
			ctx.closePath();
		}

		ctx.beginPath();
		ctx.arc(x, y, 10, 0, 2 * Math.PI, false);
		ctx.fillStyle = players[id].color;
		ctx.strokeStyle = '#888';
		ctx.fill();
		ctx.stroke();
		ctx.closePath();
	}

	textPlayers();
}