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

// Prepend '0' if a is less than @lt
Util.prepZero = function(a, lt) {
	if(!isNaN(a) && a < lt)
		return '0' + a.toString();
	return a.toString();
}

Util.dateTime = function() {
	var d = new Date(Date.now() + 1*60*60*1000);
	var date = Util.prepZero(d.getDate(), 10);
	var month = Util.prepZero(d.getUTCMonth() + 1, 10);
	var hour = Util.prepZero(d.getUTCHours(), 10);
	var minute = Util.prepZero(d.getUTCMinutes(), 10);
	var second = Util.prepZero(d.getUTCSeconds(), 10);
	return date + '/' + month + ' ' + hour + ':' + minute + ':' + second;
};

Util.rand = function(a, b, floor) {
	var c; if(a > b) { c = a; a = b; b = c; }
	var r = Math.random() * (b - a + 1) + a;
	return (floor) ? Math.floor(r) : r;
}


module.exports = Util;