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

Util.color = function(r, g, b) {
	var c = '#';
	c += ((r < 16) ? '0' : '') + r.toString(16);
	c += ((g < 16) ? '0' : '') + g.toString(16);
	c += ((b < 16) ? '0' : '') + b.toString(16);
	return c;
}