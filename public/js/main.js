'use strict';

// Configuration
const config = {
	// Server port
	port: 3000,
	// Packet headers
	headers: {
		handshake: 0x01,
		initial_state: 0x10,
		position: 0x11,
		error_id: 0xE0,
		error_full: 0xE1
	},
	// Header size in bytes
	header_size: 1
};

var host = window.document.location.host.replace(/:.*/, '');
var ws = new WebSocket('ws://' + host + ':' + config.port);
ws.binaryType = 'arraybuffer';

var can = document.getElementById('result');
var ctx = can.getContext('2d');

can.width = 400;
can.height = 400;

function Player() {
	this.color = "#000";
}

var player = new Player();

function textFull(msg) {
	ctx.clearRect(0, 0, can.width, can.height);
	ctx.font = '36px Arial';
	ctx.textAlign = 'center';
	ctx.fillStyle = '#fff';
	ctx.fillText(msg, can.width / 2, can.height / 2);
	ctx.strokeStyle = '#333';
	ctx.strokeText(msg, can.width / 2, can.height / 2);
}

ws.onmessage = function(event) {
	var data = event.data;
	var dv = new DataView(data);
	var header = dv.getUint8(0, false);

	if(header === config.headers.position) {
		var x = dv.getFloat32(config.header_size + 0, false);
		var y = dv.getFloat32(config.header_size + 4, false);

		ctx.clearRect(0, 0, can.width, can.height);
		ctx.beginPath();
		ctx.arc(x, y, 10, 0, 2 * Math.PI, false);
		ctx.lineWidth = 2;
		ctx.fillStyle = player.color;
		ctx.strokeStyle = '#888';
		ctx.fill();
		ctx.stroke();
		ctx.closePath();
	} else if(header === config.headers.initial_state) {
		player.color = Util.getString(dv, config.header_size, config.header_size + 7*2);
	} else if(header === config.headers.error_id) {
		textFull('Server error.');
	} else if(header === config.headers.error_full) {
		textFull('Server full.');
	} else {
		console.error('Unknown message header:', header);
	}
}