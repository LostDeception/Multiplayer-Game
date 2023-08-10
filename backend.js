const express = require('express')
const app = express()

// socket.io setup
const http = require("http");
const server = http.createServer(app);
const { Server } = require('socket.io');

// ping server every 2 seconds.. if no response for 5 seconds disconnect 
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 });

const port = 3000
const PLAYER_RADIUS = 10;

// (REMINDER) ---> Radius and Falloff need to be attributes for currently active weapon when created!!!
const PROJECTILE_RADIUS = 5;
const PROJECTILE_FALLOFF = 500;

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

const backEndPlayers = {}
const backEndProjectiles = {}


const SPEED = 5;
let projectileId = 0;

io.on('connection', (socket) => {
  console.log('a user connected');
  io.emit('updatePlayers', backEndPlayers);

  socket.on('initCanvas', ({width, height, devicePixelRatio}) => {
    
  })
  
  socket.on('shoot', ({x, y, angle}) => {
    projectileId++;

    const velocity = {
      x: Math.cos(angle) * 5,
      y: Math.sin(angle) * 5
    }

    backEndProjectiles[projectileId] = {
      x, 
      y, 
      startX: x, // holds firing position (does not update throughout life of projectile) 
      startY: y, // holds firing position (does not update throughout life of projectile) 
      velocity, 
      playerId: socket.id
    }
  })

  socket.on('initGame', ({username, width, height}) => {

    // create unique player id/object (id matches the socket id)
    backEndPlayers[socket.id] = {
      x: 500 * Math.random(), 
      y: 500 * Math.random(),
      color: `hsl(${360 * Math.random()}, 100%, 50%)`, // generate a random number
      sequenceNumber: 0,
      score: 0,
      username
    }


    // where we init our canvas
    backEndPlayers[socket.id].canvas = {
      width,
      height
    }

    backEndPlayers[socket.id].radius = PLAYER_RADIUS;
  })

  // when player disconnects remove from players object in backend
  // emit event to update player object on frontend
  socket.on('disconnect', (reason) => {
    console.log(reason);
    delete backEndPlayers[socket.id];
    io.emit('updatePlayers', backEndPlayers);
  })

  socket.on('keydown', ({keycode, sequenceNumber}) => {
    backEndPlayers[socket.id].sequenceNumber = sequenceNumber;
    switch(keycode) { 
      case 'KeyW':
        backEndPlayers[socket.id].y -= SPEED;
        break;
      case 'KeyA':
        backEndPlayers[socket.id].x -= SPEED;
        break;
      case 'KeyS':
        backEndPlayers[socket.id].y += SPEED;
        break;
      case 'KeyD':
        backEndPlayers[socket.id].x += SPEED;
        break;
    }
  })
})

// tick event to send player data to front end
setInterval(() => {

  // update projectile positions
  for(const id in backEndProjectiles) {
    backEndProjectiles[id].x += backEndProjectiles[id].velocity.x;
    backEndProjectiles[id].y += backEndProjectiles[id].velocity.y;

    let playerID = backEndProjectiles[id].playerId;
    if(

      // Handle projectile disposal on the X axis
      (backEndProjectiles[id].x - PROJECTILE_RADIUS) >= (backEndProjectiles[id].startX + PROJECTILE_FALLOFF) || 
      (backEndProjectiles[id].x + PROJECTILE_RADIUS) <= (backEndProjectiles[id].startX - PROJECTILE_FALLOFF) ||
      
      // Handle projectile disposal on the Y axis
      (backEndProjectiles[id].y - PROJECTILE_RADIUS) >= (backEndProjectiles[id].startY + PROJECTILE_FALLOFF) || 
      (backEndProjectiles[id].y + PROJECTILE_RADIUS) <= (backEndProjectiles[id].startY - PROJECTILE_FALLOFF)) {
      delete backEndProjectiles[id];
      continue
    }

    for(const playerId in backEndPlayers) {
      const backEndPlayer = backEndPlayers[playerId];

      const DISTANCE = Math.hypot(
        backEndProjectiles[id].x - backEndPlayer.x, 
        backEndProjectiles[id].y - backEndPlayer.y
      )

      if(DISTANCE < PROJECTILE_RADIUS + PLAYER_RADIUS && 
        backEndProjectiles[id].playerId !== playerId) {

        // Player has been hit by projectile
        if(backEndPlayers[backEndProjectiles[id].playerId]) {
          backEndPlayers[backEndProjectiles[id].playerId].score++;
        }

        delete backEndProjectiles[id]
        delete backEndPlayers[playerId]
        break;
      }
    }
  }

  io.emit('updateProjectiles', backEndProjectiles);
  io.emit('updatePlayers', backEndPlayers);
}, 15)

// listen on http server not express
server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
