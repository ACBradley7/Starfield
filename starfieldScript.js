// Adjust everything based on resize?

// Stars
// Add momentum slowing down on release
// Add trails
// Add twinkling
// Add subtle movement on stop

// Player
// Add momentum on start and stop
// Add getting hit by enemies / asteroids
// Improve hurt animation

// Enemies
// Prevent enemies from grouping on top of each other ?
// Add getting hit by asteroids

// Bullets
// Explode on impact

// State
// Add RESUMEGAME screen

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

let appState = APPSTATE.INGAME;
let canvas;
let canvasRatio;
let centerPoint = {};
let stars = [];
let player;
let enemies = [];
let bullets = [];
let collObjs = [];
let objsByGrid = {};
let objID = 1;
let questData = { correct: 0, total: 3 };

let CONTROLS = {};
let FRAMECNT = 0;

const centStarGenInterval = 1;
const enemyGenInterval = 2000;
const genStarsPerFrame = 3;
const enStopDists = [100, 200, 300, 400];
const gridDivVal = 20;

function setup() {
    canvas = createCanvas(window.innerWidth, window.innerHeight);
    canvas.id("gameScreen");

    getCenterCoords();
    getCanvasRatio();
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
        starsLogic();
        updateObjsByGrid();
        bulletsLogic();
        enemiesLogic();
        playerLogic();
        
        // if (FRAMECNT == 100) {
        //     appState = APPSTATE.FLASHCARDS;   
        //     createFlashcardState();
        // }

    } else if (appState == APPSTATE.GAMEOVER) {
        console.log("GO");
    }
    
    FRAMECNT += 1;
}

function setControls() {
    CONTROLS = {
        SUBMITQUESTION: "Enter",                // Enter
        HYPERSPEED: 32,                         // Spacebar
        GAS: 87,                                // W
        ROTLEFT: 65,                            // A
        BRAKE: 83,                              // S
        ROTRIGHT: 68,                           // D
        BOOST: 16,                              // Left Shift
        BASICATTACK: 74                         // J
    }
}

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
        
        this.speed = 5;
        this.brakeVal = 0.1;
        this.moveSpeed = this.speed;
        this.boostSpeed = this.speed * 1.5;
        
        this.cell = { x: 0, y: 0 };

        this.front = { x: this.x, y: this.y - this.radius};
        this.theta = 3 * PI / 2;
        this.rotVal = 0.1;

        this.playHurtAnim = false;

        collObjs.push(this);
    }

    display() {
        push();
        fill("#fff300");
        rect(this.front.x - 5, this.front.y - 15, 10, 10);
        pop();

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

    basicAttack() {
        if (keyIsDown(CONTROLS.BASICATTACK)) {
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

    calcAttackOffset(posNegInt) {
        let perpAngle = this.theta + posNegInt * PI / 2
        let offset = this.radius / 4;

        let coords = { x: offset * Math.cos(perpAngle), y: offset * Math.sin(perpAngle) }

        return coords;
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

        enemies.push(this);
        collObjs.push(this);
    }

    setSpawnLocation() {
        let offset = 200;
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
        let dx = obj.x - this.x;
        let dy = obj.y - this.y;
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
        const dx = this.x - obj.x;
        const dy = this.y - obj.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
    
        const sumOfRadii = this.radius + obj.radius;
    
        if (distance < sumOfRadii) {
            this.collided = true;
            obj.playHurtAnim = true;
        }
    }

    prevFrameCircCollCheck(obj) {
        let dx = this.x - this.prevFramePos.x;
        let dy = this.y - this.prevFramePos.y;
        let distMag = Math.sqrt(dx * dx + dy * dy);
        let sumOfRadii = this.radius + obj.radius

        let inRangeX = (this.prevFramePos.x <= obj.prevFramePos.x && obj.prevFramePos.x <= this.x) ||
        (this.prevFramePos.x >= obj.prevFramePos.x && obj.prevFramePos.x >= this.x);

        let inRangeY = (this.prevFramePos.y <= obj.prevFramePos.y && obj.prevFramePos.y <= this.y) ||
                (this.prevFramePos.y >= obj.prevFramePos.y && obj.prevFramePos.y >= this.y);

        if (inRangeX && inRangeY) {
            this.collided = true;
            obj.playHurtAnim = true;
        }
    }

    getBulletInfo() {
        if (this.bullType == BULLTYPE.PLAYERBASIC) {
            this.color = "#00f0ff";
            this.accentColor = "99f9ff";
            this.radius = 6;
            this.diam = this.radius * 2;
            this.speed = 10;
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

function playerLogic() {
    player.boost();
    player.calcMoveDir();
    player.calcFront();
    player.move();
    player.basicAttack();
    player.hurtAnim();
    player.display();
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
        enemy.display();
    }
}

function bulletsLogic() {
    for (let bullet of bullets) {
        bullet.offScreenCheck();
        bullet.collisionCheckHandler();
        bullet.move();
        bullet.display();
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        if (bullets[i].onScreen == false || bullets[i].collided == true) {
            bullets.splice(i, 1);
        }
    }
}

function starsLogic() {
    let starsToRemove = []

    if (keyIsDown(CONTROLS.HYPERSPEED)) {
        genStars();
    }

    for (let i = 0; i < stars.length; i++) {
        if (keyIsDown(CONTROLS.HYPERSPEED)) {
            stars[i].move();
        }
        stars[i].display();
        starsToRemove = shouldRemoveStar(stars[i], i, starsToRemove);
    }
    
    if (starsToRemove) { removeStars(stars, starsToRemove); }
}

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

function getCanvasRatio() {
    canvasRatio = canvas.width / canvas.height;
}

function getCenterCoords() {
    centerPoint = { x: window.innerWidth / 2, y: window.innerHeight / 2};
}

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

window.addEventListener("resize", () => {
    resizeCanvas(window.innerWidth, window.innerHeight);

    background(0);
    removeAllStars();
    genStarsCollection();

    getCenterCoords();
    getCanvasRatio();
});