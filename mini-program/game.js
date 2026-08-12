import './js/libs/weapp-adapter'
import './js/libs/symbol'

// 游戏主画布
const canvas = wx.createCanvas()
const ctx = canvas.getContext('2d')
const width = canvas.width
const height = canvas.height

// 定义tile大小作为全局变量
const tileSize = width / 5
const padding = width / 25

// 添加音频相关变量
const moveSound = wx.createInnerAudioContext();
const mergeSound = wx.createInnerAudioContext();

const birdSound = wx.createInnerAudioContext()
birdSound.loop = false; // 改为false，避免持续循环播放
birdSound.src = './audio/bird.mp3';// 确保路径正确
let isSoundLoaded = false;
let soundEnabled = true; // 音效开关，默认开启
birdSound.volume = 0.2;

// 添加变量标记音频初始化状态
let audioInitialized = false;

console.log('birdSound', birdSound)
birdSound.onCanplay(() => {
    console.log('birdSound onCanplay')
})
birdSound.play()
// 添加小动物相关变量

const animalImage = wx.createImage();
let animalLoaded = false;
let animalArea = null;
let showAnimalText = false;
let currentTextIndex = 0;

// 添加花朵图片相关变量
const flowerImage = wx.createImage();
let flowerLoaded = false;
let flowerArea = null;

const animalTexts = [
    "你好！我是你的小助手iTab小蓝鸟！",
    "用过iTab插件肯定看我眼熟吧！",
    "你在iTab插件里玩过2048游戏吗？",
    "2048游戏的诀窍是保持大数在角落哦！",
    "尝试始终向一个方向滑动，可以构建数字序列！",
    "合并相同数字时记得看准方向，避免被堵住！",
    "积少成多，从小数字开始慢慢合并！",
    "遇到困难不要着急，有时候需要战略性地让出一些空间！",
    "当你看到两个相同的大数字时，一定要想办法合并它们！",
    "游戏需要耐心和策略，不断尝试才能获得高分！",
    "休息一下再来挑战也是不错的选择~",
    "我是iTab插件的形象大使,你发现了没?",
    "iTab插件是一款非常强大的浏览器插件呢",
    "我是一只能为你带来快乐的小鸟~",
    "我还不会动，因为我正在学做动画呢~"
];

// 森林主题配色方案
const THEME_FOREST = {
    background: '#F7F6F2',  // 浅米色背景
    boardBackground: '#E8E4D8', // 棋盘背景色
    gridLine: 'rgba(209, 206, 197, 0.2)',  // 网格线颜色
    emptyCell: 'rgba(255, 255, 255, 0.3)', // 空方格颜色
    text: {
        dark: '#2B4162',  // 深蓝文字
        light: '#FFFFFF'  // 白色文字
    },
    tiles: {
        '0': { background: 'rgba(255,255,255,0.3)', text: '#2B4162' }, // 空格子
        '2': { background: '#FFE5D9', text: '#6D4C41' },
        '4': { background: '#FFD1B9', text: '#704E3D' },
        '8': { background: '#F8E5B2', text: '#5E503F' },
        '16': { background: '#C7E6D9', text: '#2D5D4F' },
        '32': { background: '#A3D6C7', text: '#FFFFFF' },
        '64': { background: '#79C7C3', text: '#FFFFFF' },
        '128': { background: '#4AA08C', text: '#FFFFFF' },
        '256': { background: '#2D8874', text: '#FFFFFF' },
        '512': { background: '#D9C8AE', text: '#5E503F' },
        '1024': { background: '#FFBF9B', text: '#704E3D' },
        '2048': { background: '#FFA8A8', text: '#6D4C41' }
    },
    score: {
        background: '#D5E3F0',  // 分数面板背景
        text: '#2B4162',        // 分数文字颜色
        shadow: 'rgba(43,65,98,0.1)' // 分数面板阴影
    },
    gameWon: {
        background: '#C7E6D9',  // 胜利面板背景
        button: '#4AA08C'       // 胜利按钮颜色
    },
    gameOver: {
        background: '#FFE5D9',  // 游戏结束面板背景
        button: '#FFBF9B'       // 游戏结束按钮颜色
    }
};

// 游戏数据
let board = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
]
let score = 0; // 添加分数变量
let gameOver = false; // 游戏是否结束
let gameWon = false; // 是否获胜
let gameWonDismissed = false; // 是否已关闭获胜提示

// 新增变量跟踪最后一次移动方向
let lastMoveDirection = 'none'; // 可能的值: 'left', 'right', 'up', 'down', 'none'

// 复活相关变量
let reviveMode = false; // 是否在复活模式中
let canRevive = 3; // 玩家可以复活三次

// 更新为森林主题颜色映射
const colors = {
    0: THEME_FOREST.emptyCell,  // 空格子颜色
    2: THEME_FOREST.tiles['2'].background,
    4: THEME_FOREST.tiles['4'].background,
    8: THEME_FOREST.tiles['8'].background,
    16: THEME_FOREST.tiles['16'].background,
    32: THEME_FOREST.tiles['32'].background,
    64: THEME_FOREST.tiles['64'].background,
    128: THEME_FOREST.tiles['128'].background,
    256: THEME_FOREST.tiles['256'].background,
    512: THEME_FOREST.tiles['512'].background,
    1024: THEME_FOREST.tiles['1024'].background,
    2048: THEME_FOREST.tiles['2048'].background
}

// 文字颜色映射
const textColors = {
    2: THEME_FOREST.tiles['2'].text,
    4: THEME_FOREST.tiles['4'].text,
    8: THEME_FOREST.tiles['8'].text,
    16: THEME_FOREST.tiles['16'].text,
    32: THEME_FOREST.tiles['32'].text,
    64: THEME_FOREST.tiles['64'].text,
    128: THEME_FOREST.tiles['128'].text,
    256: THEME_FOREST.tiles['256'].text,
    512: THEME_FOREST.tiles['512'].text,
    1024: THEME_FOREST.tiles['1024'].text,
    2048: THEME_FOREST.tiles['2048'].text
}

// 添加用于动画的变量
let animations = []; // 存储动画信息
let animating = false; // 是否正在动画中

// 添加变量跟踪当前弹窗中的按钮位置
let currentRestartBtn = null

// 在触摸事件中记录当前滑动状态
let currentSwipe = { direction: 'none', progress: 0 }

// 新增变量记录新添加的方块位置
let lastAddedPosition = null
// 用于新方块生成动画的数据
let newTileAnimation = null
// 用于合并动画的粒子效果
let mergeParticles = []
// 用于合并动画的冲击波效果
let mergeWaves = []
// 用于方块移动的拖尾效果
let movementTrails = []
// 音效按钮区域
let soundButtonArea = null

// 丰富的缓动函数库
const easings = {
    easeOutCubic: function (t) {
        return 1 - Math.pow(1 - t, 3);
    },
    easeInOutQuad: function (t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    },
    easeOutElastic: function (t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    easeOutBounce: function (t) {
        const n1 = 7.5625;
        const d1 = 2.75;

        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    },
    easeOutQuint: function (t) {
        return 1 - Math.pow(1 - t, 5);
    }
}

// 在全局变量区域添加animationId变量声明
let animationId = null; // 用于存储当前动画帧的ID

// 在全局变量区域添加帧率相关变量
let lastFrameTime = 0; // 上一帧的时间戳
let frameCount = 0; // 帧数计数
let fpsUpdateTime = 0; // 最后一次FPS更新时间
let currentFPS = 0; // 当前帧率

// 添加lastRenderTime变量声明
let lastRenderTime = 0; // 用于限制渲染频率

// 添加startX和startY变量声明
let startX = 0; // 用于记录触摸起始位置的X坐标
let startY = 0; // 用于记录触摸起始位置的Y坐标

// 添加hasMoved变量声明
let hasMoved = false; // 用于跟踪是否发生了滑动

// 添加粒子效果
function createMergeParticles(x, y, value) {
    const particles = [];
    const particleCount = 8; // 减少粒子数量，提高性能
    const color = colors[value];
    const now = Date.now(); // 获取当前时间戳

    for (let i = 0; i < particleCount; i++) {
        // 计算随机方向
        const angle = Math.random() * Math.PI * 2;
        const speed = 30 + Math.random() * 70; // 降低速度，更流畅的感觉

        // 粒子属性 - 优化性能的参数
        particles.push({
            x: x + tileSize / 2,
            y: y + tileSize / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 1.5 + Math.random() * 2, // 更小的粒子尺寸，减少渲染负担
            color: color,
            alpha: 0.8, // 初始透明度更高
            life: 0.2 + Math.random() * 0.2, // 更短的生命周期，减少粒子持续时间
            maxLife: 0.2 + Math.random() * 0.2,
            lastUpdate: now // 添加时间戳用于基于帧率的移动
        });
    }

    return particles;
}

// 创建冲击波效果
function createMergeWave(x, y, value) {
    return {
        x: x + tileSize / 2,
        y: y + tileSize / 2,
        radius: 0,
        maxRadius: tileSize * 0.5, // 减小冲击波半径，减轻渲染负担
        color: colors[value],
        alpha: 0.5, // 降低透明度，减少视觉干扰
        life: 0.25, // 更短的生命周期
        maxLife: 0.25,
        lastUpdate: Date.now() // 添加时间戳用于基于帧率的扩散
    };
}

// 创建移动拖尾效果 - 优化性能的版本
function createMovementTrail(startX, startY, endX, endY, value) {
    const now = Date.now(); // 获取当前时间戳

    // 只有长距离移动才创建拖尾，节省性能
    const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));

    // 如果距离太小，返回一个不会显示的拖尾
    if (distance < tileSize * 1.5) {
        return {
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            value: value,
            alpha: 0, // 透明度为0
            life: 0,
            maxLife: 0.1,
            lastUpdate: now
        };
    }

    // 创建一个拖尾效果，跟踪方块移动路径
    return {
        startX: startX,
        startY: startY,
        endX: endX,
        endY: endY,
        value: value,
        alpha: 0.25, // 降低拖尾透明度，减少视觉干扰
        life: 0.25, // 拖尾生命周期（秒）
        maxLife: 0.25,
        lastUpdate: now // 添加时间戳用于基于帧率的衰减
    };
}

// 添加全局变量
let highScore = 0

// 更新分数时检查是否为最高分
function updateScore(value) {
    score += value
    if (score > highScore) {
        highScore = score
        // 使用同步版本的API
        try {
            wx.setStorageSync("highScore", highScore)
        } catch (e) {
            console.error("保存最高分失败", e)
        }
    }
}

// 游戏初始化时加载最高分
function init() {
    // 清空棋盘
    board = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ]
    score = 0; // 重置分数
    gameOver = false; // 重置游戏状态
    gameWon = false;
    canRevive = 3; // 重置复活机会

    // 初始化音效
    initSounds();

    // 加载小动物图片
    loadAnimalImage();

    // 加载花朵图片
    loadFlowerImage();

    // 添加两个初始数字
    addRandomNumber()
    addRandomNumber()

    // 渲染棋盘
    render()

    // 加载最高分 - 使用同步方式而不是异步
    try {
        const savedHighScore = wx.getStorageSync("highScore")
        if (savedHighScore) {
            highScore = savedHighScore
        }
    } catch (e) {
        console.error("读取最高分失败", e)
    }
}

// 加载小动物图片函数
function loadAnimalImage() {
    animalImage.src = 'images/animal.png'; // 确保图片路径正确
    animalImage.onload = function () {
        animalLoaded = true;
        // 图片加载完成后重新渲染
        render(false);
    };
    animalImage.onerror = function (e) {
        console.error("小动物图片加载失败:", e);
    };
}

// 添加加载花朵图片函数
function loadFlowerImage() {
    flowerImage.src = 'images/flower.png'; // 确保图片路径正确
    flowerImage.onload = function () {
        flowerLoaded = true;
        // 图片加载完成后重新渲染
        render(false);
    };
    flowerImage.onerror = function (e) {
        console.error("花朵图片加载失败:", e);
    };
}

// 添加随机数字
function addRandomNumber() {
    // 获取所有空位置
    let emptyPositions = []
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (board[i][j] === 0) {
                emptyPositions.push({ row: i, col: j })
            }
        }
    }

    if (emptyPositions.length > 0) {
        // 随机选择一个空位置
        const position = emptyPositions[Math.floor(Math.random() * emptyPositions.length)]
        // 60%概率生成2，30%概率生成4，10%概率生成8
        board[position.row][position.col] = Math.random() < 0.6 ? 2 : (Math.random() < 0.5 ? 4 : 8);

        // 记录新添加的位置用于动画
        lastAddedPosition = { row: position.row, col: position.col, time: Date.now() }

        // 设置新方块的生成动画
        newTileAnimation = {
            row: position.row,
            col: position.col,
            value: board[position.row][position.col],
            scale: 0,
            alpha: 0.5,
            startTime: Date.now(),
            duration: 200, // 200ms动画
            shakeAmount: 3, // 震动幅度
            shakePhase: 0,
            complete: false
        }
    }
}

// 渲染游戏
function render(withAnimation = false, swipe = null, duration = 250) {
    if (animating) return

    // 清空画布
    ctx.fillStyle = THEME_FOREST.background
    ctx.fillRect(0, 0, width, height)

    // 计算比例因素
    const scaleFactor = Math.min(width / 440, height / 700);

    // 基于缩放因子调整尺寸
    const headerWidth = 440 * scaleFactor;
    const cellSize = 80 * scaleFactor;
    const gapSize = 15 * scaleFactor;

    // 标题和分数面板区域的位置
    const headerX = (width - headerWidth) / 2;
    const headerY = height * 0.1;

    // 游戏板位置
    const boardSize = cellSize * 4 + gapSize * 5;
    const boardX = (width - boardSize) / 2;
    const boardY = headerY + 100 * scaleFactor;

    // 在绘制完游戏板和其他UI前，先绘制小动物和花朵（确保它们在弹窗下方）
    if (!reviveMode && animalLoaded) { // 在复活模式下不绘制小鸟和文本框
        const animalSize = Math.floor(300 * scaleFactor); // 使用整数尺寸减少锯齿
        const animalX = Math.floor(width - animalSize + 10 * scaleFactor);
        const animalY = Math.floor(height - animalSize + 15 * scaleFactor);

        ctx.save();
        // 确保开启图像平滑，减少锯齿
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 10 * scaleFactor;
        ctx.shadowOffsetX = 3 * scaleFactor;
        ctx.shadowOffsetY = 3 * scaleFactor;

        // 使用整数坐标和尺寸进行绘制
        ctx.drawImage(animalImage, animalX, animalY, animalSize, animalSize);
        ctx.restore();

        animalArea = {
            x: animalX,
            y: animalY,
            width: animalSize,
            height: animalSize
        };

        if (showAnimalText && !gameOver) {
            renderAnimalTextBox();
        }
    }

    // 绘制花朵图片在左下角
    if (!reviveMode && flowerLoaded) {
        const flowerSize = Math.floor(190 * scaleFactor); // 使用整数尺寸减少锯齿
        const flowerX = Math.floor(10 * scaleFactor);
        const flowerY = Math.floor(height - flowerSize + 30 * scaleFactor);

        ctx.save();
        // 确保开启图像平滑，减少锯齿
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 10 * scaleFactor;
        ctx.shadowOffsetX = 3 * scaleFactor;
        ctx.shadowOffsetY = 3 * scaleFactor;

        // 使用整数坐标和尺寸进行绘制
        ctx.drawImage(flowerImage, flowerX, flowerY, flowerSize, flowerSize);
        ctx.restore();

        flowerArea = {
            x: flowerX,
            y: flowerY,
            width: flowerSize,
            height: flowerSize
        };
    }

    // 绘制游戏标题
    ctx.fillStyle = THEME_FOREST.text.dark
    ctx.font = `bold ${40 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
    ctx.textAlign = "left"
    ctx.textBaseline = "top"
    ctx.fillText("合合小鸟", headerX + 10 * scaleFactor, headerY + 20 * scaleFactor)

    // 绘制分数面板
    const scoreCardWidth = 110 * scaleFactor;
    const scoreCardHeight = 85 * scaleFactor;
    const scoreGap = 15 * scaleFactor;

    const currentScoreX = headerX + headerWidth - scoreCardWidth * 2 - scoreGap - 15 * scaleFactor;
    const highScoreX = currentScoreX + scoreCardWidth + scoreGap;
    const scoreY = headerY;

    drawScoreCard(currentScoreX, scoreY, scoreCardWidth, scoreCardHeight, "分数", score);
    drawScoreCard(highScoreX, scoreY, scoreCardWidth, scoreCardHeight, "最高分", highScore);

    // 绘制游戏棋盘
    ctx.fillStyle = THEME_FOREST.boardBackground
    roundRect(ctx, boardX, boardY, boardSize, boardSize, 12 * scaleFactor, true)

    // 添加网格线效果
    drawGridLines(boardX, boardY, boardSize, gapSize, cellSize);

    // 确定是否需要滑动预览
    const needSwipePreview = swipe && swipe.progress > 0.15;

    if (needSwipePreview) {
        renderSwipeFeedback(boardX, boardY, cellSize, gapSize, swipe);
    } else {
        // 绘制底层的空格子
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const x = boardX + gapSize + j * (cellSize + gapSize);
                const y = boardY + gapSize + i * (cellSize + gapSize);

                ctx.fillStyle = THEME_FOREST.emptyCell;
                roundRect(ctx, x, y, cellSize, cellSize, 6, true);
            }
        }

        // 绘制所有非零格子和数字
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const x = boardX + gapSize + j * (cellSize + gapSize);
                const y = boardY + gapSize + i * (cellSize + gapSize);

                if (board[i][j] !== 0) {
                    ctx.fillStyle = colors[board[i][j]];
                    roundRect(ctx, x, y, cellSize, cellSize, 6, true);

                    const fontSize = board[i][j] < 100 ? cellSize / 2 : board[i][j] < 1000 ? cellSize / 2.5 : cellSize / 3;
                    ctx.fillStyle = textColors[board[i][j]];
                    ctx.font = `bold ${fontSize}px 'Helvetica Neue', Arial, sans-serif`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(board[i][j], x + cellSize / 2, y + cellSize / 2);
                }
            }
        }
    }

    // 绘制音效按钮
    const soundBtnSize = 40 * scaleFactor;
    const soundBtnX = Math.floor(width - soundBtnSize - 15 * scaleFactor);
    const soundBtnY = Math.floor(boardY + boardSize + 20 * scaleFactor);

    ctx.globalAlpha = 1.0;
    ctx.fillStyle = soundEnabled ? THEME_FOREST.tiles['16'].background : THEME_FOREST.emptyCell;
    roundRect(ctx, soundBtnX, soundBtnY, soundBtnSize, soundBtnSize, 5, true);

    ctx.fillStyle = soundEnabled ? THEME_FOREST.tiles['16'].text : THEME_FOREST.text.dark;
    ctx.font = `bold ${soundBtnSize * 0.5}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(soundEnabled ? "🔊" : "🔇", soundBtnX + soundBtnSize / 2, soundBtnY + soundBtnSize / 2);

    soundButtonArea = {
        x: soundBtnX,
        y: soundBtnY,
        width: soundBtnSize,
        height: soundBtnSize
    }

    // 在复活模式下显示指导提示
    if (reviveMode) {
        renderReviveInstructions();
    }

    // 检查游戏状态并绘制相应内容
    if (gameOver) {
        currentRestartBtn = renderGameOverModal();
    } else if (gameWon) {
        // 可以添加获胜界面的绘制
    }

    return { soundBtn: soundButtonArea, animalBtn: gameOver ? null : animalArea };
}

// 绘制网格线
function drawGridLines(boardX, boardY, boardSize, gapSize, cellSize) {
    ctx.strokeStyle = THEME_FOREST.gridLine;
    ctx.lineWidth = 1;

    // 绘制垂直线
    for (let i = 1; i < 4; i++) {
        const x = boardX + gapSize + i * (cellSize + gapSize) - gapSize / 2;
        ctx.beginPath();
        ctx.moveTo(x, boardY + gapSize);
        ctx.lineTo(x, boardY + boardSize - gapSize);
        ctx.stroke();
    }

    // 绘制水平线
    for (let i = 1; i < 4; i++) {
        const y = boardY + gapSize + i * (cellSize + gapSize) - gapSize / 2;
        ctx.beginPath();
        ctx.moveTo(boardX + gapSize, y);
        ctx.lineTo(boardX + boardSize - gapSize, y);
        ctx.stroke();
    }
}

// 绘制分数卡片
function drawScoreCard(x, y, width, height, label, value) {
    // 设置阴影
    ctx.shadowColor = THEME_FOREST.score.shadow;
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    // 绘制卡片背景
    ctx.fillStyle = THEME_FOREST.score.background;
    roundRect(ctx, x, y, width, height, 8, true);

    // 重置阴影
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 绘制标签
    ctx.fillStyle = THEME_FOREST.score.text;
    ctx.font = `${width * 0.14}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(label, x + width / 2, y + height * 0.15);

    // 绘制数值 - 调整垂直位置，避免与标签重叠
    ctx.font = `bold ${width * 0.26}px 'Helvetica Neue', Arial, sans-serif`; // 缩小字体
    ctx.textBaseline = "middle";
    ctx.fillText(value.toLocaleString(), x + width / 2, y + height * 0.65);
}

// 绘制单个方块
function drawTile(x, y, size, value) {
    // 空方格绘制为半透明白色背景
    if (value === 0) {
        ctx.fillStyle = THEME_FOREST.emptyCell;
        roundRect(ctx, x, y, size, size, 6, true);
        return;
    }

    // 绘制方块背景
    ctx.fillStyle = colors[value];
    roundRect(ctx, x, y, size, size, 6, true);

    // 计算字体大小 - 根据数字位数调整
    const fontSize = value < 100 ? size / 2 : value < 1000 ? size / 2.5 : size / 3;

    // 绘制数字
    ctx.fillStyle = textColors[value];
    ctx.font = `bold ${fontSize}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(value, x + size / 2, y + size / 2);
}

// 优化圆角矩形函数，添加阴影效果
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.save()

    //移除阴影设置
    // ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
    // ctx.shadowBlur = 10
    // ctx.shadowOffsetX = 0
    // ctx.shadowOffsetY = 5

    // 绘制圆角矩形
    if (typeof stroke === 'undefined') {
        stroke = false
    }
    if (typeof radius === 'undefined') {
        radius = 5
    }
    if (typeof radius === 'number') {
        radius = { tl: radius, tr: radius, br: radius, bl: radius }
    } else {
        const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 }
        for (let side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side]
        }
    }
    ctx.beginPath()
    ctx.moveTo(x + radius.tl, y)
    ctx.lineTo(x + width - radius.tr, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr)
    ctx.lineTo(x + width, y + height - radius.br)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height)
    ctx.lineTo(x + radius.bl, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl)
    ctx.lineTo(x, y + radius.tl)
    ctx.quadraticCurveTo(x, y, x + radius.tl, y)
    ctx.closePath()
    if (fill) {
        ctx.fill()
    }
    if (stroke) {
        ctx.stroke()
    }

    ctx.restore()
}

// 优化游戏失败弹窗渲染
function renderGameOverModal() {
    // 绘制半透明黑色背景
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
    ctx.fillRect(0, 0, width, height)

    // 绘制弹窗面板
    const modalWidth = width * 0.8
    const modalHeight = height * 0.5 // 增加高度以容纳复活按钮
    const modalX = (width - modalWidth) / 2
    const modalY = (height - modalHeight) / 2

    // 弹窗面板底色
    ctx.fillStyle = THEME_FOREST.background  // 珍珠白背景
    roundRect(ctx, modalX, modalY, modalWidth, modalHeight, 10, true)

    // 绘制标题
    ctx.fillStyle = THEME_FOREST.text.dark  // 深色文字
    ctx.font = "bold 28px Arial"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("游戏结束", width / 2, modalY + modalHeight * 0.2)

    // 显示最终分数
    ctx.font = "20px Arial"
    ctx.fillText(`最终分数: ${score}`, width / 2, modalY + modalHeight * 0.35)

    // 绘制"再来一次"按钮
    const btnWidth = modalWidth * 0.6
    const btnHeight = 50
    const btnX = (width - btnWidth) / 2
    const btnY = modalY + modalHeight * 0.55

    ctx.fillStyle = THEME_FOREST.tiles['64'].background  // 使用深薄荷绿
    roundRect(ctx, btnX, btnY, btnWidth, btnHeight, 5, true)

    ctx.fillStyle = THEME_FOREST.text.light  // 浅色文字
    ctx.font = "bold 20px Arial"
    ctx.fillText("再来一次", width / 2, btnY + btnHeight / 2)

    // 按钮位置信息对象
    const buttons = {
        restart: {
            x: btnX,
            y: btnY,
            width: btnWidth,
            height: btnHeight
        }
    }

    // 如果玩家可以复活，绘制复活按钮
    if (canRevive > 0) {
        const reviveBtnY = modalY + modalHeight * 0.75

        ctx.fillStyle = THEME_FOREST.tiles['512'].background  // 使用抹茶绿
        roundRect(ctx, btnX, reviveBtnY, btnWidth, btnHeight, 5, true)

        ctx.fillStyle = THEME_FOREST.text.dark  // 深色文字
        ctx.font = "bold 20px Arial"
        ctx.fillText(`移除一个方块复活 (${canRevive})`, width / 2, reviveBtnY + btnHeight / 2)

        // 添加复活按钮位置信息
        buttons.revive = {
            x: btnX,
            y: reviveBtnY,
            width: btnWidth,
            height: btnHeight
        }
    }

    return buttons;
}

// 重写处理用户触摸操作的代码
wx.onTouchStart(startEvent => {
    if (animating) return

    startX = startEvent.touches[0].clientX
    startY = startEvent.touches[0].clientY
    hasMoved = false

    wx.onTouchMove(moveEvent => {
        if (reviveMode) return

        const now = Date.now()
        const moveX = moveEvent.touches[0].clientX - startX
        const moveY = moveEvent.touches[0].clientY - startY

        if (Math.abs(moveX) > 15 || Math.abs(moveY) > 15) {
            hasMoved = true

            const oldDirection = currentSwipe.direction
            const oldProgress = currentSwipe.progress

            if (Math.abs(moveX) > Math.abs(moveY)) {
                currentSwipe.direction = moveX > 0 ? 'right' : 'left'
                currentSwipe.progress = Math.min(Math.abs(moveX) / 80, 1)
            } else {
                currentSwipe.direction = moveY > 0 ? 'down' : 'up'
                currentSwipe.progress = Math.min(Math.abs(moveY) / 80, 1)
            }

            if (now - lastRenderTime > 60 &&
                (oldDirection !== currentSwipe.direction ||
                    Math.abs(oldProgress - currentSwipe.progress) > 0.15)) {

                lastRenderTime = now
                render(false, currentSwipe)
            }
        }
    })

    wx.onTouchEnd(endEvent => {
        if (animating) return

        const endX = endEvent.changedTouches[0].clientX
        const endY = endEvent.changedTouches[0].clientY

        const diffX = endX - startX
        const diffY = endY - startY

        if (!hasMoved || (Math.abs(diffX) < 5 && Math.abs(diffY) < 5)) {
            const uiElements = render(false)

            // 添加游戏结束弹窗按钮点击判断
            if (gameOver && currentRestartBtn) {
                // 检查是否点击了"再来一次"按钮
                if (currentRestartBtn.restart &&
                    endX >= currentRestartBtn.restart.x &&
                    endX <= currentRestartBtn.restart.x + currentRestartBtn.restart.width &&
                    endY >= currentRestartBtn.restart.y &&
                    endY <= currentRestartBtn.restart.y + currentRestartBtn.restart.height) {

                    // 重置游戏
                    init();
                    return;
                }

                // 检查是否点击了"复活"按钮
                if (canRevive > 0 && currentRestartBtn.revive &&
                    endX >= currentRestartBtn.revive.x &&
                    endX <= currentRestartBtn.revive.x + currentRestartBtn.revive.width &&
                    endY >= currentRestartBtn.revive.y &&
                    endY <= currentRestartBtn.revive.y + currentRestartBtn.revive.height) {

                    // 激活复活模式
                    activateReviveMode();
                    return;
                }
            }

            if (uiElements && uiElements.soundBtn &&
                endX >= uiElements.soundBtn.x &&
                endX <= uiElements.soundBtn.x + uiElements.soundBtn.width &&
                endY >= uiElements.soundBtn.y &&
                endY <= uiElements.soundBtn.y + uiElements.soundBtn.height) {

                toggleSound()
                render(false)
                return
            }

            if (!reviveMode) {
                if (uiElements && uiElements.animalBtn &&
                    endX >= uiElements.animalBtn.x &&
                    endX <= uiElements.animalBtn.x + uiElements.animalBtn.width &&
                    endY >= uiElements.animalBtn.y &&
                    endY <= uiElements.animalBtn.y + uiElements.animalBtn.height) {

                    // 播放小鸟音效 - 简化播放方式
                    if (soundEnabled && audioInitialized) {
                        console.log('播放小鸟音效');
                        // 直接使用playBirdSound函数
                        playBirdSound();
                    }

                    toggleAnimalText()
                    return
                }

                if (showAnimalText) {
                    showAnimalText = false
                    render(false)
                    return
                }
            }
        }

        if (reviveMode) {
            handleReviveTileSelection(endX, endY)
            return
        }

        // 处理滑动操作
        const minSwipeDistance = 5
        if (!hasMoved || (Math.abs(diffX) < minSwipeDistance && Math.abs(diffY) < minSwipeDistance)) {
            return
        }

        let moved = false
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 0) {
                moved = moveRight()
            } else {
                moved = moveLeft()
            }
        } else {
            if (diffY > 0) {
                moved = moveDown()
            } else {
                moved = moveUp()
            }
        }

        if (moved) {
            if (animations.length > 0) {
                render(true)
            } else {
                addRandomNumber()
                checkGameStatus()
                render(false)
            }
        }

        wx.offTouchMove()
        wx.offTouchEnd()
    })
})

// 处理玩家选择要移除的方块
function handleReviveTileSelection(touchX, touchY) {
    // 计算比例因素
    const scaleFactor = Math.min(width / 440, height / 700);

    // 计算棋盘位置
    const headerWidth = 440 * scaleFactor;
    const boardSize = 440 * scaleFactor;
    const gapSize = 15 * scaleFactor;
    const cellSize = (boardSize - gapSize * 5) / 4;

    // 标题和分数面板区域的位置
    const headerY = height * 0.1;

    // 游戏板位置
    const boardX = (width - boardSize) / 2;
    const boardY = headerY + 120 * scaleFactor;

    // 检查触摸位置是否在棋盘内
    if (touchX < boardX || touchX > boardX + boardSize ||
        touchY < boardY || touchY > boardY + boardSize) {
        return; // 不在棋盘内，忽略
    }

    // 计算点击了哪个格子
    const relX = touchX - boardX - gapSize;
    const relY = touchY - boardY - gapSize;

    const col = Math.floor(relX / (cellSize + gapSize));
    const row = Math.floor(relY / (cellSize + gapSize));

    // 检查坐标是否有效
    if (row >= 0 && row < 4 && col >= 0 && col < 4) {
        // 检查该位置是否有非零方块
        if (board[row][col] !== 0) {
            // 播放移除方块的音效（使用移动音效）
            playMoveSound();

            // 直接移除该方块，不使用动画
            board[row][col] = 0;

            // 退出复活模式
            reviveMode = false;
            // 减少复活机会
            canRevive--;

            // 不立即生成新数字，等待玩家滑动操作
            render(false);
        }
    }
}

// 激活复活模式
function activateReviveMode() {
    // 播放模式切换音效
    playMergeSound();

    // 重置游戏状态
    reviveMode = true;
    gameOver = false; // 暂时关闭游戏结束状态
    currentRestartBtn = null; // 清除按钮引用，防止弹窗重复显示

    // 立即重绘游戏，确保弹窗消失
    render(false);

    // 绘制复活模式提示
    renderReviveInstructions();
}

// 绘制复活模式指示
function renderReviveInstructions() {
    const scaleFactor = Math.min(width / 440, height / 700);

    // 计算棋盘位置（与render函数中相同的计算方式）
    const headerY = height * 0.1;
    const cellSize = 80 * scaleFactor;
    const gapSize = 15 * scaleFactor;
    const boardSize = cellSize * 4 + gapSize * 5;
    const boardY = headerY + 100 * scaleFactor;

    // 计算文本应该显示的位置：棋盘底部下方20像素处
    const textY = boardY + boardSize + 60 * scaleFactor;

    // 绘制指导文本，使用描边让文字在任何背景上都清晰可见
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${20 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 先描边后填充，确保文字清晰可见
    ctx.strokeText('点击一个方块将其移除，游戏将继续', width / 2, textY);
    ctx.fillText('点击一个方块将其移除，游戏将继续', width / 2, textY);
}

// 检查游戏是否结束
function isGameOver() {
    // 检查是否有空格
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (board[i][j] === 0) {
                return false; // 仍有空格，游戏未结束
            }
        }
    }

    // 检查水平相邻位置是否可合并
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[i][j] === board[i][j + 1]) {
                return false; // 有可合并的，游戏未结束
            }
        }
    }

    // 检查垂直相邻位置是否可合并
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 4; j++) {
            if (board[i][j] === board[i + 1][j]) {
                return false; // 有可合并的，游戏未结束
            }
        }
    }

    // 没有空格且没有可合并的，游戏结束
    return true;
}

// 重写动画生成函数 - 修复方向错误和不必要的动画
function generateAnimations(oldBoard, newBoard) {
    const anims = [];

    // 跟踪已处理的位置
    const processed = new Set();

    // 首先找出所有在新棋盘上存在的非零数字，然后回溯它们的来源
    for (let newI = 0; newI < 4; newI++) {
        for (let newJ = 0; newJ < 4; newJ++) {
            // 只处理新棋盘上的非零数字
            if (newBoard[newI][newJ] !== 0 && !processed.has(`${newI},${newJ}`)) {
                const newValue = newBoard[newI][newJ];

                // 检查这个位置在旧棋盘上是否有相同的数字
                if (oldBoard[newI][newJ] === newValue) {
                    // 数字没有移动，跳过
                    continue;
                }

                // 检查是否是合并结果（数值是旧棋盘某处的2倍）
                if (newValue % 2 === 0) { // 所有2048游戏中的数字都是2的幂，所以合并结果是偶数
                    const halfValue = newValue / 2;
                    let foundSources = 0;
                    let sources = [];

                    // 查找可能的合并来源
                    // 根据移动方向检查特定方向上的格子

                    // 对于左移，检查当前行右侧的格子
                    if (lastMoveDirection === 'left') {
                        for (let j = newJ + 1; j < 4; j++) {
                            if (oldBoard[newI][j] === halfValue && !processed.has(`${newI},${j}`)) {
                                sources.push({ row: newI, col: j });
                                foundSources++;
                                if (foundSources === 2) break;
                            }
                        }
                    }
                    // 对于右移，检查当前行左侧的格子
                    else if (lastMoveDirection === 'right') {
                        for (let j = newJ - 1; j >= 0; j--) {
                            if (oldBoard[newI][j] === halfValue && !processed.has(`${newI},${j}`)) {
                                sources.push({ row: newI, col: j });
                                foundSources++;
                                if (foundSources === 2) break;
                            }
                        }
                    }
                    // 对于上移，检查当前列下方的格子
                    else if (lastMoveDirection === 'up') {
                        for (let i = newI + 1; i < 4; i++) {
                            if (oldBoard[i][newJ] === halfValue && !processed.has(`${i},${newJ}`)) {
                                sources.push({ row: i, col: newJ });
                                foundSources++;
                                if (foundSources === 2) break;
                            }
                        }
                    }
                    // 对于下移，检查当前列上方的格子
                    else if (lastMoveDirection === 'down') {
                        for (let i = newI - 1; i >= 0; i--) {
                            if (oldBoard[i][newJ] === halfValue && !processed.has(`${i},${newJ}`)) {
                                sources.push({ row: i, col: newJ });
                                foundSources++;
                                if (foundSources === 2) break;
                            }
                        }
                    }

                    // 如果找到了两个来源，说明是合并
                    if (foundSources === 2) {
                        sources.forEach(source => {
                            anims.push({
                                startRow: source.row,
                                startCol: source.col,
                                endRow: newI,
                                endCol: newJ,
                                value: halfValue,
                                merged: true
                            });
                            processed.add(`${source.row},${source.col}`);
                        });
                        processed.add(`${newI},${newJ}`);
                        continue;
                    }
                }

                // 如果不是合并结果，找出移动前的位置
                let found = false;

                // 根据移动方向查找来源
                if (lastMoveDirection === 'left') {
                    // 向左移动，查找当前行右侧
                    for (let j = newJ + 1; j < 4 && !found; j++) {
                        if (oldBoard[newI][j] === newValue && !processed.has(`${newI},${j}`)) {
                            anims.push({
                                startRow: newI,
                                startCol: j,
                                endRow: newI,
                                endCol: newJ,
                                value: newValue,
                                merged: false
                            });
                            processed.add(`${newI},${j}`);
                            processed.add(`${newI},${newJ}`);
                            found = true;
                        }
                    }
                } else if (lastMoveDirection === 'right') {
                    // 向右移动，查找当前行左侧
                    for (let j = newJ - 1; j >= 0 && !found; j--) {
                        if (oldBoard[newI][j] === newValue && !processed.has(`${newI},${j}`)) {
                            anims.push({
                                startRow: newI,
                                startCol: j,
                                endRow: newI,
                                endCol: newJ,
                                value: newValue,
                                merged: false
                            });
                            processed.add(`${newI},${j}`);
                            processed.add(`${newI},${newJ}`);
                            found = true;
                        }
                    }
                } else if (lastMoveDirection === 'up') {
                    // 向上移动，查找当前列下方
                    for (let i = newI + 1; i < 4 && !found; i++) {
                        if (oldBoard[i][newJ] === newValue && !processed.has(`${i},${newJ}`)) {
                            anims.push({
                                startRow: i,
                                startCol: newJ,
                                endRow: newI,
                                endCol: newJ,
                                value: newValue,
                                merged: false
                            });
                            processed.add(`${i},${newJ}`);
                            processed.add(`${newI},${newJ}`);
                            found = true;
                        }
                    }
                } else if (lastMoveDirection === 'down') {
                    // 向下移动，查找当前列上方
                    for (let i = newI - 1; i >= 0 && !found; i--) {
                        if (oldBoard[i][newJ] === newValue && !processed.has(`${i},${newJ}`)) {
                            anims.push({
                                startRow: i,
                                startCol: newJ,
                                endRow: newI,
                                endCol: newJ,
                                value: newValue,
                                merged: false
                            });
                            processed.add(`${i},${newJ}`);
                            processed.add(`${newI},${newJ}`);
                            found = true;
                        }
                    }
                }

                if (found) {
                    processed.add(`${newI},${newJ}`);
                }
            }
        }
    }

    return anims;
}

// 修复animationFrame函数，确保使用的是相同的animationId变量
function animationFrame(timestamp, duration, startTimeRef, animationMap, boardX, boardY, cellSize, gapSize) {
    let startTime = startTimeRef
    if (!startTime) startTime = timestamp

    const elapsed = timestamp - startTime
    const rawProgress = Math.min(elapsed / duration, 1) // 0到1之间的线性进度

    // 使用更平滑的缓动函数
    const progress = easings.easeOutCubic(rawProgress)

    // 清空画布
    ctx.fillStyle = THEME_FOREST.background
    ctx.fillRect(0, 0, width, height)

    // 计算比例因素
    const scaleFactor = Math.min(width / 440, height / 700);

    // 基于缩放因子调整尺寸
    const headerWidth = 440 * scaleFactor;

    // 标题和分数面板区域的位置
    const headerX = (width - headerWidth) / 2;
    const headerY = height * 0.1;

    // 游戏板位置
    const boardSize = cellSize * 4 + gapSize * 5;

    // 绘制游戏标题 - 左对齐，但稍微右移一些
    ctx.fillStyle = THEME_FOREST.text.dark
    ctx.font = `bold ${40 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
    ctx.textAlign = "left"
    ctx.textBaseline = "top"
    ctx.fillText("合合小鸟", headerX + 10 * scaleFactor, headerY)

    // 绘制分数面板 - 右侧对齐，但整体向左移动
    const scoreCardWidth = 110 * scaleFactor;
    const scoreCardHeight = 85 * scaleFactor;
    const scoreGap = 15 * scaleFactor;

    // 调整分数面板位置，使其更加居中
    const currentScoreX = headerX + headerWidth - scoreCardWidth * 2 - scoreGap - 15 * scaleFactor;
    const highScoreX = currentScoreX + scoreCardWidth + scoreGap;
    const scoreY = headerY;

    // 绘制分数卡片
    drawScoreCard(currentScoreX, scoreY, scoreCardWidth, scoreCardHeight, "分数", score);
    drawScoreCard(highScoreX, scoreY, scoreCardWidth, scoreCardHeight, "最高分", highScore);

    // 绘制游戏棋盘
    ctx.fillStyle = THEME_FOREST.boardBackground
    roundRect(ctx, boardX, boardY, boardSize, boardSize, 12 * scaleFactor, true)

    // 添加网格线效果
    drawGridLines(boardX, boardY, boardSize, gapSize, cellSize);

    // 先绘制所有空格子，确保它们不会闪烁
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            const x = boardX + gapSize + j * (cellSize + gapSize);
            const y = boardY + gapSize + i * (cellSize + gapSize);

            // 绘制底层的空方格
            ctx.fillStyle = THEME_FOREST.emptyCell;
            roundRect(ctx, x, y, cellSize, cellSize, 6, true);
        }
    }

    // 先绘制拖尾效果（应该在方块下面）
    for (let i = 0; i < movementTrails.length; i++) {
        const trail = movementTrails[i]

        // 跟踪移动的一半位置
        const trailX = trail.startX + (trail.endX - trail.startX) * 0.5
        const trailY = trail.startY + (trail.endY - trail.startY) * 0.5

        // 绘制半透明拖尾
        ctx.globalAlpha = trail.alpha * (trail.life / trail.maxLife)
        ctx.fillStyle = colors[trail.value]
        roundRect(ctx, trailX, trailY, cellSize, cellSize, 6, true)
        ctx.globalAlpha = 1

        // 更新拖尾生命周期
        trail.life -= 0.016 // 约60fps下每帧减少的时间
        if (trail.life <= 0) {
            movementTrails.splice(i, 1)
            i--
        }
    }

    // 创建一个更完整的动画位置映射，包括起始位置和目标位置
    const fullAnimationMap = {}
    if (animationMap) {
        animations.forEach(anim => {
            fullAnimationMap[`${anim.startRow},${anim.startCol}`] = true
            fullAnimationMap[`${anim.endRow},${anim.endCol}`] = true
        })
    }

    // 只绘制非零的方块（空格子已在前面绘制）
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            // 跳过在动画中的格子
            if (fullAnimationMap && fullAnimationMap[`${i},${j}`]) continue;

            // 只绘制非零的方块
            if (board[i][j] !== 0) {
                const x = boardX + gapSize + j * (cellSize + gapSize);
                const y = boardY + gapSize + i * (cellSize + gapSize);

                // 绘制方块背景
                ctx.fillStyle = colors[board[i][j]];
                roundRect(ctx, x, y, cellSize, cellSize, 6, true);

                // 绘制数字
                const fontSize = board[i][j] < 100 ? cellSize / 2 : board[i][j] < 1000 ? cellSize / 2.5 : cellSize / 3;
                ctx.fillStyle = textColors[board[i][j]];
                ctx.font = `bold ${fontSize}px 'Helvetica Neue', Arial, sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(board[i][j], x + cellSize / 2, y + cellSize / 2);
            }
        }
    }

    // 绘制动画中的数字
    animations.forEach(anim => {
        // 计算起点和终点坐标
        const startX = boardX + gapSize + anim.startCol * (cellSize + gapSize);
        const startY = boardY + gapSize + anim.startRow * (cellSize + gapSize);
        const endX = boardX + gapSize + anim.endCol * (cellSize + gapSize);
        const endY = boardY + gapSize + anim.endRow * (cellSize + gapSize);

        // 计算当前位置
        const currentX = startX + (endX - startX) * progress
        const currentY = startY + (endY - startY) * progress

        // 移动距离大于等于2格时添加拖尾效果
        if (!anim.addedTrail &&
            (Math.abs(anim.startRow - anim.endRow) >= 2 || Math.abs(anim.startCol - anim.endCol) >= 2)) {
            movementTrails.push(createMovementTrail(startX, startY, endX, endY, anim.value))
            anim.addedTrail = true
        }

        // 绘制移动中的格子
        if (!anim.merged) {
            ctx.fillStyle = colors[anim.value]
            roundRect(ctx, currentX, currentY, cellSize, cellSize, 6, true)

            // 绘制数字
            const fontSize = anim.value < 100 ? cellSize / 2 : anim.value < 1000 ? cellSize / 2.5 : cellSize / 3;
            ctx.fillStyle = textColors[anim.value]
            ctx.font = `bold ${fontSize}px 'Helvetica Neue', Arial, sans-serif`
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillText(anim.value, currentX + cellSize / 2, currentY + cellSize / 2)
        } else if (progress > 0.9) {
            // 当合并即将发生(90%进度)时，创建粒子和冲击波效果
            if (progress > 0.9 && !anim.addedEffects) {
                mergeParticles = mergeParticles.concat(
                    createMergeParticles(endX, endY, anim.value * 2)
                )
                mergeWaves.push(createMergeWave(endX, endY, anim.value * 2))
                anim.addedEffects = true
            }

            // 合并的数字有缩放效果
            const scale = 1 + 0.2 * Math.sin((progress - 0.9) * Math.PI * 5)

            ctx.save()
            ctx.translate(endX + cellSize / 2, endY + cellSize / 2)
            ctx.scale(scale, scale)
            ctx.fillStyle = colors[anim.value * 2]
            roundRect(ctx, -cellSize / 2, -cellSize / 2, cellSize, cellSize, 6, true)

            // 绘制数字
            const fontSize = anim.value * 2 < 100 ? cellSize / 2 : anim.value * 2 < 1000 ? cellSize / 2.5 : cellSize / 3;
            ctx.fillStyle = textColors[anim.value * 2]
            ctx.font = `bold ${fontSize}px 'Helvetica Neue', Arial, sans-serif`
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillText(anim.value * 2, 0, 0)
            ctx.restore()
        }
    })

    // 绘制音效按钮，确保它在动画中也保持稳定位置
    const soundBtnSize = 40 * scaleFactor;
    const soundBtnX = Math.floor(width - soundBtnSize - 15 * scaleFactor);
    const soundBtnY = Math.floor(boardY + boardSize + 20 * scaleFactor);

    // 绘制音效按钮 - 不应用任何动画效果
    ctx.globalAlpha = 1.0; // 确保完全不透明
    ctx.fillStyle = soundEnabled ? THEME_FOREST.tiles['16'].background : THEME_FOREST.emptyCell;
    roundRect(ctx, soundBtnX, soundBtnY, soundBtnSize, soundBtnSize, 5, true);

    // 绘制音效图标
    ctx.fillStyle = soundEnabled ? THEME_FOREST.tiles['16'].text : THEME_FOREST.text.dark;
    ctx.font = `bold ${soundBtnSize * 0.5}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(soundEnabled ? "🔊" : "🔇", soundBtnX + soundBtnSize / 2, soundBtnY + soundBtnSize / 2);

    // 检查动画是否结束
    if (progress >= 1) {
        // 动画完成，重置标志
        animating = false
        animations = []
        animationId = null

        // 添加新数字
        addRandomNumber()

        // 然后检查游戏状态
        checkGameStatus()

        // 重新渲染
        render()
    } else {
        // 保存动画ID以便必要时取消
        animationId = requestAnimationFrame(function (timestamp) {
            animationFrame(timestamp, duration, startTime, animationMap, boardX, boardY, cellSize, gapSize)
        })
    }
}

// 在移动函数结束后检查游戏状态
function checkGameStatus() {
    // 检查游戏是否获胜（是否有2048）
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (board[i][j] === 2048 && !gameWon) {
                gameWon = true;
                return;
            }
        }
    }

    // 检查游戏是否结束
    if (isGameOver()) {
        gameOver = true;
    }
}

// 初始化游戏
init()

// 在移动前取消可能正在进行的动画
function handleMove(direction) {
    if (animationId) {
        cancelAnimationFrame(animationId)
        animationId = null
    }
    // 处理移动...
}

// 开始动画函数
function startAnimation() {
    animating = true
    let startTime = null
    const duration = 250 // 动画持续时间(毫秒)

    // 创建一个映射，跟踪哪些位置的数字在动画中
    const animationMap = {}
    animations.forEach(anim => {
        animationMap[`${anim.endRow},${anim.endCol}`] = true
    })

    // 传递所有需要的变量给animationFrame
    requestAnimationFrame(function (timestamp) {
        animationFrame(timestamp, duration, startTime, animationMap)
    })
}

// 向左移动
function moveLeft() {
    let moved = false;
    // 记录合并发生
    let merged = false;

    for (let i = 0; i < 4; i++) {
        let row = board[i].filter(val => val);
        let newRow = [];

        for (let j = 0; j < row.length; j++) {
            if (row[j] === row[j + 1]) {
                newRow.push(row[j] * 2);
                updateScore(row[j] * 2);
                j++;
                merged = true; // 标记发生了合并
            } else {
                newRow.push(row[j]);
            }
        }

        while (newRow.length < 4) newRow.push(0);
        if (newRow.toString() !== board[i].toString()) moved = true;
        board[i] = newRow;
    }

    if (moved) {
        lastMoveDirection = 'left';
        // 根据是否发生合并播放相应音效
        if (merged) {
            playMergeSound();
        } else if (moved) {
            playMoveSound();
        }
    }

    return moved;
}

// 向右移动
function moveRight() {
    let moved = false;
    // 记录合并发生
    let merged = false;

    for (let i = 0; i < 4; i++) {
        let row = board[i].filter(val => val);
        let newRow = [];

        for (let j = row.length - 1; j >= 0; j--) {
            if (row[j] === row[j - 1]) {
                newRow.unshift(row[j] * 2);
                updateScore(row[j] * 2);
                j--;
                merged = true; // 标记发生了合并
            } else {
                newRow.unshift(row[j]);
            }
        }

        while (newRow.length < 4) newRow.unshift(0);
        if (newRow.toString() !== board[i].toString()) moved = true;
        board[i] = newRow;
    }

    if (moved) {
        lastMoveDirection = 'right';
        // 根据是否发生合并播放相应音效
        if (merged) {
            playMergeSound();
        } else if (moved) {
            playMoveSound();
        }
    }

    return moved;
}

// 向上移动
function moveUp() {
    let moved = false;
    // 记录合并发生
    let merged = false;

    for (let j = 0; j < 4; j++) {
        let column = [];
        for (let i = 0; i < 4; i++) {
            if (board[i][j] !== 0) column.push(board[i][j]);
        }

        let newColumn = [];
        for (let i = 0; i < column.length; i++) {
            if (column[i] === column[i + 1]) {
                newColumn.push(column[i] * 2);
                updateScore(column[i] * 2);
                i++;
                merged = true; // 标记发生了合并
            } else {
                newColumn.push(column[i]);
            }
        }

        while (newColumn.length < 4) newColumn.push(0);
        for (let i = 0; i < 4; i++) {
            if (board[i][j] !== newColumn[i]) moved = true;
            board[i][j] = newColumn[i];
        }
    }

    if (moved) {
        lastMoveDirection = 'up';
        // 根据是否发生合并播放相应音效
        if (merged) {
            playMergeSound();
        } else if (moved) {
            playMoveSound();
        }
    }

    return moved;
}

// 向下移动
function moveDown() {
    let moved = false;
    // 记录合并发生
    let merged = false;

    for (let j = 0; j < 4; j++) {
        let column = [];
        for (let i = 0; i < 4; i++) {
            if (board[i][j] !== 0) column.push(board[i][j]);
        }

        let newColumn = [];
        for (let i = column.length - 1; i >= 0; i--) {
            if (column[i] === column[i - 1]) {
                newColumn.unshift(column[i] * 2);
                updateScore(column[i] * 2);
                i--;
                merged = true; // 标记发生了合并
            } else {
                newColumn.unshift(column[i]);
            }
        }

        while (newColumn.length < 4) newColumn.unshift(0);
        for (let i = 0; i < 4; i++) {
            if (board[i][j] !== newColumn[i]) moved = true;
            board[i][j] = newColumn[i];
        }
    }

    if (moved) {
        lastMoveDirection = 'down';
        // 根据是否发生合并播放相应音效
        if (merged) {
            playMergeSound();
        } else if (moved) {
            playMoveSound();
        }
    }

    return moved;
}

// 添加滑动反馈渲染函数
function renderSwipeFeedback(boardX, boardY, cellSize, gapSize, swipe) {
    // 计算滑动方向的偏移量 - 减小为原来的一半，使视觉效果更自然
    const maxOffset = cellSize * 0.02; // 最大偏移量为格子大小的2%
    const offset = maxOffset * swipe.progress;

    // 基于滑动方向计算偏移向量
    let offsetX = 0, offsetY = 0;

    switch (swipe.direction) {
        case 'left':
            offsetX = -offset;
            break;
        case 'right':
            offsetX = offset;
            break;
        case 'up':
            offsetY = -offset;
            break;
        case 'down':
            offsetY = offset;
            break;
    }

    // 先绘制所有空格子
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            const x = boardX + gapSize + j * (cellSize + gapSize);
            const y = boardY + gapSize + i * (cellSize + gapSize);

            // 绘制底层的空方格
            ctx.fillStyle = THEME_FOREST.emptyCell;
            roundRect(ctx, x, y, cellSize, cellSize, 6, true);
        }
    }

    // 然后绘制带偏移的非零格子
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (board[i][j] !== 0) {
                const x = boardX + gapSize + j * (cellSize + gapSize) + offsetX;
                const y = boardY + gapSize + i * (cellSize + gapSize) + offsetY;

                // 绘制方块背景
                ctx.fillStyle = colors[board[i][j]];
                roundRect(ctx, x, y, cellSize, cellSize, 6, true);

                // 绘制数字
                const fontSize = board[i][j] < 100 ? cellSize / 2 : board[i][j] < 1000 ? cellSize / 2.5 : cellSize / 3;
                ctx.fillStyle = textColors[board[i][j]];
                ctx.font = `bold ${fontSize}px 'Helvetica Neue', Arial, sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(board[i][j].toString(), x + cellSize / 2, y + cellSize / 2);
            }
        }
    }
}

// 以下是所有的音效相关函数
// 初始化音效
function initSounds() {
    console.log('初始化音效...');

    // 设置移动音效
    moveSound.src = 'audio/move.mp3';
    moveSound.loop = false;
    moveSound.volume = 0.6; // 设置音量为60%

    // 使用更简单的事件监听方式
    moveSound.onCanplay(function () {
        console.log('Move sound loaded');
    });

    moveSound.onError(function (err) {
        console.error('移动音效加载失败:', err);
    });

    // 设置合并音效
    mergeSound.src = 'audio/merge.mp3';
    mergeSound.loop = false;
    mergeSound.volume = 0.7; // 设置音量为70%

    mergeSound.onCanplay(function () {
        console.log('Merge sound loaded');
    });

    mergeSound.onError(function (err) {
        console.error('合并音效加载失败:', err);
    });

    // 设置小鸟音效
    birdSound.src = 'audio/bird.mp3';
    birdSound.loop = false;
    birdSound.volume = 0.4; // 增加音量确保可听到

    birdSound.onCanplay(function () {
        console.log('Bird sound loaded');
        isSoundLoaded = true;
    });

    birdSound.onError(function (res) {
        console.error('Failed to load bird sound:', res);
    });

    // 尝试从本地存储加载音效设置
    try {
        const savedSoundEnabled = wx.getStorageSync("soundEnabled");
        if (savedSoundEnabled !== undefined && savedSoundEnabled !== null) {
            soundEnabled = savedSoundEnabled;
        }
    } catch (e) {
        console.error("读取音效设置失败", e);
    }

    audioInitialized = true;
    console.log('音效初始化完成');
}

// 播放移动音效
function playMoveSound() {
    if (!soundEnabled || !audioInitialized) return;

    console.log('播放移动音效');
    try {
        moveSound.stop();
        moveSound.seek(0);
        wx.getSystemInfo({
            success: function (res) {
                console.log('系统信息:', res);
                // 确保之前的播放停止，然后重新播放
                setTimeout(function () {
                    moveSound.play();
                }, 0);
            }
        });
    } catch (e) {
        console.error("播放移动音效失败:", e);
    }
}

// 播放合并音效
function playMergeSound() {
    if (!soundEnabled || !audioInitialized) return;

    console.log('播放合并音效');
    try {
        mergeSound.stop();
        mergeSound.seek(0);
        wx.getSystemInfo({
            success: function (res) {
                console.log('系统信息:', res);
                // 确保之前的播放停止，然后重新播放
                setTimeout(function () {
                    mergeSound.play();
                }, 0);
            }
        });
    } catch (e) {
        console.error("播放合并音效失败:", e);
    }
}

// 切换音效开关
function toggleSound() {
    soundEnabled = !soundEnabled;

    // 保存用户选择
    try {
        wx.setStorageSync("soundEnabled", soundEnabled);
    } catch (e) {
        console.error("保存音效设置失败", e);
    }

    return soundEnabled;
}

// 显示消息的函数
// 渲染游戏状态消息（胜利或失败）
function renderGameMessage(message, buttonText, backgroundColor, buttonColor) {
    // 创建半透明背景
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, width, height);

    // 计算比例因素
    const scaleFactor = Math.min(width / 440, height / 700);

    // 绘制消息面板
    const modalWidth = width * 0.8;
    const modalHeight = height * 0.4;
    const modalX = (width - modalWidth) / 2;
    const modalY = (height - modalHeight) / 2;

    // 绘制面板背景
    ctx.fillStyle = backgroundColor || THEME_FOREST.background;
    roundRect(ctx, modalX, modalY, modalWidth, modalHeight, 10, true);

    // 绘制消息
    ctx.fillStyle = THEME_FOREST.text.dark;
    ctx.font = `bold ${28 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, width / 2, modalY + modalHeight * 0.3);

    // 绘制按钮
    const btnWidth = modalWidth * 0.6;
    const btnHeight = 50 * scaleFactor;
    const btnX = (width - btnWidth) / 2;
    const btnY = modalY + modalHeight * 0.6;

    ctx.fillStyle = buttonColor || THEME_FOREST.tiles['64'].background;
    roundRect(ctx, btnX, btnY, btnWidth, btnHeight, 8, true);

    ctx.fillStyle = THEME_FOREST.text.light;
    ctx.font = `bold ${20 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillText(buttonText, width / 2, btnY + btnHeight / 2);

    // 返回按钮的位置信息
    return {
        button: {
            x: btnX,
            y: btnY,
            width: btnWidth,
            height: btnHeight
        }
    };
}

// 绘制小动物文本框
function renderAnimalTextBox() {
    // 计算比例因素
    const scaleFactor = Math.min(width / 440, height / 700);

    // 文本框尺寸和位置
    const boxWidth = width * 0.5;
    const boxHeight = height * 0.075;

    // 将文本框向左侧移动，避免与小鸟重叠
    const boxX = width * 0.07; // 从屏幕左侧10%的位置开始
    const boxY = height * 0.71;

    // 绘制文本框背景
    ctx.fillStyle = THEME_FOREST.emptyCell;
    roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 10, true);

    // 绘制边框
    ctx.strokeStyle = THEME_FOREST.tiles['16'].background;
    ctx.lineWidth = 2 * scaleFactor;
    roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 10, false, true);

    // 绘制文本 - 需要调整文本位置，使其在新的文本框中居中
    ctx.fillStyle = THEME_FOREST.text.dark;
    ctx.font = `${14 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 获取当前要显示的文本
    const text = animalTexts[currentTextIndex];

    // 根据文本长度自动调整字体大小
    if (text.length > 30) {
        ctx.font = `${12 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`;
    }

    // 绘制文本 - 考虑长文本换行处理
    // 注意：文本的x坐标需要调整为新文本框的中心
    wrapText(ctx, text, boxX + boxWidth / 2, boxY + boxHeight / 2, boxWidth - 20 * scaleFactor, 18 * scaleFactor);

    // 添加"点击继续"提示 - 同样需要调整位置
    ctx.font = `${10 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillText("点击继续...", boxX + boxWidth - 40 * scaleFactor, boxY + boxHeight - 10 * scaleFactor);
}

// 文本换行函数
function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split('');
    let line = '';
    let lineCount = 0;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n];
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && n > 0) {
            context.fillText(line, x, y - lineHeight / 2 + lineCount * lineHeight);
            line = words[n];
            lineCount++;
        }
        else {
            line = testLine;
        }
    }

    context.fillText(line, x, y - lineHeight / 2 + lineCount * lineHeight);
}

// 切换小动物文本
function toggleAnimalText() {
    if (showAnimalText) {
        // 如果已经显示文本，切换到下一条
        currentTextIndex = (currentTextIndex + 1) % animalTexts.length;

        // 如果需要加入AI文本功能，这里可以调用云函数
        // 当文本轮换到最后时，可以尝试获取新的AI生成文本
        if (currentTextIndex === 0) {
            requestAIText();
        }
    } else {
        // 如果未显示文本，则显示
        showAnimalText = true;
    }

    // 重新渲染
    render(false);
}

// 请求AI生成文本（示例函数，需要配合微信云开发使用）
function requestAIText() {
    // 这里仅作示例，实际实现需要使用wx.cloud.callFunction
    console.log("尝试获取AI生成的文本");

    // 微信云开发调用示例
    /*
    wx.cloud.callFunction({
        name: 'getAIText',
        data: {
            prompt: '给2048游戏玩家一条鼓励或提示'
        },
        success: res => {
            // 将AI生成的文本添加到文本数组中
            if (res.result && res.result.text) {
                animalTexts.push(res.result.text);
            }
        },
        fail: err => {
            console.error('调用AI生成文本失败', err);
        }
    });
    */
}

// 确保在页面加载时初始化音效，并加入用户交互后再次尝试播放的逻辑
wx.onShow(() => {
    console.log('游戏页面显示，尝试初始化音效');
    // 确保音效被初始化
    if (!audioInitialized) {
        initSounds();
    }
});

// 添加触摸事件监听，用于在首次用户交互时激活音频
wx.onTouchStart(() => {
    if (!isSoundLoaded && soundEnabled) {
        console.log('用户首次交互，尝试预加载音频');
        // 尝试预加载音频
        birdSound.play();
        birdSound.stop();
        moveSound.play();
        moveSound.stop();
        mergeSound.play();
        mergeSound.stop();
        isSoundLoaded = true;
    }
});

// 添加播放小鸟音效的函数
function playBirdSound() {
    if (!soundEnabled || !audioInitialized) return;

    console.log('播放小鸟音效');
    try {
        birdSound.stop();
        birdSound.seek(0);
        birdSound.play();
    } catch (e) {
        console.error("播放小鸟音效失败:", e);
    }
}

