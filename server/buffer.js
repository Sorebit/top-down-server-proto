// ArrayBuffer wrapper for more elegant byte setting
// Setters set values in order they are passed

var Util = require('./util');

function Buffer(size) {
	this._ab = new ArrayBuffer(size);
	this._dv = new DataView(this._ab);

	// Offset
	this.o = 0;
	// Endian (false = little)
	this.e = false;
}

Buffer.prototype._set = function(thisArg, size, args) {
	if(!thisArg || !size || !args) {
		Util.error('Invalid setter');
		return;
	}
	for(var i = 0; i < args.length; ++i) {
		thisArg.call(this._dv, this.o + size * i, args[i], this.e);
	}
	this.o += size * args.length;
}

Buffer.prototype.setInt8 = function() {
	this._set(DataView.prototype.setInt8, 1, arguments);
}

Buffer.prototype.setUint8 = function() {
	this._set(DataView.prototype.setUint8, 1, arguments);
}

Buffer.prototype.setInt16 = function() {
	this._set(DataView.prototype.setInt16, 2, arguments);
}

Buffer.prototype.setUint16 = function() {
	this._set(DataView.prototype.setUint16, 2, arguments);
}

Buffer.prototype.setInt32 = function() {
	this._set(DataView.prototype.setInt32, 4, arguments);
}

Buffer.prototype.setUint32 = function() {
	this._set(DataView.prototype.setUint32, 4, arguments);
}

Buffer.prototype.setFloat32 = function() {
	this._set(DataView.prototype.setFloat32, 4, arguments);
}

Buffer.prototype.setFloat64 = function() {
	this._set(DataView.prototype.setFloat64, 8, arguments);
}

// Add string terminator?
Buffer.prototype.setString16 = function(str) {
	for(var i = 0; i < str.length; i++) {
		this._dv.setUint16(this.o + i * 2, str.charCodeAt(i), this.e);
	}
	this.o += str.length * 2;
}

Buffer.prototype.build = function() {
	return this._ab;
}

module.exports = Buffer;