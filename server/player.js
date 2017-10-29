// Player object
var Util = require('./util');

function Player(id, socket) {
	if(isNaN(id)) {
		Util.logError('Player constructor requires an id.');
		return;		
	}
	if(!socket) {
		Util.logError('Player constructor requires a socket object reference.');
		return;
	}
	this.id = id;
	this.socket = socket;

	this.pos = {
		x: Util.rand(10, 390, true),
		y: Util.rand(10, 390, true),
	};
	this.dx = 0.0;
	this.dy = 0.0;
	// this.dx = Util.rand(5, 7) * (Util.rand(0, 1) < 0.5 ? -1 : 1);
	// this.dy = Util.rand(5, 7) * (Util.rand(0, 1) < 0.5 ? -1 : 1);

	this.moving = {
		up: false,
		down: false,
		left: false,
		right: false,
	}

	this.color = {
		r: Util.rand(140, 240, true),
		g: Util.rand(140, 240, true),
		b: Util.rand(140, 240, true),
	}
}

module.exports = Player;