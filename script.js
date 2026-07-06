
// ===== DATA =====
const STORAGE_KEY = 'expense_log';
let expenses = [];

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    expenses = raw ? JSON.parse(raw) : [];
  } catch { expenses = []; }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

// ===== HELPERS =====
function fmt(n) {
  return Number(n).toLocaleString('vi-VN');
}

function getWeek(date) {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const day = start.getDay() || 7;
  const diff = d.getDate() + day - 2;
  return Math.floor(diff / 7) + 1;
}

function isToday(d) {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() &&
         d.getMonth() === t.getMonth() &&
         d.getDate() === t.getDate();
}

function isThisWeek(d) {
  const t = new Date();
  const startOfWeek = new Date(t);
  const day = t.getDay();
  const diff = day === 0 ? 6 : day - 1;
  startOfWeek.setDate(t.getDate() - diff);
  startOfWeek.setHours(0,0,0,0);
  return d >= startOfWeek;
}

function isThisMonth(d) {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth();
}

// ===== STATS =====
function updateStats() {
  const now = new Date();
  const todayTotal = expenses
    .filter(e => isToday(new Date(e.date)))
    .reduce((s, e) => s + e.amount, 0);

  const weekTotal = expenses
    .filter(e => isThisWeek(new Date(e.date)))
    .reduce((s, e) => s + e.amount, 0);

  const monthTotal = expenses
    .filter(e => isThisMonth(new Date(e.date)))
    .reduce((s, e) => s + e.amount, 0);

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed = now.getDate();
  const avg = daysPassed > 0 ? Math.round(monthTotal / daysPassed) : 0;

  document.getElementById('statToday').textContent = fmt(todayTotal) + ' \u20AB';
  document.getElementById('statWeek').textContent = fmt(weekTotal) + ' \u20AB';
  document.getElementById('statMonth').textContent = fmt(monthTotal) + ' \u20AB';
  document.getElementById('statAvg').textContent = fmt(avg) + ' \u20AB';

  // Progress bar (giáº£ sá»­ má»‘c 10tr lÃ m 100%)
  const target = 10000000;
  const pct = Math.min(100, Math.round((monthTotal / target) * 100));
  document.getElementById('progressText').textContent = pct + '%';
  document.getElementById('progressFill').style.width = pct + '%';
}

// ===== WEEKLY CHART =====
function updateChart() {
  const container = document.getElementById('weeklyChart');
  const now = new Date();
  const monthExpenses = expenses.filter(e => isThisMonth(new Date(e.date)));

  if (monthExpenses.length === 0) {
    container.innerHTML = '<p class="empty-log">ChÆ°a cÃ³ dá»¯ liá»‡u</p>';
    return;
  }

  const weeks = {};
  for (let i = 1; i <= 5; i++) weeks[i] = 0;

  monthExpenses.forEach(e => {
    const w = getWeek(new Date(e.date));
    weeks[w] = (weeks[w] || 0) + e.amount;
  });

  const maxVal = Math.max(...Object.values(weeks), 1);
  const labels = ['Tu\u1EA7n 1', 'Tu\u1EA7n 2', 'Tu\u1EA7n 3', 'Tu\u1EA7n 4', 'Tu\u1EA7n 5'];

  let html = '';
  for (let i = 1; i <= 5; i++) {
    const val = weeks[i] || 0;
    const pct = (val / maxVal) * 100;
    const isSmall = pct < 15;
    html += `
      <div class="chart-bar-group">
        <div class="chart-label">${labels[i-1]}</div>
        <div class="chart-track">
          <div class="chart-fill ${isSmall ? 'small' : ''}" style="width:${Math.max(pct, 2)}%">
            ${val > 0 ? fmt(val) + ' \u20AB' : ''}
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  // Trigger animation
  requestAnimationFrame(() => {
    container.querySelectorAll('.chart-fill').forEach(el => {
      el.style.width = el.style.width;
    });
  });
}

// ===== LOG =====
let currentFilter = 'all';

function renderLog() {
  const list = document.getElementById('logList');
  const filtered = filterExpenses();

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-log">Kh\u00F4ng c\u00F3 kho\u1EA3n chi n\u00E0o.</p>';
    return;
  }

  list.innerHTML = filtered.map(e => {
    const d = new Date(e.date);
    const ds = d.toLocaleDateString('vi-VN');
    const ts = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="log-item" data-id="${e.id}">
        <span class="log-date">${ds} ${ts}</span>
        <span class="log-amount">-${fmt(e.amount)} \u20AB</span>
        <span class="log-reason">${escapeHtml(e.reason)}</span>
        <button class="log-del" onclick="deleteExpense(${e.id})" title="Xo\u00E1">&times;</button>
      </div>
    `;
  }).join('');
}

function filterExpenses() {
  const now = new Date();
  return expenses.filter(e => {
    const d = new Date(e.date);
    switch (currentFilter) {
      case 'today': return isToday(d);
      case 'week': return isThisWeek(d);
      case 'month': return isThisMonth(d);
      default: return true;
    }
  }).reverse(); // newest first
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let deleting = false;

function deleteExpense(id) {
  if (deleting) return;
  deleting = true;
  expenses = expenses.filter(e => e.id !== id);
  saveData();
  refresh();
  setTimeout(() => { deleting = false; }, 200);
}

// ===== QUICK ADD =====
function renderQuickAdd() {
  const container = document.getElementById('quickAddBtns');
  const freq = {};
  expenses.forEach(e => {
    const key = e.reason.toLowerCase().trim();
    freq[key] = freq[key] || { label: e.reason, count: 0 };
    freq[key].count++;
  });

  const top3 = Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 3);

  if (top3.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = top3.map(t => `
    <button class="quick-add-btn" data-reason="${escapeHtml(t.label)}">
      <span class="qa-icon">+</span>
      ${escapeHtml(t.label)}
      <span class="qa-count">(${t.count})</span>
    </button>
  `).join('');

  container.querySelectorAll('.quick-add-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const reason = this.dataset.reason;
      const amount = prompt(`Nháº­p sá»‘ tiá»n cho "${reason}":`);
      if (amount === null) return;
      const val = parseInt(amount.replace(/[^0-9]/g, ''));
      if (!val || val <= 0) {
        showToast('Sá»‘ tiá»n khÃ´ng há»£p lá»‡!', true);
        return;
      }
      expenses.push({
        id: Date.now(),
        amount: val,
        reason: reason,
        date: new Date().toISOString()
      });
      saveData();
      refresh();
      showToast('ÄÃ£ thÃªm ' + fmt(val) + 'â‚« cho "' + reason + '"!');
    });
  });
}

// Override refresh to include quick add
const origRefresh = refresh;
refresh = function() {
  origRefresh();
  renderQuickAdd();
};

// ===== FORM =====
document.getElementById('expenseForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const amount = parseInt(document.getElementById('amount').value);
  const reason = document.getElementById('reason').value.trim();

  if (!amount || amount <= 0) {
    showToast('Vui lÃ²ng nháº­p sá»‘ tiá»n há»£p lá»‡!', true);
    return;
  }
  if (!reason) {
    showToast('Vui lÃ²ng nháº­p lÃ½ do chi!', true);
    return;
  }

  expenses.push({
    id: Date.now(),
    amount: amount,
    reason: reason,
    date: new Date().toISOString()
  });

  saveData();
  document.getElementById('amount').value = '';
  document.getElementById('reason').value = '';
  refresh();
  showToast('ÄÃ£ lÆ°u khoáº£n chi ' + fmt(amount) + 'â‚«!');
});

// ===== FILTER BUTTONS =====
document.querySelectorAll('.log-controls button').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.log-controls button').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    currentFilter = this.dataset.filter;
    drawDonutChart();
    renderLog();
  });
});

// ===== TOAST =====
function showToast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.background = isError ? '#991b1b' : '#065f46';
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2500);
}

// ===== DONUT CHART (CARTOON STYLE) =====
const DONUT_COLORS = [
  '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bdf',
  '#ff9f43', '#00d2d3', '#a29bfe', '#fd79a8', '#fdcb6e'
];

let slicesCache = [];
let donutData = null;
let hoverAnim = { from: 0, to: 0, current: 0, idx: -1, prevIdx: -1, running: false, time: 0, numFrom: 0, numTo: 0, numCurrent: 0 };
let cartoonyBounce = 0;

function setupCanvas() {
  const canvas = document.getElementById('donutChart');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { canvas, ctx, dpr };
}

function drawDonutChart(hoverIdx = -1, gapOverride) {
  const { canvas, ctx } = setupCanvas();
  const legend = document.getElementById('donutLegend');
  const w = canvas.width, h = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  const displayW = w / dpr, displayH = h / dpr;
  const cx = displayW / 2, cy = displayH / 2;
  const outerR = 142, innerR = 92;
  const hoverGap = 12;
  const strokeW = 3;

  const filtered = filterExpenses();
  if (filtered.length === 0) {
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ChÆ°a cÃ³ dá»¯ liá»‡u ðŸ©', cx, cy);
    legend.innerHTML = '';
    slicesCache = [];
    donutData = null;
    return;
  }

  const groups = {};
  filtered.forEach(e => {
    const key = e.reason.toLowerCase().trim();
    groups[key] = groups[key] || { label: e.reason, total: 0, count: 0 };
    groups[key].total += e.amount;
    groups[key].count++;
  });

  const entries = Object.values(groups).sort((a, b) => b.total - a.total);
  const total = entries.reduce((s, e) => s + e.total, 0);

  if (!hoverAnim.running && hoverAnim.numCurrent === 0) {
    hoverAnim.numCurrent = total;
  }

  let startAngle = -Math.PI / 2;
  const slices = [];
  slicesCache = [];
  donutData = { total, entries };

  // Cartoon shadow under whole donut
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy + 3, outerR + 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  ctx.fill();
  ctx.restore();

  entries.forEach((entry, i) => {
    const angle = (entry.total / total) * Math.PI * 2;
    const color = DONUT_COLORS[i % DONUT_COLORS.length];
    const mid = startAngle + angle / 2;
    const isHover = i === hoverIdx;
    const gap = gapOverride !== undefined ? (isHover ? gapOverride : 0) : (isHover ? hoverGap : 0);

    const ox = Math.cos(mid) * gap;
    const oy = Math.sin(mid) * gap;

    ctx.save();
    ctx.translate(ox, oy);

    // Cartoon 3D effect - darker layer
    ctx.beginPath();
    ctx.moveTo(cx + innerR * Math.cos(startAngle), (cy + 2) + innerR * Math.sin(startAngle));
    ctx.arc(cx, cy + 2, outerR, startAngle, startAngle + angle);
    ctx.lineTo(cx + innerR * Math.cos(startAngle + angle), (cy + 2) + innerR * Math.sin(startAngle + angle));
    ctx.arc(cx, cy + 2, innerR, startAngle + angle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = darkenColor(color, 20);
    ctx.fill();

    // Main segment
    ctx.beginPath();
    ctx.moveTo(cx + innerR * Math.cos(startAngle), cy + innerR * Math.sin(startAngle));
    ctx.arc(cx, cy, outerR, startAngle, startAngle + angle);
    ctx.lineTo(cx + innerR * Math.cos(startAngle + angle), cy + innerR * Math.sin(startAngle + angle));
    ctx.arc(cx, cy, innerR, startAngle + angle, startAngle, true);
    ctx.closePath();

    if (isHover && gap > 1) {
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = 10;
    }
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Cartoon thick outline
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = 'white';
    ctx.stroke();

    // Inner highlight (cartoon shine)
    if (angle > 0.3) {
      const shineAngle = angle * 0.3;
      const shineStart = startAngle + angle * 0.15;
      ctx.beginPath();
      ctx.arc(cx, cy - 2, outerR - 6, shineStart, shineStart + shineAngle);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.restore();

    slices.push({ color, label: entry.label, total: entry.total, mid, angle, startAngle });
    slicesCache.push({ startAngle, angle, color, label: entry.label, total: entry.total });
    startAngle += angle;
  });

  // White inner circle with border
  ctx.beginPath();
  ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.stroke();

  // Center text - cartoony with animated number
  const dispValue = Math.round(hoverAnim.numCurrent);
  const hovered = hoverIdx >= 0 ? slices[hoverIdx] : null;
  if (hovered) {
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.fillStyle = hovered.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fmt(dispValue), cx, cy - 6);
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(hovered.label, cx, cy + 16);
  } else {
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillStyle = '#334155';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fmt(dispValue), cx, cy - 6);
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('tổng cộng', cx, cy + 16);
  }

  // Cartoon legend
  legend.innerHTML = slices.map((s, i) => {
    const pct = ((s.total / total) * 100).toFixed(1);
    const active = i === hoverIdx ? ' style="font-weight:700"' : '';
    return `
      <div class="donut-legend-item" data-idx="${i}"${active}>
        <span class="donut-legend-dot" style="background:${s.color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.06)"></span>
        <span class="donut-legend-label">${escapeHtml(s.label)}</span>
        <span class="donut-legend-value">${fmt(s.total)}â‚« (${pct}%)</span>
      </div>
    `;
  }).join('');

  Array.from(legend.children).forEach(el => {
    el.addEventListener('mouseenter', () => setHover(parseInt(el.dataset.idx)));
    el.addEventListener('mouseleave', () => setHover(-1));
  });
}

function darkenColor(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `rgb(${r},${g},${b})`;
}

function setHover(idx) {
  if (idx === hoverAnim.idx) return;

  const filtered = filterExpenses();
  const grandTotal = filtered.reduce((s, e) => s + e.amount, 0);

  if (idx >= 0 && slicesCache[idx]) {
    hoverAnim.numTo = slicesCache[idx].total;
  } else {
    hoverAnim.numTo = grandTotal;
  }
  hoverAnim.numFrom = hoverAnim.numCurrent || grandTotal;

  hoverAnim.prevIdx = hoverAnim.idx;
  hoverAnim.idx = idx;
  hoverAnim.from = hoverAnim.current;
  hoverAnim.to = idx >= 0 ? 1 : 0;
  hoverAnim.time = 0;
  if (!hoverAnim.running) {
    hoverAnim.running = true;
    animateDonut();
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animateDonut() {
  const duration = 900;
  hoverAnim.time += 16;

  const t = Math.min(hoverAnim.time / duration, 1);
  const eased = easeInOutCubic(t);

  const currentGap = hoverAnim.from + (hoverAnim.to - hoverAnim.from) * eased;
  hoverAnim.current = currentGap;

  hoverAnim.numCurrent = hoverAnim.numFrom + (hoverAnim.numTo - hoverAnim.numFrom) * eased;

  const gapPx = currentGap * 10;
  drawDonutChart(hoverAnim.idx, gapPx);

  if (t < 1) {
    requestAnimationFrame(animateDonut);
  } else {
    hoverAnim.running = false;
    hoverAnim.from = hoverAnim.to;
    hoverAnim.current = hoverAnim.to;
    hoverAnim.numCurrent = hoverAnim.numTo;
  }
}

function setupDonutHover() {
  const canvas = document.getElementById('donutChart');
  const innerR = 92, outerR = 142;

  canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const dx = mx - cx, dy = my - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < innerR || dist > outerR) {
      canvas.style.cursor = 'default';
      setHover(-1);
      return;
    }

    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;

    let found = -1;
    for (let i = 0; i < slicesCache.length; i++) {
      const s = slicesCache[i];
      const end = s.startAngle + s.angle;
      if (angle >= s.startAngle && angle < end) {
        found = i;
        break;
      }
    }

    canvas.style.cursor = found >= 0 ? 'pointer' : 'default';
    setHover(found);
  });

  canvas.addEventListener('mouseleave', function() {
    setHover(-1);
  });
}

// ===== CONTROL PANEL =====

// Dark mode
function createStars() {
  const container = document.getElementById('starfield');
  container.innerHTML = '';
  for (let i = 0; i < 80; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 2.5 + 1;
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.setProperty('--dur', (Math.random() * 2 + 1) + 's');
    star.style.animationDelay = Math.random() * 3 + 's';
    container.appendChild(star);
  }
}

function createGalaxyDust() {
  const container = document.getElementById('galaxyDust');
  if (!container) return;
  container.innerHTML = '';
  const colors = ['rgba(200, 180, 255, 0.9)', 'rgba(255, 200, 240, 0.8)', 'rgba(180, 230, 255, 0.8)', 'rgba(255, 230, 180, 0.7)', 'rgba(200, 255, 220, 0.7)'];
  for (let i = 0; i < 120; i++) {
    const dust = document.createElement('div');
    dust.className = 'galaxy-dust';
    const size = Math.random() * 5 + 2;
    dust.style.width = size + 'px';
    dust.style.height = size + 'px';
    dust.style.background = 'radial-gradient(circle, ' + colors[i % colors.length] + ', transparent)';
    dust.style.left = Math.random() * 100 + '%';
    dust.style.top = Math.random() * 100 + '%';
    dust.style.setProperty('--dur', (Math.random() * 8 + 5) + 's');
    dust.style.setProperty('--max-op', (Math.random() * 0.6 + 0.3));
    dust.style.setProperty('--tx', (Math.random() * 120 - 60) + 'px');
    dust.style.setProperty('--ty', (Math.random() * 120 - 60) + 'px');
    dust.style.animationDelay = Math.random() * 8 + 's';
    container.appendChild(dust);
  }
}

function updateHeaderTheme(dark) {
  const emoji = document.getElementById('headerEmoji');
  const sub = document.getElementById('headerSub');
  const star = document.getElementById('shootingStar');
  if (dark) {
    emoji.textContent = '\u{1F30C}';
    sub.textContent = 'VÅ© trá»¥ tÃ i chÃ­nh, kiá»ƒm soÃ¡t má»i chi tiÃªu';
    star.style.display = 'block';
  } else {
    emoji.textContent = '\u{1F30A}';
    sub.textContent = 'Theo dÃµi thu chi má»—i ngÃ y, quáº£n lÃ½ tÃ i chÃ­nh thÃ´ng minh';
    star.style.display = 'none';
  }
}

function initDarkMode() {
  const enabled = localStorage.getItem('darkMode') === 'true';
  document.body.classList.toggle('dark-mode', enabled);
  document.getElementById('dmBadge').textContent = enabled ? 'ON' : 'OFF';
  createStars();
  if (enabled) { createGalaxyDust(); }
  updateHeaderTheme(enabled);
}

document.getElementById('cpDarkMode').addEventListener('click', function() {
  const enabled = !document.body.classList.contains('dark-mode');
  document.body.classList.toggle('dark-mode', enabled);
  localStorage.setItem('darkMode', enabled);
  document.getElementById('dmBadge').textContent = enabled ? 'ON' : 'OFF';
  updateHeaderTheme(enabled);
  if (enabled) { createGalaxyDust(); }
    else { document.getElementById('galaxyDust').innerHTML = ''; }
  showToast(enabled ? 'ÄÃ£ báº­t Dark Mode â€” chÃ o má»«ng Ä‘áº¿n vÅ© trá»¥!' : 'ÄÃ£ táº¯t Dark Mode');
});

// Reset data
document.getElementById('cpReset').addEventListener('click', function() {
  const overlay = document.getElementById('confirmOverlay');
  document.getElementById('confirmMsg').textContent =
    'Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xoÃ¡ táº¥t cáº£ dá»¯ liá»‡u chi tiÃªu? HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c!';
  overlay.classList.add('show');
});

document.getElementById('confirmCancel').addEventListener('click', function() {
  document.getElementById('confirmOverlay').classList.remove('show');
});

document.getElementById('confirmOk').addEventListener('click', function() {
  expenses = [];
  saveData();
  refresh();
  document.getElementById('confirmOverlay').classList.remove('show');
  showToast('ÄÃ£ reset toÃ n bá»™ dá»¯ liá»‡u');
});

// Export PDF
document.getElementById('cpPDF').addEventListener('click', function() {
  const monthExpenses = expenses.filter(e => isThisMonth(new Date(e.date)));
  if (monthExpenses.length === 0) {
    showToast('KhÃ´ng cÃ³ dá»¯ liá»‡u thÃ¡ng nÃ y Ä‘á»ƒ xuáº¥t!', true);
    return;
  }

  const now = new Date();
  const monthName = now.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  const total = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const count = monthExpenses.length;
  const avg = Math.round(total / count);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyAvg = Math.round(total / daysInMonth);

  const sorted = [...monthExpenses].sort((a, b) => new Date(b.date) - new Date(a.date));

  let rows = '';
  sorted.forEach((e, i) => {
    const d = new Date(e.date);
    const ds = d.toLocaleDateString('vi-VN');
    const ts = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const bg = i % 2 === 0 ? '#1a1030' : '#120824';
    rows += `<tr style="background:${bg}">
      <td style="padding:5px 8px;border:1px solid #2a1a4a;color:#c8c8d0;font-size:10px">${ds}</td>
      <td style="padding:5px 8px;border:1px solid #2a1a4a;color:#8888a0;font-size:10px">${ts}</td>
      <td style="padding:5px 8px;border:1px solid #2a1a4a;color:#f87171;text-align:right;font-weight:600;font-size:10px">-${fmt(e.amount)}â‚«</td>
      <td style="padding:5px 8px;border:1px solid #2a1a4a;color:#b0b0c0;font-size:10px">${e.reason}</td>
    </tr>`;
  });

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  @page { margin: 0; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0015; color: white; padding: 0; }
  .page { width: 210mm; min-height: 297mm; padding: 0; position: relative; }
  .header { background: linear-gradient(135deg,#0a0015,#1a0a2e,#0d1b3e); padding: 28px 30px 16px; text-align: center; }
  .header h1 { font-size: 22px; font-weight: 700; letter-spacing: 1px; }
  .header .sub { color: rgba(200,180,255,0.7); font-size: 12px; margin-top: 4px; }
  .header .date-line { color: #a890c0; font-size: 10px; margin-top: 10px; }
  .body { padding: 20px 30px; }
  .stats { display: flex; gap: 6px; margin-bottom: 20px; }
  .stat-card { flex: 1; background: linear-gradient(135deg,rgba(20,8,42,0.6),rgba(30,15,50,0.4)); border: 1px solid rgba(120,80,200,0.12); border-radius: 6px; padding: 10px; text-align: center; }
  .stat-card .label { font-size: 9px; color: #8a70a0; }
  .stat-card .value { font-size: 15px; font-weight: 700; color: #e0d0f0; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: linear-gradient(135deg,#1a0a2e,#0d1b3e); color: #b8a0d0; padding: 7px 8px; text-align: left; border: 1px solid #2a1a4a; font-size: 9px; font-weight: 600; }
  td { padding: 5px 8px; border: 1px solid #2a1a4a; color: #c8c8d0; font-size: 10px; }
  .total-row td { font-weight: 700; color: #f0e0ff; font-size: 12px; background: #1a1030; }
  .total-row .amount { color: #f87171; text-align: right; }
  .footer { text-align: center; color: #5a4a70; font-size: 8px; margin-top: 24px; }
  .amount-cell { color: #f87171; text-align: right; font-weight: 600; }
</style></head>
<body>
<div class="page">
  <div class="header">
    <h1>BÃO CÃO CHI TIÃŠU</h1>
    <div class="sub">${monthName}</div>
    <div class="date-line">NgÃ y xuáº¥t: ${now.toLocaleDateString('vi-VN', { year:'numeric', month:'long', day:'numeric' })}</div>
  </div>
  <div class="body">
    <div class="stats">
      <div class="stat-card"><div class="label">Tá»•ng chi</div><div class="value">${fmt(total)}â‚«</div></div>
      <div class="stat-card"><div class="label">Sá»‘ khoáº£n</div><div class="value">${count}</div></div>
      <div class="stat-card"><div class="label">TB má»—i khoáº£n</div><div class="value">${fmt(avg)}â‚«</div></div>
      <div class="stat-card"><div class="label">TB má»—i ngÃ y</div><div class="value">${fmt(dailyAvg)}â‚«</div></div>
    </div>
    <table>
      <thead><tr>
        <th style="width:22%;font-weight:700;font-size:11px">NgÃ y thÃªm dá»¯ liá»‡u</th>
        <th style="width:15%;font-weight:700;font-size:11px">Thá»i gian</th>
        <th style="width:25%;text-align:right;font-weight:700;font-size:11px">Sá»‘ tiá»n</th>
        <th style="width:38%;font-weight:700;font-size:11px">LÃ½ do</th>
      </tr></thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="2" style="font-size:12px">Tá»”NG Cá»˜NG</td>
          <td colspan="2" style="text-align:right;font-size:15px;font-weight:700;color:#fbbf24;padding-right:12px">-${fmt(total)}â‚«</td>
        </tr>
      </tbody>
    </table>
    <div class="footer">Generated by Quáº£n LÃ½ Chi TiÃªu App &bull; ${now.toLocaleString('vi-VN')}</div>
  </div>
</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 600);
  showToast('ÄÃ£ má»Ÿ bÃ¡o cÃ¡o PDF! Nháº¥n "LÆ°u" trong cá»­a sá»• in áº¥n.');
});

// Stats extra
document.getElementById('cpStatsExtra').addEventListener('click', function() {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const count = expenses.length;
  const avg = count > 0 ? Math.round(total / count) : 0;
  const thisMonth = expenses.filter(e => isThisMonth(new Date(e.date)));
  const monthTotal = thisMonth.reduce((s, e) => s + e.amount, 0);
  const topReason = count > 0 ? (() => {
    const g = {};
    expenses.forEach(e => { g[e.reason] = (g[e.reason] || 0) + e.amount; });
    return Object.entries(g).sort((a, b) => b[1] - a[1])[0][0];
  })() : 'â€”';
  const msg =
    'ðŸ“Š Thá»‘ng kÃª tá»•ng quan\n' +
    'â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\n' +
    `Tá»•ng chi:   ${fmt(total)}â‚«\n` +
    `Sá»‘ khoáº£n:   ${count}\n` +
    `TB má»—i khoáº£n: ${fmt(avg)}â‚«\n` +
    `ThÃ¡ng nÃ y:  ${fmt(monthTotal)}â‚«\n` +
    `Khoáº£n lá»›n nháº¥t: ${topReason}`;
  alert(msg);
});

// Suggestions
const suggestions = [
  'ðŸ“Œ ThÃªm danh má»¥c chi tiÃªu (Äƒn uá»‘ng, Ä‘i láº¡i, giáº£i trÃ­...)',
  'ðŸ“Œ Äáº·t háº¡n má»©c theo tá»«ng danh má»¥c',
  'ðŸ“Œ Nháº­p khoáº£n thu (lÆ°Æ¡ng, thu nháº­p thÃªm) Ä‘á»ƒ theo dÃµi tá»•ng thá»ƒ',
  'ðŸ“Œ Biá»ƒu Ä‘á»“ Ä‘Æ°á»ng theo ngÃ y Ä‘á»ƒ xem xu hÆ°á»›ng',
  'ðŸ“Œ Lá»c chi tiÃªu theo khoáº£ng ngÃ y tuá»³ chá»‰nh',
  'ðŸ“Œ Sao lÆ°u dá»¯ liá»‡u lÃªn Google Drive / Cloud',
  'ðŸ“Œ Xuáº¥t bÃ¡o cÃ¡o PDF cuá»‘i thÃ¡ng',
  'ðŸ“Œ Nháº¯c nhá»Ÿ khi sáº¯p vÆ°á»£t ngÃ¢n sÃ¡ch',
  'ðŸ“Œ Nháº­p chi tiÃªu báº±ng giá»ng nÃ³i',
  'ðŸ“Œ Xem tá»· lá»‡ chi theo danh má»¥c dáº¡ng báº£ng'
];

document.getElementById('cpSuggest').addEventListener('click', function() {
  const idx = Math.floor(Math.random() * suggestions.length);
  showToast(suggestions[idx]);
});

// ===== REFRESH =====
function refresh() {
  updateStats();
  updateChart();
  drawDonutChart();
  renderLog();
}

// ===== BUBBLES =====
function createBubbles() {
  const header = document.getElementById('oceanHeader');
  for (let i = 0; i < 15; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    const size = Math.random() * 24 + 8;
    bubble.style.width = size + 'px';
    bubble.style.height = size + 'px';
    bubble.style.left = Math.random() * 100 + '%';
    bubble.style.bottom = '-20px';
    bubble.style.animationDuration = (Math.random() * 6 + 4) + 's';
    bubble.style.animationDelay = (Math.random() * 8) + 's';
    header.appendChild(bubble);
  }
}

// ===== INIT =====
loadData();
createBubbles();
setupDonutHover();
initDarkMode();
refresh();

