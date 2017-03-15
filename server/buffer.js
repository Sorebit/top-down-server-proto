// ArrayBuffer wrapper for more elegant byte setting
// Setters set values in order they are passed

function Buffer(size) {
	this._ab = new ArrayBuffer(size);
	this._dv = new DataView(this._ab);

	// Offset
	this.o = 0;
	// Endian (false = little)
	this.e = false;
}

Buffer.prototype.setInt8 = function() {
	for(var i = 0; i < arguments.length; ++i)
		this._dv.setInt8(this.o + i, arguments[i], this.e);
	this.o += 1 * arguments.length;
}

Buffer.prototype.setUint8 = function() {
	for(var i = 0; i < arguments.length; ++i)
		this._dv.setUint8(this.o + i, arguments[i], this.e);
	this.o += 1 * arguments.length;
}

Buffer.prototype.setInt16 = function() {
	for(var i = 0; i < arguments.length; ++i)
		this._dv.setInt16(this.o + i * 2, arguments[i], this.e);
	this.o += 2 * arguments.length;
}

Buffer.prototype.setUint16 = function() {
	for(var i = 0; i < arguments.length; ++i)
		this._dv.setUint16(this.o + i * 2, arguments[i], this.e);
	this.o += 2 * arguments.length;
}

Buffer.prototype.setInt32 = function() {
	for(var i = 0; i < arguments.length; ++i)
		this._dv.setInt32(this.o + i * 4, arguments[i], this.e);
	this.o += 4 * arguments.length;
}

Buffer.prototype.setUint32 = function() {
	for(var i = 0; i < arguments.length; ++i)
		this._dv.setUint32(this.o + i * 4, arguments[i], this.e);
	this.o += 4 * arguments.length;
}

Buffer.prototype.setFloat32 = function() {
	for(var i = 0; i < arguments.length; ++i)
		this._dv.setFloat32(this.o + i * 4, arguments[i], this.e);
	this.o += 4 * arguments.length;
}

Buffer.prototype.setFloat64 = function() {
	for(var i = 0; i < arguments.length; ++i)
		this._dv.setFloat64(this.o + i * 8, arguments[i], this.e);
	this.o += 8 * arguments.length;
}

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