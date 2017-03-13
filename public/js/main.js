'use strict';

// Packet processing code seems a little repetitive, I wonder what I could do about this.

var host = window.document.location.host.replace(/:.*/, '');
var ws = new WebSocket('ws://' + host + ':' + Config.port);
ws.binaryType = 'arraybuffer';

var serverFull = false;
var serverClosed = false;
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
var particles = [];

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
		playerCount = dv.getUint8(Config.header_size, false);
		var id = dv.getUint8(Config.header_size + 1, false);
		delete players[id];
		console.log('Player #' + id + ' has disconnected.');
	// Server error
	} else if(header === Config.headers.error_server) {
		textFull('Server error.');
		serverClosed = true;
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
	serverClosed = true;
}

function handleNewPlayer(dv) {
	playerCount = dv.getUint8(Config.header_size, false);
	var rp = Util.getIdPos(dv, Config.header_size + 1);
	var color = Util.getString16(dv, rp.off, rp.off + Config.color_size);
	players[rp.id] = new Player(rp.id, color);
	players[rp.id].x = rp.x;
	players[rp.id].y = rp.y;
	console.log('Player #' + rp.id + ' has connected.');

	particles.push({x: rp.x, y: rp.y, size: 30});
}

function handleInitialState(dv) {
	playerCount = dv.getUint8(Config.header_size + 0, false);
	var recId = dv.getUint8(Config.header_size + 1, false);
	var off = Config.header_size + 2;
	for(var i = 0; i < playerCount; i++) {
		// Returned player
		var rp = Util.getIdPos(dv, off);
		off = rp.off;

		var color = Util.getString16(dv, off, off + Config.color_size);
		off += Config.color_size;
		if(rp.id === recId) {
			player = new Player(rp.id, color);
			players[rp.id] = player;
		} else {
			players[rp.id] = new Player(rp.id, color);
		}
		players[rp.id].x = rp.x;
		players[rp.id].y = rp.y;
	}
}

function handlePositionUpdate(dv) {
	var count = dv.getUint8(Config.header_size, false);
	for(var i = 0; i < count; i++) {
		var off = Config.header_size + 1 + i*9;
		var rp = Util.getIdPos(dv, off);
		players[rp.id].x = rp.x;
		players[rp.id].y = rp.y;
	}
}

function render() {
	if(serverFull) {
		textFull('Server full.');
		return;
	} else if(serverClosed) {
		textFull('Server closed.');
		return;
	}

	ctx.clearRect(0, 0, can.width, can.height);
	particles.forEach(function each(p) {
		console.log(p);
		ctx.beginPath();
		ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI, false);
		ctx.fillStyle = 'rgba(165, 138, 206, 0.2)';
		ctx.strokeStyle = 'rgba(73, 56, 99, 0.4)';
		ctx.stroke();
		ctx.fill();
		p.size -= 2;
		if(p.size < 1) {
			p.del = true;
		}
	});

	for(var i = particles.length - 1; i >= 0; i--) {
		if(particles[i].del) {
			particles.splice(i, 1);
		}
	}

	ctx.lineWidth = 2;

	players.forEach(function each(p) {

		// Draw a lighter circle around player
		if(p.id === player.id) {
			ctx.beginPath();
			ctx.arc(p.x, p.y, 18, 0, 2 * Math.PI, false);
			ctx.strokeStyle = '#aaa';
			ctx.stroke();
			ctx.closePath();
		}

		ctx.beginPath();
		ctx.arc(p.x, p.y, 10, 0, 2 * Math.PI, false);
		ctx.fillStyle = p.color;
		ctx.strokeStyle = '#888';
		ctx.fill();
		ctx.stroke();
		ctx.closePath();
	});
	textPlayers();
	requestAnimationFrame(render);
}
render();