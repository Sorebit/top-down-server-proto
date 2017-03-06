// Player object
var Util = require('./util.js');

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
		x: x = Util.rand(10, 390, true),
		y: Util.rand(10, 390, true)
	};
	this.dx = Util.rand(5, 7);
	this.dy = Util.rand(5, 7);
	this.color = {
		r: Util.rand(140, 240, true),
		g: Util.rand(140, 240, true),
		b: Util.rand(140, 240, true)
	}
	this.colorString = '#' + this.color.r.toString(16) + this.color.g.toString(16) + this.color.b.toString(16);
}

module.exports = Player;