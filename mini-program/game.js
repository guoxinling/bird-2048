import './js/libs/weapp-adapter'
import './js/libs/symbol'

const APP_VERSION = '1.1.0'

const MAX_UNDOS = 2
const MAX_REVIVES = 1
const MILESTONES = [512, 1024, 2048]
const SLIDE_MS = 140
const SPAWN_START_MS = 80
const SPAWN_MS = 100
const POP_START_MS = 120
const POP_MS = 80
const MOVE_ANIM_MS = 200
const SCORE_POP_MS = 420

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

const bgImage = wx.createImage()
let bgLoaded = false

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
  '点我可以衔回上一步，每局两次哦！',
  '误滑了别慌，让我帮你把格子衔回来~'
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

let reviveMode = false
let canRevive = MAX_REVIVES

let undoLeft = MAX_UNDOS
let undoStack = []
let showAssistPanel = false
let assistUndoBtn = null
let assistHintBtn = null
let reachedMilestones = new Set()

let currentRestartBtn = null
let currentSwipe = { direction: 'none', progress: 0 }
let soundButtonArea = null

let lastRenderTime = 0
let startX = 0
let startY = 0
let hasMoved = false

let animating = false
let moveAnim = null
let displayScore = 0
let scorePopup = null
let highScoreFlashUntil = 0
let birdEvent = null
let loopStarted = false

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

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

function cellPos(layout, row, col) {
  return {
    x: layout.boardX + layout.gapSize + col * (layout.cellSize + layout.gapSize),
    y: layout.boardY + layout.gapSize + row * (layout.cellSize + layout.gapSize)
  }
}

function triggerBirdEvent(type) {
  birdEvent = { type, start: Date.now() }
}

function cloneBoard(source) {
  return source.map(row => row.slice())
}

function captureSnapshot() {
  return {
    board: cloneBoard(board),
    score,
    gameOver,
    gameWon,
    reachedMilestones: Array.from(reachedMilestones)
  }
}

function restoreSnapshot(snapshot) {
  board = cloneBoard(snapshot.board)
  score = snapshot.score
  displayScore = snapshot.score
  gameOver = snapshot.gameOver
  gameWon = snapshot.gameWon
  reachedMilestones = new Set(snapshot.reachedMilestones)
}

function updateScore(value) {
  score += value
  if (score > highScore) {
    highScore = score
    highScoreFlashUntil = Date.now() + 220
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
  displayScore = 0
  gameOver = false
  gameWon = false
  canRevive = MAX_REVIVES
  reviveMode = false
  undoLeft = MAX_UNDOS
  undoStack = []
  showAssistPanel = false
  reachedMilestones = new Set()
  currentRestartBtn = null
  showAnimalText = false
  currentSwipe = { direction: 'none', progress: 0 }
  animating = false
  moveAnim = null
  scorePopup = null
  birdEvent = null

  initSounds()
  loadAnimalImage()
  loadBackgroundImage()

  addRandomNumber()
  addRandomNumber()
  displayScore = score
  render()
  startMainLoop()

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

function loadBackgroundImage() {
  bgImage.src = 'images/bg.jpg'
  bgImage.onload = function () {
    bgLoaded = true
    render()
  }
  bgImage.onerror = function (e) {
    console.error('背景图片加载失败:', e)
  }
}

function drawBackground() {
  ctx.fillStyle = THEME_FOREST.background
  ctx.fillRect(0, 0, width, height)
  if (!bgLoaded || !bgImage.width || !bgImage.height) return

  const scale = Math.max(width / bgImage.width, height / bgImage.height)
  const dw = bgImage.width * scale
  const dh = bgImage.height * scale
  const dx = (width - dw) / 2
  const dy = height - dh
  ctx.drawImage(bgImage, dx, dy, dw, dh)
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

  if (emptyPositions.length === 0) return null

  const position = emptyPositions[Math.floor(Math.random() * emptyPositions.length)]
  // 90% -> 2, 10% -> 4（与 shared/game-rules.md 1.1 一致）
  board[position.row][position.col] = Math.random() < 0.9 ? 2 : 4
  return {
    row: position.row,
    col: position.col,
    value: board[position.row][position.col]
  }
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

  drawBackground()

  if (!reviveMode && animalLoaded) {
    animalArea = drawBird(scaleFactor)

    if (showAssistPanel && !gameOver) {
      renderAssistPanel(scaleFactor, animalArea)
    } else {
      assistUndoBtn = null
      assistHintBtn = null
    }

    if (showAnimalText && !gameOver) {
      renderAnimalTextBox(scaleFactor)
    }
  } else {
    animalArea = null
    assistUndoBtn = null
    assistHintBtn = null
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

  const shownScore = animating && moveAnim ? Math.round(displayScore) : score
  const scoreFlash = Date.now() < highScoreFlashUntil
  drawScoreCard(currentScoreX, headerY, scoreCardWidth, scoreCardHeight, '分数', shownScore, false)
  drawScoreCard(highScoreX, headerY, scoreCardWidth, scoreCardHeight, '最高分', highScore, scoreFlash)
  drawScorePopup(currentScoreX, headerY, scoreCardWidth, scaleFactor)

  ctx.fillStyle = THEME_FOREST.boardBackground
  roundRect(ctx, boardX, boardY, boardSize, boardSize, 12 * scaleFactor, true)
  drawGridLines(boardX, boardY, boardSize, gapSize, cellSize)

  const needSwipePreview = !animating && swipe && swipe.progress > 0.15
  if (needSwipePreview) {
    renderSwipeFeedback(boardX, boardY, cellSize, gapSize, swipe)
  } else if (animating && moveAnim) {
    renderBoardAnimation(layout)
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

  if (gameOver) {
    currentRestartBtn = renderGameOverModal()
  } else {
    currentRestartBtn = null
  }

  return {
    soundBtn: soundButtonArea,
    animalBtn: gameOver || reviveMode ? null : animalArea,
    assistUndoBtn,
    assistHintBtn
  }
}

function drawBird(scaleFactor) {
  const animalSize = Math.floor(300 * scaleFactor)
  const animalX = Math.floor(width - animalSize + 10 * scaleFactor)
  const animalY = Math.floor(height - animalSize + 15 * scaleFactor)
  const area = { x: animalX, y: animalY, width: animalSize, height: animalSize }
  const now = Date.now()
  const idle = !gameOver && !reviveMode
  let bob = idle ? Math.sin(now / 800) * 4 : 0
  let tilt = idle ? Math.sin(now / 1600) * 2 * Math.PI / 180 : 0
  let squash = 1

  if (birdEvent && idle) {
    const t = (now - birdEvent.start) / 280
    if (t >= 1) {
      birdEvent = null
    } else {
      const wave = Math.sin(Math.min(t, 1) * Math.PI)
      if (birdEvent.type === 'hop') {
        bob -= 8 * wave
        squash = 1 - 0.08 * wave
      } else if (birdEvent.type === 'peck') {
        tilt += (8 * wave) * Math.PI / 180
      } else if (birdEvent.type === 'nudge') {
        tilt += Math.sin(t * Math.PI * 4) * 3 * Math.PI / 180
        bob -= 3 * wave
      }
    }
  }

  const originX = animalX + animalSize * 0.52
  const originY = animalY + animalSize * 0.82
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.translate(originX, originY + bob)
  ctx.rotate(tilt)
  ctx.scale(1 / squash, squash)
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 10 * scaleFactor
  ctx.shadowOffsetX = 3 * scaleFactor
  ctx.shadowOffsetY = 3 * scaleFactor
  ctx.drawImage(animalImage, animalX - originX, animalY - originY, animalSize, animalSize)
  ctx.restore()

  drawUndoBadge(area, scaleFactor, bob)
  return area
}

function drawUndoBadge(area, scaleFactor, bob = 0) {
  const badgeSize = 28 * scaleFactor
  const badgeX = area.x + area.width * 0.18
  const badgeY = area.y + area.height * 0.22 + bob
  ctx.fillStyle = undoLeft > 0 ? THEME_FOREST.tiles['64'].background : THEME_FOREST.emptyCell
  roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, badgeSize / 2, true)
  ctx.fillStyle = undoLeft > 0 ? THEME_FOREST.text.light : THEME_FOREST.text.dark
  ctx.font = `bold ${14 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(undoLeft), badgeX + badgeSize / 2, badgeY + badgeSize / 2)
}

function renderAssistPanel(scaleFactor, animalArea) {
  const panelWidth = width * 0.52
  const panelHeight = 108 * scaleFactor
  const panelX = Math.max(12 * scaleFactor, animalArea.x - panelWidth + 36 * scaleFactor)
  const panelY = animalArea.y - 4 * scaleFactor

  ctx.fillStyle = THEME_FOREST.background
  roundRect(ctx, panelX, panelY, panelWidth, panelHeight, 12, true)
  ctx.strokeStyle = THEME_FOREST.tiles['16'].background
  ctx.lineWidth = 2 * scaleFactor
  roundRect(ctx, panelX, panelY, panelWidth, panelHeight, 12, false, true)

  ctx.fillStyle = THEME_FOREST.text.dark
  ctx.font = `bold ${13 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('小鸟助攻', panelX + 12 * scaleFactor, panelY + 10 * scaleFactor)

  const btnWidth = panelWidth - 24 * scaleFactor
  const btnHeight = 32 * scaleFactor
  const undoY = panelY + 32 * scaleFactor
  const hintY = undoY + btnHeight + 6 * scaleFactor
  const canUndo = undoLeft > 0 && undoStack.length > 0

  ctx.fillStyle = canUndo ? THEME_FOREST.tiles['64'].background : THEME_FOREST.emptyCell
  roundRect(ctx, panelX + 12 * scaleFactor, undoY, btnWidth, btnHeight, 8, true)
  ctx.fillStyle = canUndo ? THEME_FOREST.text.light : THEME_FOREST.text.dark
  ctx.font = `bold ${13 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(
    canUndo ? `衔回上一步 (${undoLeft})` : '衔回已用完',
    panelX + 12 * scaleFactor + btnWidth / 2,
    undoY + btnHeight / 2
  )

  ctx.fillStyle = THEME_FOREST.tiles['16'].background
  roundRect(ctx, panelX + 12 * scaleFactor, hintY, btnWidth, btnHeight, 8, true)
  ctx.fillStyle = THEME_FOREST.tiles['16'].text
  ctx.fillText('听提示', panelX + 12 * scaleFactor + btnWidth / 2, hintY + btnHeight / 2)

  assistUndoBtn = canUndo
    ? { x: panelX + 12 * scaleFactor, y: undoY, width: btnWidth, height: btnHeight }
    : null
  assistHintBtn = { x: panelX + 12 * scaleFactor, y: hintY, width: btnWidth, height: btnHeight }
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

function drawScoreCard(x, y, cardWidth, cardHeight, label, value, flash = false) {
  ctx.shadowColor = THEME_FOREST.score.shadow
  ctx.shadowBlur = 6
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 3

  ctx.fillStyle = flash ? THEME_FOREST.tiles['16'].background : THEME_FOREST.score.background
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

function drawScorePopup(cardX, cardY, cardWidth, scaleFactor) {
  if (!scorePopup) return
  const t = (Date.now() - scorePopup.start) / SCORE_POP_MS
  if (t >= 1) {
    scorePopup = null
    return
  }
  ctx.save()
  ctx.globalAlpha = 1 - t
  ctx.fillStyle = THEME_FOREST.tiles['128'].background
  ctx.font = `bold ${18 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(`+${scorePopup.delta}`, cardX + cardWidth / 2, cardY - 4 * scaleFactor - t * 28 * scaleFactor)
  ctx.restore()
}

function drawTile(x, y, size, value, scale = 1) {
  const style = getTileStyle(value)
  const cx = x + size / 2
  const cy = y + size / 2
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(scale, scale)
  ctx.fillStyle = style.background
  roundRect(ctx, -size / 2, -size / 2, size, size, 6, true)

  const fontSize = value < 100 ? size / 2 : value < 1000 ? size / 2.5 : size / 3.2
  ctx.fillStyle = style.text
  ctx.font = `bold ${fontSize}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(value), 0, 0)
  ctx.restore()
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

  if (pointInRect(endX, endY, uiElements.soundBtn)) {
    toggleSound()
    render()
    return true
  }

  if (!reviveMode && !gameOver) {
    if (showAssistPanel && pointInRect(endX, endY, uiElements.assistUndoBtn)) {
      performUndo()
      return true
    }
    if (showAssistPanel && pointInRect(endX, endY, uiElements.assistHintBtn)) {
      showAssistPanel = false
      playBirdSound()
      toggleAnimalText()
      return true
    }
    if (pointInRect(endX, endY, uiElements.animalBtn)) {
      playBirdSound()
      triggerBirdEvent('hop')
      showAssistPanel = !showAssistPanel
      showAnimalText = false
      render()
      return true
    }
    if (showAssistPanel) {
      showAssistPanel = false
      render()
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
  if (animating || reviveMode || gameOver) return

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

  if (animating) {
    if (!hasMoved || (Math.abs(diffX) < 5 && Math.abs(diffY) < 5)) {
      handleTap(endX, endY)
    }
    return
  }

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

  const snapshot = captureSnapshot()
  const oldBoard = cloneBoard(board)
  const oldScore = score
  let moved = false
  let direction = 'none'
  if (Math.abs(diffX) > Math.abs(diffY)) {
    direction = diffX > 0 ? 'right' : 'left'
    moved = diffX > 0 ? moveRight() : moveLeft()
  } else {
    direction = diffY > 0 ? 'down' : 'up'
    moved = diffY > 0 ? moveDown() : moveUp()
  }

  if (moved) {
    undoStack.push(snapshot)
    if (undoStack.length > MAX_UNDOS) undoStack.shift()
    showAssistPanel = false
    const anims = generateMoveAnims(oldBoard, direction)
    const postMove = cloneBoard(board)
    const spawn = addRandomNumber()
    const scoreDelta = score - oldScore
    checkGameStatus()
    if (scoreDelta > 0) triggerBirdEvent('nudge')
    startMoveAnimation(anims, postMove, spawn, oldScore, score, scoreDelta)
  } else {
    render()
  }
})

function performUndo() {
  if (undoLeft <= 0 || undoStack.length === 0 || reviveMode) return false
  const snapshot = undoStack.pop()
  restoreSnapshot(snapshot)
  undoLeft--
  showAssistPanel = false
  showAnimalText = false
  playBirdSound()
  triggerBirdEvent('peck')
  render()
  return true
}

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
  let maxTile = 0
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] > maxTile) maxTile = board[i][j]
    }
  }

  for (let i = 0; i < MILESTONES.length; i++) {
    const milestone = MILESTONES[i]
    if (maxTile >= milestone) reachedMilestones.add(milestone)
  }

  if (maxTile >= 2048) gameWon = true

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

function compressLine(cells) {
  const anims = []
  let dest = 0
  let i = 0
  while (i < cells.length) {
    if (i + 1 < cells.length && cells[i].value === cells[i + 1].value) {
      anims.push({
        from: cells[i].index,
        to: dest,
        value: cells[i].value,
        merged: true,
        result: cells[i].value * 2
      })
      anims.push({
        from: cells[i + 1].index,
        to: dest,
        value: cells[i + 1].value,
        merged: true,
        result: cells[i].value * 2
      })
      dest++
      i += 2
    } else {
      anims.push({
        from: cells[i].index,
        to: dest,
        value: cells[i].value,
        merged: false,
        result: cells[i].value
      })
      dest++
      i++
    }
  }
  return anims
}

function generateMoveAnims(oldBoard, direction) {
  const out = []
  if (direction === 'left' || direction === 'right') {
    for (let r = 0; r < 4; r++) {
      const cells = []
      if (direction === 'left') {
        for (let c = 0; c < 4; c++) {
          if (oldBoard[r][c]) cells.push({ index: c, value: oldBoard[r][c] })
        }
        compressLine(cells).forEach(a => {
          out.push({ sr: r, sc: a.from, er: r, ec: a.to, value: a.value, merged: a.merged, result: a.result })
        })
      } else {
        for (let c = 3; c >= 0; c--) {
          if (oldBoard[r][c]) cells.push({ index: c, value: oldBoard[r][c] })
        }
        compressLine(cells).forEach(a => {
          out.push({ sr: r, sc: a.from, er: r, ec: 3 - a.to, value: a.value, merged: a.merged, result: a.result })
        })
      }
    }
  } else {
    for (let c = 0; c < 4; c++) {
      const cells = []
      if (direction === 'up') {
        for (let r = 0; r < 4; r++) {
          if (oldBoard[r][c]) cells.push({ index: r, value: oldBoard[r][c] })
        }
        compressLine(cells).forEach(a => {
          out.push({ sr: a.from, sc: c, er: a.to, ec: c, value: a.value, merged: a.merged, result: a.result })
        })
      } else {
        for (let r = 3; r >= 0; r--) {
          if (oldBoard[r][c]) cells.push({ index: r, value: oldBoard[r][c] })
        }
        compressLine(cells).forEach(a => {
          out.push({ sr: a.from, sc: c, er: 3 - a.to, ec: c, value: a.value, merged: a.merged, result: a.result })
        })
      }
    }
  }
  return out
}

function startMoveAnimation(anims, postMove, spawn, oldScore, newScore, scoreDelta) {
  animating = true
  displayScore = oldScore
  if (scoreDelta > 0) {
    scorePopup = { delta: scoreDelta, start: Date.now() }
  }
  moveAnim = {
    anims,
    postMove,
    spawn,
    oldScore,
    newScore,
    start: Date.now()
  }
  render()
}

function renderBoardAnimation(layout) {
  const { cellSize } = layout
  const elapsed = Date.now() - moveAnim.start
  const slideT = easeOutCubic(Math.min(elapsed / SLIDE_MS, 1))
  const spawnT = elapsed < SPAWN_START_MS ? 0 : Math.min((elapsed - SPAWN_START_MS) / SPAWN_MS, 1)
  const popT = elapsed < POP_START_MS ? 0 : Math.min((elapsed - POP_START_MS) / POP_MS, 1)
  displayScore = moveAnim.oldScore + (moveAnim.newScore - moveAnim.oldScore) * Math.min(elapsed / SLIDE_MS, 1)

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const p = cellPos(layout, i, j)
      ctx.fillStyle = THEME_FOREST.emptyCell
      roundRect(ctx, p.x, p.y, cellSize, cellSize, 6, true)
    }
  }

  const incoming = {}
  moveAnim.anims.forEach(anim => {
    if (anim.sr !== anim.er || anim.sc !== anim.ec) {
      incoming[`${anim.er},${anim.ec}`] = true
    }
  })

  const spawnKey = moveAnim.spawn ? `${moveAnim.spawn.row},${moveAnim.spawn.col}` : ''
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const key = `${i},${j}`
      if (!moveAnim.postMove[i][j] || incoming[key] || key === spawnKey) continue
      const p = cellPos(layout, i, j)
      drawTile(p.x, p.y, cellSize, moveAnim.postMove[i][j])
    }
  }

  const drawnMerge = {}
  moveAnim.anims.forEach(anim => {
    const start = cellPos(layout, anim.sr, anim.sc)
    const end = cellPos(layout, anim.er, anim.ec)
    if (anim.merged && popT > 0) {
      const key = `${anim.er},${anim.ec}`
      if (!drawnMerge[key]) {
        drawnMerge[key] = true
        const scale = 1 + 0.12 * Math.sin(popT * Math.PI)
        drawTile(end.x, end.y, cellSize, anim.result, scale)
      }
      return
    }
    const x = start.x + (end.x - start.x) * slideT
    const y = start.y + (end.y - start.y) * slideT
    drawTile(x, y, cellSize, anim.value)
  })

  if (moveAnim.spawn && spawnT > 0) {
    const p = cellPos(layout, moveAnim.spawn.row, moveAnim.spawn.col)
    drawTile(p.x, p.y, cellSize, moveAnim.spawn.value, easeOutCubic(spawnT))
  }
}

function startMainLoop() {
  if (loopStarted) return
  loopStarted = true
  const tick = function () {
    requestAnimationFrame(tick)
    if (animating && moveAnim) {
      if (Date.now() - moveAnim.start >= MOVE_ANIM_MS) {
        animating = false
        moveAnim = null
        displayScore = score
        render()
        return
      }
      render()
      return
    }
    if (!gameOver && !reviveMode) {
      if (Date.now() - lastRenderTime > 32) {
        lastRenderTime = Date.now()
        render()
      }
    }
  }
  requestAnimationFrame(tick)
}

wx.onShow(() => {
  if (!audioInitialized) {
    initSounds()
  }
})

init()
