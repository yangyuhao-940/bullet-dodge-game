// 初始化画布
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// 游戏配置
const GameConfig = {
    player: {
        size: 15,
        speed: 5,
        color: '#2ecc71'
    },
    bullet: {
        baseSpeed: 3,
        color: '#e74c3c'
    },
    levels: [
        { duration: 60, spawnRate: 2000, bulletSpeed: 3, bulletCount: 1 },  // 第1关
        { duration: 60, spawnRate: 1800, bulletSpeed: 3.5, bulletCount: 1 },// 第2关
        { duration: 60, spawnRate: 1600, bulletSpeed: 4, bulletCount: 2 },  // 第3关
        { duration: 60, spawnRate: 1400, bulletSpeed: 4.5, bulletCount: 2 },// 第4关
        { duration: 60, spawnRate: 1200, bulletSpeed: 5, bulletCount: 3 },  // 第5关
        // 继续补充到第10关...
    ]
};

// 游戏状态对象
let gameState = {
    player: { x: canvas.width / 2, y: canvas.height / 2 },
    bullets: [],
    keys: {},
    level: 0, // 当前关卡索引
    remainingTime: 0,
    lastUpdateTime: 0,
    lastSpawnTime: 0,
    isPlaying: false,
    gameLoop: null
};

// 控制玩家移动
document.addEventListener('keydown', (e) => gameState.keys[e.key] = true);
document.addEventListener('keyup', (e) => delete gameState.keys[e.key]);

// 游戏主循环
function update(timestamp) {
    if (!gameState.isPlaying) return;

    // 计算时间差
    const deltaTime = timestamp - gameState.lastUpdateTime;
    gameState.lastUpdateTime = timestamp;

    // 更新倒计时
    updateTimer(deltaTime);

    // 清空画布
    ctx.fillStyle = '#34495e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 玩家移动
    if (gameState.keys['w']) gameState.player.y -= GameConfig.player.speed;
    if (gameState.keys['s']) gameState.player.y += GameConfig.player.speed;
    if (gameState.keys['a']) gameState.player.x -= GameConfig.player.speed;
    if (gameState.keys['d']) gameState.player.x += GameConfig.player.speed;

    // 边界检测
    gameState.player.x = Math.max(GameConfig.player.size, Math.min(canvas.width - GameConfig.player.size, gameState.player.x));
    gameState.player.y = Math.max(GameConfig.player.size, Math.min(canvas.height - GameConfig.player.size, gameState.player.y));

    // 生成炮弹（仅在游戏进行时生成）
    if (gameState.isPlaying) {
        const currentLevel = GameConfig.levels[gameState.level];
        if (timestamp - gameState.lastSpawnTime > currentLevel.spawnRate) {
            for (let i = 0; i < currentLevel.bulletCount; i++) {
                spawnBullet(currentLevel.bulletSpeed);
            }
            gameState.lastSpawnTime = timestamp;
        }
    }

    // 更新炮弹位置和碰撞检测
    gameState.bullets.forEach((bullet, index) => {
        bullet.x += bullet.speedX;
        bullet.y += bullet.speedY;

        // 碰撞检测
        const dx = gameState.player.x - bullet.x;
        const dy = gameState.player.y - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < GameConfig.player.size + bullet.radius) {
            gameOver();
        }

        // 移除屏幕外炮弹
        if (bullet.x < -bullet.radius || bullet.x > canvas.width + bullet.radius ||
            bullet.y < -bullet.radius || bullet.y > canvas.height + bullet.radius) {
            gameState.bullets.splice(index, 1);
        }
    });

    // 绘制玩家
    ctx.beginPath();
    ctx.arc(gameState.player.x, gameState.player.y, GameConfig.player.size, 0, Math.PI * 2);
    ctx.fillStyle = GameConfig.player.color;
    ctx.fill();

    // 绘制炮弹
    gameState.bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fillStyle = GameConfig.bullet.color;
        ctx.fill();
    });

    gameState.gameLoop = requestAnimationFrame(update);
}

// 生成炮弹函数
function spawnBullet(speed) {
    const side = Math.floor(Math.random() * 4);
    let x, y, angle;

    switch (side) {
        case 0: // 上方
            x = Math.random() * canvas.width;
            y = -10;
            angle = Math.atan2(gameState.player.y - y, gameState.player.x - x);
            break;
        case 1: // 下方
            x = Math.random() * canvas.width;
            y = canvas.height + 10;
            angle = Math.atan2(gameState.player.y - y, gameState.player.x - x);
            break;
        case 2: // 左侧
            x = -10;
            y = Math.random() * canvas.height;
            angle = Math.atan2(gameState.player.y - y, gameState.player.x - x);
            break;
        case 3: // 右侧
            x = canvas.width + 10;
            y = Math.random() * canvas.height;
            angle = Math.atan2(gameState.player.y - y, gameState.player.x - x);
            break;
    }

    gameState.bullets.push({
        x: x,
        y: y,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        radius: 8
    });
}

// 更新倒计时函数
function updateTimer(deltaTime) {
    gameState.remainingTime -= deltaTime / 1000;
    if (gameState.remainingTime < 0) gameState.remainingTime = 0;

    const timerDisplay = document.getElementById('timer');
    timerDisplay.textContent = Math.ceil(gameState.remainingTime);

    if (gameState.remainingTime <= 0) {
        nextLevel();
        return;
    }
}

// 关卡切换函数
function nextLevel() {
    gameState.level++;

    // 所有关卡通过
    if (gameState.level >= GameConfig.levels.length) {
        showGameStatus("恭喜通关！");
        return;
    }

    // 重置游戏状态
    resetGameState();
    showGameStatus(`第 ${gameState.level + 1} 关 准备！`, 2000);
    updateHUD();
}

// 重置游戏状态函数
function resetGameState() {
    const currentLevel = GameConfig.levels[gameState.level];
    gameState.player = { x: canvas.width / 2, y: canvas.height / 2 };
    gameState.bullets = [];
    gameState.keys = {};
    gameState.remainingTime = currentLevel.duration;
    gameState.lastUpdateTime = performance.now();
    gameState.lastSpawnTime = 0;
    gameState.isPlaying = true;
}

// 更新HUD函数
function updateHUD() {
    document.getElementById('currentLevel').textContent = gameState.level + 1;
}

// 显示游戏状态提示
function showGameStatus(text, duration = 0) {
    const statusEl = document.getElementById('gameStatus');
    statusEl.style.display = 'block';
    statusEl.textContent = text;

    gameState.isPlaying = false;

    if (duration > 0) {
        setTimeout(() => {
            statusEl.style.display = 'none';
            gameState.isPlaying = true;
            requestAnimationFrame(update);
        }, duration);
    }
}

// 游戏结束函数
function gameOver() {
    cancelAnimationFrame(gameState.gameLoop);

    // 清除所有炮弹
    gameState.bullets = [];

    // 停止倒计时和炮弹生成
    gameState.isPlaying = false;

    // 显示游戏结束提示
    const statusEl = document.getElementById('gameStatus');
    statusEl.style.display = 'block';
    statusEl.textContent = '游戏结束！点击重试';

    // 点击重新开始
    canvas.style.cursor = 'pointer';
    canvas.onclick = () => {
        statusEl.style.display = 'none';
        canvas.style.cursor = 'default';
        resetGameState();
        requestAnimationFrame(update);
    };
}

// 启动游戏
function startGame() {
    gameState.level = 0;
    resetGameState();
    updateHUD();
    requestAnimationFrame(update);
}

// 初始化游戏
startGame();