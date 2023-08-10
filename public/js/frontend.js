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

//const player = new Player(x, y, 10, 'white');
const frontEndPlayers = {};
const frontEndProjectiles = {};

socket.on('updatePlayers', (backEndPlayers) => {
  for(const id in backEndPlayers) {
    const backEndPlayer = backEndPlayers[id];

    if(!frontEndPlayers[id]) {
      frontEndPlayers[id] = new Player({
        x: backEndPlayer.x, 
        y: backEndPlayer.y, 
        radius: 15, 
        color: backEndPlayer.color
      })

      // Add player to leaderboard
      document.querySelector('#leaderboardPlayers').innerHTML += `<li data-id="${id}" data-score="${backEndPlayer.score}">${backEndPlayer.username}: ${backEndPlayer.score}</li>`

    } else {

      // Update player score to leaderboard
      document.querySelector(`li[data-id="${id}"]`).innerHTML = `${backEndPlayer.username}: ${backEndPlayer.score}`;
      document.querySelector(`li[data-id="${id}"]`).setAttribute('data-score', backEndPlayer.score);

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

      if(id === socket.id) {
        // if player already exists
        frontEndPlayers[id].x = backEndPlayer.x;
        frontEndPlayers[id].y = backEndPlayer.y;

        // use Server Reconciliation to fix any lag issues for player
        const lastBackendInputIndex = playerInputs.findIndex(input => {
          return backEndPlayer.sequenceNumber === input.sequenceNumber;
        })

        if(lastBackendInputIndex > -1) {
          playerInputs.splice(0, lastBackendInputIndex + 1);
        }
        
        playerInputs.forEach(input => {
          frontEndPlayers[id].x += input.dx;
          frontEndPlayers[id].y += input.dy;
        })
      } else {
        // for all other players (Player Interpolation using GSAP)
        gsap.to(frontEndPlayers[id], {
          x: backEndPlayer.x,
          y: backEndPlayer.y,
          duration: 0.015,
          ease: 'linear'
        })
      }
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
        radius: 5, 
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
//const enemies = []
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

const SPEED = 5;
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
  c.fillStyle = 'rgba(0, 0, 0, 0.1)'
  c.fillRect(0, 0, canvas.width, canvas.height);

  for(const id in frontEndPlayers) {
    const frontEndPlayer = frontEndPlayers[id];
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

  /*
  for (let index = enemies.length - 1; index >= 0; index--) {
    const enemy = enemies[index]

    enemy.update()

    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y)

    //end game
    if (dist - enemy.radius - player.radius < 1) {
      cancelAnimationFrame(animationId)
    }

    for (
      let projectilesIndex = projectiles.length - 1;
      projectilesIndex >= 0;
      projectilesIndex--
    ) {
      const projectile = projectiles[projectilesIndex]

      const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y)

      // when projectiles touch enemy
      if (dist - enemy.radius - projectile.radius < 1) {
        // create explosions
        for (let i = 0; i < enemy.radius * 2; i++) {
          particles.push(
            new Particle(
              projectile.x,
              projectile.y,
              Math.random() * 2,
              //enemy.color,
              {
                x: (Math.random() - 0.5) * (Math.random() * 6),
                y: (Math.random() - 0.5) * (Math.random() * 6)
              }
            )
          )
        }
        // this is where we shrink our enemy
        if (enemy.radius - 10 > 5) {
          score += 100
          scoreEl.innerHTML = score
          gsap.to(enemy, {
            radius: enemy.radius - 10
          })
          projectiles.splice(projectilesIndex, 1)
        } else {
          // remove enemy if they are too small
          score += 150
          scoreEl.innerHTML = score

          enemies.splice(index, 1)
          projectiles.splice(projectilesIndex, 1)
        }
      }
    }
  }*/
}

animate()
//spawnEnemies()

function generateImage(src) {
  var img = new Image();
  img.src = src;
  return img;
}