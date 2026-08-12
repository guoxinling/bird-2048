import './js/libs/weapp-adapter'
import './js/libs/symbol'

const APP_VERSION = '1.0.1'

// Canvas + DPR（逻辑坐标绘制，物理像素按像素比放大）
const canvas = wx.createCanvas()
const ctx = canvas.getContext('2d')

function getWindowMetrics() {
  try {
    if (typeof wx.getWindowInfo === 'function') {
      return wx.getWindowInfo()
    }
  } catch (e) { /* fall through */ }
  return wx.getSystemInfoSync()
}

const windowInfo = getWindowMetrics()
const dpr = windowInfo.pixelRatio || 1
const width = windowInfo.windowWidth || canvas.width
const height = windowInfo.windowHeight || canvas.height

canvas.width = Math.floor(width * dpr)
canvas.height = Math.floor(height * dpr)
ctx.scale(dpr, dpr)
ctx.imageSmoothingEnabled = true
if (ctx.imageSmoothingQuality) {
  ctx.imageSmoothingQuality = 'high'
}

const moveSound = wx.createInnerAudioContext()
const mergeSound = wx.createInnerAudioContext()
const birdSound = wx.createInnerAudioContext()
birdSound.loop = false
birdSound.volume = 0.4

let soundEnabled = true
let audioInitialized = false
let audioUnlocked = false

const animalImage = wx.createImage()
let animalLoaded = false
let animalArea = null
let showAnimalText = false
let currentTextIndex = 0

const flowerImage = wx.createImage()
let flowerLoaded = false
let flowerArea = null

const animalTexts = [
  '你好！我是你的小助手iTab小蓝鸟！',
  '用过iTab插件肯定看我眼熟吧！',
  '你在iTab插件里玩过2048游戏吗？',
  '2048游戏的诀窍是保持大数在角落哦！',
  '尝试始终向一个方向滑动，可以构建数字序列！',
  '合并相同数字时记得看准方向，避免被堵住！',
  '积少成多，从小数字开始慢慢合并！',
  '遇到困难不要着急，有时候需要战略性地让出一些空间！',
  '当你看到两个相同的大数字时，一定要想办法合并它们！',
  '游戏需要耐心和策略，不断尝试才能获得高分！',
  '休息一下再来挑战也是不错的选择~',
  '我是iTab插件的形象大使,你发现了没?',
  'iTab插件是一款非常强大的浏览器插件呢',
  '我是一只能为你带来快乐的小鸟~',
  '我还不会动，因为我正在学做动画呢~'
]

const THEME_FOREST = {
  background: '#F7F6F2',
  boardBackground: '#E8E4D8',
  gridLine: 'rgba(209, 206, 197, 0.2)',
  emptyCell: 'rgba(255, 255, 255, 0.3)',
  text: {
    dark: '#2B4162',
    light: '#FFFFFF'
  },
  tiles: {
    '0': { background: 'rgba(255,255,255,0.3)', text: '#2B4162' },
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
    '2048': { background: '#FFA8A8', text: '#6D4C41' },
    '4096': { background: '#FF7B7B', text: '#FFFFFF' },
    '8192': { background: '#E85D5D', text: '#FFFFFF' }
  },
  score: {
    background: '#D5E3F0',
    text: '#2B4162',
    shadow: 'rgba(43,65,98,0.1)'
  },
  gameWon: {
    background: '#C7E6D9',
    button: '#4AA08C'
  },
  gameOver: {
    background: '#FFE5D9',
    button: '#FFBF9B'
  }
}

const TILE_FALLBACK = { background: '#C45C5C', text: '#FFFFFF' }

function getTileStyle(value) {
  if (value === 0) {
    return { background: THEME_FOREST.emptyCell, text: THEME_FOREST.text.dark }
  }
  return THEME_FOREST.tiles[String(value)] || TILE_FALLBACK
}

let board = [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0]
]
let score = 0
let highScore = 0
let gameOver = false
let gameWon = false
let gameWonDismissed = false

let reviveMode = false
let canRevive = 3

let currentRestartBtn = null
let winBannerArea = null
let currentSwipe = { direction: 'none', progress: 0 }
let soundButtonArea = null

let lastRenderTime = 0
let startX = 0
let startY = 0
let hasMoved = false

function getLayout() {
  const scaleFactor = Math.min(width / 440, height / 700)
  const headerWidth = 440 * scaleFactor
  const cellSize = 80 * scaleFactor
  const gapSize = 15 * scaleFactor
  const headerX = (width - headerWidth) / 2
  const headerY = height * 0.1
  const boardSize = cellSize * 4 + gapSize * 5
  const boardX = (width - boardSize) / 2
  const boardY = headerY + 100 * scaleFactor

  return {
    scaleFactor,
    headerWidth,
    headerX,
    headerY,
    cellSize,
    gapSize,
    boardSize,
    boardX,
    boardY
  }
}

function updateScore(value) {
  score += value
  if (score > highScore) {
    highScore = score
    try {
      wx.setStorageSync('highScore', highScore)
    } catch (e) {
      console.error('保存最高分失败', e)
    }
  }
}

function init() {
  board = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ]
  score = 0
  gameOver = false
  gameWon = false
  gameWonDismissed = false
  canRevive = 3
  reviveMode = false
  currentRestartBtn = null
  winBannerArea = null
  showAnimalText = false
  currentSwipe = { direction: 'none', progress: 0 }

  initSounds()
  loadAnimalImage()
  loadFlowerImage()

  addRandomNumber()
  addRandomNumber()
  render()

  try {
    const savedHighScore = wx.getStorageSync('highScore')
    if (savedHighScore) {
      highScore = savedHighScore
      render()
    }
  } catch (e) {
    console.error('读取最高分失败', e)
  }
}

function loadAnimalImage() {
  animalImage.src = 'images/animal.png'
  animalImage.onload = function () {
    animalLoaded = true
    render()
  }
  animalImage.onerror = function (e) {
    console.error('小动物图片加载失败:', e)
  }
}

function loadFlowerImage() {
  flowerImage.src = 'images/flower.png'
  flowerImage.onload = function () {
    flowerLoaded = true
    render()
  }
  flowerImage.onerror = function (e) {
    console.error('花朵图片加载失败:', e)
  }
}

function addRandomNumber() {
  const emptyPositions = []
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] === 0) {
        emptyPositions.push({ row: i, col: j })
      }
    }
  }

  if (emptyPositions.length === 0) return

  const position = emptyPositions[Math.floor(Math.random() * emptyPositions.length)]
  // 60% -> 2, 20% -> 4, 20% -> 8（与 shared/game-rules.md 一致）
  board[position.row][position.col] = Math.random() < 0.6 ? 2 : (Math.random() < 0.5 ? 4 : 8)
}

function render(swipe = null) {
  const layout = getLayout()
  const {
    scaleFactor,
    headerWidth,
    headerX,
    headerY,
    cellSize,
    gapSize,
    boardSize,
    boardX,
    boardY
  } = layout

  ctx.fillStyle = THEME_FOREST.background
  ctx.fillRect(0, 0, width, height)

  if (!reviveMode && animalLoaded) {
    const animalSize = Math.floor(300 * scaleFactor)
    const animalX = Math.floor(width - animalSize + 10 * scaleFactor)
    const animalY = Math.floor(height - animalSize + 15 * scaleFactor)

    ctx.save()
    ctx.imageSmoothingEnabled = true
    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur = 10 * scaleFactor
    ctx.shadowOffsetX = 3 * scaleFactor
    ctx.shadowOffsetY = 3 * scaleFactor
    ctx.drawImage(animalImage, animalX, animalY, animalSize, animalSize)
    ctx.restore()

    animalArea = { x: animalX, y: animalY, width: animalSize, height: animalSize }

    if (showAnimalText && !gameOver) {
      renderAnimalTextBox(scaleFactor)
    }
  } else {
    animalArea = null
  }

  if (!reviveMode && flowerLoaded) {
    const flowerSize = Math.floor(190 * scaleFactor)
    const flowerX = Math.floor(10 * scaleFactor)
    const flowerY = Math.floor(height - flowerSize + 30 * scaleFactor)

    ctx.save()
    ctx.imageSmoothingEnabled = true
    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur = 10 * scaleFactor
    ctx.shadowOffsetX = 3 * scaleFactor
    ctx.shadowOffsetY = 3 * scaleFactor
    ctx.drawImage(flowerImage, flowerX, flowerY, flowerSize, flowerSize)
    ctx.restore()

    flowerArea = { x: flowerX, y: flowerY, width: flowerSize, height: flowerSize }
  }

  ctx.fillStyle = THEME_FOREST.text.dark
  ctx.font = `bold ${40 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('合合小鸟', headerX + 10 * scaleFactor, headerY + 20 * scaleFactor)

  ctx.font = `${10 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
  ctx.fillStyle = 'rgba(43,65,98,0.45)'
  ctx.fillText(`v${APP_VERSION}`, headerX + 10 * scaleFactor, headerY + 62 * scaleFactor)

  const scoreCardWidth = 110 * scaleFactor
  const scoreCardHeight = 85 * scaleFactor
  const scoreGap = 15 * scaleFactor
  const currentScoreX = headerX + headerWidth - scoreCardWidth * 2 - scoreGap - 15 * scaleFactor
  const highScoreX = currentScoreX + scoreCardWidth + scoreGap

  drawScoreCard(currentScoreX, headerY, scoreCardWidth, scoreCardHeight, '分数', score)
  drawScoreCard(highScoreX, headerY, scoreCardWidth, scoreCardHeight, '最高分', highScore)

  ctx.fillStyle = THEME_FOREST.boardBackground
  roundRect(ctx, boardX, boardY, boardSize, boardSize, 12 * scaleFactor, true)
  drawGridLines(boardX, boardY, boardSize, gapSize, cellSize)

  const needSwipePreview = swipe && swipe.progress > 0.15
  if (needSwipePreview) {
    renderSwipeFeedback(boardX, boardY, cellSize, gapSize, swipe)
  } else {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const x = boardX + gapSize + j * (cellSize + gapSize)
        const y = boardY + gapSize + i * (cellSize + gapSize)
        ctx.fillStyle = THEME_FOREST.emptyCell
        roundRect(ctx, x, y, cellSize, cellSize, 6, true)

        if (board[i][j] !== 0) {
          drawTile(x, y, cellSize, board[i][j])
        }
      }
    }
  }

  const soundBtnSize = 40 * scaleFactor
  const soundBtnX = Math.floor(width - soundBtnSize - 15 * scaleFactor)
  const soundBtnY = Math.floor(boardY + boardSize + 20 * scaleFactor)

  ctx.fillStyle = soundEnabled ? THEME_FOREST.tiles['16'].background : THEME_FOREST.emptyCell
  roundRect(ctx, soundBtnX, soundBtnY, soundBtnSize, soundBtnSize, 5, true)
  ctx.fillStyle = soundEnabled ? THEME_FOREST.tiles['16'].text : THEME_FOREST.text.dark
  ctx.font = `bold ${soundBtnSize * 0.5}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(soundEnabled ? '🔊' : '🔇', soundBtnX + soundBtnSize / 2, soundBtnY + soundBtnSize / 2)

  soundButtonArea = {
    x: soundBtnX,
    y: soundBtnY,
    width: soundBtnSize,
    height: soundBtnSize
  }

  if (reviveMode) {
    renderReviveInstructions(layout)
  }

  winBannerArea = null
  if (gameOver) {
    currentRestartBtn = renderGameOverModal()
  } else {
    currentRestartBtn = null
    if (gameWon && !gameWonDismissed) {
      winBannerArea = renderWinBanner(scaleFactor)
    }
  }

  return {
    soundBtn: soundButtonArea,
    animalBtn: gameOver || reviveMode ? null : animalArea,
    winBanner: winBannerArea
  }
}

function renderWinBanner(scaleFactor) {
  const bannerWidth = width * 0.72
  const bannerHeight = 52 * scaleFactor
  const bannerX = (width - bannerWidth) / 2
  const bannerY = height * 0.02

  ctx.fillStyle = THEME_FOREST.gameWon.background
  roundRect(ctx, bannerX, bannerY, bannerWidth, bannerHeight, 10, true)

  ctx.fillStyle = THEME_FOREST.text.dark
  ctx.font = `bold ${16 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('达成 2048！点击继续', width / 2, bannerY + bannerHeight / 2)

  return { x: bannerX, y: bannerY, width: bannerWidth, height: bannerHeight }
}

function drawGridLines(boardX, boardY, boardSize, gapSize, cellSize) {
  ctx.strokeStyle = THEME_FOREST.gridLine
  ctx.lineWidth = 1

  for (let i = 1; i < 4; i++) {
    const x = boardX + gapSize + i * (cellSize + gapSize) - gapSize / 2
    ctx.beginPath()
    ctx.moveTo(x, boardY + gapSize)
    ctx.lineTo(x, boardY + boardSize - gapSize)
    ctx.stroke()
  }

  for (let i = 1; i < 4; i++) {
    const y = boardY + gapSize + i * (cellSize + gapSize) - gapSize / 2
    ctx.beginPath()
    ctx.moveTo(boardX + gapSize, y)
    ctx.lineTo(boardX + boardSize - gapSize, y)
    ctx.stroke()
  }
}

function drawScoreCard(x, y, cardWidth, cardHeight, label, value) {
  ctx.shadowColor = THEME_FOREST.score.shadow
  ctx.shadowBlur = 6
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 3

  ctx.fillStyle = THEME_FOREST.score.background
  roundRect(ctx, x, y, cardWidth, cardHeight, 8, true)

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  ctx.fillStyle = THEME_FOREST.score.text
  ctx.font = `${cardWidth * 0.14}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(label, x + cardWidth / 2, y + cardHeight * 0.15)

  ctx.font = `bold ${cardWidth * 0.26}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.fillText(value.toLocaleString(), x + cardWidth / 2, y + cardHeight * 0.65)
}

function drawTile(x, y, size, value) {
  const style = getTileStyle(value)
  ctx.fillStyle = style.background
  roundRect(ctx, x, y, size, size, 6, true)

  const fontSize = value < 100 ? size / 2 : value < 1000 ? size / 2.5 : size / 3.2
  ctx.fillStyle = style.text
  ctx.font = `bold ${fontSize}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(value), x + size / 2, y + size / 2)
}

function roundRect(context, x, y, w, h, radius, fill, stroke) {
  context.save()

  if (typeof stroke === 'undefined') stroke = false
  if (typeof radius === 'undefined') radius = 5
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius }
  } else {
    const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 }
    for (const side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side]
    }
  }

  context.beginPath()
  context.moveTo(x + radius.tl, y)
  context.lineTo(x + w - radius.tr, y)
  context.quadraticCurveTo(x + w, y, x + w, y + radius.tr)
  context.lineTo(x + w, y + h - radius.br)
  context.quadraticCurveTo(x + w, y + h, x + w - radius.br, y + h)
  context.lineTo(x + radius.bl, y + h)
  context.quadraticCurveTo(x, y + h, x, y + h - radius.bl)
  context.lineTo(x, y + radius.tl)
  context.quadraticCurveTo(x, y, x + radius.tl, y)
  context.closePath()
  if (fill) context.fill()
  if (stroke) context.stroke()
  context.restore()
}

function renderGameOverModal() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.fillRect(0, 0, width, height)

  const modalWidth = width * 0.8
  const modalHeight = height * 0.5
  const modalX = (width - modalWidth) / 2
  const modalY = (height - modalHeight) / 2

  ctx.fillStyle = THEME_FOREST.background
  roundRect(ctx, modalX, modalY, modalWidth, modalHeight, 10, true)

  ctx.fillStyle = THEME_FOREST.text.dark
  ctx.font = 'bold 28px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('游戏结束', width / 2, modalY + modalHeight * 0.2)

  ctx.font = '20px Arial'
  ctx.fillText(`最终分数: ${score}`, width / 2, modalY + modalHeight * 0.35)

  const btnWidth = modalWidth * 0.6
  const btnHeight = 50
  const btnX = (width - btnWidth) / 2
  const btnY = modalY + modalHeight * 0.55

  ctx.fillStyle = THEME_FOREST.tiles['64'].background
  roundRect(ctx, btnX, btnY, btnWidth, btnHeight, 5, true)
  ctx.fillStyle = THEME_FOREST.text.light
  ctx.font = 'bold 20px Arial'
  ctx.fillText('再来一次', width / 2, btnY + btnHeight / 2)

  const buttons = {
    restart: { x: btnX, y: btnY, width: btnWidth, height: btnHeight }
  }

  if (canRevive > 0) {
    const reviveBtnY = modalY + modalHeight * 0.75
    ctx.fillStyle = THEME_FOREST.tiles['512'].background
    roundRect(ctx, btnX, reviveBtnY, btnWidth, btnHeight, 5, true)
    ctx.fillStyle = THEME_FOREST.text.dark
    ctx.font = 'bold 20px Arial'
    ctx.fillText(`移除一个方块复活 (${canRevive})`, width / 2, reviveBtnY + btnHeight / 2)
    buttons.revive = { x: btnX, y: reviveBtnY, width: btnWidth, height: btnHeight }
  }

  return buttons
}

function pointInRect(x, y, rect) {
  return rect &&
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
}

function unlockAudioIfNeeded() {
  if (audioUnlocked || !soundEnabled) return
  audioUnlocked = true
  try {
    birdSound.play()
    birdSound.stop()
    moveSound.play()
    moveSound.stop()
    mergeSound.play()
    mergeSound.stop()
  } catch (e) {
    // 忽略首次解锁失败，后续手势可再试
  }
}

function handleTap(endX, endY) {
  const uiElements = render()

  if (gameOver && currentRestartBtn) {
    if (pointInRect(endX, endY, currentRestartBtn.restart)) {
      init()
      return true
    }
    if (canRevive > 0 && pointInRect(endX, endY, currentRestartBtn.revive)) {
      activateReviveMode()
      return true
    }
  }

  if (!gameOver && gameWon && !gameWonDismissed && pointInRect(endX, endY, uiElements.winBanner)) {
    gameWonDismissed = true
    render()
    return true
  }

  if (pointInRect(endX, endY, uiElements.soundBtn)) {
    toggleSound()
    render()
    return true
  }

  if (!reviveMode && !gameOver) {
    if (pointInRect(endX, endY, uiElements.animalBtn)) {
      playBirdSound()
      toggleAnimalText()
      return true
    }
    if (showAnimalText) {
      showAnimalText = false
      render()
      return true
    }
  }

  return false
}

wx.onTouchStart(startEvent => {
  unlockAudioIfNeeded()

  startX = startEvent.touches[0].clientX
  startY = startEvent.touches[0].clientY
  hasMoved = false
  currentSwipe = { direction: 'none', progress: 0 }
})

wx.onTouchMove(moveEvent => {
  if (reviveMode || gameOver) return

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

    if (
      now - lastRenderTime > 60 &&
      (oldDirection !== currentSwipe.direction ||
        Math.abs(oldProgress - currentSwipe.progress) > 0.15)
    ) {
      lastRenderTime = now
      render(currentSwipe)
    }
  }
})

wx.onTouchEnd(endEvent => {
  const endX = endEvent.changedTouches[0].clientX
  const endY = endEvent.changedTouches[0].clientY
  const diffX = endX - startX
  const diffY = endY - startY

  currentSwipe = { direction: 'none', progress: 0 }

  if (!hasMoved || (Math.abs(diffX) < 5 && Math.abs(diffY) < 5)) {
    if (reviveMode) {
      handleReviveTileSelection(endX, endY)
      return
    }
    handleTap(endX, endY)
    return
  }

  if (reviveMode) {
    handleReviveTileSelection(endX, endY)
    return
  }

  if (gameOver) {
    render()
    return
  }

  let moved = false
  if (Math.abs(diffX) > Math.abs(diffY)) {
    moved = diffX > 0 ? moveRight() : moveLeft()
  } else {
    moved = diffY > 0 ? moveDown() : moveUp()
  }

  if (moved) {
    addRandomNumber()
    checkGameStatus()
    render()
  } else {
    render()
  }
})

function handleReviveTileSelection(touchX, touchY) {
  const { gapSize, cellSize, boardSize, boardX, boardY } = getLayout()

  if (
    touchX < boardX ||
    touchX > boardX + boardSize ||
    touchY < boardY ||
    touchY > boardY + boardSize
  ) {
    return
  }

  const relX = touchX - boardX - gapSize
  const relY = touchY - boardY - gapSize
  const col = Math.floor(relX / (cellSize + gapSize))
  const row = Math.floor(relY / (cellSize + gapSize))

  if (row >= 0 && row < 4 && col >= 0 && col < 4 && board[row][col] !== 0) {
    playMoveSound()
    board[row][col] = 0
    reviveMode = false
    canRevive--
    render()
  }
}

function activateReviveMode() {
  playMergeSound()
  reviveMode = true
  gameOver = false
  currentRestartBtn = null
  render()
}

function renderReviveInstructions(layout) {
  const { scaleFactor, boardSize, boardY } = layout || getLayout()
  const textY = boardY + boardSize + 60 * scaleFactor

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'
  ctx.lineWidth = 3
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${20 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.strokeText('点击一个方块将其移除，游戏将继续', width / 2, textY)
  ctx.fillText('点击一个方块将其移除，游戏将继续', width / 2, textY)
}

function isGameOver() {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] === 0) return false
    }
  }

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i][j] === board[i][j + 1]) return false
    }
  }

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] === board[i + 1][j]) return false
    }
  }

  return true
}

function checkGameStatus() {
  let reached2048 = false
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] >= 2048) {
        reached2048 = true
      }
    }
  }

  if (reached2048 && !gameWon) {
    gameWon = true
    gameWonDismissed = false
  }

  if (isGameOver()) {
    gameOver = true
  }
}

function moveLeft() {
  let moved = false
  let merged = false

  for (let i = 0; i < 4; i++) {
    const row = board[i].filter(val => val)
    const newRow = []

    for (let j = 0; j < row.length; j++) {
      if (row[j] === row[j + 1]) {
        newRow.push(row[j] * 2)
        updateScore(row[j] * 2)
        j++
        merged = true
      } else {
        newRow.push(row[j])
      }
    }

    while (newRow.length < 4) newRow.push(0)
    if (newRow.toString() !== board[i].toString()) moved = true
    board[i] = newRow
  }

  if (moved) {
    if (merged) playMergeSound()
    else playMoveSound()
  }

  return moved
}

function moveRight() {
  let moved = false
  let merged = false

  for (let i = 0; i < 4; i++) {
    const row = board[i].filter(val => val)
    const newRow = []

    for (let j = row.length - 1; j >= 0; j--) {
      if (row[j] === row[j - 1]) {
        newRow.unshift(row[j] * 2)
        updateScore(row[j] * 2)
        j--
        merged = true
      } else {
        newRow.unshift(row[j])
      }
    }

    while (newRow.length < 4) newRow.unshift(0)
    if (newRow.toString() !== board[i].toString()) moved = true
    board[i] = newRow
  }

  if (moved) {
    if (merged) playMergeSound()
    else playMoveSound()
  }

  return moved
}

function moveUp() {
  let moved = false
  let merged = false

  for (let j = 0; j < 4; j++) {
    const column = []
    for (let i = 0; i < 4; i++) {
      if (board[i][j] !== 0) column.push(board[i][j])
    }

    const newColumn = []
    for (let i = 0; i < column.length; i++) {
      if (column[i] === column[i + 1]) {
        newColumn.push(column[i] * 2)
        updateScore(column[i] * 2)
        i++
        merged = true
      } else {
        newColumn.push(column[i])
      }
    }

    while (newColumn.length < 4) newColumn.push(0)
    for (let i = 0; i < 4; i++) {
      if (board[i][j] !== newColumn[i]) moved = true
      board[i][j] = newColumn[i]
    }
  }

  if (moved) {
    if (merged) playMergeSound()
    else playMoveSound()
  }

  return moved
}

function moveDown() {
  let moved = false
  let merged = false

  for (let j = 0; j < 4; j++) {
    const column = []
    for (let i = 0; i < 4; i++) {
      if (board[i][j] !== 0) column.push(board[i][j])
    }

    const newColumn = []
    for (let i = column.length - 1; i >= 0; i--) {
      if (column[i] === column[i - 1]) {
        newColumn.unshift(column[i] * 2)
        updateScore(column[i] * 2)
        i--
        merged = true
      } else {
        newColumn.unshift(column[i])
      }
    }

    while (newColumn.length < 4) newColumn.unshift(0)
    for (let i = 0; i < 4; i++) {
      if (board[i][j] !== newColumn[i]) moved = true
      board[i][j] = newColumn[i]
    }
  }

  if (moved) {
    if (merged) playMergeSound()
    else playMoveSound()
  }

  return moved
}

function renderSwipeFeedback(boardX, boardY, cellSize, gapSize, swipe) {
  const maxOffset = cellSize * 0.02
  const offset = maxOffset * swipe.progress
  let offsetX = 0
  let offsetY = 0

  switch (swipe.direction) {
    case 'left':
      offsetX = -offset
      break
    case 'right':
      offsetX = offset
      break
    case 'up':
      offsetY = -offset
      break
    case 'down':
      offsetY = offset
      break
  }

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const x = boardX + gapSize + j * (cellSize + gapSize)
      const y = boardY + gapSize + i * (cellSize + gapSize)
      ctx.fillStyle = THEME_FOREST.emptyCell
      roundRect(ctx, x, y, cellSize, cellSize, 6, true)
    }
  }

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] !== 0) {
        const x = boardX + gapSize + j * (cellSize + gapSize) + offsetX
        const y = boardY + gapSize + i * (cellSize + gapSize) + offsetY
        drawTile(x, y, cellSize, board[i][j])
      }
    }
  }
}

function initSounds() {
  if (audioInitialized) return

  moveSound.src = 'audio/move.mp3'
  moveSound.loop = false
  moveSound.volume = 0.6
  moveSound.onError(function (err) {
    console.error('移动音效加载失败:', err)
  })

  mergeSound.src = 'audio/merge.mp3'
  mergeSound.loop = false
  mergeSound.volume = 0.7
  mergeSound.onError(function (err) {
    console.error('合并音效加载失败:', err)
  })

  birdSound.src = 'audio/bird.mp3'
  birdSound.loop = false
  birdSound.volume = 0.4
  birdSound.onError(function (res) {
    console.error('Failed to load bird sound:', res)
  })

  try {
    const savedSoundEnabled = wx.getStorageSync('soundEnabled')
    if (savedSoundEnabled === true || savedSoundEnabled === false) {
      soundEnabled = savedSoundEnabled
    }
  } catch (e) {
    console.error('读取音效设置失败', e)
  }

  audioInitialized = true
}

function playAudio(sound) {
  if (!soundEnabled || !audioInitialized) return
  try {
    sound.stop()
    sound.seek(0)
    sound.play()
  } catch (e) {
    console.error('播放音效失败:', e)
  }
}

function playMoveSound() {
  playAudio(moveSound)
}

function playMergeSound() {
  playAudio(mergeSound)
}

function playBirdSound() {
  playAudio(birdSound)
}

function toggleSound() {
  soundEnabled = !soundEnabled
  try {
    wx.setStorageSync('soundEnabled', soundEnabled)
  } catch (e) {
    console.error('保存音效设置失败', e)
  }
  if (soundEnabled) {
    audioUnlocked = false
    unlockAudioIfNeeded()
  }
  return soundEnabled
}

function renderAnimalTextBox(scaleFactor) {
  const boxWidth = width * 0.5
  const boxHeight = height * 0.075
  const boxX = width * 0.07
  const boxY = height * 0.71

  ctx.fillStyle = THEME_FOREST.emptyCell
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 10, true)

  ctx.strokeStyle = THEME_FOREST.tiles['16'].background
  ctx.lineWidth = 2 * scaleFactor
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 10, false, true)

  ctx.fillStyle = THEME_FOREST.text.dark
  const text = animalTexts[currentTextIndex]
  const fontSize = (text.length > 30 ? 12 : 14) * scaleFactor
  ctx.font = `${fontSize}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  wrapText(ctx, text, boxX + boxWidth / 2, boxY + boxHeight / 2, boxWidth - 20 * scaleFactor, 18 * scaleFactor)

  ctx.font = `${10 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
  ctx.fillText('点击继续...', boxX + boxWidth - 40 * scaleFactor, boxY + boxHeight - 10 * scaleFactor)
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split('')
  let line = ''
  let lineCount = 0

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n]
    const metrics = context.measureText(testLine)
    if (metrics.width > maxWidth && n > 0) {
      context.fillText(line, x, y - lineHeight / 2 + lineCount * lineHeight)
      line = words[n]
      lineCount++
    } else {
      line = testLine
    }
  }

  context.fillText(line, x, y - lineHeight / 2 + lineCount * lineHeight)
}

function toggleAnimalText() {
  if (showAnimalText) {
    currentTextIndex = (currentTextIndex + 1) % animalTexts.length
  } else {
    showAnimalText = true
  }
  render()
}

wx.onShow(() => {
  if (!audioInitialized) {
    initSounds()
  }
})

init()
