'use strict';

// e.x [~header, x] means header is already processed

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

	this.keys = {
		'a': false,
		'd': false,
	};
}

var player;
var players = [];
var particles = [];

document.addEventListener('keydown', (e) => {
	if(typeof(player) === 'undefined'
	|| typeof(player.keys) === 'undefined')
		return;
	if(e.key === 'a' || e.key === 'd') {
		if(player.keys[e.key] === false) {
			player.keys[e.key] = true;
			console.log('Move: ' + e.key);
			var packet = new PacketBuffer(Config.header_size);
			packet.setUint8(Config.headers.key_down);
			ws.send(packet.build());
		}
	}
});

document.addEventListener('keyup', (e) => {
	if(typeof(player) === 'undefined'
	|| typeof(player.keys) === 'undefined')
		return;
	if(e.key === 'a' || e.key === 'd') {
		player.keys[e.key] = false;
		// ws.send(Config.headers.key_up);
		var packet = new PacketBuffer(Config.header_size);
		packet.setUint8(Config.headers.key_up);
		ws.send(packet.build());
	}
});

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
	var packet = new PacketBuffer(0, data);
	var header = packet.getUint8();

	// Position update
	if(header === Config.headers.position) {
		handlePositionUpdate(packet);
	// Initial server state after joining
	} else if(header === Config.headers.initial_state) {
		handleInitialState(packet);
	// Player connected
	} else if(header === Config.headers.player_new) {
		handleNewPlayer(packet);
	// Player left
	} else if(header === Config.headers.player_left) {
		// Packet structue : [~header, playerCount, id]
		playerCount = packet.getUint8();
		var id = packet.getUint8();
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

function handleNewPlayer(packet) {
	// Packet structue : [~header, playerCount, id, x, y, color]
	playerCount = packet.getUint8();
	const id = packet.getUint8();
	const x = packet.getFloat32();
	const y = packet.getFloat32();

	const r = packet.getUint8();
	const g = packet.getUint8();
	const b = packet.getUint8();
	const color = Util.color(r, g, b);

	players[id] = new Player(id, color);
	players[id].x = x;
	players[id].y = y;
	console.log('Player #' + id + ' has connected.');

	particles.push({x: x, y: y, size: 30});
}

function handleInitialState(packet) {
	// Packet structue : [~header, playerCount, receiverId, id[i], x[i], y[i], color.{r, g, b}[i] ]
	playerCount = packet.getUint8();
	const recId = packet.getUint8();
	for(var i = 0; i < playerCount; i++) {
		// Returned player
		const id = packet.getUint8();
		const x = packet.getFloat32();
		const y = packet.getFloat32();

		// Color
		const r = packet.getUint8();
		const g = packet.getUint8();
		const b = packet.getUint8();
		const color = Util.color(r, g, b);
		
		if(id === recId) {
			player = new Player(id, color);
			players[id] = player;
		} else {
			players[id] = new Player(id, color);
		}
		players[id].x = x;
		players[id].y = y;
	}
}

function handlePositionUpdate(packet) {
	// Packet structue : [~header, deltaCount, id[i], x[i], y[i]]
	var deltaCount = packet.getUint8();
	for(var i = 0; i < deltaCount; i++) {
		var id = packet.getUint8();
		var x = packet.getFloat32();
		var y = packet.getFloat32();
		players[id].x = x;
		players[id].y = y;
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