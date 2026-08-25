export const RANK_KEY_BEST = 'bestScore'
export const RANK_KEY_DAILY = 'dailyScore'

const NPCS = [
  { id: 'grass', name: '菜鸟' },
  { id: 'fetch', name: '勤鸟' },
  { id: 'hehe', name: '老鸟' }
]

const BEAT_COPY = {
  grass: '今日超过菜鸟了！',
  fetch: '今日超过勤鸟了！',
  hehe: '今日超过老鸟了！',
  all: '今日挑战已全部完成！'
}

function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function lerp(min, max, t) {
  return Math.round(min + (max - min) * t)
}

export function getBeijingDate() {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date())
  } catch (e) {
    const now = new Date()
    const utc = now.getTime() + now.getTimezoneOffset() * 60000
    const beijing = new Date(utc + 8 * 3600000)
    const y = beijing.getFullYear()
    const m = String(beijing.getMonth() + 1).padStart(2, '0')
    const d = String(beijing.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
}

export function dailyNpcScores(dateStr) {
  const h = hashString(dateStr)
  const unit = 1 / 999
  return {
    grass: lerp(600, 1500, (h % 1000) * unit),
    fetch: lerp(1500, 3500, ((h >>> 10) % 1000) * unit),
    hehe: lerp(3500, 8000, ((h >>> 20) % 1000) * unit)
  }
}

export function totalBandKey(highScore) {
  if (highScore >= 8000) return '24k'
  if (highScore >= 4096) return '12k'
  if (highScore >= 2048) return '8k'
  return '4k'
}

export function totalNpcScores(highScore) {
  if (highScore >= 8000) return { grass: 10000, fetch: 16000, hehe: 24000 }
  if (highScore >= 4096) return { grass: 5000, fetch: 8000, hehe: 12000 }
  if (highScore >= 2048) return { grass: 2048, fetch: 4096, hehe: 8000 }
  return { grass: 1024, fetch: 2048, hehe: 4096 }
}

export function buildNpcRows(tab, playerScore) {
  const scores = tab === 'daily' ? dailyNpcScores(getBeijingDate()) : totalNpcScores(playerScore)
  return NPCS.map(npc => {
    const score = scores[npc.id]
    return {
      id: npc.id,
      name: npc.name,
      score,
      beaten: playerScore >= score,
      kind: 'npc'
    }
  })
}

export function loadDailyBest() {
  const today = getBeijingDate()
  try {
    const saved = wx.getStorageSync('dailyBest')
    if (saved && saved.d === today && typeof saved.s === 'number') {
      return saved
    }
  } catch (e) { /* ignore */ }
  return { d: today, s: 0 }
}

export function saveDailyBest(score) {
  const today = getBeijingDate()
  const current = loadDailyBest()
  if (current.d === today && score <= current.s) return current
  const next = { d: today, s: Math.max(score, current.d === today ? current.s : 0) }
  try {
    wx.setStorageSync('dailyBest', next)
  } catch (e) {
    console.error('保存今日分失败', e)
  }
  return next
}

export function loadBeatState() {
  const today = getBeijingDate()
  try {
    const saved = wx.getStorageSync('rankBeats')
    if (saved && saved.dailyDate === today) return saved
    return {
      dailyDate: today,
      dailyIds: [],
      totalBand: null,
      totalIds: []
    }
  } catch (e) {
    return { dailyDate: today, dailyIds: [], totalBand: null, totalIds: [] }
  }
}

export function saveBeatState(state) {
  try {
    wx.setStorageSync('rankBeats', state)
  } catch (e) {
    console.error('保存挑战进度失败', e)
  }
}

export function detectNewBeats(tab, rows, playerScore) {
  const state = loadBeatState()
  const today = getBeijingDate()
  if (state.dailyDate !== today) {
    state.dailyDate = today
    state.dailyIds = []
  }

  if (tab === 'total') {
    const band = totalBandKey(playerScore)
    if (state.totalBand !== band) {
      state.totalBand = band
      state.totalIds = []
    }
  }

  const key = tab === 'daily' ? 'dailyIds' : 'totalIds'
  const known = new Set(state[key])
  const fresh = []
  rows.forEach(row => {
    if (row.kind !== 'npc' || !row.beaten || known.has(row.id)) return
    known.add(row.id)
    fresh.push(row.id)
  })
  state[key] = Array.from(known)

  const allIds = NPCS.map(n => n.id)
  const justFinished = allIds.every(id => known.has(id)) && fresh.length > 0
  saveBeatState(state)

  if (!fresh.length) return null
  if (justFinished && tab === 'daily') return BEAT_COPY.all
  return BEAT_COPY[fresh[fresh.length - 1]] || BEAT_COPY.grass
}

export function dailyAllBeaten(dailyBest) {
  return buildNpcRows('daily', dailyBest).every(row => row.beaten)
}

export function uploadRankCloud(highScore, dailyBest) {
  if (typeof wx.setUserCloudStorage !== 'function') return
  wx.setUserCloudStorage({
    KVDataList: [
      { key: RANK_KEY_BEST, value: String(highScore || 0) },
      { key: RANK_KEY_DAILY, value: JSON.stringify(dailyBest || loadDailyBest()) }
    ]
  })
}

export function requestPrivacyAuth() {
  return new Promise(resolve => {
    if (typeof wx.requirePrivacyAuthorize !== 'function') {
      resolve(true)
      return
    }
    wx.requirePrivacyAuthorize({
      success: () => resolve(true),
      fail: () => resolve(false)
    })
  })
}

export function openPrivacyContract() {
  if (typeof wx.openPrivacyContract !== 'function') return
  wx.openPrivacyContract({
    fail: err => console.warn('打开隐私指引失败', err)
  })
}

export function checkFriendAuthSilent() {
  return new Promise(resolve => {
    if (typeof wx.getSetting !== 'function') {
      resolve(false)
      return
    }
    wx.getSetting({
      success: res => resolve(!!res.authSetting['scope.WxFriendInteraction']),
      fail: () => resolve(false)
    })
  })
}

export function requestFriendAuth() {
  return new Promise(resolve => {
    if (typeof wx.authorize !== 'function') {
      resolve(false)
      return
    }

    // 必须在点击同步栈里立刻调用。前面不能 getSetting / requirePrivacyAuthorize，否则真机不弹窗。
    wx.authorize({
      scope: 'scope.WxFriendInteraction',
      success: () => resolve(true),
      fail: err => {
        console.warn('朋友信息授权失败', err)
        resolve(false)
      }
    })
  })
}

export function openAuthSetting() {
  if (typeof wx.openSetting !== 'function') return Promise.resolve(false)
  return new Promise(resolve => {
    wx.openSetting({
      success: res => resolve(!!res.authSetting['scope.WxFriendInteraction']),
      fail: () => resolve(false)
    })
  })
}

export function drawHeheBirdAvatar(target, x, y, size, variant) {
  const cx = x + size / 2
  const cy = y + size / 2
  const body = variant === 'grass' ? '#B7D4CE' : variant === 'fetch' ? '#6FA3A0' : '#8BB8B3'
  const wing = variant === 'grass' ? '#8BB0AA' : variant === 'fetch' ? '#4E7F7C' : '#5E8F8C'

  target.save()
  target.beginPath()
  target.arc(cx, cy, size / 2, 0, Math.PI * 2)
  target.closePath()
  target.fillStyle = '#E7F2EE'
  target.fill()
  target.clip()

  target.fillStyle = body
  target.beginPath()
  target.arc(cx + size * 0.06, cy + size * 0.1, size * 0.3, 0, Math.PI * 2)
  target.fill()
  target.beginPath()
  target.arc(cx - size * 0.08, cy - size * 0.02, size * 0.22, 0, Math.PI * 2)
  target.fill()

  target.fillStyle = wing
  target.beginPath()
  target.arc(cx + size * 0.1, cy + size * 0.12, size * 0.13, 0, Math.PI * 2)
  target.fill()

  target.fillStyle = '#2B4162'
  target.beginPath()
  target.arc(cx - size * 0.16, cy - size * 0.04, Math.max(1.5, size * 0.038), 0, Math.PI * 2)
  target.fill()

  target.fillStyle = '#E8894A'
  target.beginPath()
  target.moveTo(cx - size * 0.28, cy - size * 0.02)
  target.lineTo(cx - size * 0.46, cy + size * 0.02)
  target.lineTo(cx - size * 0.28, cy + size * 0.07)
  target.closePath()
  target.fill()

  if (variant !== 'grass' && variant !== 'fetch') {
    target.fillStyle = '#F0D36A'
    const top = cy - size * 0.32
    target.beginPath()
    target.moveTo(cx - size * 0.15, top + size * 0.12)
    target.lineTo(cx - size * 0.1, top)
    target.lineTo(cx - size * 0.03, top + size * 0.09)
    target.lineTo(cx, top - size * 0.02)
    target.lineTo(cx + size * 0.03, top + size * 0.09)
    target.lineTo(cx + size * 0.1, top)
    target.lineTo(cx + size * 0.15, top + size * 0.12)
    target.closePath()
    target.fill()
  }
  target.restore()
}
