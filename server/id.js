function Id() {
	var highest = 0;
	var dropped = [];

	this.next = function() {
		// If there are no free IDs
		if(dropped.length === 0) {
			return highest++;
		}
		// Return last dropped id, remove it from list
		var ret = dropped[dropped.length - 1];
		dropped.pop();
		return ret;
	}

	this.free = function(id) {
		// If it's last
		if(id === highest - 1) {
			highest--;
			return;
		}
		// Add dropped id to list
		dropped.push(id);
	}
};

module.exports = Id;