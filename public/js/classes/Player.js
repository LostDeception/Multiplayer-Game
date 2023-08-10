class Player {
  constructor({id, x, y, radius, color, username, weapon}) {
    this.id = id
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.username = username
    this.weapon = weapon;
  }

  draw() {

    c.font = '12px sans-serif'
    c.fillStyle = this.color
    c.fillText(this.username, this.x, this.y + 30)

    c.save();
    c.shadowColor = this.color;
    c.shadowBlur = 10;

    // create body
    c.beginPath()

    c.arc(
    this.x, 
    this.y, 
    this.radius, 
    0, 
    Math.PI * 2, 
    false)
   
    c.fillStyle = this.color
    c.fill()

    var weapon = frontEndPlayers[this.id].weapon.CurrentLevel();
    var weaponImage = weapon.standardImage();
    var weaponWidth = weapon.width;
    var weaponHeight = weapon.height;

    var drawImgX = this.x - (weaponWidth / 2);
    var drawImgY = this.y - (weaponHeight / 2);
    var angle = frontEndPlayers[this.id].aimAngle;

    c.translate(drawImgX + weaponWidth / 2, drawImgY + weaponHeight / 2);
    c.rotate(angle);
    c.translate(-drawImgX - weaponWidth / 2, -drawImgY - weaponHeight / 2);


    if(angle < -1.5 || angle > 1.5) {
      weaponImage = weapon.flippedImage();
      drawImgX -= weapon.altPosX;
      drawImgY -= weapon.altPosY;
    } else {
      drawImgX += weapon.altPosX;
      drawImgY += weapon.altPosY;
    }


    c.drawImage(weaponImage, drawImgX, drawImgY, weaponWidth, weaponHeight);
    c.restore();
  }
}
