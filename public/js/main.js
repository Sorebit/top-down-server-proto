'use strict';

const LITTLE_ENDIAN = checkLittleEndian();
const HDR_POS = 0x2;

function checkLittleEndian() {
	var a = new ArrayBuffer(4);
	var b = new Uint8Array(a);
	var c = new Uint32Array(a);
	b[0] = 0xa1;
	b[1] = 0xb2;
	b[2] = 0xc3;
	b[3] = 0xd4;
	if(c[0] === 0xd4c3b2a1)
		return true;
	if(c[0] === 0xa1b2c3d4)
		return false;
	throw new Error('Unrecognized endianness');
};

var host = window.document.location.host.replace(/:.*/, '');
var ws = new WebSocket('ws://' + host + ':3000');
ws.binaryType = 'arraybuffer';

var can = document.getElementById('result');
var ctx = can.getContext('2d');

can.width = 400;
can.height = 400;

ws.onmessage = function(event) {
	var data = event.data;
	var dv = new DataView(data);
	var header = dv.getFloat32(0, LITTLE_ENDIAN);
	// console.log('Message:', 'byteLength:', dv.byteLength, 'Header:', header);

	if(header === HDR_POS) {
		var x = dv.getFloat32(4, LITTLE_ENDIAN);
		var y = dv.getFloat32(8, LITTLE_ENDIAN);
		// console.log('x, y:', x, y);
		ctx.clearRect(0, 0, can.width, can.height);
		ctx.beginPath();
		ctx.arc(x, y, 10, 0, 2 * Math.PI, false);
		ctx.fillStyle = '#faba4b';
		ctx.fill();
		ctx.lineWidth = 2;
		ctx.strokeStyle = '#99722e';
		ctx.stroke();
		ctx.closePath();
	} else {
		console.error('Unknown message header:', header);
	}
}