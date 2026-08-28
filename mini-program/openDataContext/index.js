const sharedCanvas = wx.getSharedCanvas()
const ctx = sharedCanvas.getContext('2d')

const KEY_BEST = 'bestScore'
const KEY_DAILY = 'dailyScore'

let lastMsg = null
const avatarCache = {}

function kv(item, key) {
  const found = (item.KVDataList || []).find(entry => entry.key === key)
  return found ? found.value : ''
}

function parseDaily(raw) {
  try {
    const data = JSON.parse(raw)
    if (data && typeof data.s === 'number') return data
  } catch (e) { /* ignore */ }
  return { d: '', s: 0 }
}

function friendScore(item, tab, today) {
  if (tab === 'total') return parseInt(kv(item, KEY_BEST), 10) || 0
  const daily = parseDaily(kv(item, KEY_DAILY))
  return daily.d === today ? daily.s : 0
}

const npcAvatar = wx.createImage()
let npcAvatarReady = false
npcAvatar.onload = function () {
  npcAvatarReady = true
  if (lastMsg) render(lastMsg)
}
npcAvatar.onerror = function () {
  npcAvatarReady = false
}
npcAvatar.src = 'rank-bird.png'

function drawNpcAvatar(x, y, size, variant) {
  if (npcAvatarReady) {
    ctx.drawImage(npcAvatar, x, y, size, size)
    return
  }
  const cx = x + size / 2
  const cy = y + size / 2
  const body = variant === 'grass' ? '#B7D4CE' : variant === 'fetch' ? '#6FA3A0' : '#8BB8B3'
  const wing = variant === 'grass' ? '#8BB0AA' : variant === 'fetch' ? '#4E7F7C' : '#5E8F8C'
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fillStyle = '#E7F2EE'
  ctx.fill()
  ctx.clip()
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(cx + size * 0.06, cy + size * 0.1, size * 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx - size * 0.08, cy - size * 0.02, size * 0.22, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = wing
  ctx.beginPath()
  ctx.arc(cx + size * 0.1, cy + size * 0.12, size * 0.13, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#2B4162'
  ctx.beginPath()
  ctx.arc(cx - size * 0.16, cy - size * 0.04, Math.max(1.5, size * 0.038), 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#E8894A'
  ctx.beginPath()
  ctx.moveTo(cx - size * 0.28, cy - size * 0.02)
  ctx.lineTo(cx - size * 0.46, cy + size * 0.02)
  ctx.lineTo(cx - size * 0.28, cy + size * 0.07)
  ctx.closePath()
  ctx.fill()
  if (variant !== 'grass' && variant !== 'fetch') {
    ctx.fillStyle = '#F0D36A'
    const top = cy - size * 0.32
    ctx.beginPath()
    ctx.moveTo(cx - size * 0.15, top + size * 0.12)
    ctx.lineTo(cx - size * 0.1, top)
    ctx.lineTo(cx - size * 0.03, top + size * 0.09)
    ctx.lineTo(cx, top - size * 0.02)
    ctx.lineTo(cx + size * 0.03, top + size * 0.09)
    ctx.lineTo(cx + size * 0.1, top)
    ctx.lineTo(cx + size * 0.15, top + size * 0.12)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function roundRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function loadAvatar(url, onReady) {
  if (!url) return
  if (avatarCache[url] && avatarCache[url].complete) {
    onReady()
    return
  }
  const img = wx.createImage()
  avatarCache[url] = img
  img.onload = onReady
  img.src = url
}

function drawList(rows, logicalW, logicalH, scale) {
  ctx.clearRect(0, 0, sharedCanvas.width, sharedCanvas.height)
  ctx.save()
  ctx.scale(scale, scale)
  ctx.fillStyle = '#FFFEFA'
  ctx.fillRect(0, 0, logicalW, logicalH)

  const rowH = 50
  rows.slice(0, 6).forEach((row, index) => {
    const y = index * rowH
    const boxY = y + 3
    const rh = rowH - 6
    if (index === 0) ctx.fillStyle = '#F6E7C1'
    else if (index === 1) ctx.fillStyle = '#E7E7E4'
    else if (index === 2) ctx.fillStyle = '#EDD4C0'
    else if (row.isSelf) ctx.fillStyle = 'rgba(213, 227, 240, 0.85)'
    else ctx.fillStyle = 'rgba(255,255,255,0.72)'
    roundRect(2, boxY, logicalW - 4, rh, 12)
    ctx.fill()
    if (row.isSelf) {
      ctx.strokeStyle = '#8FB4D4'
      ctx.lineWidth = 1.5
      roundRect(2, boxY, logicalW - 4, rh, 12)
      ctx.stroke()
    }

    ctx.fillStyle = index === 0 ? '#C9A227' : index === 1 ? '#8E8E8E' : index === 2 ? '#C08457' : '#2B4162'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(index + 1), 20, y + rowH / 2)

    const avS = 34
    const avX = 34
    const avY = y + (rowH - avS) / 2
    if (row.kind === 'npc') {
      drawNpcAvatar(avX, avY, avS, row.id)
    } else {
      ctx.save()
      ctx.beginPath()
      ctx.arc(avX + avS / 2, avY + avS / 2, avS / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      if (row.avatar && avatarCache[row.avatar] && avatarCache[row.avatar].width) {
        ctx.drawImage(avatarCache[row.avatar], avX, avY, avS, avS)
      } else {
        ctx.fillStyle = '#D5E3F0'
        ctx.fill()
      }
      ctx.restore()
    }

    ctx.textAlign = 'left'
    ctx.fillStyle = row.beaten ? 'rgba(43,65,98,0.45)' : '#2B4162'
    ctx.font = '15px sans-serif'
    ctx.fillText(row.name, 74, y + rowH / 2)
    let cursorX = 74 + ctx.measureText(row.name).width + 8
    if (row.isSelf && row.name !== '我') {
      ctx.fillStyle = '#D5E3F0'
      roundRect(cursorX, y + rowH / 2 - 8, 22, 16, 8)
      ctx.fill()
      ctx.fillStyle = '#2B4162'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('我', cursorX + 11, y + rowH / 2 + 0.5)
      cursorX += 28
      ctx.textAlign = 'left'
    }
    if (row.beaten) {
      ctx.fillStyle = 'rgba(43,65,98,0.4)'
      ctx.font = '11px sans-serif'
      ctx.fillText('已超越', cursorX, y + rowH / 2)
    }

    ctx.textAlign = 'right'
    ctx.font = 'bold 16px sans-serif'
    ctx.fillStyle = row.beaten ? 'rgba(43,65,98,0.45)' : '#2B4162'
    ctx.fillText(String(row.score), logicalW - 14, y + rowH / 2)
  })
  ctx.restore()
}

function pickName(item) {
  return (item && (item.nickName || item.nickname)) || ''
}

function pickOpenId(item) {
  return (item && (item.openId || item.openid)) || ''
}

function pickAvatar(item) {
  return (item && (item.avatarUrl || item.avatar)) || ''
}

function normalizeAvatar(url) {
  if (!url) return ''
  return String(url).replace(/^https?:/i, '').replace(/\/\d+$/, '').split('?')[0]
}

function kvFingerprint(item) {
  return `${kv(item, KEY_BEST)}|${kv(item, KEY_DAILY)}`
}

function isSelfFriend(item, me, myKvFp) {
  if (!item) return false
  const oid = pickOpenId(item)
  const myOid = pickOpenId(me)
  if (oid && myOid && oid === myOid) return true
  const av = normalizeAvatar(pickAvatar(item))
  const myAv = normalizeAvatar(pickAvatar(me))
  if (av && myAv && av === myAv) return true
  const name = pickName(item)
  const myName = pickName(me)
  if (name && myName && name === myName) return true
  if (myKvFp && kvFingerprint(item) === myKvFp) return true
  return false
}

function mergeRows(msg, friends, me, myKvFp) {
  const rows = msg.npcs.map(npc => ({ ...npc, kind: 'npc', isSelf: false }))
  let selfRow = null

  ;(friends || []).forEach(item => {
    const score = friendScore(item, msg.tab, msg.today)
    const self = isSelfFriend(item, me, myKvFp)
    if (score <= 0 && !self) return
    const row = {
      name: self ? (pickName(item) || pickName(me) || '我') : (pickName(item) || '好友'),
      score: self ? Math.max(score, msg.playerScore || 0) : score,
      kind: self ? 'self' : 'friend',
      isSelf: self,
      avatar: pickAvatar(item) || (self ? pickAvatar(me) : ''),
      beaten: false
    }
    if (self) {
      if (!selfRow) {
        selfRow = row
      } else {
        selfRow.score = Math.max(selfRow.score, row.score)
        if (selfRow.name === '我' && row.name) selfRow.name = row.name
        if (!selfRow.avatar && row.avatar) selfRow.avatar = row.avatar
      }
      return
    }
    rows.push(row)
  })

  if (!selfRow) {
    selfRow = {
      name: pickName(me) || '我',
      score: msg.playerScore || 0,
      kind: 'self',
      isSelf: true,
      avatar: pickAvatar(me),
      beaten: false
    }
  } else {
    selfRow.score = Math.max(selfRow.score, msg.playerScore || 0)
  }
  rows.push(selfRow)

  rows.sort((a, b) => b.score - a.score || (a.isSelf ? -1 : 1))
  return rows
}

function loadMe(callback) {
  const withKv = me => {
    if (typeof wx.getUserCloudStorage !== 'function') {
      callback(me, '')
      return
    }
    wx.getUserCloudStorage({
      keyList: [KEY_BEST, KEY_DAILY],
      success: res => callback(me, kvFingerprint({ KVDataList: res.KVDataList || [] })),
      fail: () => callback(me, '')
    })
  }

  if (typeof wx.getUserInfo !== 'function') {
    withKv(null)
    return
  }
  wx.getUserInfo({
    openIdList: ['selfOpenId'],
    lang: 'zh_CN',
    success: res => withKv((res.data && res.data[0]) || null),
    fail: () => withKv(null)
  })
}

function render(msg) {
  lastMsg = msg
  const scale = msg.dpr || 1
  const logicalW = msg.width
  const logicalH = msg.height
  sharedCanvas.width = Math.max(1, Math.floor(logicalW * scale))
  sharedCanvas.height = Math.max(1, Math.floor(logicalH * scale))

  const paint = (friends, me, myKvFp) => {
    const rows = mergeRows(msg, friends, me, myKvFp)
    drawList(rows, logicalW, logicalH, scale)
    rows.forEach(row => {
      if (row.avatar) loadAvatar(row.avatar, () => drawList(rows, logicalW, logicalH, scale))
    })
  }

  loadMe((me, myKvFp) => {
    paint([], me, myKvFp)
    if (!msg.showFriends || typeof wx.getFriendCloudStorage !== 'function') return
    wx.getFriendCloudStorage({
      keyList: [KEY_BEST, KEY_DAILY],
      success: res => paint(res.data || [], me, myKvFp),
      fail: () => paint([], me, myKvFp)
    })
  })
}

wx.onMessage(data => {
  if (data && data.type === 'render') render(data)
})
