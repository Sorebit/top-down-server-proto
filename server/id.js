function Id() {
	var highest = 0;
	var dropped = [];

	this.updated = true;

	this.next = function() {
		// If there are no free IDs
		if(dropped.length === 0) {
			return highest++;
		}
		// Return last dropped ID, remove it from list
		var ret = dropped[dropped.length - 1];
		dropped.pop();
		this.updated = false;
		return ret;
	}

	this.free = function(id) {
		// If it's last
		if(id === highest - 1) {
			highest--;
			return;
		}
		// Add dropped ID to list
		dropped.push(id);
		this.updated = false;
	}

	this.reset = function() {
		highest = 0;
		dropped = [];
		this.updated = true;
	}
};

module.exports = Id;