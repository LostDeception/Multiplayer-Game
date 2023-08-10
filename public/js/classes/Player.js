class Player {
  constructor({x, y, radius, color, level}) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    
  }

  draw() {

    // create body
    c.beginPath()

    c.arc(
    this.x, 
    this.y, 
    this.radius * window.devicePixelRatio, 
    0, 
    Math.PI * 2, 
    false)
   
    c.fillStyle = this.color
    c.fill()

    c.closePath();
  }
}
