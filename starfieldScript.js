// Adjust everything based on resize?

// Stars
// Add momentum slowing down on release
// Add trails
// Add twinkling
// Add subtle movement on stop
// Add image

// Player
// Add momentum on start and stop
// Add getting hit by enemies / asteroids
// Improve hurt animation

// Enemies
// Prevent enemies from grouping on top of each other ?
// Add getting hit by asteroids

// State
// Add RESUMEGAME screen

// #region Enums

const APPSTATE = {
    FLASHCARDS: "FLASHCARDS",
    RESUMEGAME: "RESUMEGAME",
    INGAME: "INGAME",
    GAMEOVER: "GAMEOVER"
}

const DIRS = {
    NORTH: "NORTH",
    EAST: "EAST",
    SOUTH: "SOUTH",
    WEST: "WEST"
}

const BULLTYPE = {
    PLAYERBASIC: "PLAYERBASIC",
    ALIENBASIC: "ALIENBASIC"
}

const TEAM = {
    PLAYER: "PLAYER",
    ENEMY: "ENEMY"
}

const OBJTYPE = {
    SHIP: "SHIP",
    BULLET: "BULLET"
}

const PARTICLEFORCETYPE = {
    CIRCLE: "CIRCLE"
}

// #endregion

// #region Global Variables

let appState = APPSTATE.INGAME;
let canvas;
let canvasRatio;
let scrDiagonal;
let centerPoint = {};
let player;
let stars = [];
let enemies = [];
let bullets = [];
let collObjs = [];
let particleSystems = [];
let objsByGrid = {};
let objID = 1;
let questData = { correct: 0, total: 3 };

let CONTROLS = {};
let FRAMECNT = 0;

const centStarGenInterval = 1;
const enemyGenInterval = 300;
const genStarsPerFrame = 3;
const enStopDists = [100, 200, 300, 400];
const gridDivVal = 50;
const winDist = 500;

// #endregion

// #region Game loop

function setup() {
    canvas = createCanvas(window.innerWidth, window.innerHeight);
    canvas.id("gameScreen");

    getCenterCoords();
    getCanvasDimensions();
    setControls();

    player = new Player();
    genStarsCollection();
}

function draw() {
    background(0);

    if (appState == APPSTATE.FLASHCARDS) {
        background(0);
        dispStarsFlashcardState();

        if (questData.correct == questData.total) {
            removeFlashcardHTML();
            appState = APPSTATE.INGAME;
        }

    } else if (appState == APPSTATE.INGAME) {
        calcPhysics();
        renderAll();
        gameOverCheck();
        
        // if (FRAMECNT == 100) {
        //     appState = APPSTATE.FLASHCARDS;   
        //     createFlashcardState();
        // }

    } else if (appState == APPSTATE.GAMEOVER) {
        dispGameOver();
        return;
    }
    
    FRAMECNT += 1;
}

// #endregion

// #region Setup Functions

function setControls() {
    CONTROLS = {
        SUBMITQUESTION: "Enter",                // Enter
        HYPERSPEED: 32,                         // Spacebar
        GAS: 87,                                // W
        BRAKE: 83,                              // S
        ROTLEFT: 65,                            // A
        ROTRIGHT: 68,                           // D
        TARGETSNAP: 186,                        // Semicolon
        BOOST: 16,                              // Left Shift
        BASICATTACK: 74                         // J
    }
}

// #endregion

// #region Classes

class Player {
    constructor() {
        this.objType = OBJTYPE.SHIP;
        this.team = TEAM.PLAYER;
        this.ID = objID;
        objID += 1;

        this.primaryColor = "#00aaff";
        this.accentColor = "#b0b0b0";
        this.hurtColor = "#ff3b3b";

        this.radius = 20;
        this.diam = this.radius * 2;
        this.x = centerPoint.x - this.radius / 2;
        this.y = centerPoint.y - this.radius / 2;
        this.prevFramePos = { x: this.x, y: this.y };
        this.cell = { x: 0, y: 0 };
        
        this.speed = 5;
        this.brakeVal = 0.1;
        this.moveSpeed = this.speed;
        this.boostSpeed = this.speed * 1.5;
        
        this.basicAttackReady = true;
        this.basicAttackReadyTimer = 0;
        this.basicAttackCooldown = 20;

        this.front = { x: this.x, y: this.y - this.radius};
        this.theta = 3 * PI / 2;
        this.rotVal = 0.1;

        this.playHurtAnim = false;
        
        this.health = 4;
        this.isDead = false;

        this.distTraveled = 0;
        this.hasWon = false;

        collObjs.push(this);
    }

    display() {
        this.calcFront();

        push();
        translate(this.front.x, this.front.y);
        rotate(this.theta);
        fill("#fff300");
        rectMode(CENTER);
        rect(0, 0, 20, 20);
        pop();

        push();
        strokeWeight(2);
        stroke(this.accentColor);
        fill(this.primaryColor);
        circle(this.x, this.y, this.diam);
        pop();
    }

    displayHealth() {
        for (let i = 0; i < this.health; i++) {
            push();
            fill("red");
            stroke(255);
            circle(canvas.width * 7 / 8 + this.diam * i, canvas.height * 1 / 16, this.diam / 3);
            pop();
        }
    }

    displayDistTraveled() {
        push();
        fill(255);
        rect(canvas.width * 1 / 16, canvas.height * 1 / 16, canvas.width / 8, canvas.height / 64);
        pop();

        push();
        fill("#66ff66");
        console.log(canvas.width / 8 - (this.distTraveled / winDist));
        rect(canvas.width * 1 / 16, canvas.height * 1 / 16, (this.distTraveled / winDist) * (canvas.width / 8), canvas.height / 64);
        pop();
    }

    move() {
        this.prevFramePos.x = this.x;
        this.prevFramePos.y = this.y;

        if (keyIsDown(CONTROLS.GAS)) {
            this.x += this.dx * this.speed;
            this.y += this.dy * this.speed;
        }
        
        if (keyIsDown(CONTROLS.BRAKE)) {
            this.speed -= this.brakeVal;
            this.speed = Math.max(0, this.speed)
        }
        
        if (keyIsDown(CONTROLS.ROTLEFT)) {
            this.theta -= this.rotVal;
        }
        
        if (keyIsDown(CONTROLS.ROTRIGHT)) {
            this.theta += this.rotVal;
        }
    }

    calcMoveDir() {
        this.dx = Math.cos(this.theta);
        this.dy = Math.sin(this.theta);
    }

    calcFront() {
        this.front = { x: this.x + this.radius * Math.cos(this.theta), y: this.y + this.radius * Math.sin(this.theta)};
    }

    boost() {
        if (keyIsDown(CONTROLS.BRAKE) == false) {
            if (keyIsDown(CONTROLS.BOOST)) {
                this.speed = this.boostSpeed;
            } else {
                this.speed = this.moveSpeed;
            }
        }
    }

    snapToTarget() {
        if (keyIsDown(CONTROLS.TARGETSNAP)) {
            let target = null;
            let targetDist = scrDiagonal;
        
            // Check to see if objs in surrounding squares
            // Check objs for closest distance
            Object.keys(objsByGrid).forEach(key => {
                    for (let obj of objsByGrid[key]) {
                        if (obj.objType == OBJTYPE.SHIP && obj.ID != this.ID) {
                            let dx = this.x - obj.x;
                            let dy = this.y - obj.y;
                            let distance = Math.sqrt(dx * dx + dy * dy);

                            if (distance <= targetDist) {
                                targetDist = distance;
                                target = obj;
                            }
                        }
                    }
                });

            // If target is found, snap to it
            if (target) {
                this.theta = angleToTarget(this.x, this.y, target.x, target.y);
                this.calcFront();
                return;
            }
        }
    }

    basicAttack() {
        if (keyIsDown(CONTROLS.BASICATTACK)) {
            if (this.basicAttackReady) {
                this.basicAttackReady = false;

                let leftOffset = this.calcAttackOffset(-1);
                let leftBullFront = { x: this.front.x + leftOffset.x, y: this.front.y + leftOffset.y}
                let leftBull = new Bullet(this, BULLTYPE.PLAYERBASIC, leftOffset.x, leftOffset.y);
                leftBull.calcMoveDir(leftBullFront);
                
                let rightOffset = this.calcAttackOffset(1);
                let rightBullFront = { x: this.front.x + rightOffset.x, y: this.front.y + rightOffset.y}
                let rightBull = new Bullet(this, BULLTYPE.PLAYERBASIC, rightOffset.x, rightOffset.y);
                rightBull.calcMoveDir(rightBullFront);
            }
        }
    }

    calcAttackOffset(posNegInt) {
        let perpAngle = this.theta + posNegInt * PI / 2
        let offset = this.radius / 4;

        let coords = { x: offset * Math.cos(perpAngle), y: offset * Math.sin(perpAngle) }

        return coords;
    }

    incTimers() {
        if (this.basicAttackReady == false) {
            this.basicAttackReadyTimer += 1;
            if (this.basicAttackReadyTimer >= this.basicAttackCooldown) {
                this.basicAttackReadyTimer = 0;
                this.basicAttackReady = true;
            }
        }
    }

    hurtAnim() {
        if (this.playHurtAnim) {
            push();
            noStroke();
            fill(this.hurtColor);
            circle(this.x, this.y, this.diam + this.radius / 2);
            pop();

            this.playHurtAnim = false;
        }
    }

    loseHealth() {
        this.health -= 1;
    }

    hasDied() {
        if (this.health <= 0) {
            this.isDead = true;
        }
    }

    moveForward() {
        if (keyIsDown(CONTROLS.HYPERSPEED) && enemies.length == 0) {
            this.distTraveled += 1;
        }
    }

    checkGameWon() {
        if (this.distTraveled >= winDist) {
            this.hasWon = true;
        }
    }
}

class Enemy {
    constructor() {
        this.objType = OBJTYPE.SHIP;
        this.team = TEAM.ENEMY;
        this.ID = objID;
        objID += 1;

        this.primaryColor = "#66ff66";
        this.accentColor = "#b0b0b0";
        this.hurtColor = "#ff3b3b";

        this.radius = 15;
        this.diam = this.radius * 2;
        this.x = 500;
        this.y = 500;
        this.prevFramePos = { x: this.x, y: this.y };

        this.dx = 0;
        this.dy = 0;
        this.theta = 0;
        this.speed = 3;

        this.cell = { x: 0, y: 0 };

        this.stopDist = randomChoice(enStopDists);
        this.baseAutoAttackRate = 30;
        
        this.health = 1;
        this.isDead = false;

        enemies.push(this);
        collObjs.push(this);
    }

    setSpawnLocation() {
        let offset = this.diam;
        let choices = [DIRS.NORTH, DIRS.EAST, DIRS.SOUTH, DIRS.WEST];
        let choice = randomChoice(choices);
    
        if (choice == DIRS.NORTH) {
            this.x = Math.random() * canvas.width;
            this.y = 0 - offset;
        } else if (choice == DIRS.EAST) {
            this.x = canvas.width + offset;
            this.y = Math.random() * canvas.height;
        } else if (choice == DIRS.SOUTH) {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height + offset;
        } else if (choice == DIRS.WEST) {
            this.x = 0 - offset;
            this.y = Math.random() * canvas.height;
        }
    }

    display() {
        push();
        strokeWeight(2);
        stroke(this.accentColor);
        fill(this.primaryColor);
        circle(this.x, this.y, this.diam);
        pop();
    }

    move() {
        this.prevFramePos.x = this.x;
        this.prevFramePos.y = this.y;

        if (this.shouldStop()) {
            this.autoAttack();
        } else {
            this.x += this.dx;
            this.y += this.dy;
        }
    }

    shouldStop() {
        let dx = abs(player.x - this.x);
        let dy = abs(player.y - this.y);
        let hypotenuse = sqrt(dx * dx + dy * dy);

        if (circInCanvas(this)) {
            if (hypotenuse <= this.stopDist) {
                return true;
            } else {
                return false;
            }
        }
    }

    calcMoveDir() {
        let dx = player.x - this.x;
        let dy = player.y - this.y;
        let magnitude = Math.sqrt(dx * dx + dy * dy);

        this.theta = acos(dx / magnitude);

        if (magnitude === 0) {
            this.dx = 0;
            this.dy = 0;
        } else {
            this.dx = (dx / magnitude) * this.speed;
            this.dy = (dy / magnitude) * this.speed;
        }
    }

    autoAttack() {
        if (FRAMECNT % this.baseAutoAttackRate == 0) {
            let b = new Bullet(this, BULLTYPE.ALIENBASIC);
            b.calcMoveDir(player);
        }
    }

    hurtAnim() {
        if (this.playHurtAnim) {
            push();
            noStroke();
            fill(this.hurtColor);
            circle(this.x, this.y, this.diam + this.radius / 2);
            pop();

            this.playHurtAnim = false;
        }
    }

    loseHealth() {
        this.health -= 1;
    }

    hasDied() {
        if (this.health <= 0) {
            this.isDead = true;
        }
    }
}

class Bullet {
    constructor(obj, bullType, offsetX = 0, offsetY = 0) {
        this.objType = OBJTYPE.BULLET;
        this.ID = objID;
        objID += 1;

        this.x = obj.x + offsetX;
        this.y = obj.y + offsetY;
        this.prevFramePos = { x: this.x, y: this.y };
        this.dx = 0;
        this.dy = 0;

        this.bullType = bullType;
        this.onScreen = true;
        this.collided = false;
        this.cell = { x: 0, y: 0 };

        this.getBulletInfo();

        bullets.push(this);
        collObjs.push(this);
    }

    display() {
        push();
        strokeWeight(1);
        stroke(this.accentColor);
        fill(this.color);
        circle(this.x, this.y, this.diam);
        pop();
    }

    move() {
        this.prevFramePos.x = this.x;
        this.prevFramePos.y = this.y;

        this.x += this.dx;
        this.y += this.dy;
    }

    calcMoveDir(obj) {
        this.theta = angleToTarget(this.x, this.y, obj.x, obj.y);

        this.dx = cos(this.theta) * this.speed;
        this.dy = sin(this.theta) * this.speed;
    }

    offScreenCheck() {
        if (circOnScreen(this) == false) {
            this.onScreen = false;
        }
    }

    collisionCheckHandler() {
        const neighbors = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [-1, 1], [1, -1], [1, 1]
        ];
    
        // Helper function to filter valid collision targets
        const validTargets = (objs) => objs?.filter(obj =>
            obj.ID !== this.ID &&
            obj.team !== this.team &&
            obj.objType !== OBJTYPE.BULLET
        ) || [];
    
        // Check current cell
        let key = `${this.cell.x},${this.cell.y}`;
        for (let obj of validTargets(objsByGrid[key])) {
            this.circCollisionCheck(obj);
            if (this.collided) return;
        }
    
        // Check neighboring cells based on previous frame position
        for (let [dx, dy] of neighbors) {    
            key = `${this.cell.x + dx},${this.cell.y + dy}`;
            for (let obj of validTargets(objsByGrid[key])) {
                this.prevFrameCircCollCheck(obj);
                if (this.collided) return;
            }
        }
    }

    circCollisionCheck(obj) {
        let dx = this.x - obj.x;
        let dy = this.y - obj.y;

        let distance = Math.sqrt(dx * dx + dy * dy);
        let sumOfRadii = this.radius + obj.radius;
    
        if (distance < sumOfRadii) {
            this.collision(obj);
            return;
        }
    }

    prevFrameCircCollCheck(obj) {
        let dx = this.x - this.prevFramePos.x;
        let dy = this.y - this.prevFramePos.y;
        let sumOfRadii = this.radius + obj.radius;
        let steps = 8;

        for (let i = 1; i < steps; i++) {
            let dxFrac = this.prevFramePos.x + dx * i / steps;
            let dyFrac = this.prevFramePos.y + dy * i / steps;

            let dxNew = dxFrac - obj.x;
            let dyNew = dyFrac - obj.y;
            let distance = Math.sqrt(dxNew * dxNew + dyNew * dyNew);
        
            if (distance < sumOfRadii) {
                this.collision(obj);
                return;
            }
        }
    }

    collision(obj) {
        this.collided = true;
        if (obj.objType == OBJTYPE.SHIP) {
            obj.playHurtAnim = true;
            obj.loseHealth();
            obj.hasDied();
        }
        this.explode();
    }

    explode() {
        new ParticleSys(this.x, this.y, 10, 1, 8, 4, 10, 5, PI / 4, PARTICLEFORCETYPE.CIRCLE, "red");
    }

    getBulletInfo() {
        if (this.bullType == BULLTYPE.PLAYERBASIC) {
            this.color = "#00f0ff";
            this.accentColor = "99f9ff";
            this.radius = 6;
            this.diam = this.radius * 2;
            this.speed = 8;
            this.team = TEAM.PLAYER;
        } else if (this.bullType == BULLTYPE.ALIENBASIC) {
            this.color = "#fff300";
            this.accentColor = "#ffff99";
            this.radius = 6;
            this.diam = this.radius * 2;
            this.speed = 8;
            this.team = TEAM.ENEMY;
        }
    }
}

class ParticleSys {
    constructor(x, y, size, sizeVar, amount, speed, lifespan, lifespanVar, forceVar, forceType, color) {
        this.initPos = { x: x, y: y};
        this.size = size;
        this.sizeVar = sizeVar;
        this.amount = amount;
        this.speed = speed;
        this.lifespan = lifespan + lifespanVar;
        this.lifespanVar = lifespanVar;
        this.currLife = 0;
        this.forceType = forceType;
        this.forceVar = forceVar;
        this.color = color;
        this.particles = [];

        this.calcParticleSysData(size, sizeVar, lifespan, lifespanVar);
        particleSystems.push(this);
    }
    
    calcParticleSysData(size, sizeVar, lifespan, lifespanVar) {
        if (this.forceType == PARTICLEFORCETYPE.CIRCLE) {
            this.genParticlesCircle(size, sizeVar, lifespan, lifespanVar);
        }
    }

    genParticlesCircle(size, sizeVar, lifespan, lifespanVar) {
        for (let i = 1; i <= this.amount; i++) {
            let angle = (i / this.amount) * 2 * Math.PI;
            angle += this.forceVar * Math.random() * randomChoice([-1, 1]);

            let dirX = Math.cos(angle);
            let dirY = Math.sin(angle);

            let velX = dirX * this.speed;
            let velY = dirY * this.speed;

            let particle = new Particle(this.initPos.x, this.initPos.y, velX, velY, size, sizeVar, lifespan, lifespanVar, this.color)
            this.particles.push(particle);
        }
    }

    displayParticles() {
        for (let particle of this.particles) {
            particle.display();
        }
    }

    removeParticles() {
        if (this.currLife >= this.lifespan - this.lifespanVar) {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                if (this.particles[i].currLife >= this.particles[i].lifespan) {
                    this.particles.splice(i, 1);
                } 
            }
        }
    }

    incLife() {
        this.currLife += 1;
    }
}

class Particle {
    constructor(x, y, velX, velY, size, sizeVar, lifespan, lifespanVar, color) {
        this.pos = { x: x, y: y };
        this.vel = { x: velX, y: velY };
        this.color = color;

        this.size = size + sizeVar * Math.random() * randomChoice([-1, 1]);
        this.lifespan = lifespan + lifespanVar * Math.random() * randomChoice([-1, 1]);

        this.currLife = 0;
    }

    display() {
        push();
        noStroke();
        fill(this.color);
        circle(this.pos.x, this.pos.y, this.size);
        pop();
    }

    updatePos() {
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;
    }

    incLife() {
        this.currLife += 1;
    }
}

class Star {
    constructor(x = Math.random() * canvas.width, y = Math.random() * canvas.height) {
        this.x = x;
        this.y = y;
        this.radius = 1.5;
        this.diam = this.radius * 2;
        this.growth = 0.05;
        this.color = 255;

        this.dx = 0;
        this.dy = 0;
        this.speed = 5;
        this.theta = 0;

        stars.push(this);
    }

    move() {
        this.x += this.dx;
        this.y += this.dy;

        this.radius += this.growth;
        this.diam = this.radius * 2;
    }

    calcMoveDir() {
        let dx = this.x - centerPoint.x;
        let dy = this.y - centerPoint.y;
        let magnitude = Math.sqrt(dx * dx + dy * dy);

        if (magnitude === 0) {
            let dirs = [0, QUARTER_PI, HALF_PI, 3 * QUARTER_PI, PI, -QUARTER_PI, -HALF_PI, 3 * -QUARTER_PI, -PI];
            this.dx = randomChoice(dirs) * this.speed;
            this.dy = randomChoice(dirs) * this.speed;
        } else {
            this.dx = (dx / magnitude) * this.speed;
            this.dy = (dy / magnitude) * this.speed;
        }
    }

    display() {
        push();
        noStroke();
        fill(this.color);
        circle(this.x, this.y, this.diam);
        pop();
    }
}

// #endregion

// #region Physics Functions

function calcPhysics() {
    updateObjsByGrid();
    starsLogic();
    bulletsLogic();
    enemiesLogic();
    playerLogic();
    particlesLogic();
    removeDead();
}

function updateObjsByGrid() {
    objsByGrid = {};

    for (let obj of collObjs) {
        let pushObj = true;

        if (circInCanvas(obj) == true) {
            let squareX = Math.floor(obj.x / gridDivVal);
            let squareY = Math.floor(obj.y / gridDivVal);

            let keyStr = `${squareX},${squareY}`;

            if (objsByGrid[keyStr]) {
                for (let objInKey of objsByGrid[keyStr]) {
                    if (objInKey.ID == obj.ID) {
                        pushObj = false;
                    }
                }
                
                if (pushObj) { objsByGrid[keyStr].push(obj); }
            } else {
                objsByGrid[keyStr] = [obj];
            }

            obj.cell = { x: squareX, y: squareY };
        }
    }
}

function starsLogic() {
    let starsToRemove = []

    if (keyIsDown(CONTROLS.HYPERSPEED) && enemies.length == 0) {
        genStars();
    }

    for (let i = 0; i < stars.length; i++) {
        if (keyIsDown(CONTROLS.HYPERSPEED) && enemies.length == 0) {
            stars[i].move();
        }
        starsToRemove = shouldRemoveStar(stars[i], i, starsToRemove);
    }
    
    if (starsToRemove) { removeStars(stars, starsToRemove); }
}

function bulletsLogic() {
    for (let bullet of bullets) {
        bullet.offScreenCheck();
        bullet.collisionCheckHandler();
        bullet.move();
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        if (bullets[i].onScreen == false || bullets[i].collided == true) {
            bullets.splice(i, 1);
        }
    }
}

function enemiesLogic() {
    genEnemy();
    enemiesLoop();
}

function genEnemy() {
    if (FRAMECNT % enemyGenInterval == 0) {
        e = new Enemy();
        e.setSpawnLocation();
    }
}

function enemiesLoop() {
    for (let enemy of enemies) {
        enemy.calcMoveDir();
        enemy.move();
        enemy.hurtAnim();
    }
}

function playerLogic() {
    player.boost();
    player.calcMoveDir();
    player.calcFront();
    player.move();
    player.snapToTarget();
    player.basicAttack();
    player.incTimers();
    player.hurtAnim();
    player.moveForward();
    player.checkGameWon();
}

function particlesLogic() {
    for (let i = particleSystems.length - 1; i >= 0; i--) {
        particleSystems[i].incLife();
        particleSystems[i].removeParticles();

        for (let particle of particleSystems[i].particles) {
            particle.updatePos();
            particle.incLife();
        }

        if (particleSystems[i].currLife >= particleSystems[i].lifespan) {
            particleSystems.splice(i, 1);
        }
    }
}

function removeDead() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].isDead) {
            enemies.splice(i, 1);
        }
    }

    for (let i = collObjs.length - 1; i >= 0; i--) {
        if (collObjs[i].objType == OBJTYPE.SHIP) {
            if (collObjs[i].isDead) {
                collObjs.splice(i, 1);
            }
        }
    }
}

function gameOverCheck() {
    if (player.isDead) {
        dispLoss();
        appState = APPSTATE.GAMEOVER;
    } else if (player.hasWon) {
        dispWin();
        appState = APPSTATE.GAMEOVER;
    }
}

function dispGameOver() {
    if (player.isDead) {
        dispLoss();
    } else if (player.hasWon) {
        dispWin();
    }
}

function dispLoss() {
    push();
    textSize(48);
    textStyle(BOLD);
    fill(255);
    textAlign(CENTER);
    text("Game Over...", centerPoint.x, canvas.height * 1 / 3);
    pop();
}

function dispWin() {
    push();
    textSize(48);
    textStyle(BOLD);
    fill(255);
    textAlign(CENTER);
    text("You Win!", centerPoint.x, canvas.height * 1 / 3);
    pop();
}

// #endregion

// #region Rendering Functions

function renderAll() {
    rendStars();
    rendBullets();
    rendEnemeis();
    rendPlayer();
    rendParticles();
    removeDead();
}

function rendStars() {
    for (let star of stars) {
        star.display();
    }
}

function rendBullets() {
    for (let bullet of bullets) {
        bullet.display();
    }
}

function rendEnemeis() {
    for (let enemy of enemies) {
        enemy.display();
    }
}

function rendPlayer() {
    player.display();
    player.displayDistTraveled();
    player.displayHealth();
}

function rendParticles() {
    for (let partSys of particleSystems) {
        partSys.displayParticles();
    }
}

// #endregion

// #region Stars Functions

function genStarsCollection() {
    for (let i = 0; i < 500; i++) {
        genStar();
    }
}

function genStars() {
    for (let i = 0; i <= genStarsPerFrame; i++) {
        genStar();
    }

    if (FRAMECNT % centStarGenInterval == 0) {
        genCenterStar();
    }
}

function genStar() {
    let s = new Star();
    s.calcMoveDir();
}

function shouldRemoveStar(star, index, removalArr) {
    let scrWidth = window.screen.width;
    let scrHeight = window.screen.height;

    if (star.x > scrWidth + star.radius || star.x < 0 - star.radius) {
        removalArr.push(index);
    } else if (star.y > scrHeight + star.radius || star.y < 0 - star.radius) {
        removalArr.push(index);
    }
    return removalArr
}

function removeStars(starsArr, removalArr) {
    for (let i = removalArr.length - 1; i >= 0; i--) {
        starsArr.splice(removalArr[i], 1);
    }
}

function removeAllStars() {
    stars = [];
}

function genCenterStar() {
    let offsetX = getStarOffset();
    let offsetY = getStarOffset();

    genStar(centerPoint.x + offsetX, centerPoint.y + offsetY);
}

function getStarOffset() {
    let choices = [true, false];
    let bool = randomChoice(choices);
    let offset = 30

    if (bool == true) {
        return Math.random() * offset;
    } else {
        return Math.random() * -offset;
    }
}

// #endregion

// #region General/Library Functions

function angleToTarget(x1, y1, x2, y2) {
    let dx = x2 - x1;
    let dy = y2 - y1;
    let magnitude = Math.sqrt(dx * dx + dy * dy);

    if (magnitude === 0) return 0; // Avoid division by zero

    // Normalize vector
    let dirX = dx / magnitude;
    let dirY = dy / magnitude;

    // Reference direction (pointing right)
    const refX = 1;
    const refY = 0;

    // Dot product (for angle magnitude)
    let dot = dirX * refX + dirY * refY;
    dot = Math.max(-1, Math.min(1, dot)); // Clamp due to floating point precision

    let angle = Math.acos(dot); // radians [0, π]

    // Cross product (for sign)
    let cross = refX * dirY - refY * dirX;
    if (cross < 0) angle = -angle;

    return angle;
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function circInCanvas(obj) {
    if (obj.x - obj.radius > 0 && obj.x + obj.radius < canvas.width && obj.y - obj.radius > 0 && obj.y + obj.radius < canvas.height) {
        return true;
    } else {
        return false;
    }
}

function circOnScreen(obj) {
    let scrWidth = window.screen.width;
    let scrHeight = window.screen.height;

    if (obj.x - obj.radius > 0 && obj.x + obj.radius < scrWidth && obj.y - obj.radius > 0 && obj.y + obj.radius < scrHeight) {
        return true;
    } else {
        return false;
    }
}

function getCanvasDimensions() {
    canvasRatio = canvas.width / canvas.height;
    scrDiagonal = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
}

function getCenterCoords() {
    centerPoint = { x: window.innerWidth / 2, y: window.innerHeight / 2};
}

window.addEventListener("resize", () => {
    resizeCanvas(window.innerWidth, window.innerHeight);

    background(0);
    removeAllStars();
    genStarsCollection();

    getCenterCoords();
    getCanvasDimensions();
});

// #endregion

// #region Flashcard Functions

function dispStarsFlashcardState() {
    for (let i = 0; i < stars.length; i++) {
        stars[i].display();
    }
}

function createFlashcardState() {
    questData = { correct: 0, total: randInt(2, 5) };

    genFlashcardHTML();
    genQuestionHandlerHTML();
    genQuestTrackerHTML();
}

function genFlashcardHTML() {
    flashcardDiv = createElement("div");
    flashcardDiv.id("flashcardDiv");
    flashcardDiv.parent(document.body);
}

function genQuestTrackerHTML() {
    trackerDiv = createElement("div");
    trackerDiv.id("trackerDiv");
    trackerDiv.parent(document.getElementById("flashcardDiv"));

    let text = `${questData.correct} / ${questData.total}`;

    trackerText = createElement("p", text);
    trackerText.id("questTrackerText");
    trackerText.class("textInFlashCard");
    trackerText.parent(trackerDiv);
}

function genQuestionHandlerHTML() {
    let calcData = genCalculation();
    genQuestionHTML(calcData);
    genInputHTML(calcData);
}

function genCalculation() {
    let numOne = randInt(1, 12);
    let numTwo = randInt(1, 12);

    let operations = ["*"];//, "/"];
    let operation = randomChoice(operations);

    let answer = eval(`${numOne} ${operation} ${numTwo}`);

    return { numOne: numOne, numTwo: numTwo, op: operation, ans: answer };
}

function genQuestionHTML(calcData) {
    questionDiv = createElement("div");
    questionDiv.id("questionDiv");
    questionDiv.parent(document.getElementById("flashcardDiv"));

    let text = `${calcData.numOne} ${calcData.op} ${calcData.numTwo}`;

    questionText = createElement("p", text);
    questionText.id("questionText");
    questionText.class("textInFlashcard");
    questionText.parent(questionDiv);
}

function genInputHTML(calcData) {
    let input = createInput();
    input.id("answerField");
    input.parent(document.getElementById("flashcardDiv"));
    input.attribute("type", "text");
    input.attribute("answer", calcData.ans)
    input.size(200);
    addAnswerFieldListener(input.elt, calcData);    
}

function addAnswerFieldListener(input, calcData) {
    input.addEventListener("keydown", handler = (event) => {
        if (event.key == CONTROLS.SUBMITQUESTION) {
            checkAnswer(input, calcData.ans);
        }
    });
}

function checkAnswer(input, ans) {
    let answer = ans.toString();
    let val = input.value.toString();

    let flashcardDiv = document.getElementById("flashcardDiv");

    if (val == answer) {
        flashcardDiv.style.boxShadow = "0vw 0vh 3vw #00FF66";
    } else {
        flashcardDiv.style.boxShadow = "0vw 0vh 3vw #FF073A";
    }
    
    setTimeout(() => {
        flashcardDiv.style.boxShadow = "0 0 1vw #ffffff";
    }, 300);
    
    
    if (val == answer) {
        questData.correct += 1;
        text = document.getElementById("questTrackerText");
        text.innerHTML = `${questData.correct} / ${questData.total}`;
    }
    
    input.value = "";

    if (questData.correct != questData.total) {
        calcData = genCalculation();
        newQuest(calcData);
    }
}

function newQuest(calcData) {
    questionText = document.getElementById("questionText");
    questionText.innerHTML = `${calcData.numOne} ${calcData.op} ${calcData.numTwo}`;

    input = document.getElementById("answerField");
    input.removeEventListener("keydown", handler);
    addAnswerFieldListener(input, calcData);
}

function removeFlashcardHTML() {
    elt = document.getElementById("flashcardDiv");
    elt.remove();
}

// #endregion
