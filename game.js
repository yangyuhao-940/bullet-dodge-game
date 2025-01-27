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
        { duration: 60, spawnRate: 2000, bulletSpeed: 3, bulletCount: 1 },
        { duration: 60, spawnRate: 1800, bulletSpeed: 3.5, bulletCount: 1 },
        { duration: 60, spawnRate: 1600, bulletSpeed: 4, bulletCount: 2 },
        { duration: 60, spawnRate: 1400, bulletSpeed: 4.5, bulletCount: 2 },
        { duration: 60, spawnRate: 1200, bulletSpeed: 5, bulletCount: 3 },
    ],
    powerups: {
        invisibility: { duration: 5000 },
        clearScreen: {},
        agility: { duration: 10000 }
    },
    specialBullet: {
        color: '#3498db',
        explosionColor: '#f1c40f',
        sizeMultiplier: 3,
        spawnInterval: 5000,
        baseSplitCount: 8, // 基础分裂炮弹数
        splitIncrementPerLevel: 2 // 每关增加的分裂炮弹数
    },
    refractionBullet: {
        color: '#9b59b6',
        radius: 10,
        speed: 4,
        maxRefractions: 3, // 最大折射次数
        spawnInterval: 7000 // 生成间隔
    }
};

// 游戏状态对象
let gameState = {
    player: { x: canvas.width / 2, y: canvas.height / 2 },
    bullets: [],
    keys: {},
    level: 0,
    remainingTime: 0,
    lastUpdateTime: 0,
    lastSpawnTime: 0,
    lastSpecialSpawnTime: 0,
    lastRefractionSpawnTime: 0,
    isPlaying: false,
    gameLoop: null,
    usedPowerups: {
        invisibility: false,
        clearScreen: false,
        agility: false
    },
    activeEffects: {
        invisibility: false,
        agility: false
    }
};

// 获取道具按钮
const invisibilityButton = document.getElementById('invisibilityButton');
const clearScreenButton = document.getElementById('clearScreenButton');
const agilityButton = document.getElementById('agilityButton');

// 控制玩家移动
document.addEventListener('keydown', (e) => gameState.keys[e.key] = true);
document.addEventListener('keyup', (e) => delete gameState.keys[e.key]);

// 使用道具
// 修改usePowerup函数中的agility处理逻辑
function usePowerup(type) {
    if (gameState.usedPowerups[type]) return;

    gameState.usedPowerups[type] = true;

    switch (type) {
        case 'invisibility':
            gameState.activeEffects.invisibility = true;
            setTimeout(() => {
                gameState.activeEffects.invisibility = false;
            }, GameConfig.powerups.invisibility.duration);
            break;
        case 'clearScreen':
            gameState.bullets = [];
            break;
        case 'agility':
            // 记录原始数值（仅首次生效时记录）
            if (!gameState.originalPlayerProps) {
                gameState.originalPlayerProps = {
                    size: GameConfig.player.size,
                    speed: GameConfig.player.speed
                };
            }
            
            // 应用敏捷效果
            GameConfig.player.size = gameState.originalPlayerProps.size * 0.5;
            GameConfig.player.speed = gameState.originalPlayerProps.speed * 1.5;
            
            setTimeout(() => {
                // 还原时使用记录的原始值
                GameConfig.player.size = gameState.originalPlayerProps.size;
                GameConfig.player.speed = gameState.originalPlayerProps.speed;
                gameState.activeEffects.agility = false;
                delete gameState.originalPlayerProps; // 清除缓存
            }, GameConfig.powerups.agility.duration);
            break;
    }

    document.getElementById(`${type}Button`).disabled = true;
}

// 绑定按钮点击事件
invisibilityButton.addEventListener('click', () => usePowerup('invisibility'));
clearScreenButton.addEventListener('click', () => usePowerup('clearScreen'));
agilityButton.addEventListener('click', () => usePowerup('agility'));

// 生成特殊炮弹函数
// 修改后的生成特殊炮弹函数
function spawnSpecialBullet(baseSpeed) {
    const speed = baseSpeed * 0.8;
    
    // 随机选择生成边（0:上 1:下 2:左 3:右）
    const spawnSide = Math.floor(Math.random() * 4);
    let startX, startY;

    // 设置初始位置（在屏幕外）
    switch(spawnSide) {
        case 0: // 上方
            startX = Math.random() * canvas.width;
            startY = -100;
            break;
        case 1: // 下方
            startX = Math.random() * canvas.width;
            startY = canvas.height + 100;
            break;
        case 2: // 左侧
            startX = -100;
            startY = Math.random() * canvas.height;
            break;
        case 3: // 右侧
            startX = canvas.width + 100;
            startY = Math.random() * canvas.height;
            break;
    }

    // 生成目标位置（距离边缘至少100px）
    const targetPadding = 100;
    const targetPos = {
        x: Math.random() * (canvas.width - targetPadding * 2) + targetPadding,
        y: Math.random() * (canvas.height - targetPadding * 2) + targetPadding
    };

    const bullet = {
        x: startX,
        y: startY,
        speedX: 0,
        speedY: 0,
        radius: 8 * GameConfig.specialBullet.sizeMultiplier,
        color: GameConfig.specialBullet.color,
        isSpecial: true,
        targetPos: targetPos, // 存储目标位置
        arrived: false,
        spawnSide: spawnSide // 记录生成边用于调试
    };

    // 计算移动角度
    const angle = Math.atan2(
        targetPos.y - startY,
        targetPos.x - startX
    );
    
    bullet.speedX = Math.cos(angle) * speed;
    bullet.speedY = Math.sin(angle) * speed;

    gameState.bullets.push(bullet);
}

// 生成折射炮弹函数
function spawnRefractionBullet() {
    const side = Math.floor(Math.random() * 4);
    let x, y, angle;

    switch (side) {
        case 0: // 上方
            x = Math.random() * canvas.width;
            y = 10; // 调整初始位置到屏幕内
            angle = Math.atan2(gameState.player.y - y, gameState.player.x - x);
            break;
        case 1: // 下方
            x = Math.random() * canvas.width;
            y = canvas.height - 10; // 调整初始位置到屏幕内
            angle = Math.atan2(gameState.player.y - y, gameState.player.x - x);
            break;
        case 2: // 左侧
            x = 10; // 调整初始位置到屏幕内
            y = Math.random() * canvas.height;
            angle = Math.atan2(gameState.player.y - y, gameState.player.x - x);
            break;
        case 3: // 右侧
            x = canvas.width - 10; // 调整初始位置到屏幕内
            y = Math.random() * canvas.height;
            angle = Math.atan2(gameState.player.y - y, gameState.player.x - x);
            break;
    }

    gameState.bullets.push({
        x: x,
        y: y,
        speedX: Math.cos(angle) * GameConfig.refractionBullet.speed,
        speedY: Math.sin(angle) * GameConfig.refractionBullet.speed,
        radius: GameConfig.refractionBullet.radius,
        color: GameConfig.refractionBullet.color,
        isRefraction: true,
        refractions: 0 // 当前折射次数
    });
}

// 游戏主循环
function update(timestamp) {
    if (!gameState.isPlaying) return;

    // 生成特殊炮弹
    if (timestamp - gameState.lastSpecialSpawnTime > GameConfig.specialBullet.spawnInterval) {
        spawnSpecialBullet(GameConfig.levels[gameState.level].bulletSpeed);
        gameState.lastSpecialSpawnTime = timestamp;
    }

    // 生成折射炮弹
    if (timestamp - gameState.lastRefractionSpawnTime > GameConfig.refractionBullet.spawnInterval) {
        spawnRefractionBullet();
        gameState.lastRefractionSpawnTime = timestamp;
    }

    const deltaTime = timestamp - gameState.lastUpdateTime;
    gameState.lastUpdateTime = timestamp;

    updateTimer(deltaTime);

    ctx.fillStyle = '#34495e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 玩家移动控制
    if (gameState.keys['w']) gameState.player.y -= GameConfig.player.speed;
    if (gameState.keys['s']) gameState.player.y += GameConfig.player.speed;
    if (gameState.keys['a']) gameState.player.x -= GameConfig.player.speed;
    if (gameState.keys['d']) gameState.player.x += GameConfig.player.speed;

    // 玩家边界约束
    gameState.player.x = Math.max(GameConfig.player.size, Math.min(canvas.width - GameConfig.player.size, gameState.player.x));
    gameState.player.y = Math.max(GameConfig.player.size, Math.min(canvas.height - GameConfig.player.size, gameState.player.y));

    // 普通炮弹生成
    if (gameState.isPlaying) {
        const currentLevel = GameConfig.levels[gameState.level];
        if (timestamp - gameState.lastSpawnTime > currentLevel.spawnRate) {
            for (let i = 0; i < currentLevel.bulletCount; i++) {
                spawnBullet(currentLevel.bulletSpeed);
            }
            gameState.lastSpawnTime = timestamp;
        }
    }

    // 炮弹处理主循环
    let collisionDetected = false; // 碰撞检测标志
    gameState.bullets.forEach((bullet, index) => {
        // === 移动逻辑 ===
        if (bullet.isSpecial && bullet.targetPos) {
            // 特殊炮弹移动
            if (!bullet.arrived) {
                bullet.x += bullet.speedX;
                bullet.y += bullet.speedY;
                
                // 到达检测
                const dx = bullet.targetPos.x - bullet.x;
                const dy = bullet.targetPos.y - bullet.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
        
                if (distance < 10) {
                    bullet.arrived = true;
                    createExplosion(bullet.x, bullet.y, GameConfig.levels[gameState.level].bulletSpeed);
                    gameState.bullets.splice(index, 1);
                }
            }
        } else if (bullet.isRefraction) {
            // 折射炮弹移动
            bullet.x += bullet.speedX;
            bullet.y += bullet.speedY;

            // 边界检测并折射
            if (bullet.x <= bullet.radius || bullet.x >= canvas.width - bullet.radius) {
                bullet.speedX *= -1;
                bullet.refractions++;
            }
            if (bullet.y <= bullet.radius || bullet.y >= canvas.height - bullet.radius) {
                bullet.speedY *= -1;
                bullet.refractions++;
            }

            // 检查折射次数
            if (bullet.refractions > GameConfig.refractionBullet.maxRefractions) {
                gameState.bullets.splice(index, 1);
                return;
            }
        } else {
            // 普通炮弹/爆炸子炮弹移动
            bullet.x += bullet.speedX;
            bullet.y += bullet.speedY;
        }

        // === 边界判断 ===
        let shouldRemove = false;
        if (bullet.isSpecial) {
            // 特殊炮弹使用宽松边界（100px缓冲）
            const buffer = 100;
            shouldRemove = (
                bullet.x < -buffer || 
                bullet.x > canvas.width + buffer ||
                bullet.y < -buffer || 
                bullet.y > canvas.height + buffer
            );
        } else {
            // 普通炮弹使用严格边界
            shouldRemove = (
                bullet.x < -bullet.radius || 
                bullet.x > canvas.width + bullet.radius ||
                bullet.y < -bullet.radius || 
                bullet.y > canvas.height + bullet.radius
            );
        }
        if (shouldRemove) {
            gameState.bullets.splice(index, 1);
            return; // 提前退出当前炮弹处理
        }

        // === 碰撞检测 ===
        if (!gameState.activeEffects.invisibility && !collisionDetected) {
            const dx = gameState.player.x - bullet.x;
            const dy = gameState.player.y - bullet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const collisionDistance = GameConfig.player.size + bullet.radius;

            if (distance < collisionDistance) {
                collisionDetected = true; // 标记碰撞
                gameOver(); // 触发游戏结束
            }
        }
    });

    // 如果发生碰撞，立即停止后续处理
    if (collisionDetected) return;

    // === 绘制玩家 ===
    ctx.beginPath();
    ctx.arc(
        gameState.player.x, 
        gameState.player.y, 
        GameConfig.player.size, 
        0, 
        Math.PI * 2
    );
    ctx.fillStyle = gameState.activeEffects.invisibility ? 
        'rgba(46, 204, 113, 0.5)' : 
        GameConfig.player.color;
    ctx.fill();

    // === 绘制炮弹 ===
    gameState.bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fillStyle = bullet.color || GameConfig.bullet.color;
        ctx.fill();
    });

    // 继续游戏循环
    gameState.gameLoop = requestAnimationFrame(update);
}

// 爆炸效果函数
function createExplosion(x, y, baseSpeed) {
    // 计算当前关卡的分裂炮弹数
    const splitCount = GameConfig.specialBullet.baseSplitCount + 
                       GameConfig.specialBullet.splitIncrementPerLevel * gameState.level;
    
    // 确保分裂炮弹数不超过最大值（例如 16）
    const maxSplitCount = 16;
    const finalSplitCount = Math.min(splitCount, maxSplitCount);
    
    // 计算角度间隔
    const angleIncrement = 360 / splitCount;
    
    // 生成分裂炮弹
    for (let i = 0; i < splitCount; i++) {
        const angle = i * angleIncrement;
        const rad = angle * (Math.PI / 180);
        gameState.bullets.push({
            x: x,
            y: y,
            speedX: Math.cos(rad) * baseSpeed,
            speedY: Math.sin(rad) * baseSpeed,
            radius: 6,
            color: GameConfig.specialBullet.explosionColor
        });
    }
    
    // 添加爆炸效果
    addExplosionEffect(x, y);
}

function addExplosionEffect(x, y) {
    const effect = document.createElement('div');
    effect.className = 'explosion-effect';
    effect.style.left = `${x - 20}px`;
    effect.style.top = `${y - 20}px`;
    document.getElementById('gameContainer').appendChild(effect);
    setTimeout(() => effect.remove(), 500);
}

// 生成普通炮弹函数
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
// 显示当前关卡的分裂炮弹数
const splitCount = GameConfig.specialBullet.baseSplitCount + 
GameConfig.specialBullet.splitIncrementPerLevel * gameState.level;
console.log(`第 ${gameState.level + 1} 关，特殊炮弹分裂数: ${splitCount}`);
    // 清除所有道具效果
    gameState.activeEffects.invisibility = false;
    gameState.activeEffects.agility = false;
    GameConfig.player.size = 15; // 恢复默认大小
    GameConfig.player.speed = 5; // 恢复默认速度

    // 重置游戏状态
    resetGameState();
    showGameStatus(`第 ${gameState.level + 1} 关 准备！`, 2000);
    updateHUD();
}

// 重置游戏状态函数
function resetGameState() {
    const currentLevel = GameConfig.levels[gameState.level];
    gameState.player = { x: canvas.width / 2, y: canvas.height / 2 }; // 重置玩家位置
    gameState.bullets = []; // 清空炮弹
    gameState.keys = {}; // 清空按键状态
    gameState.remainingTime = currentLevel.duration; // 重置倒计时
    gameState.lastUpdateTime = performance.now(); // 重置时间戳
    gameState.lastSpawnTime = 0; // 重置炮弹生成时间
    gameState.isPlaying = true; // 恢复游戏状态
    gameState.lastSpawnTime = performance.now(); // 修复初始生成延迟
    gameState.lastSpecialSpawnTime = performance.now();
    gameState.lastRefractionSpawnTime = performance.now();
    gameState.usedPowerups = { // 重置道具使用状态
        invisibility: false,
        clearScreen: false,
        agility: false
    };
    gameState.activeEffects = { // 重置激活效果
        invisibility: false,
        agility: false
    };
// 新增：清除原始属性缓存
if (gameState.originalPlayerProps) {
    delete gameState.originalPlayerProps;
}
    // 恢复玩家默认属性
    GameConfig.player.size = 15; // 恢复默认大小
    GameConfig.player.speed = 5; // 恢复默认速度

    // 启用所有道具按钮
    invisibilityButton.disabled = false;
    clearScreenButton.disabled = false;
    agilityButton.disabled = false;

    // 停止所有游戏循环
    if (gameState.gameLoop) {
        cancelAnimationFrame(gameState.gameLoop);
    }
    gameState.gameLoop = null;

    // 确保点击事件被解绑
    canvas.onclick = null;
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

    // 清除所有道具效果
    gameState.activeEffects.invisibility = false;
    gameState.activeEffects.agility = false;
    GameConfig.player.size = 15; // 恢复默认大小
    GameConfig.player.speed = 5; // 恢复默认速度

    // 显示游戏结束提示
    const statusEl = document.getElementById('gameStatus');
    statusEl.style.display = 'block';
    statusEl.textContent = '游戏结束！空格键继续/点击重试';

    // 移除之前的点击事件
    canvas.onclick = null;

    // 绑定新的点击事件
    canvas.style.cursor = 'pointer';
    canvas.onclick = () => {
        statusEl.style.display = 'none';
        canvas.style.cursor = 'default';
        canvas.onclick = null; // 解绑点击事件
        resetGameState(); // 重置游戏状态
        requestAnimationFrame(update); // 重新开始游戏
    };
}
// 在现有的事件监听器后添加以下代码
document.addEventListener('keydown', (e) => {
    // 空格键重新开始/继续
    if (e.key === ' ' && !gameState.isPlaying) {
        const statusEl = document.getElementById('gameStatus');
        if (statusEl.textContent.includes('游戏结束') || statusEl.textContent.includes('通关')) {
            statusEl.style.display = 'none';
            resetGameState();
            requestAnimationFrame(update);
        }
    }

    // 数字键激活道具
    if (gameState.isPlaying) {
        switch (e.key) {
            case '1':
                usePowerup('invisibility');
                break;
            case '2':
                usePowerup('clearScreen');
                break;
            case '3':
                usePowerup('agility');
                break;
        }
    }
});
// 初始化摇杆
const joystickContainer = document.getElementById('joystickContainer');
const joystick = document.getElementById('joystick');
let joystickActive = false;
let joystickStartX, joystickStartY;

joystickContainer.addEventListener('touchstart', (e) => {
    joystickActive = true;
    const touch = e.touches[0];
    joystickStartX = touch.clientX;
    joystickStartY = touch.clientY;
});

joystickContainer.addEventListener('touchmove', (e) => {
    if (!joystickActive) return;
    const touch = e.touches[0];
    const dx = touch.clientX - joystickStartX;
    const dy = touch.clientY - joystickStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = joystickContainer.clientWidth / 2;

    if (distance < maxDistance) {
        joystick.style.transform = `translate(${dx}px, ${dy}px)`;
    } else {
        const angle = Math.atan2(dy, dx);
        joystick.style.transform = `translate(${Math.cos(angle) * maxDistance}px, ${Math.sin(angle) * maxDistance}px)`;
    }

    // 更新玩家位置
    gameState.player.x += (dx / maxDistance) * GameConfig.player.speed;
    gameState.player.y += (dy / maxDistance) * GameConfig.player.speed;

    // 玩家边界约束
    gameState.player.x = Math.max(GameConfig.player.size, Math.min(canvas.width - GameConfig.player.size, gameState.player.x));
    gameState.player.y = Math.max(GameConfig.player.size, Math.min(canvas.height - GameConfig.player.size, gameState.player.y));
});

joystickContainer.addEventListener('touchend', () => {
    joystickActive = false;
    joystick.style.transform = 'translate(-50%, -50%)';
});

// 启动游戏
function startGame() {
    gameState.level = 0;
    resetGameState();
    updateHUD();
    requestAnimationFrame(update);

    // 确保游戏进行中不会触发点击事件
    canvas.onclick = null;

    // 适配屏幕尺寸
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}

// 初始化游戏
startGame();