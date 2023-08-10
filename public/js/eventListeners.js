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

addEventListener('click', () => {
    if(frontEndPlayers[socket.id]) {
        socket.emit('shoot', {
            x: MOUSE_POS.x,
            y: MOUSE_POS.y,
            angle: MOUSE_POS.angle
        })
    }
})
