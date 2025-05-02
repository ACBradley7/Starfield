// Adjust stars based on resize?

var canvas;
var canvasRatio;
var centStarGenInterval = 20;
var centerPoint = {};
var stars = [];
var frameCnt = 0;

function setup() {
    canvas = createCanvas(window.innerWidth, window.innerHeight);
    getCenterCoords();
    getCanvasRatio();
    //genInitStars();
}

function draw() {
    background(0);
    genCenterStar(frameCnt);
    genStar();
    genStar();
    starsLogic();
    frameCnt += 1;
}

class Star {
    constructor(x = Math.random() * canvas.width, y = Math.random() * canvas.height) {
        this.x = x;
        this.y = y;
        this.radius = 3;
        this.color = 255;

        this.dx = 0;
        this.dy = 0;
        this.quadrant = 0;
    }

    move() {
        this.x += this.dx;
        this.y += this.dy;
        this.radius += 0.2;
    }

    setMoveVectors() {
        if (this.quadrant == 1) {
            this.dx = 5;
            this.dy = -5;
        } else if (this.quadrant == 2) {
            this.dx = -5;
            this.dy = -5;
        } else if (this.quadrant == 3) {
            this.dx = -5;
            this.dy = 5;
        } else if (this.quadrant == 4) {
            this.dx = 5;
            this.dy = 5;
        }
    }

    setQuadrant() {
        if (this.x > centerPoint.x && this.y < centerPoint.y) {
            this.quadrant = 1;
        } else if (this.x < centerPoint.x && this.y < centerPoint.y) {
            this.quadrant = 2;
        } else if (this.x < centerPoint.x && this.y > centerPoint.y) {
            this.quadrant = 3;
        } else if (this.x > centerPoint.x && this.y > centerPoint.y) {
            this.quadrant = 4;
        } else if (this.x == centerPoint.x && this.y == centerPoint.y) {
            this.quadrant = Math.ceil(Math.random() * 4);
        }
    }

    calculateTheta() {
        null;
    }

    display() {
        push();
        noStroke();
        fill(this.color);
        circle(this.x, this.y, this.radius);
        pop();
    }
}

function starsLogic() {
    for (let i = 0; i < stars.length; i++) {
        stars[i].move();
        stars[i].display();
        removeStar(stars[i], i);
    }
}

function genInitStars() {
    for (let i = 0; i < 1000; i++) {
        genStar();
    }
}

function genStar(x, y) {
    s = new Star(x, y);
    s.setQuadrant();
    s.setMoveVectors();
    stars.push(s);
}

function genCenterStar(frameCnt) {
    offsetX = getOffset();
    offsetY = getOffset();

    if (frameCnt % centStarGenInterval == 0) {
        genStar(centerPoint.x + offsetX, centerPoint.y + offsetY);
    }
}

function getOffset() {
    choices = [true, false];

    bool = randomChoice(choices);

    if (bool == true) {
        return Math.random() * 30;
    } else {
        return Math.random() * -30;
    }
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function removeStar(star, index) {
    if (star.x > canvas.width + star.radius || star.x < 0 - star.radius) {
        stars.splice(index, 1);
    } else if (star.y > canvas.height + star.radius || star.y < 0 - star.radius) {
        stars.splice(index, 1)
    }
}

function getCanvasRatio() {
    canvasRatio = canvas.width / canvas.height;
}

function getCenterCoords() {
    centerPoint = { x: window.innerWidth / 2, y: window.innerHeight / 2};
}

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    getCenterCoords();
    getCanvasRatio();
  });