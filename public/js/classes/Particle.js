const friction = 0.99
class Particle {
  constructor(type, x, y, radius, color, alpha, velocity) {
    this.type = type
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.velocity = velocity
    this.alpha = alpha
  }

  draw() {
    c.save()
    c.globalAlpha = this.alpha
    c.beginPath()
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
    c.fillStyle = this.color
    c.fill()
    c.restore()
  }

  update() {

    this.draw();


    // if particle will have a velocity
    if(this.velocity) {
      this.velocity.x *= friction
      this.velocity.y *= friction
      this.x = this.x + this.velocity.x
      this.y = this.y + this.velocity.y
      this.alpha -= 0.007
    }
  }
}
