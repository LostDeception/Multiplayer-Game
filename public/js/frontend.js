const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')


const socket = io();
const scoreEl = document.querySelector('#scoreEl')
const devicePixelRatio = window.devicePixelRatio || 1;

canvas.width = 1024 * devicePixelRatio;
canvas.height = 576 * devicePixelRatio;
c.scale(devicePixelRatio, devicePixelRatio);
const x = canvas.width / 2
const y = canvas.height / 2

const frontEndPlayers = {};
const frontEndProjectiles = {};

const projectiles = []
const particles = []

var MOUSE_POS = {
  x: 0,
  y: 0,
  angle: 0 // angle from player to mouse in radians
}

const PROJECTILE_RADIUS = 5;
const PLAYER_HEALTH = 60;


// update canvas background!!!!
var bgroundX = 30;
var bgroundY = 20;
for(var by = 0; by < 41; by++) {
  for(var bx = 0; bx < 41; bx++) {
    particles.push(new Particle('background', bgroundX, bgroundY, 3, 'pink', 0.5))
    bgroundX += 30;
  }

  bgroundX = 30;
  bgroundY += 30;
}


// attacker hits player object
socket.on('playerHit', (impactData) => {
  let dp = impactData.deathParticles;
  for(var i  = 0; i < 10; i++) {
    particles.push(new Particle('blood', dp.x, dp.y, dp.radius, dp.color, 1, {
      x: Math.random() - 0.5,
      y: Math.random() - 0.5
    }))
  }
  delete frontEndProjectiles[impactData.attackerId];
})

// player respawn
socket.on('respawn', (playerId, attackerId) => {
  delete frontEndPlayers[playerId];
})

socket.on('updatePlayers', (backEndPlayers) => {
  for(const id in backEndPlayers) {
    const backEndPlayer = backEndPlayers[id];

    // if player has not been added or is respawning
    if(!frontEndPlayers[id]) {
      frontEndPlayers[id] = new Player({
        id,
        x: backEndPlayer.x, 
        y: backEndPlayer.y, 
        radius: 15,
        health: backEndPlayer.health,
        aimAngle: 0, 
        color: backEndPlayer.color,
        username: backEndPlayer.username,
        level: backEndPlayer.level,
        weapon: backEndPlayer.weapon
      })

    } else {

      // update player aim 
      frontEndPlayers[id].aimAngle = backEndPlayer.aimAngle;

      // update player health
      frontEndPlayers[id].health = backEndPlayer.health;

      // update player level
      frontEndPlayers[id].level = backEndPlayer.level;


      // set target for interpolation
      frontEndPlayers[id].target = {
        x: backEndPlayer.x,
        y: backEndPlayer.y,
      }

      if(id === socket.id) {

        // use Server Reconciliation to fix any lag issues for player
        const lastBackendInputIndex = playerInputs.findIndex(input => {
          return backEndPlayer.sequenceNumber === input.sequenceNumber;
        })

        if(lastBackendInputIndex > -1) {
          playerInputs.splice(0, lastBackendInputIndex + 1);
        }
        
        playerInputs.forEach(input => {
          frontEndPlayers[id].target.x += input.dx;
          frontEndPlayers[id].target.y += input.dy;
        })
      }
    }
  }

  // this is where we delete front end players
  for(const id in frontEndPlayers) {
    if(!backEndPlayers[id]) {
      delete frontEndPlayers[id];
    }
  }
})

socket.on('updateProjectiles', (backendProjectiles) => {
  for (const id in backendProjectiles) {
    const backEndProjectile = backendProjectiles[id];

    // check that frontend player exists
    if(frontEndPlayers[backEndProjectile.playerId]) {
      if(!frontEndProjectiles[id]) {
        frontEndProjectiles[id] = new Projectile({
          x: frontEndPlayers[backEndProjectile.playerId].x,
          y: frontEndPlayers[backEndProjectile.playerId].y, 
          radius: PROJECTILE_RADIUS, 
          color: frontEndPlayers[backEndProjectile.playerId]?.color, 
          velocity: backEndProjectile.velocity
        })
      } else if(frontEndProjectiles[id]) {
        frontEndProjectiles[id].x += backendProjectiles[id].velocity.x;
        frontEndProjectiles[id].y += backendProjectiles[id].velocity.y;
      }
    }
  }

  for(const frontEndProjectileId in frontEndProjectiles) {
    if(!backendProjectiles[frontEndProjectileId]) {
      delete frontEndProjectiles[frontEndProjectileId];
    }
  }
})


// ========= PLAYER MOVEMENT =========

const keys = {
  w: {
    pressed: false
  },
  a: {
    pressed: false
  },
  s: {
    pressed: false
  },
  d: {
    pressed: false
  }
}

const SPEED = 3;
const playerInputs = [];
let sequenceNumber = 0;
setInterval(() => {
  if(keys.w.pressed) {
    sequenceNumber++;
    playerInputs.push({sequenceNumber, dx: 0, dy: -SPEED});
    frontEndPlayers[socket.id].y -= SPEED;
    socket.emit('keydown', { keycode: 'KeyW', sequenceNumber });
  }
  if(keys.a.pressed) {
    sequenceNumber++;
    playerInputs.push({sequenceNumber, dx: -SPEED, dy: 0});
    frontEndPlayers[socket.id].x -= SPEED;
    socket.emit('keydown', { keycode: 'KeyA', sequenceNumber });
  }
  if(keys.s.pressed) { 
    sequenceNumber++;
    playerInputs.push({sequenceNumber, dx: 0, dy: SPEED});
    frontEndPlayers[socket.id].y += SPEED;
    socket.emit('keydown', { keycode: 'KeyS', sequenceNumber });
  }
  if(keys.d.pressed) {
    sequenceNumber++;
    playerInputs.push({sequenceNumber, dx: SPEED, dy: 0});
    frontEndPlayers[socket.id].x += SPEED;
    socket.emit('keydown', { keycode: 'KeyD', sequenceNumber });
  }

  // send player angle to backend
  socket.emit('aim', MOUSE_POS.angle);
}, 15);

window.addEventListener('keydown', (e) => {
  if(!frontEndPlayers[socket.id]) return;
  switch(e.code) {
    case 'KeyW':
      keys.w.pressed = true;
      break;
    case 'KeyA':
      keys.a.pressed = true;
      break;
    case 'KeyS':
      keys.s.pressed = true;
      break;
    case 'KeyD':
      keys.d.pressed = true;
      break;
    case 'Tab':
      e.preventDefault();
      break;
  }
})

window.addEventListener('keyup', (e) => {
  if(!frontEndPlayers[socket.id]) return;
  switch(e.code) {
    case 'KeyW':
      keys.w.pressed = false;
      break;
    case 'KeyA':
      keys.a.pressed = false;
      break;
    case 'KeyS':
      keys.s.pressed = false;
      break;
    case 'KeyD':
      keys.d.pressed = false;
      break;
    case 'Tab':
      e.preventDefault();
      break;
  }
})

document.querySelector('#usernameForm').addEventListener('submit', (e) => {
  e.preventDefault();
  document.querySelector('#usernameForm').style.display = 'none';
  socket.emit('initGame', {
    username: document.querySelector('#usernameInput').value,
    width: canvas.width,
    height: canvas.height,
    devicePixelRatio
  });
})


let animationId
function animate() {
  animationId = requestAnimationFrame(animate)
  c.clearRect(0, 0, canvas.width, canvas.height);


  // update projectiles
  for(const id in frontEndProjectiles) {
    const frontEndProjectile = frontEndProjectiles[id];
    frontEndProjectile.draw();
  }

  // remove projectiles at end of screen
  for (let index = projectiles.length - 1; index >= 0; index--) {
    const projectile = projectiles[index]

    projectile.update()

    // remove from edges of screen
    if (
      projectile.x - projectile.radius < 0 ||
      projectile.x - projectile.radius > canvas.width ||
      projectile.y + projectile.radius < 0 ||
      projectile.y - projectile.radius > canvas.height
    ) {
      projectiles.splice(index, 1)
    }
  }

  // update frontend player movement
  for(const id in frontEndPlayers) {
    const frontEndPlayer = frontEndPlayers[id];

    // linear interpolation
    if(frontEndPlayer.target) {
      frontEndPlayers[id].x += (frontEndPlayers[id].target.x - frontEndPlayers[id].x) * 0.5;
      frontEndPlayers[id].y += (frontEndPlayers[id].target.y - frontEndPlayers[id].y) * 0.5;
    }

    frontEndPlayer.draw();
  }
}

animate()

function generateImage(src) {
  var img = new Image();
  img.src = src;
  return img;
}