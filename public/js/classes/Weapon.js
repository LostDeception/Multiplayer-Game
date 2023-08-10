class Weapon {
    constructor(level) {
        this.level = level;
        this.image = new Image();
        this.weaponImages = {
            1: {
                name: 'peeshooter',
                standardImage: () => {
                    this.image.src = '../../resources/assault1.png';
                    return this.image;
                },
                flippedImage: () => {
                    this.image.src = '../../resources/assault1_flipped.png';
                    return this.image;
                },
                width: 60,
                height: 25,
                altPosX: 0,
                altPosY: 10
            }
        }
    }

    NextLevel() {
        this.level += 1;
    }

    PreviousLevel() {
        this.level -= 1;
    }

    CurrentLevel() {
        return this.weaponImages[this.level];
    }
}