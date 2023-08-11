addEventListener('mousemove', (event) => {
    if(frontEndPlayers[socket.id]) {
        const canvas = document.querySelector('canvas');
        const  { top, left } = canvas.getBoundingClientRect();
        const playerPosition = {
            x: frontEndPlayers[socket.id].x,
            y: frontEndPlayers[socket.id].y
        }
        const angle = Math.atan2(
            (event.clientY - top) - playerPosition.y,
            (event.clientX - left) - playerPosition.x
        )

        // updates mouse position and angle in game
        MOUSE_POS = { x: playerPosition.x, y: playerPosition.y, angle }
    }
})

var intervalId;
$(window).mousedown(function() {
    if(frontEndPlayers[socket.id]) {
        let frontEndPlayer = frontEndPlayers[socket.id];
        let level = frontEndPlayer.level;
        let fireRate = frontEndPlayer.weapon[level].fireRate;

        (function ShootWeapon() {
            
            socket.emit('shoot', {
                x: MOUSE_POS.x,
                y: MOUSE_POS.y,
                angle: MOUSE_POS.angle
            })
        
            intervalId = setTimeout(ShootWeapon, fireRate);
        })();
    }
}).mouseup(function() {
  clearInterval(intervalId);
});

