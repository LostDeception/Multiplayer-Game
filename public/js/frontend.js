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

var MOUSE_POS = {
  x: 0,
  y: 0,
  angle: 0 // angle from player to mouse in radians
}

const PROJECTILE_RADIUS = 5;

// delete frontend player object
socket.on('respawn', (playerId) => {
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
        aimAngle: 0, 
        color: backEndPlayer.color,
        username: backEndPlayer.username,
        weapon: new Weapon(1)
      })

      if(!document.querySelector(`li[data-id="${id}"]`)) {
        document.querySelector('#leaderboardPlayers').innerHTML += `<li data-id="${id}" data-score="${backEndPlayer.level}">${backEndPlayer.username}: ${backEndPlayer.level}</li>`
      }

    } else {

      // update player aim 
      frontEndPlayers[id].aimAngle = backEndPlayer.aimAngle;

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

      // Update player score to leaderboard
      document.querySelector(`li[data-id="${id}"]`).innerHTML = `${backEndPlayer.username}: ${backEndPlayer.level}`;
      document.querySelector(`li[data-id="${id}"]`).setAttribute('data-score', backEndPlayer.level);

      // sorts the player leaderboard list
      const leaderboardList = document.querySelector('#leaderboardPlayers');
      const listItems = Array.from(leaderboardList.querySelectorAll('li'));
      listItems.sort((a, b) => {
        const scoreA = Number(a.getAttribute('data-score'));
        const scoreB = Number(b.getAttribute('data-score'));
        return scoreB - scoreA;
      })

      // Remove old elements
      listItems.forEach((li) => {
        leaderboardList.removeChild(li);
      })

      // Add sorted elements
      listItems.forEach((li) => {
        leaderboardList.appendChild(li);
      })
    }
  }

  // this is where we delete front end players
  for(const id in frontEndPlayers) {
    if(!backEndPlayers[id]) {
      const liToDelete = document.querySelector(`li[data-id="${id}"]`);
      liToDelete.parentNode.removeChild(liToDelete);
      delete frontEndPlayers[id];
    }
  }
})

socket.on('updateProjectiles', (backendProjectiles) => {
  for (const id in backendProjectiles) {
    const backEndProjectile = backendProjectiles[id];

    if(!frontEndProjectiles[id]) {
      frontEndProjectiles[id] = new Projectile({
        x: backEndProjectile.x,
        y: backEndProjectile.y, 
        radius: PROJECTILE_RADIUS, 
        color: frontEndPlayers[backEndProjectile.playerId]?.color, 
        velocity: backEndProjectile.velocity
      })
    } else {
      frontEndProjectiles[id].x += backendProjectiles[id].velocity.x;
      frontEndProjectiles[id].y += backendProjectiles[id].velocity.y;
    }
  }

  for(const frontEndProjectileId in frontEndProjectiles) {
    if(!backendProjectiles[frontEndProjectileId]) {
      delete frontEndProjectiles[frontEndProjectileId];
    }
  }
})

const projectiles = []
const particles = []


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
//let score = 0
function animate() {
  animationId = requestAnimationFrame(animate)
  c.clearRect(0, 0, canvas.width, canvas.height);

  for(const id in frontEndPlayers) {
    const frontEndPlayer = frontEndPlayers[id];

    // linear interpolation
    if(frontEndPlayer.target) {
      frontEndPlayers[id].x += (frontEndPlayers[id].target.x - frontEndPlayers[id].x) * 0.5;
      frontEndPlayers[id].y += (frontEndPlayers[id].target.y - frontEndPlayers[id].y) * 0.5;
    }

    frontEndPlayer.draw();
  }

  for(const id in frontEndProjectiles) {
    const frontEndProjectile = frontEndProjectiles[id];
    frontEndProjectile.draw();
  }

  for (let index = particles.length - 1; index >= 0; index--) {
    const particle = particles[index]

    if (particle.alpha <= 0) {
      particles.splice(index, 1)
    } else {
      particle.update()
    }
  }

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
}

animate()

function generateImage(src) {
  var img = new Image();
  img.src = src;
  return img;
}