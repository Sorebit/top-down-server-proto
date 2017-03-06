var Util = function(){};

// Log with time and date (incapable of printing full objects, but I don't think it needs to)
Util.log = function() {
	var cont = '[' + Util.dateTime() + ' INFO]';
	for(var arg = 0; arg < arguments.length; ++arg)
		cont += ' ' + arguments[arg];
	console.log(cont);
}

// Log error with time and date
Util.logError = function() {
	var cont = '[' + Util.dateTime() + ' ERROR]';
	for(var arg = 0; arg < arguments.length; ++arg)
		cont += ' ' + arguments[arg];
	console.log(cont);
}

// Prepend '0' if @a is less than @lt
Util.prepZero = function(a, lt) {
	if(!isNaN(a) && a < lt)
		return '0' + a.toString();
	return a.toString();
}

// Date / time string (DD/MM HH:MM:SS)
Util.dateTime = function() {
	var d = new Date(Date.now() + 1*60*60*1000);
	var date = Util.prepZero(d.getDate(), 10);
	var month = Util.prepZero(d.getUTCMonth() + 1, 10);
	var hour = Util.prepZero(d.getUTCHours(), 10);
	var minute = Util.prepZero(d.getUTCMinutes(), 10);
	var second = Util.prepZero(d.getUTCSeconds(), 10);
	return date + '/' + month + ' ' + hour + ':' + minute + ':' + second;
};

// Random in range [@a, @b], floor the value if @floor is true
Util.rand = function(a, b, floor) {
	var c; if(a > b) { c = a; a = b; b = c; }
	var r = Math.random() * (b - a + 1) + a;
	return (floor) ? Math.floor(r) : r;
}

// Get string DataView beginning at @beg, ending at @end to string, charCodes stored as Uint16
Util.getString16 = function(dv, beg, end) {
	var c = [];
	for(var i = beg; i < end; i += 2) {
		c.push(dv.getUint16(i, false));
	}
	return String.fromCharCode.apply(null, c);
}

// Set charCode values of given string for dataview, charCodes stored as Uint16
Util.setString16 = function(dv, off, str) {
	for(var i = 0; i < str.length; i++) {
		dv.setUint16(i * 2 + off, str.charCodeAt(i), false);
	}
}

module.exports = Util;