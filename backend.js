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
const PROJECTILE_SPEED = 10;

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

const backEndPlayers = {}
const backEndProjectiles = {}


const SPEED = 3;
const PLAYER_HEALTH = 60;
const PLAYER_DAMAGE = 2;
let projectileId = 0;

io.on('connection', (socket) => {
  console.log('a user connected');
  io.emit('updatePlayers', backEndPlayers);
  
  socket.on('shoot', ({x, y, angle}) => {
    projectileId++;

    var backendPlayer = backEndPlayers[socket.id];
    var weapon = backendPlayer.weapon;

    const velocity = {
      x: Math.cos(angle) * weapon.speed,
      y: Math.sin(angle) * weapon.speed
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

  socket.on('aim', (angle) => {
    if(backEndPlayers[socket.id])
      backEndPlayers[socket.id].aimAngle = angle;
  })

  socket.on('initGame', ({username, width, height}) => {

    // create unique player id/object (id matches the socket id)
    backEndPlayers[socket.id] = {
      x: 1024 * Math.random(),
      y: 576 * Math.random(),
      aimAngle: 0,
      health: PLAYER_HEALTH, // player default health
      color: `hsl(${360 * Math.random()}, 100%, 50%)`, // generate a random number
      sequenceNumber: 0,
      username,
      level: 1,
      weapon: {
        standardImage: '/resources/assault1.png',
        flippedImage: '/resources/assault1_flipped.png',
        altPosX: 0,
        altPosY: 5,
        damage: 5,
        fireRate: 100,
        speed: 10
      }
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
    const backEndPlayer = backEndPlayers[socket.id];
    
    if(!backEndPlayers[socket.id]) return;

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

    const playerSides = {
      left: backEndPlayer.x - backEndPlayer.radius,
      right: backEndPlayer.x + backEndPlayer.radius,
      top: backEndPlayer.y - backEndPlayer.radius,
      bottom: backEndPlayer.y + backEndPlayer.radius
    }

    if(playerSides.left < 0) 
      backEndPlayers[socket.id].x = backEndPlayer.radius;

    if(playerSides.right > 1024) 
      backEndPlayers[socket.id].x = 1024 - backEndPlayer.radius;
    
    if(playerSides.top < 0) 
      backEndPlayers[socket.id].y = backEndPlayer.radius;

    if(playerSides.bottom > 576) 
        backEndPlayers[socket.id].y = 576 - backEndPlayer.radius;
  })
})

// tick event to send player data to front end
setInterval(() => {

  // update projectile positions
  for(const id in backEndProjectiles) {
    backEndProjectiles[id].x += backEndProjectiles[id].velocity.x;
    backEndProjectiles[id].y += backEndProjectiles[id].velocity.y;

    let attackerID = backEndProjectiles[id].playerId;
    let attacker = backEndPlayers[attackerID];

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

      // Player has been hit by projectile
      if(DISTANCE < PROJECTILE_RADIUS + PLAYER_RADIUS && 
        attackerID !== playerId) {

        // if player health is at or below 0
        if(backEndPlayer.health <= 0) {

          // update attackers level by 1
          if(attacker) { 
            if(attacker.level < 10) {
              attacker.level++; 
            }
          }

          backEndPlayers[playerId].x = 1024 * Math.random();
          backEndPlayers[playerId].y = 576 * Math.random();
          backEndPlayers[playerId].health = PLAYER_HEALTH;
          io.emit('respawn', { playerId, attackerID });
        } else {
          let weapon = attacker.weapon;
          backEndPlayers[playerId].health -=  weapon.damage; // reduce player health by 1 hit point
          
          var impactData = { 
            playerId, 
            attackerID,
            deathParticles: {
              x: backEndProjectiles[id].x,
              y: backEndProjectiles[id].y,
              radius: 1.5,
              color: 'red'
            }
          };
          io.emit('playerHit', impactData);

          delete backEndProjectiles[id];
        }

        break;
      }
    }
  }
  io.emit('updateProjectiles', backEndProjectiles);
  io.emit('updatePlayers', backEndPlayers);
}, 15)

// listen on http server not express
server.listen(port);
