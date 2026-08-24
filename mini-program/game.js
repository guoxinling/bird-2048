import './js/libs/weapp-adapter'
import './js/libs/symbol'
import {
  buildNpcRows,
  checkFriendAuthSilent,
  dailyAllBeaten,
  detectNewBeats,
  drawHeheBirdAvatar,
  getBeijingDate,
  loadDailyBest,
  openAuthSetting,
  requestFriendAuth,
  saveDailyBest,
  uploadRankCloud
} from './js/rank.js'

const APP_VERSION = '1.4.0'
const SHARE_IMAGE = 'images/share.jpg'

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

function getCapsuleBottom() {
  try {
    if (typeof wx.getMenuButtonBoundingClientRect === 'function') {
      const rect = wx.getMenuButtonBoundingClientRect()
      if (rect && rect.bottom > 0) return rect.bottom
    }
  } catch (e) { /* fall through */ }
  return (windowInfo.statusBarHeight || 20) + 32
}

const capsuleBottom = getCapsuleBottom()

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

const rankBirdImage = wx.createImage()
let rankBirdLoaded = false

const crownImage = wx.createImage()
let crownLoaded = false

const bgImage = wx.createImage()
let bgLoaded = false

const hudIconImages = {
  trophy: wx.createImage(),
  refresh: wx.createImage()
}
const hudIconLoaded = {}

const TILE_BIRD_VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048]
const tileBirdImages = {}
const tileBirdLoaded = {}

const animalTexts = [
  '点我可以撤回上一步，每局两次哦！',
  '误滑了别慌，点我就能撤回~',
  '2048的诀窍是把大数留在角落！',
  '我是iTab插件的形象大使,你发现了没?',
  '我是一只能为你带来快乐的小鸟~'
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
let reachedMilestones = new Set()

let currentRestartBtn = null
let currentSwipe = { direction: 'none', progress: 0 }
let hudRestartBtn = null
let hudSettingsBtn = null
let hudRankBtn = null
let showSettings = false
let showRestartConfirm = false
let showRank = false
let rankTab = 'daily'
let rankFriendOk = false
let rankAuthTried = false
let friendAuthInflight = null
let rankCloseBtn = null
let rankTabDailyBtn = null
let rankTabTotalBtn = null
let rankAuthBtn = null
let rankListRect = null
let rankPanelRect = null
let rankPostDirty = true
let birdToast = null
let dailyBest = { d: '', s: 0 }
let settingsSoundBtn = null
let settingsCloseBtn = null
let confirmOkBtn = null
let confirmCancelBtn = null
let hudPressed = null

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
  const headerY = capsuleBottom + 10 * scaleFactor
  const scoreCardWidth = 110 * scaleFactor
  const scoreCardHeight = 72 * scaleFactor
  const scoreGap = 12 * scaleFactor
  const pillHeight = 36 * scaleFactor
  const pillGap = 8 * scaleFactor
  const boardSize = cellSize * 4 + gapSize * 5
  const boardX = (width - boardSize) / 2
  const toolbarY = headerY + scoreCardHeight + 12 * scaleFactor
  const minBoardY = toolbarY + pillHeight + 12 * scaleFactor
  const birdReserve = 210 * scaleFactor
  const maxBoardY = height - birdReserve - boardSize
  const centeredY = (height - boardSize) / 2 - height * 0.03
  let boardY = centeredY
  if (maxBoardY >= minBoardY) {
    boardY = Math.min(Math.max(centeredY, minBoardY), maxBoardY)
  } else {
    boardY = minBoardY
  }

  return {
    scaleFactor,
    headerWidth,
    headerX,
    headerY,
    scoreCardWidth,
    scoreCardHeight,
    scoreGap,
    pillHeight,
    pillGap,
    cellSize,
    gapSize,
    boardSize,
    boardX,
    boardY,
    toolbarY
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
  const oldHigh = highScore
  const oldDaily = (dailyBest && dailyBest.s) || 0
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
  dailyBest = saveDailyBest(score)
  if (dailyBest.s > oldDaily) noteNpcBeats('daily', dailyBest.s)
  if (highScore > oldHigh) noteNpcBeats('total', highScore)
  uploadRankCloud(highScore, dailyBest)
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
  showSettings = false
  showRestartConfirm = false
  showRank = false
  currentSwipe = { direction: 'none', progress: 0 }
  animating = false
  moveAnim = null
  scorePopup = null
  birdEvent = null

  initSounds()
  loadAnimalImage()
  loadRankBirdImage()
  loadBackgroundImage()
  loadCrownImage()
  loadHudIcons()
  loadTileBirdImages()

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

  dailyBest = loadDailyBest()
  if (score > 0) dailyBest = saveDailyBest(score)
  uploadRankCloud(highScore, dailyBest)
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

function loadRankBirdImage() {
  rankBirdImage.src = 'images/rank-bird.png'
  rankBirdImage.onload = function () {
    rankBirdLoaded = true
    if (showRank) render()
  }
}

function loadCrownImage() {
  crownImage.src = 'images/crown.png'
  crownImage.onload = function () {
    crownLoaded = true
    render()
  }
  crownImage.onerror = function (e) {
    console.error('皇冠图片加载失败:', e)
  }
}

function drawTitle(headerX, headerY, scaleFactor) {
  const fontSize = 40 * scaleFactor
  const titleX = headerX + 10 * scaleFactor
  const titleY = headerY + 16 * scaleFactor
  ctx.fillStyle = THEME_FOREST.text.dark
  ctx.font = `bold ${fontSize}px 'PingFang SC', 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('合合小鸟', titleX, titleY)

  if (!crownLoaded) return
  const birdX = titleX + ctx.measureText('合合小').width
  const birdW = ctx.measureText('鸟').width
  const size = fontSize * 0.5
  const x = birdX + birdW * 0.42 - size * 0.5
  const y = titleY - size * 0.52
  ctx.drawImage(crownImage, x, y, size, size)
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
    scoreCardWidth,
    scoreCardHeight,
    scoreGap,
    pillHeight,
    pillGap,
    cellSize,
    gapSize,
    boardSize,
    boardX,
    boardY,
    toolbarY
  } = layout

  drawBackground()

  if (!reviveMode && animalLoaded) {
    animalArea = drawBird(scaleFactor)

    if (showAssistPanel && canFetchUndo() && !gameOver && !showSettings && !showRestartConfirm && !showRank) {
      renderAssistPanel(scaleFactor, animalArea)
    } else {
      assistUndoBtn = null
    }

    if ((showAnimalText || (birdToast && Date.now() < birdToast.until)) && !gameOver && !showSettings && !showRestartConfirm && !showRank) {
      renderAnimalTextBox(scaleFactor)
    }
  } else {
    animalArea = null
    assistUndoBtn = null
  }

  drawTitle(headerX, headerY, scaleFactor)

  const currentScoreX = headerX + headerWidth - scoreCardWidth * 2 - scoreGap - 15 * scaleFactor
  const highScoreX = currentScoreX + scoreCardWidth + scoreGap

  const shownScore = animating && moveAnim ? Math.round(displayScore) : score
  const scoreFlash = Date.now() < highScoreFlashUntil
  drawScoreCard(currentScoreX, headerY, scoreCardWidth, scoreCardHeight, '分数', shownScore, false)
  drawScoreCard(highScoreX, headerY, scoreCardWidth, scoreCardHeight, '最高分', highScore, scoreFlash)
  drawScorePopup(currentScoreX, headerY, scoreCardWidth, scaleFactor)

  const pillsRight = highScoreX + scoreCardWidth
  hudSettingsBtn = drawHudButton(
    pillsRight, toolbarY, pillHeight,
    '设置', 'gear', 6 * scaleFactor, scaleFactor, hudPressed === 'settings'
  )
  hudRestartBtn = drawHudButton(
    hudSettingsBtn.x - pillGap, toolbarY, pillHeight,
    '重开', 'refresh', 6 * scaleFactor, scaleFactor, hudPressed === 'restart'
  )
  hudRankBtn = drawHudButton(
    hudRestartBtn.x - pillGap, toolbarY, pillHeight,
    '排行', 'trophy', 6 * scaleFactor, scaleFactor, hudPressed === 'rank'
  )

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

  if (reviveMode) {
    renderReviveInstructions(layout)
  }

  if (gameOver) {
    currentRestartBtn = renderGameOverModal()
  } else {
    currentRestartBtn = null
  }

  if (showRestartConfirm && !gameOver) {
    renderRestartConfirm(scaleFactor)
  } else {
    confirmOkBtn = null
    confirmCancelBtn = null
  }

  if (showSettings && !gameOver && !showRank) {
    renderSettingsPanel(scaleFactor)
  } else {
    settingsSoundBtn = null
    settingsCloseBtn = null
  }

  if (showRank) {
    renderRankPanel(scaleFactor, layout)
  } else {
    rankCloseBtn = null
    rankTabDailyBtn = null
    rankTabTotalBtn = null
    rankAuthBtn = null
    rankListRect = null
    rankPanelRect = null
  }

  return {
    animalBtn: gameOver || reviveMode || showSettings || showRestartConfirm || showRank ? null : animalArea,
    assistUndoBtn,
    hudRestartBtn: gameOver || showRank ? null : hudRestartBtn,
    hudSettingsBtn: gameOver || showRank ? null : hudSettingsBtn,
    hudRankBtn: showSettings || showRestartConfirm || showRank ? null : hudRankBtn
  }
}

function drawBird(scaleFactor) {
  const animalSize = Math.floor(220 * scaleFactor)
  const animalX = Math.floor(width - animalSize + 8 * scaleFactor)
  const animalY = Math.floor(height - animalSize - 24 * scaleFactor)
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

function canFetchUndo() {
  return undoLeft > 0 && undoStack.length > 0
}

function drawUndoBadge(area, scaleFactor, bob = 0) {
  if (undoLeft <= 0) return
  const badgeSize = 28 * scaleFactor
  const badgeX = area.x + area.width * 0.18
  const badgeY = area.y + area.height * 0.22 + bob
  ctx.fillStyle = THEME_FOREST.tiles['64'].background
  roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, badgeSize / 2, true)
  ctx.fillStyle = THEME_FOREST.text.light
  ctx.font = `bold ${14 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(undoLeft), badgeX + badgeSize / 2, badgeY + badgeSize / 2)
}

function renderAssistPanel(scaleFactor, animalArea) {
  const panelWidth = width * 0.52
  const panelHeight = 78 * scaleFactor
  const panelX = Math.max(12 * scaleFactor, animalArea.x - panelWidth + 36 * scaleFactor)
  const panelY = animalArea.y + 8 * scaleFactor

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
  const btnHeight = 36 * scaleFactor
  const undoY = panelY + 32 * scaleFactor

  ctx.fillStyle = THEME_FOREST.tiles['64'].background
  roundRect(ctx, panelX + 12 * scaleFactor, undoY, btnWidth, btnHeight, 8, true)
  ctx.fillStyle = THEME_FOREST.text.light
  ctx.font = `bold ${13 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(
    `撤回上一步 (${undoLeft})`,
    panelX + 12 * scaleFactor + btnWidth / 2,
    undoY + btnHeight / 2
  )

  assistUndoBtn = { x: panelX + 12 * scaleFactor, y: undoY, width: btnWidth, height: btnHeight }
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

function drawHudButton(anchorX, y, h, label, icon, iconGap, scaleFactor, pressed, fromLeft) {
  const iconSize = 16 * scaleFactor
  const fontSize = 13 * scaleFactor
  const padX = 13 * scaleFactor
  const radius = h / 2
  const color = '#555A58'
  const fill = pressed ? '#F1EEE8' : '#F7F4EE'

  ctx.font = `500 ${fontSize}px 'PingFang SC', 'Helvetica Neue', Arial, sans-serif`
  const textW = ctx.measureText(label).width
  const w = padX * 2 + iconSize + iconGap + textW
  const x = fromLeft ? anchorX : anchorX - w

  ctx.save()
  if (pressed) {
    ctx.translate(x + w / 2, y + h / 2)
    ctx.scale(0.97, 0.97)
    ctx.translate(-(x + w / 2), -(y + h / 2))
  }

  ctx.shadowColor = pressed ? 'rgba(80, 70, 50, 0.04)' : 'rgba(80, 70, 50, 0.08)'
  ctx.shadowBlur = pressed ? 2 : 5
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = pressed ? 0.5 : 1.5
  ctx.fillStyle = fill
  roundRect(ctx, x, y, w, h, radius, true)

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  ctx.strokeStyle = 'rgba(70, 70, 60, 0.08)'
  ctx.lineWidth = 1
  roundRect(ctx, x, y, w, h, radius, false, true)

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
  ctx.clip()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.fillRect(x, y, w, 1 * scaleFactor)
  ctx.restore()

  const contentX = x + padX
  const midY = y + h / 2
  drawHudIcon(icon, contentX + iconSize / 2, midY, iconSize, color)

  ctx.fillStyle = color
  ctx.font = `500 ${fontSize}px 'PingFang SC', 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, contentX + iconSize + iconGap, midY + 0.5)
  ctx.restore()

  return { x, y, width: w, height: h }
}

const HUD_ICONS = {
  trophy: {
    paths: [
      'M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2',
      'M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2',
      'M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3',
      'M4 22h16',
      'M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z',
      'M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3'
    ]
  },
  refresh: {
    paths: [
      'M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8',
      'M21 3v5h-5'
    ]
  },
  gear: {
    paths: [
      'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'
    ],
    circles: [{ cx: 12, cy: 12, r: 4 }]
  }
}

function loadHudIcons() {
  const files = {
    trophy: 'images/icon-trophy.png',
    refresh: 'images/icon-refresh.png'
  }
  Object.keys(files).forEach((key) => {
    hudIconImages[key].src = files[key]
    hudIconImages[key].onload = function () {
      hudIconLoaded[key] = true
      render()
    }
  })
}

function loadTileBirdImages() {
  TILE_BIRD_VALUES.forEach(value => {
    const img = wx.createImage()
    tileBirdImages[value] = img
    img.onload = function () {
      tileBirdLoaded[value] = true
      render()
    }
    img.src = `images/tile-bird-${value}.png`
  })
}

function drawBoltIcon(cx, cy, size, color) {
  ctx.save()
  ctx.translate(cx - size / 2, cy - size / 2)
  ctx.scale(size / 24, size / 24)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(12, 2.27)
  ctx.lineTo(20, 6.27)
  ctx.lineTo(20, 17.73)
  ctx.lineTo(12, 21.73)
  ctx.lineTo(4, 17.73)
  ctx.lineTo(4, 6.27)
  ctx.closePath()
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(12, 12, 4, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawHudIcon(type, cx, cy, size, color) {
  if (type === 'gear') {
    drawBoltIcon(cx, cy, size, color)
    return
  }

  const img = hudIconImages[type]
  if (img && hudIconLoaded[type]) {
    ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size)
    return
  }

  const icon = HUD_ICONS[type]
  if (!icon || typeof Path2D !== 'function') return

  ctx.save()
  ctx.translate(cx - size / 2, cy - size / 2)
  ctx.scale(size / 24, size / 24)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2
  for (let i = 0; i < icon.paths.length; i++) {
    ctx.stroke(new Path2D(icon.paths[i]))
  }
  const circles = icon.circles || []
  for (let i = 0; i < circles.length; i++) {
    const c = circles[i]
    ctx.beginPath()
    ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

function renderSettingsPanel(scaleFactor) {
  ctx.fillStyle = 'rgba(43, 65, 98, 0.28)'
  ctx.fillRect(0, 0, width, height)

  const panelW = width * 0.78
  const panelH = 248 * scaleFactor
  const panelX = (width - panelW) / 2
  const panelY = (height - panelH) / 2

  ctx.fillStyle = THEME_FOREST.background
  roundRect(ctx, panelX, panelY, panelW, panelH, 16, true)

  ctx.fillStyle = THEME_FOREST.text.dark
  ctx.font = `bold ${20 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('设置', width / 2, panelY + 22 * scaleFactor)

  const rowX = panelX + 20 * scaleFactor
  const rowW = panelW - 40 * scaleFactor
  const rowH = 44 * scaleFactor
  const soundY = panelY + 68 * scaleFactor
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  roundRect(ctx, rowX, soundY, rowW, rowH, 10, true)
  ctx.fillStyle = THEME_FOREST.text.dark
  ctx.font = `${15 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('音效', rowX + 14 * scaleFactor, soundY + rowH / 2)
  ctx.textAlign = 'right'
  ctx.fillStyle = soundEnabled ? THEME_FOREST.tiles['128'].background : THEME_FOREST.text.dark
  ctx.fillText(soundEnabled ? '开' : '关', rowX + rowW - 14 * scaleFactor, soundY + rowH / 2)

  ctx.fillStyle = 'rgba(43,65,98,0.45)'
  ctx.font = `${13 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`版本 v${APP_VERSION}`, width / 2, panelY + 128 * scaleFactor)
  ctx.font = `${12 * scaleFactor}px 'PingFang SC', 'Helvetica Neue', Arial, sans-serif`
  ctx.fillStyle = 'rgba(43,65,98,0.4)'
  ctx.fillText('此产品由iTab新标签页团队开发。', width / 2, panelY + 150 * scaleFactor)

  const closeW = rowW
  const closeH = 40 * scaleFactor
  const closeY = panelY + panelH - closeH - 18 * scaleFactor
  ctx.fillStyle = THEME_FOREST.tiles['16'].background
  roundRect(ctx, rowX, closeY, closeW, closeH, 10, true)
  ctx.fillStyle = THEME_FOREST.tiles['16'].text
  ctx.font = `bold ${15 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.fillText('关闭', width / 2, closeY + closeH / 2)

  settingsSoundBtn = { x: rowX, y: soundY, width: rowW, height: rowH }
  settingsCloseBtn = { x: rowX, y: closeY, width: closeW, height: closeH }
}

function getOpenDataContextSafe() {
  try {
    if (typeof wx.getOpenDataContext === 'function') return wx.getOpenDataContext()
  } catch (e) { /* ignore */ }
  return null
}

function noteNpcBeats(tab, playerScore) {
  const rows = buildNpcRows(tab, playerScore)
  const copy = detectNewBeats(tab, rows, playerScore)
  if (!copy) return
  birdToast = { text: copy, until: Date.now() + 3200 }
  showAnimalText = true
  triggerBirdEvent('hop')
}

function syncFriendAuthSilent() {
  if (!rankAuthTried) return
  checkFriendAuthSilent().then(ok => {
    rankFriendOk = ok
    uploadRankCloud(highScore, loadDailyBest())
    if (showRank) {
      rankPostDirty = true
      render()
    }
  })
}

function ensureFriendAuth() {
  if (rankFriendOk) {
    uploadRankCloud(highScore, loadDailyBest())
    return
  }
  if (friendAuthInflight) return
  friendAuthInflight = requestFriendAuth().then(ok => {
    friendAuthInflight = null
    rankFriendOk = ok
    rankAuthTried = true
    uploadRankCloud(highScore, loadDailyBest())
    if (showRank) {
      rankPostDirty = true
      render()
    }
  })
}

function openRankPanel() {
  ensureFriendAuth()
  showRank = true
  showSettings = false
  showRestartConfirm = false
  showAssistPanel = false
  showAnimalText = false
  rankTab = 'daily'
  rankPostDirty = true
  render()
}

function playerScoreForTab() {
  return rankTab === 'daily' ? (loadDailyBest().s || 0) : highScore
}

function localRankRows() {
  const playerScore = playerScoreForTab()
  const npcs = buildNpcRows(rankTab, playerScore)
  const rows = npcs.concat([{
    id: 'self',
    name: '我',
    score: playerScore,
    beaten: false,
    kind: 'self',
    isSelf: true
  }])
  rows.sort((a, b) => b.score - a.score || (a.isSelf ? -1 : 1))
  return rows
}

function postRankToOpenData(listRect, scaleFactor) {
  const odc = getOpenDataContextSafe()
  if (!odc || !listRect) return
  const dpr = windowInfo.pixelRatio || 1
  odc.canvas.width = Math.max(1, Math.floor(listRect.width * dpr))
  odc.canvas.height = Math.max(1, Math.floor(listRect.height * dpr))
  const playerScore = playerScoreForTab()
  odc.postMessage({
    type: 'render',
    tab: rankTab,
    today: getBeijingDate(),
    playerScore,
    npcs: buildNpcRows(rankTab, playerScore),
    showFriends: rankFriendOk,
    width: listRect.width,
    height: listRect.height,
    dpr
  })
}

function drawMeBadge(x, y, scaleFactor) {
  const bw = 22 * scaleFactor
  const bh = 16 * scaleFactor
  ctx.fillStyle = '#D5E3F0'
  roundRect(ctx, x, y - bh / 2, bw, bh, 8, true)
  ctx.fillStyle = '#2B4162'
  ctx.font = `500 ${10 * scaleFactor}px 'PingFang SC', 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('我', x + bw / 2, y + 0.5)
  return bw
}

function drawRankAvatar(x, y, size, row) {
  if (row.kind === 'npc') {
    if (animalLoaded) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.fillStyle = '#E7F2EE'
      ctx.fill()
      ctx.clip()
      ctx.drawImage(animalImage, 150, 40, 560, 560, x - size * 0.04, y - size * 0.02, size * 1.12, size * 1.12)
      ctx.restore()
      return
    }
    if (rankBirdLoaded) {
      ctx.drawImage(rankBirdImage, x, y, size, size)
      return
    }
    drawHeheBirdAvatar(ctx, x, y, size, row.id)
    return
  }
  ctx.save()
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fillStyle = '#D5E3F0'
  ctx.fill()
  ctx.restore()
}

function drawRankListLocal(x, y, w, h, scaleFactor) {
  const rows = localRankRows()
  const rowH = 50 * scaleFactor
  rows.slice(0, 6).forEach((row, index) => {
    const ry = y + index * rowH
    if (ry + rowH > y + h) return
    const inset = 2
    const rw = w - inset * 2
    const rh = rowH - 6 * scaleFactor
    const rx = x + inset
    const boxY = ry + 3 * scaleFactor
    if (index === 0) ctx.fillStyle = '#F6E7C1'
    else if (index === 1) ctx.fillStyle = '#E7E7E4'
    else if (index === 2) ctx.fillStyle = '#EDD4C0'
    else if (row.isSelf) ctx.fillStyle = 'rgba(213, 227, 240, 0.85)'
    else ctx.fillStyle = 'rgba(255,255,255,0.72)'
    roundRect(ctx, rx, boxY, rw, rh, 12, true)
    if (row.isSelf) {
      ctx.strokeStyle = '#8FB4D4'
      ctx.lineWidth = 1.5
      roundRect(ctx, rx, boxY, rw, rh, 12, false, true)
    }

    ctx.fillStyle = index === 0 ? '#C9A227' : index === 1 ? '#8E8E8E' : index === 2 ? '#C08457' : THEME_FOREST.text.dark
    ctx.font = `bold ${16 * scaleFactor}px 'PingFang SC', 'Helvetica Neue', Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(index + 1), x + 20 * scaleFactor, ry + rowH / 2)

    const avS = 34 * scaleFactor
    drawRankAvatar(x + 34 * scaleFactor, ry + (rowH - avS) / 2, avS, row)

    ctx.textAlign = 'left'
    ctx.fillStyle = row.beaten ? 'rgba(43,65,98,0.45)' : THEME_FOREST.text.dark
    ctx.font = `${15 * scaleFactor}px 'PingFang SC', 'Helvetica Neue', Arial, sans-serif`
    const nameX = x + 74 * scaleFactor
    ctx.fillText(row.name, nameX, ry + rowH / 2)
    let cursorX = nameX + ctx.measureText(row.name).width + 8 * scaleFactor
    if (row.isSelf && row.name !== '我') cursorX += drawMeBadge(cursorX, ry + rowH / 2, scaleFactor) + 6 * scaleFactor
    if (row.beaten) {
      ctx.fillStyle = 'rgba(43,65,98,0.4)'
      ctx.font = `${11 * scaleFactor}px 'PingFang SC', 'Helvetica Neue', Arial, sans-serif`
      ctx.textAlign = 'left'
      ctx.fillText('已超越', cursorX, ry + rowH / 2)
    }

    ctx.textAlign = 'right'
    ctx.font = `bold ${16 * scaleFactor}px 'PingFang SC', 'Helvetica Neue', Arial, sans-serif`
    ctx.fillStyle = row.beaten ? 'rgba(43,65,98,0.45)' : THEME_FOREST.text.dark
    ctx.fillText(String(row.score), x + w - 14 * scaleFactor, ry + rowH / 2)
  })
}

function renderRankPanel(scaleFactor, layout) {
  ctx.fillStyle = 'rgba(43, 65, 98, 0.28)'
  ctx.fillRect(0, 0, width, height)

  const panelW = Math.min(width * 0.88, layout.boardSize + 28 * scaleFactor)
  const panelH = Math.min(height * 0.72, 560 * scaleFactor)
  const panelX = (width - panelW) / 2
  const panelY = Math.max(layout.toolbarY + layout.pillHeight + 8 * scaleFactor, (height - panelH) / 2)

  ctx.fillStyle = '#FFFEFA'
  roundRect(ctx, panelX, panelY, panelW, panelH, 20, true)
  rankPanelRect = { x: panelX, y: panelY, width: panelW, height: panelH }

  ctx.fillStyle = THEME_FOREST.text.dark
  ctx.font = `bold ${22 * scaleFactor}px 'PingFang SC', 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('排行榜', width / 2, panelY + 20 * scaleFactor)

  const segW = 176 * scaleFactor
  const segH = 34 * scaleFactor
  const segX = (width - segW) / 2
  const tabY = panelY + 56 * scaleFactor
  ctx.fillStyle = '#EFECE6'
  roundRect(ctx, segX, tabY, segW, segH, segH / 2, true)
  rankTabDailyBtn = { x: segX, y: tabY, width: segW / 2, height: segH }
  rankTabTotalBtn = { x: segX + segW / 2, y: tabY, width: segW / 2, height: segH }
  const active = rankTab === 'daily' ? rankTabDailyBtn : rankTabTotalBtn
  ctx.fillStyle = THEME_FOREST.tiles['128'].background
  roundRect(ctx, active.x + 3, active.y + 3, active.width - 6, active.height - 6, (active.height - 6) / 2, true)

  const drawTabLabel = (rect, label, isActive) => {
    ctx.fillStyle = isActive ? '#FFFFFF' : 'rgba(43,65,98,0.55)'
    ctx.font = `500 ${14 * scaleFactor}px 'PingFang SC', 'Helvetica Neue', Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2)
  }
  drawTabLabel(rankTabDailyBtn, '今日', rankTab === 'daily')
  drawTabLabel(rankTabTotalBtn, '总榜', rankTab === 'total')

  let hintY = tabY + segH + 10 * scaleFactor
  if (rankTab === 'daily' && dailyAllBeaten(loadDailyBest().s)) {
    ctx.fillStyle = 'rgba(43,65,98,0.45)'
    ctx.font = `${12 * scaleFactor}px 'PingFang SC', 'Helvetica Neue', Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('今日挑战已全部完成', width / 2, hintY)
    hintY += 18 * scaleFactor
  }

  const closeH = 44 * scaleFactor
  const closeY = panelY + panelH - closeH - 16 * scaleFactor
  const rowX = panelX + 16 * scaleFactor
  const rowW = panelW - 32 * scaleFactor
  const footerH = 36 * scaleFactor
  const showAuth = rankAuthTried && !rankFriendOk
  const authH = showAuth ? 26 * scaleFactor : 0
  const footerY = closeY - 12 * scaleFactor - footerH - authH

  rankAuthBtn = null
  if (showAuth) {
    const authY = footerY + footerH + 14 * scaleFactor
    ctx.fillStyle = 'rgba(43,65,98,0.5)'
    ctx.font = `${12 * scaleFactor}px 'PingFang SC', 'Helvetica Neue', Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('允许朋友信息后可看总榜  去设置', width / 2, authY)
    rankAuthBtn = { x: panelX + 36 * scaleFactor, y: authY - 13 * scaleFactor, width: panelW - 72 * scaleFactor, height: 26 * scaleFactor }
  }

  rankListRect = {
    x: rowX,
    y: hintY,
    width: rowW,
    height: Math.max(90 * scaleFactor, footerY - 8 * scaleFactor - hintY)
  }

  const odc = getOpenDataContextSafe()
  const useOpenData = rankFriendOk && odc && odc.canvas
  if (useOpenData) {
    if (rankPostDirty) {
      postRankToOpenData(rankListRect, scaleFactor)
      rankPostDirty = false
    }
    try {
      ctx.drawImage(odc.canvas, rankListRect.x, rankListRect.y, rankListRect.width, rankListRect.height)
    } catch (e) {
      drawRankListLocal(rankListRect.x, rankListRect.y, rankListRect.width, rankListRect.height, scaleFactor)
    }
  } else {
    drawRankListLocal(rankListRect.x, rankListRect.y, rankListRect.width, rankListRect.height, scaleFactor)
  }

  const rows = localRankRows()
  const myIndex = rows.findIndex(row => row.isSelf)
  const myRank = myIndex >= 0 ? myIndex + 1 : '-'
  const scoreLabel = rankTab === 'daily' ? `今日 ${playerScoreForTab()}` : `最高分 ${playerScoreForTab()}`
  ctx.fillStyle = '#D5E3F0'
  roundRect(ctx, rowX, footerY, rowW, footerH, 10, true)
  ctx.fillStyle = THEME_FOREST.text.dark
  ctx.font = `500 ${13 * scaleFactor}px 'PingFang SC', 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`我的 · 第${myRank}名 · ${scoreLabel}`, width / 2, footerY + footerH / 2)

  ctx.fillStyle = THEME_FOREST.tiles['128'].background
  roundRect(ctx, rowX, closeY, rowW, closeH, 12, true)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `bold ${16 * scaleFactor}px 'PingFang SC', 'Helvetica Neue', Arial, sans-serif`
  ctx.fillText('关闭', width / 2, closeY + closeH / 2)
  rankCloseBtn = { x: rowX, y: closeY, width: rowW, height: closeH }
}

function renderRestartConfirm(scaleFactor) {
  ctx.fillStyle = 'rgba(43, 65, 98, 0.28)'
  ctx.fillRect(0, 0, width, height)

  const panelW = width * 0.78
  const panelH = 190 * scaleFactor
  const panelX = (width - panelW) / 2
  const panelY = (height - panelH) / 2

  ctx.fillStyle = THEME_FOREST.background
  roundRect(ctx, panelX, panelY, panelW, panelH, 16, true)

  ctx.fillStyle = THEME_FOREST.text.dark
  ctx.font = `bold ${18 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('重新开始本局？', width / 2, panelY + 28 * scaleFactor)
  ctx.font = `${13 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
  ctx.fillStyle = 'rgba(43,65,98,0.7)'
  ctx.fillText('当前分数和撤回次数会清零', width / 2, panelY + 62 * scaleFactor)

  const btnW = (panelW - 48 * scaleFactor) / 2
  const btnH = 40 * scaleFactor
  const btnY = panelY + panelH - btnH - 22 * scaleFactor
  const cancelX = panelX + 18 * scaleFactor
  const okX = cancelX + btnW + 12 * scaleFactor

  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  roundRect(ctx, cancelX, btnY, btnW, btnH, 10, true)
  ctx.fillStyle = THEME_FOREST.text.dark
  ctx.font = `bold ${15 * scaleFactor}px 'Helvetica Neue', Arial, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.fillText('取消', cancelX + btnW / 2, btnY + btnH / 2)

  ctx.fillStyle = THEME_FOREST.tiles['64'].background
  roundRect(ctx, okX, btnY, btnW, btnH, 10, true)
  ctx.fillStyle = THEME_FOREST.text.light
  ctx.fillText('确定', okX + btnW / 2, btnY + btnH / 2)

  confirmCancelBtn = { x: cancelX, y: btnY, width: btnW, height: btnH }
  confirmOkBtn = { x: okX, y: btnY, width: btnW, height: btnH }
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

  const birdImg = tileBirdImages[value]
  if (birdImg && tileBirdLoaded[value]) {
    const birdSize = size * 0.84
    ctx.drawImage(birdImg, -birdSize / 2, -size / 2 + size * 0.02, birdSize, birdSize)

    const label = String(value)
    const fontSize = label.length >= 4 ? size * 0.17 : size * 0.2
    ctx.font = `bold ${fontSize}px 'Helvetica Neue', Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.miterLimit = 2
    ctx.lineWidth = Math.max(2.4, size * 0.05)
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'
    const ly = size / 2 - fontSize * 0.68
    ctx.strokeText(label, 0, ly)
    ctx.fillStyle = value === 2048 ? '#F08A2A' : '#3D4A5C'
    ctx.fillText(label, 0, ly)
  } else {
    const fontSize = value < 100 ? size / 2 : value < 1000 ? size / 2.5 : size / 3.2
    ctx.fillStyle = style.text
    ctx.font = `bold ${fontSize}px 'Helvetica Neue', Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(value), 0, 0)
  }
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
  if (showRank) {
    if (pointInRect(endX, endY, rankTabDailyBtn) && rankTab !== 'daily') {
      rankTab = 'daily'
      rankPostDirty = true
      render()
      return true
    }
    if (pointInRect(endX, endY, rankTabTotalBtn) && rankTab !== 'total') {
      rankTab = 'total'
      rankPostDirty = true
      render()
      return true
    }
    if (pointInRect(endX, endY, rankAuthBtn)) {
      openAuthSetting().then(ok => {
        rankFriendOk = ok
        rankAuthTried = true
        uploadRankCloud(highScore, loadDailyBest())
        rankPostDirty = true
        render()
      })
      return true
    }
    if (pointInRect(endX, endY, rankCloseBtn) || !pointInRect(endX, endY, rankPanelRect)) {
      showRank = false
      render()
      return true
    }
    return true
  }

  if (pointInRect(endX, endY, hudRankBtn)) {
    openRankPanel()
    return true
  }

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
    return true
  }

  if (showRestartConfirm) {
    if (pointInRect(endX, endY, confirmOkBtn)) {
      init()
      return true
    }
    if (pointInRect(endX, endY, confirmCancelBtn)) {
      showRestartConfirm = false
      render()
      return true
    }
    showRestartConfirm = false
    render()
    return true
  }

  if (showSettings) {
    if (pointInRect(endX, endY, settingsSoundBtn)) {
      toggleSound()
      render()
      return true
    }
    showSettings = false
    render()
    return true
  }

  if (pointInRect(endX, endY, uiElements.hudRestartBtn)) {
    showAssistPanel = false
    showAnimalText = false
    showRestartConfirm = true
    render()
    return true
  }

  if (pointInRect(endX, endY, uiElements.hudSettingsBtn)) {
    showAssistPanel = false
    showAnimalText = false
    showSettings = true
    render()
    return true
  }

  if (!reviveMode && !gameOver) {
    if (showAssistPanel && pointInRect(endX, endY, uiElements.assistUndoBtn)) {
      performUndo()
      return true
    }
    if (pointInRect(endX, endY, uiElements.animalBtn)) {
      playBirdSound()
      triggerBirdEvent('hop')
      if (canFetchUndo()) {
        showAnimalText = false
        showAssistPanel = !showAssistPanel
      } else {
        showAssistPanel = false
        if (showAnimalText) {
          currentTextIndex = (currentTextIndex + 1) % animalTexts.length
        } else {
          showAnimalText = true
        }
      }
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
  hudPressed = null
  if (!showSettings && !showRestartConfirm && !showRank) {
    if (!gameOver && pointInRect(startX, startY, hudRestartBtn)) hudPressed = 'restart'
    else if (!gameOver && pointInRect(startX, startY, hudSettingsBtn)) hudPressed = 'settings'
    else if (pointInRect(startX, startY, hudRankBtn)) {
      hudPressed = 'rank'
      ensureFriendAuth()
    }
    if (hudPressed) render()
  }
})

wx.onTouchMove(moveEvent => {
  if (animating || reviveMode || gameOver || showSettings || showRestartConfirm || showRank) return

  const now = Date.now()
  const moveX = moveEvent.touches[0].clientX - startX
  const moveY = moveEvent.touches[0].clientY - startY

  if (Math.abs(moveX) > 15 || Math.abs(moveY) > 15) {
    hasMoved = true
    if (hudPressed) {
      hudPressed = null
      render()
    }

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
  if (hudPressed) {
    hudPressed = null
    render()
  }

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

  if (gameOver || showSettings || showRestartConfirm || showRank) {
    handleTap(endX, endY)
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
    showAnimalText = false
    const anims = generateMoveAnims(oldBoard, direction)
    const postMove = cloneBoard(board)
    const spawn = addRandomNumber()
    const scoreDelta = score - oldScore
    checkGameStatus()
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
  const boxWidth = width * 0.52
  const boxHeight = height * 0.09
  const boxX = Math.max(12 * scaleFactor, width * 0.06)
  const boxY = Math.min(animalArea ? animalArea.y + 18 * scaleFactor : height * 0.68, height - boxHeight - 24 * scaleFactor)

  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 12, true)
  ctx.strokeStyle = THEME_FOREST.tiles['16'].background
  ctx.lineWidth = 2 * scaleFactor
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 12, false, true)

  ctx.fillStyle = THEME_FOREST.text.dark
  const text = (birdToast && Date.now() < birdToast.until) ? birdToast.text : animalTexts[currentTextIndex]
  if (birdToast && Date.now() >= birdToast.until) {
    birdToast = null
    showAnimalText = false
  }
  const fontSize = (text.length > 22 ? 12 : 14) * scaleFactor
  ctx.font = `${fontSize}px 'PingFang SC', 'Helvetica Neue', Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  wrapText(ctx, text, boxX + boxWidth / 2, boxY + boxHeight / 2, boxWidth - 22 * scaleFactor, 18 * scaleFactor)
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
    if (showRank || !gameOver && !reviveMode) {
      if (Date.now() - lastRenderTime > 32) {
        lastRenderTime = Date.now()
        render()
      }
    }
  }
  requestAnimationFrame(tick)
}

function getShareTitle() {
  if (score > 0) {
    return `我在合合小鸟拿到了 ${score} 分，你也来试试？`
  }
  if (highScore > 0) {
    return `合合小鸟最高分 ${highScore}，来挑战一下？`
  }
  return '合合小鸟，一起把格子合成 2048！'
}

function getSharePayload() {
  return {
    title: getShareTitle(),
    imageUrl: SHARE_IMAGE
  }
}

function enableShareMenu() {
  if (typeof wx.showShareMenu !== 'function') return
  wx.showShareMenu({
    menus: ['shareAppMessage', 'shareTimeline']
  })
}

function enableShare() {
  enableShareMenu()
  if (typeof wx.onShareAppMessage === 'function') {
    wx.onShareAppMessage(getSharePayload)
  }
  if (typeof wx.onShareTimeline === 'function') {
    wx.onShareTimeline(getSharePayload)
  }
}

wx.onShow(() => {
  if (!audioInitialized) {
    initSounds()
  }
  enableShareMenu()
  uploadRankCloud(highScore, loadDailyBest())
  syncFriendAuthSilent()
})

enableShare()
init()
