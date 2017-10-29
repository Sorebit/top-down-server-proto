// ArrayBuffer wrapper for more elegant byte setting
// Setters set values in order they are passed

// var Util = require('./util');

function PacketBuffer(size, ab) {
	if(size === 0 && typeof ab !== 'undefined') {
		this._ab = ab;
	} else {
		this._ab = new ArrayBuffer(size);
	}

	this._dv = new DataView(this._ab);

	// Offset
	this.o = 0;
	// Endian (false = little)
	this.e = false;
}

PacketBuffer.prototype._set = function(thisArg, size, args) {
	if(!thisArg || !size || !args) {
		Util.error('Invalid setter');
		return;
	}
	for(var i = 0; i < args.length; ++i) {
		thisArg.call(this._dv, this.o + size * i, args[i], this.e);
	}
	this.o += size * args.length;
}

PacketBuffer.prototype.setInt8 = function() {
	this._set(DataView.prototype.setInt8, 1, arguments);
}

PacketBuffer.prototype.setUint8 = function() {
	this._set(DataView.prototype.setUint8, 1, arguments);
}

PacketBuffer.prototype.setInt16 = function() {
	this._set(DataView.prototype.setInt16, 2, arguments);
}

PacketBuffer.prototype.setUint16 = function() {
	this._set(DataView.prototype.setUint16, 2, arguments);
}

PacketBuffer.prototype.setInt32 = function() {
	this._set(DataView.prototype.setInt32, 4, arguments);
}

PacketBuffer.prototype.setUint32 = function() {
	this._set(DataView.prototype.setUint32, 4, arguments);
}

PacketBuffer.prototype.setFloat32 = function() {
	this._set(DataView.prototype.setFloat32, 4, arguments);
}

PacketBuffer.prototype.setFloat64 = function() {
	this._set(DataView.prototype.setFloat64, 8, arguments);
}

// Add string terminator?
PacketBuffer.prototype.setString16 = function(str) {
	for(var i = 0; i < str.length; i++) {
		this._dv.setUint16(this.o + i * 2, str.charCodeAt(i), this.e);
	}
	this.o += str.length * 2;
}

PacketBuffer.prototype._get = function(thisArg, size) {
	if(!thisArg || !size) {
		Util.error('Invalid getter');
		return null;
	}
	const ret = thisArg.call(this._dv, this.o, this.e);
	this.o += size;
	return ret;
}

PacketBuffer.prototype.getInt8 = function() {
	return this._get(DataView.prototype.getInt8, 1);
}

PacketBuffer.prototype.getUint8 = function() {
	return this._get(DataView.prototype.getUint8, 1);
}

PacketBuffer.prototype.getInt16 = function() {
	return this._get(DataView.prototype.getInt16, 2);
}

PacketBuffer.prototype.getUint16 = function() {
	return this._get(DataView.prototype.getUint16, 2);
}

PacketBuffer.prototype.getInt32 = function() {
	return this._get(DataView.prototype.getInt32, 4);
}

PacketBuffer.prototype.getUint32 = function() {
	return this._get(DataView.prototype.getUint32, 4);
}

PacketBuffer.prototype.getFloat32 = function() {
	return this._get(DataView.prototype.getFloat32, 4);
}

PacketBuffer.prototype.getFloat64 = function() {
	return this._get(DataView.prototype.getFloat64, 8);
}

PacketBuffer.prototype.build = function() {
	return this._ab;
}

// module.exports = PacketBuffer;