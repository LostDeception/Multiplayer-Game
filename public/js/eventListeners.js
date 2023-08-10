addEventListener('click', (event) => {
    if(frontEndPlayers[socket.id]) {
        const playerPosition = {
            x: frontEndPlayers[socket.id].x,
            y: frontEndPlayers[socket.id].y
        }
        const angle = Math.atan2(
            (event.clientY * window.devicePixelRatio) - playerPosition.y,
            (event.clientX * devicePixelRatio) - playerPosition.x
        )
    
        socket.emit('shoot', {
            x: playerPosition.x,
            y: playerPosition.y,
            angle
        })
    }
})
