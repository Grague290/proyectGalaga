let player;
let bullets = [];
let enemyBullets = [];
let enemies = [];
let score = 0;
let lives = 3;
let level = 1;
let enemySpeed = 0.6;
let gameStarted = false;

let shooting = false;
let lastPlayerShot = 0;
const playerShootInterval = 300;

let transitioning = false;
let transitionTimer = 0;

let farStars = [];
let midStars = [];
let nearStars = [];

let canvas;

let playerSprite;
let enemySprite; 
let basicEnemySprite;
let zigZagEnemySprite;
let fastZigZagEnemySprite;
let resistantEnemySprite;
let bossEnemySprite;

let shootSound, enemyHitSound, enemyDestroyedSound, playerHitSound, gameOverSound, levelTransitionSound;

function preload() {
    playerSprite = loadImage('sprites/player.png');
    enemySprite = loadImage('sprites/enemy.png'); 
    basicEnemySprite = loadImage('sprites/basic_enemy.png');
    zigZagEnemySprite = loadImage('sprites/zigzag_enemy.png');
    fastZigZagEnemySprite = loadImage('sprites/fast_zigzag_enemy.png');
    resistantEnemySprite = loadImage('sprites/resistant_enemy.png');
    bossEnemySprite = loadImage('sprites/boss_enemy.png');

    soundFormats('wav', 'ogg');

    shootSound = loadSound('sounds/player_shoot.wav');
    if (shootSound) {
        shootSound.setVolume(0.3); 
    }

    enemyHitSound = loadSound('sounds/enemy_hit.wav'); 
    if (enemyHitSound) {
        enemyHitSound.setVolume(0.3);
    }

    enemyDestroyedSound = loadSound('sounds/enemy_destroyed.wav');
    if (enemyDestroyedSound) {
        enemyDestroyedSound.setVolume(0.3);
    }

    playerHitSound = loadSound('sounds/player_hit.wav');
    if (playerHitSound) {
        playerHitSound.setVolume(0.3);
    }

    gameOverSound = loadSound('sounds/game_over.wav');
    if (gameOverSound) {
        gameOverSound.setVolume(0.3);
    }

    levelTransitionSound = loadSound('sounds/level_transition.wav');
    if (levelTransitionSound) {
        levelTransitionSound.setVolume(0.3);
    }
}

function updateScoreBoard() {
    document.getElementById('current-score').textContent = score;
    document.getElementById('current-level').textContent = level;
    document.getElementById('current-lives').textContent = lives;
    
    const scoreElement = document.getElementById('current-score');
    scoreElement.classList.add('updated');
    setTimeout(() => scoreElement.classList.remove('updated'), 300);
    
    updateTopScoresDisplay();
}

function updateTopScoresDisplay() {
    const topScores = JSON.parse(localStorage.getItem('galagaScores')) || [];
    const topScoresList = document.getElementById('top-scores-list');
    topScoresList.innerHTML = '';
    
    topScores.slice(0, 5).forEach((scoreValue, index) => {
        const li = document.createElement('li');
        li.textContent = `${scoreValue}`;
        topScoresList.appendChild(li);
    });
}

function storeScore(newScore) {
    let scores = JSON.parse(localStorage.getItem('galagaScores')) || [];
    scores.push(newScore);
    scores.sort((a, b) => b - a);
    scores = scores.slice(0, 5);
    localStorage.setItem('galagaScores', JSON.stringify(scores));
    updateTopScoresDisplay();
}

function setup() {
    canvas = createCanvas(600, 600);
    canvas.position((windowWidth - width) / 2, (windowHeight - height) / 2);
    canvas.class('game-container');
    
    imageMode(CENTER);

    player = new Player();
    spawnEnemies();

    updateTopScoresDisplay();
    updateScoreBoard();

    for (let i = 0; i < 300; i++) {
        farStars.push(createStar(0.5, 0.2, 100));
    }
    for (let i = 0; i < 150; i++) {
        midStars.push(createStar(1, 0.5, 180));
    }
    for (let i = 0; i < 50; i++) {
        nearStars.push(createStar(1.5, 1, 230));
    }
}

function draw() {
    background(0);
    drawStars();

    if (!gameStarted) {
        showTopScores(); 
        return;
    }

    if (transitioning) {
        showLevelTransition();
        return;
    }

    player.show();
    player.move();

    if (shooting && millis() - lastPlayerShot > playerShootInterval) {
        bullets.push(new Bullet(player.x)); 
        if (shootSound && shootSound.isLoaded()) {
            shootSound.play();
        }
        lastPlayerShot = millis();
    }

    for (let b of bullets) b.update(), b.show();
    for (let b of enemyBullets) b.update(), b.show();
    for (let e of enemies) e.update(), e.show();

    checkCollisions();
    if (frameCount % 10 === 0) {
        updateScoreBoard();
    }

    if (enemies.length === 0 && !transitioning) {
        level++;
        enemySpeed += 0.5; 
        transitioning = true;
        transitionTimer = millis();
        if (levelTransitionSound && levelTransitionSound.isLoaded()) {
            levelTransitionSound.play();
        }
    }

    if (lives <= 0) {
        showGameOver();
    }
}

function createStar(baseSize, baseSpeed, baseAlpha) {
    return {
        x: random(width),
        y: random(height),
        size: random(baseSize * 0.7, baseSize * 1.3),
        speed: random(baseSpeed * 0.8, baseSpeed * 1.2),
        alpha: random(baseAlpha * 0.7, baseAlpha * 1.3),
        twinkleSpeed: random(0.02, 0.08)
    };
}

function drawStars() {
    background(0);
    drawStarLayer(farStars, 0.3);
    drawStarLayer(midStars, 0.6);
    drawStarLayer(nearStars, 1);
    if (frameCount % 180 === 0 && random() > 0.8) {
        drawShootingStar();
    }
}

function drawStarLayer(stars, intensity) {
    for (let star of stars) {
        let twinkle = (sin(frameCount * star.twinkleSpeed) * 0.5 + 0.5) * star.alpha;
        let blueTint = random(200, 255);
        fill(blueTint, blueTint, 255, twinkle * intensity);
        noStroke();
        ellipse(star.x, star.y, star.size, star.size);
        star.y += star.speed * intensity;
        if (star.y > height) {
            star.y = 0;
            star.x = random(width);
        }
    }
}

function drawShootingStar() {
    let x = random(width);
    let length = random(80, 150);
    let speed = random(8, 15);
    let size = random(2, 4);
    for (let i = 0; i < length; i++) {
        let alpha = map(i, 0, length, 255, 0);
        let currentSize = map(i, 0, length, size, 0.1);
        fill(255, 255, 255, alpha);
        ellipse(
            x + i * 0.3,
            -10 + (frameCount % height) * speed - i,
            currentSize,
            currentSize
        );
    }
}

function showTopScores() { 
    background(0);
    for (let i = 0; i < 100; i++) {
        let x = random(width);
        let y = random(height);
        let size = random(1, 3);
        fill(255, random(150, 255));
        noStroke();
        ellipse(x, y, size, size);
    }
    fill(255, 255, 0);
    textAlign(CENTER);
    textSize(48);
    textStyle(BOLD);
    text("GALAGA", width / 2, height / 2 - 150);
    fill(100, 255, 100);
    textSize(20);
    text("Presiona ESPACIO para iniciar", width / 2, height - 100);
    if (frameCount % 60 < 30) {
        fill(255);
        textSize(18);
        text("▼", width / 2, height - 70);
    }
}


function showLevelTransition() {
    background(0, 0, 50, 100); 
    fill(255, 255, 0);
    textAlign(CENTER, CENTER);
    textSize(48);
    textStyle(BOLD);
    text(`NIVEL ${level}`, width / 2, height / 2);
    
    let progress = map(millis() - transitionTimer, 0, 2000, 0, 100);
    fill(255);
    textSize(24);
    text(`Cargando... ${int(progress)}%`, width / 2, height / 2 + 60);
    
    rectMode(CORNER); 
    noFill();
    stroke(255);
    strokeWeight(2);
    rect(width / 4, height / 2 + 90, width / 2, 10);
    fill(255, 255, 0);
    noStroke();
    rect(width / 4, height / 2 + 90, (width / 2) * (progress / 100), 10);
    imageMode(CENTER); 

    if (millis() - transitionTimer > 2000) {
        transitioning = false;
        spawnEnemies();
    }
}

let gameOverSoundPlayed = false;

function showGameOver() {
    noLoop(); 
    storeScore(score); 
    
    if (gameOverSound && gameOverSound.isLoaded() && !gameOverSoundPlayed) {
        gameOverSound.play();
        gameOverSoundPlayed = true; 
    }
    
    fill(0, 0, 0, 200); 
    rectMode(CORNER);
    rect(0, 0, width, height);
    imageMode(CENTER); 

    fill(255, 0, 0); 
    textAlign(CENTER);
    textSize(48);
    textStyle(BOLD);
    text("GAME OVER", width / 2, height / 2 - 50);
    
    fill(255); 
    textSize(24);
    text(`Puntuación final: ${score}`, width / 2, height / 2 + 20);
    
    fill(200, 200, 255); 
    textSize(18);
    text("Recarga la página para jugar de nuevo O presiona R", width / 2, height / 2 + 80);
}

function keyPressed() {

    if (key === 'r' || key === 'R') {
        resetGame();
        return;
    }

    if (key === ' ') {
        if (!gameStarted) {
            gameStarted = true;
            gameOverSoundPlayed = false;
            if (levelTransitionSound && levelTransitionSound.isLoaded()) {
                levelTransitionSound.play();
            }
            return;
        }
        shooting = true;
    }

    if (keyCode === LEFT_ARROW) {
        player.setDir(-1);
    } else if (keyCode === RIGHT_ARROW) {
        player.setDir(1);
    }
}

function keyReleased() {
    if (key === ' ') {
        shooting = false;
    }

    if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) {
        player.setDir(0); 
    }
}

function spawnEnemies() {
    enemies = []; 

    if (level === 1) {
        for (let i = 0; i < 10; i++) {
            let x = i * (width / 11) + (width / 22);
            let y = 70;
            enemies.push(new BasicEnemy(x, y));
        }
    } else if (level === 2) {
        for (let i = 0; i < 8; i++) {
            let x = i * (width / 9) + (width / 18);
            let y = 70;
            enemies.push(new ZigZagEnemy(x, y));
        }
        setTimeout(() => {
            enemies.push(new ResistantEnemy(width / 2, 100)); 
        }, 2000);
    } else if (level === 3) {
        for (let i = 0; i < 5; i++) { 
            let x = i * 100 + 60; 
            let y = 70; 
            enemies.push(new FastZigZagEnemy(x, y));
        }
        
        let resistantY = 90; 
        enemies.push(new ResistantEnemy(60, resistantY)); 
        enemies.push(new ResistantEnemy(width - 60, resistantY)); 
        
        setTimeout(() => {
            enemies.push(new BossEnemy(width / 2, 100)); 
        }, 2000); 
    }
}


function checkCollisions() {
    for (let b = bullets.length - 1; b >= 0; b--) {
        for (let e = enemies.length - 1; e >= 0; e--) {
            if (bullets[b].hits(enemies[e])) {
                if ('hp' in enemies[e]) { 
                    enemies[e].hp--;
                    if (enemies[e].hp <= 0) {
                        if (enemies[e] instanceof BossEnemy) {
                            score += 10;
                        } else if (enemies[e] instanceof ResistantEnemy) {
                            score += 3;
                        } else { 
                            score += 1;
                        }
                        enemies.splice(e, 1); 
                        if (enemyDestroyedSound && enemyDestroyedSound.isLoaded()) {
                            enemyDestroyedSound.play();
                        }
                    } else {
                        if (enemyHitSound && enemyHitSound.isLoaded()) {
                            enemyHitSound.play();
                        }
                    }
                } else {
                    score += 1;
                    enemies.splice(e, 1); 
                    if (enemyDestroyedSound && enemyDestroyedSound.isLoaded()) {
                        enemyDestroyedSound.play();
                    }
                }
                bullets.splice(b, 1); 
                break; 
            }
        }
    }

    for (let b = enemyBullets.length - 1; b >= 0; b--) {
        if (enemyBullets[b].hitsPlayer(player)) {
            enemyBullets.splice(b, 1); 
            lives--;
            if (playerHitSound && playerHitSound.isLoaded()) {
                playerHitSound.play();
            }
            resetPlayer(); 
            if (lives <= 0) break; 
        }
    }

    for (let e = enemies.length - 1; e >= 0; e--) {
        const enemy = enemies[e];
        const hitsPlayer = typeof enemy.hitsPlayer === 'function' && enemy.hitsPlayer(player);
        const outOfBounds = enemy.y - enemy.size / 2 > height; 

        if (hitsPlayer || outOfBounds) {
            if (hitsPlayer && playerHitSound && playerHitSound.isLoaded()) {
                 playerHitSound.play();
            }
            lives--;
            enemies.splice(e, 1); 
            if(hitsPlayer) resetPlayer(); 
            if (lives <= 0) break; 
        }
    }
}


function resetPlayer() {
    player.x = width / 2; 
}

function resetGame() {
    score = 0;
    lives = 3;
    level = 1;
    enemySpeed = 0.6;
    
    enemies = [];
    bullets = [];
    enemyBullets = [];

    gameStarted = true;
    transitioning = false;
    gameOverSoundPlayed = false; 
    shooting = false;

    if (player) {
        player.x = width / 2;
        player.dir = 0;
    }

    updateScoreBoard();

    spawnEnemies();

    if (levelTransitionSound && levelTransitionSound.isLoaded()) {
        levelTransitionSound.play();
    }

    loop();
}

class Player {
    constructor() {
        this.w = 60; 
        this.h = 60; 
        this.x = width / 2;
        this.y = height - this.h / 2 - 20; 
        this.dir = 0;
    }

    show() {
        if (playerSprite) {
            image(playerSprite, this.x, this.y, this.w, this.h);
        } else { 
            fill(0, 255, 255);
            rectMode(CENTER); 
            rect(this.x, this.y, this.w, this.h);
        }
    }

    move() {
        this.x += this.dir * 7; 
        this.x = constrain(this.x, this.w / 2, width - this.w / 2);
    }

    setDir(dir) {
        this.dir = dir;
    }
}

class Bullet {
    constructor(x) { 
        this.x = x;
        this.y = player.y - player.h / 2; 
        this.r = 6; 
        this.speed = 10; 
    }

    update() {
        this.y -= this.speed;
    }

    show() {
        fill(255, 255, 0); 
        noStroke();
        ellipse(this.x, this.y, this.r * 2, this.r * 2);
    }

    hits(enemy) {
        return dist(this.x, this.y, enemy.x, enemy.y) < this.r + enemy.size / 2;
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 45; 
        this.lastShot = millis() + random(500, 1500); 
        this.shootInterval = random(3000, 5000); 
        this.spawnDelay = millis() + random(500, 2000); 
    }

    update() {
        if (millis() > this.spawnDelay) { 
            this.y += enemySpeed;
        }
        if (millis() - this.lastShot > this.shootInterval && millis() > this.spawnDelay) {
            enemyBullets.push(new EnemyBullet(this.x, this.y + this.size / 2)); 
            this.lastShot = millis();
            this.shootInterval = random(3000, 5000); 
        }
    }

    show() {
        if (enemySprite) { 
            image(enemySprite, this.x, this.y, this.size, this.size);
        } else { 
            fill(255, 0, 0);
            ellipse(this.x, this.y, this.size, this.size);
        }
    }

    hitsPlayer(player) {
        let distance = dist(this.x, this.y, player.x, player.y);
        return distance < (this.size / 2 + player.w / 2); 
    }
}

class ZigZagEnemy extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.angle = random(TWO_PI); 
        this.amplitude = random(1.5, 3); 
        this.frequency = random(0.03, 0.07); 
    }

    update() {
        if (millis() > this.spawnDelay) {
            this.y += enemySpeed; 
        }
        if (millis() - this.lastShot > this.shootInterval && millis() > this.spawnDelay) {
            enemyBullets.push(new EnemyBullet(this.x, this.y + this.size / 2));
            this.lastShot = millis();
            this.shootInterval = random(3000, 5000);
        }

        if (millis() > this.spawnDelay) { 
             this.x += sin(this.angle) * this.amplitude; 
             this.angle += this.frequency; 
        }
        this.x = constrain(this.x, this.size / 2, width - this.size / 2);
    }

    show() {
        if (zigZagEnemySprite) {
            image(zigZagEnemySprite, this.x, this.y, this.size, this.size);
        } else {
            fill(0, 255, 100);
            ellipse(this.x, this.y, this.size, this.size);
        }
    }
}

class ResistantEnemy extends ZigZagEnemy {
    constructor(x, y) {
        super(x, y); 
        this.hp = 3;
        this.spriteSize = this.size + 10; 
    }

    show() {
        if (resistantEnemySprite) {
            image(resistantEnemySprite, this.x, this.y, this.spriteSize, this.spriteSize);
        } else {
            fill(255, 165, 0); 
            ellipse(this.x, this.y, this.spriteSize, this.spriteSize);
        }
    }
}


class EnemyBullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.r = 4; 
        this.baseSpeed = 3.5;
        this.speed = this.baseSpeed;
    }

    update() {
        let currentSpeed = this.speed;
        if (level >= 3) {
            currentSpeed *= 1.5; 
        }
        this.y += currentSpeed;
    }

    show() {
        fill(255, 100, 100); 
        noStroke();
        ellipse(this.x, this.y, this.r * 2, this.r * 2);
    }

    hitsPlayer(player) {
        return this.y + this.r > player.y - player.h / 2 &&
               this.y - this.r < player.y + player.h / 2 &&
               this.x + this.r > player.x - player.w / 2 &&
               this.x - this.r < player.x + player.w / 2;
    }
}

class BasicEnemy extends Enemy { 
    constructor(x,y) {
        super(x,y);
        this.shootInterval = Infinity;
    }
    
    show() {
        if (basicEnemySprite) {
            image(basicEnemySprite, this.x, this.y, this.size, this.size);
        } else {
            fill(150, 0, 255);
            ellipse(this.x, this.y, this.size, this.size);
        }
    }
}

class FastZigZagEnemy extends ZigZagEnemy {
    constructor(x, y) {
        super(x, y);
        this.shootInterval = random(1500, 2500); 
        this.amplitude *= 1.5; 
        this.frequency *= 1.5; 
    }

    update() {
        if (millis() > this.spawnDelay) {
            this.y += enemySpeed + 1.2;
        }
        if (millis() - this.lastShot > this.shootInterval && millis() > this.spawnDelay) {
            enemyBullets.push(new EnemyBullet(this.x - 10, this.y + this.size / 2));
            enemyBullets.push(new EnemyBullet(this.x + 10, this.y + this.size / 2));
            this.lastShot = millis();
            this.shootInterval = random(1500, 2500); 
        }
        
        if (millis() > this.spawnDelay) {
            this.x += sin(this.angle) * this.amplitude;
            this.angle += this.frequency;
        }
        this.x = constrain(this.x, this.size / 2, width - this.size / 2);
    }

    show() {
        if (fastZigZagEnemySprite) {
            image(fastZigZagEnemySprite, this.x, this.y, this.size, this.size);
        } else {
            fill(0, 200, 255);
            ellipse(this.x, this.y, this.size, this.size);
        }
    }
}

class BossEnemy extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.hp = 7;
        this.size = 90; 
        this.shootInterval = random(800, 1500); 
        this.lastSpecialAttack = millis();
        this.specialAttackInterval = random(5000, 8000); 
    }

    update() {
        if (millis() > this.spawnDelay) {
            this.y += enemySpeed * 0.4;
        }

        if (millis() - this.lastShot > this.shootInterval && millis() > this.spawnDelay) {
            enemyBullets.push(new EnemyBullet(this.x - 20, this.y + this.size / 2));
            enemyBullets.push(new EnemyBullet(this.x, this.y + this.size / 2 + 10));
            enemyBullets.push(new EnemyBullet(this.x + 20, this.y + this.size / 2));
            this.lastShot = millis();
            this.shootInterval = random(800, 1500); 
        }

        if (millis() - this.lastSpecialAttack > this.specialAttackInterval && millis() > this.spawnDelay) {
            for (let i = 0; i < 5; i++) {
                let angle = map(i, 0, 5, -PI/4, PI/4); 
                let bx = this.x + cos(angle) * 30;
                let by = this.y + this.size / 2 + sin(angle) * 30;
                let bullet = new EnemyBullet(bx, by);
                enemyBullets.push(bullet);
            }
            this.lastSpecialAttack = millis();
            this.specialAttackInterval = random(7000, 12000); 
        }
        if (this.y - this.size/2 > height) {
            this.y = -this.size; 
        }
    }

    show() {
        if (bossEnemySprite) {
            image(bossEnemySprite, this.x, this.y, this.size, this.size);
        } else {
            fill(255, 69, 0); 
            ellipse(this.x, this.y, this.size, this.size);
        }
        if (this.hp > 0 && millis() > this.spawnDelay) {
            rectMode(CORNER);
            fill(50);
            rect(this.x - this.size/2, this.y - this.size/2 - 15, this.size, 10);
            fill(255,0,0);
            let hpWidth = map(this.hp, 0, 7, 0, this.size);
            rect(this.x - this.size/2, this.y - this.size/2 - 15, hpWidth, 10);
            imageMode(CENTER); 
        }
    }
}