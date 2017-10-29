### Types
- Header type: Uint8
- Most types: Uint8
- String charCodes: Uint16
- Position: Float32

### Gameplay ideas
- Ability to shoot through walls
- Gamemode in which players have 10 seconds at the beginning to place things
- Rocket launchers.

### Packets
- I decided to go for specifying headers for every key rather than composing a packet
of a header and a keycode to cut down on data sent everytime. I'm not sure if I'm
going to stick with this approach