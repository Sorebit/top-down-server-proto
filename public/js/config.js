// Configuration
const Config = {
	// Server port
	port: 3000,
	// Packet headers
	headers: {
		handshake: 0x01,
		initial_state: 0x10,
		player_new: 0x11,
		player_left: 0x12,
		position: 0x20,
		key_down: 0x30,
		key_up: 0x31,
		error_server: 0xE0,
		error_full: 0xE1
	},
	// Header size in bytes
	header_size: 1,
	color_size: 14,
	position_size: 4,
	text_color_fill: '#fff',
	text_color_stroke: '#444',

};