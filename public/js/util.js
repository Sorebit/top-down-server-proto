var Util = function(){};

Util.setString16 = function(dv, off, str) {
	for(var i = 0; i < str.length; i++) {
		dv.setUint16(i * 2 + off, str.charCodeAt(i), false);
	}
}

Util.getString16 = function(dv, beg, end) {
	var c = [];
	for(var i = beg; i < end; i += 2) {
		c.push(dv.getUint16(i, false));
	}
	return String.fromCharCode.apply(null, c);
}


Util.getIdPos = function(dv, off) {
	var ret = {};
	ret.id = dv.getUint8(off, false);
	ret.x = dv.getFloat32(off + 1, false);
	ret.y = dv.getFloat32(off + 1 + Config.position_size, false);
	ret.off = off + 1 + 2 * Config.position_size;
	return ret;
}