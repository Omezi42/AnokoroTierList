import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAjsWqN2VqdYh1Gwd4d0WmB22HxOkeMT0Y",
  authDomain: "anokorotierlist.firebaseapp.com",
  projectId: "anokorotierlist",
  storageBucket: "anokorotierlist.firebasestorage.app",
  messagingSenderId: "949621912870",
  appId: "1:949621912870:web:638ad87f68fc17fce37de7",
  measurementId: "G-4TLKD1YTJD"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Constants ---
const CARD_NAMES_URL = "https://raw.githubusercontent.com/Omezi42/AnokoroImageFolder/main/all_card_names.txt";
const TRANSPARENT_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/Omezi42/AnokoroImageFolder/main/images/transparent_cards';
const CROPPED_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/Omezi42/AnokoroImageFolder/main/images/cropped_cards';
const IMAGE_SUFFIX = '.png';

// --- Global State ---
let state = {
  cardNames: [],
  selectedBg: null,
  selectedSub: null,
  inventory: JSON.parse(localStorage.getItem('anokoro_inventory') || '[]'),
  tiers: [
    { id: 't1', name: 'S', color: '#ff7f7f' },
    { id: 't2', name: 'A', color: '#ffbf7f' },
    { id: 't3', name: 'B', color: '#ffff7f' },
    { id: 't4', name: 'C', color: '#7fff7f' }
  ],
  iconSize: 84,
  lastPos: { x: 0, y: 0 } 
};

// --- Initialization ---
window.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  await fetchCardNames();
  renderInventory();
  renderTierList();
  setupSearch();
  setupPlotterLabels();
  await checkSharedId();
  
  const track = (e) => {
    state.lastPos.x = e.clientX || (e.touches && e.touches[0].clientX);
    state.lastPos.y = e.clientY || (e.touches && e.touches[0].clientY);
  };
  window.addEventListener('mousemove', track, true);
  window.addEventListener('touchmove', track, true);

  document.getElementById('save-btn').onclick = saveToFirebase;

  // Inventory Toggle
  const toggleBtn = document.getElementById('inventory-toggle-btn');
  const isCollapsed = localStorage.getItem('anokoro_tray_collapsed') === 'true';
  if (isCollapsed) document.body.classList.add('tray-is-collapsed');
  
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      const collapsed = document.body.classList.toggle('tray-is-collapsed');
      localStorage.setItem('anokoro_tray_collapsed', collapsed);
    };
  }

  // Global exports
  window.addIconToInventory = addIconToInventory;
  window.downloadIcon = downloadIcon;
  window.addTierRow = addTierRow;
  window.addToMatchup = addToMatchup;
  window.addToPlotter = addToPlotter;
  window.deleteIcon = deleteIcon;
  window.clearInventory = clearInventory;
  window.moveTier = moveTier;
  window.deleteTier = deleteTier;
  window.updateTierColor = updateTierColor;
  window.updateTierName = updateTierName;
  window.exportAsImage = exportAsImage;
  window.clearTierRow = clearTierRow;
  window.updateIconSize = updateIconSize;
  window.handleCustomUpload = handleCustomUpload;
  window.applyTierPreset = applyTierPreset;
  window.deleteMatchupRow = deleteMatchupRow;
  window.deleteMatchupCol = deleteMatchupCol;
  window.copyToClipboard = copyToClipboard;
});

function setupNav() {
  const btns = document.querySelectorAll('.side-btn');
  btns.forEach(btn => {
    btn.onclick = () => {
      const viewId = btn.getAttribute('data-view');
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
      document.getElementById(viewId).classList.add('active');
      document.getElementById('current-view-name').innerText = btn.innerText.trim();
      
      initTraySortable(viewId);
      renderInventory(); 
    };
  });
}

function initTraySortable(viewId) {
  const inventoryEl = document.getElementById('icon-inventory');
  if (!inventoryEl) return;
  
  const existing = Sortable.get(inventoryEl);
  if (existing) existing.destroy();
  
  if (viewId === 'tier-list') {
    new Sortable(inventoryEl, { group: { name: 'shared', pull: 'clone', put: false }, animation: 200, sort: false });
  }
}

async function fetchCardNames() {
  try {
    const res = await fetch(CARD_NAMES_URL);
    const text = await res.text();
    state.cardNames = text.split('\n').filter(n => n.trim());
    renderSearchResults('bg', state.cardNames);
    renderSearchResults('sub', state.cardNames);
  } catch (e) { console.error(e); }
}

function setupSearch() {
  document.getElementById('bg-search').oninput = (e) => renderSearchResults('bg', state.cardNames.filter(n => n.includes(e.target.value)));
  document.getElementById('sub-search').oninput = (e) => renderSearchResults('sub', state.cardNames.filter(n => n.includes(e.target.value)));
}

function renderSearchResults(type, names) {
  const container = document.getElementById(`${type}-results`);
  container.innerHTML = '';
  names.forEach(name => {
    const img = document.createElement('img');
    const encodedName = encodeURIComponent(name).replace(/\(/g, '%28').replace(/\)/g, '%29');
    const baseUrl = type === 'bg' ? CROPPED_IMAGE_BASE_URL : TRANSPARENT_IMAGE_BASE_URL;
    img.src = `${baseUrl}/${encodedName}${IMAGE_SUFFIX}`;
    img.className = 'search-img-item';
    img.crossOrigin = "Anonymous";
    img.loading = "lazy";
    img.onerror = () => img.remove(); // 404等の場合は非表示にする
    img.onclick = () => {
      container.querySelectorAll('img').forEach(i => i.classList.remove('selected'));
      img.classList.add('selected');
      if (type === 'bg') state.selectedBg = img.src;
      else state.selectedSub = img.src;
      updateCanvas();
    };
    container.appendChild(img);
  });
}

function updateCanvas() {
  const canvas = document.getElementById('icon-canvas');
  const ctx = canvas.getContext('2d');
  const size = 512;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  if (!state.selectedBg) return;

  const bg = new Image();
  bg.crossOrigin = "Anonymous";
  bg.src = state.selectedBg;
  bg.onload = () => {
    const aspect = bg.width / bg.height;
    let w, h, x, y;
    if (aspect > 1) { h = size; w = size * aspect; x = (size - w) / 2; y = 0; }
    else { w = size; h = size / aspect; x = 0; y = (size - h) / 2; }
    ctx.drawImage(bg, x, y, w, h);

    if (state.selectedSub) {
      const sub = new Image();
      sub.crossOrigin = "Anonymous";
      sub.src = state.selectedSub;
      sub.onload = () => {
        const maxSub = size * 0.8;
        const subAspect = sub.width / sub.height;
        let sw, sh;
        if (subAspect > 1) { sw = maxSub; sh = maxSub / subAspect; }
        else { sh = maxSub; sw = maxSub * subAspect; }
        const sx = size - sw * (2/3);
        const sy = size - sh;
        ctx.drawImage(sub, sx, sy, sw, sh);
      };
    }
  };
}

// --- Image Compression Utility ---
async function compressImage(src, maxSize = 256) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round((h * maxSize) / w); w = maxSize; } 
        else { w = Math.round((w * maxSize) / h); h = maxSize; }
      }
      
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/webp', 0.85));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

async function addIconToInventory() {
  if (!state.selectedBg || !state.selectedSub) return;
  const canvas = document.getElementById('icon-canvas');
  const originalDataUrl = canvas.toDataURL('image/png');
  
  // 容量節約のために圧縮
  const compressedDataUrl = await compressImage(originalDataUrl, 256);
  
  state.inventory.unshift({ id: 'icon_' + Date.now(), dataUrl: compressedDataUrl });
  
  try {
    localStorage.setItem('anokoro_inventory', JSON.stringify(state.inventory));
    renderInventory();
    showToast("追加しました");
  } catch (e) {
    console.error("Storage limit exceeded", e);
    state.inventory.shift(); // 追加をキャンセル
    alert("保存容量の限界です！「Reset Tray」を押すか不要なアイコンを削除してください。\n(過去に巨大なデータが保存されている可能性があります)");
  }
}

function renderInventory() {
  const el = document.getElementById('icon-inventory');
  if (!el) return;
  el.innerHTML = '';
  state.inventory.forEach(item => {
    const wrap = document.createElement('div');
    wrap.className = 'relative group';
    const img = document.createElement('img');
    img.src = item.dataUrl;
    img.className = 'tray-icon-img';
    
    const del = document.createElement('button');
    del.innerHTML = '×';
    del.className = 'inventory-delete-btn';
    del.onmousedown = (e) => e.stopPropagation();
    del.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      deleteIcon(item.id);
    };
    
    const activeView = document.querySelector('.view-container.active');
    if (activeView) {
      if (activeView.id === 'matchup') {
        img.onclick = () => addToMatchup(item.id);
        img.style.cursor = 'pointer';
      } else if (activeView.id === 'plotter') {
        img.onclick = () => addToPlotter(item.id);
        img.style.cursor = 'pointer';
      } else {
        img.onclick = null;
        img.style.cursor = 'grab';
      }
    }
    
    wrap.appendChild(img);
    wrap.appendChild(del);
    el.appendChild(wrap);
  });
}

function deleteIcon(id) {
  if (confirm("インベントリから完全に削除しますか？\n(配置済みのデータには影響しません)")) {
    state.inventory = state.inventory.filter(i => i.id !== id);
    localStorage.setItem('anokoro_inventory', JSON.stringify(state.inventory));
    renderInventory();
    showToast("削除しました");
  }
}

function handleCustomUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    // アップロードされた画像も圧縮して容量削減
    const compressedDataUrl = await compressImage(e.target.result, 256);
    state.inventory.unshift({ id: 'icon_custom_' + Date.now(), dataUrl: compressedDataUrl });
    try {
      localStorage.setItem('anokoro_inventory', JSON.stringify(state.inventory));
      renderInventory();
      showToast("アップロード完了");
    } catch (err) {
      console.error("Storage limit exceeded", err);
      state.inventory.shift();
      alert("保存容量の限界です！不要なアイコンを削除してください。");
    }
  };
  reader.readAsDataURL(file);
}

function clearInventory() {
  if (confirm("インベントリをクリアしますか？")) {
    state.inventory = [];
    localStorage.removeItem('anokoro_inventory');
    renderInventory();
  }
}

function updateIconSize(size) {
  state.iconSize = parseInt(size);
  document.documentElement.style.setProperty('--icon-size', `${size}px`);
}

// --- Tier List ---
function renderTierList() {
  const container = document.getElementById('tier-rows-container');
  if (!container) return;
  container.innerHTML = '';
  state.tiers.forEach((tier, idx) => {
    const row = document.createElement('div');
    row.className = 'tier-row';
    row.innerHTML = `
      <div class="tier-label-cell" style="background: ${tier.color}">
        <div class="tier-actions">
          <button class="action-btn" onclick="moveTier(${idx}, -1)">▲</button>
          <button class="action-btn" onclick="clearTierRow('${tier.id}')">CLR</button>
          <button class="action-btn" onclick="deleteTier(${idx})">×</button>
          <button class="action-btn" onclick="moveTier(${idx}, 1)">▼</button>
          <input type="color" value="${tier.color}" onchange="updateTierColor(${idx}, this.value)">
        </div>
        <div class="tier-name-input" contenteditable="true" onblur="updateTierName(${idx}, this.innerText)">${tier.name}</div>
      </div>
      <div class="tier-items-cell" data-id="${tier.id}"></div>
    `;
    container.appendChild(row);
    new Sortable(row.querySelector('.tier-items-cell'), { 
      group: 'shared', 
      animation: 200, 
      ghostClass: 'opacity-30',
      onAdd: (evt) => {
        const item = evt.item;
        const del = item.querySelector('.inventory-delete-btn');
        if (del) {
          del.onclick = (e) => {
            e.stopPropagation();
            item.remove();
          };
        }
      }
    });
  });
}

function applyTierPreset(type) {
  if (!confirm("Tier表の内容がリセットされます。よろしいですか？")) return;
  if (type === 's-c') {
    state.tiers = [
      { id: 't1', name: 'S', color: '#ff7f7f' },
      { id: 't2', name: 'A', color: '#ffbf7f' },
      { id: 't3', name: 'B', color: '#ffff7f' },
      { id: 't4', name: 'C', color: '#7fff7f' }
    ];
  } else if (type === 's-d') {
    state.tiers = [
      { id: 't1', name: 'S', color: '#ff7f7f' },
      { id: 't2', name: 'A', color: '#ffbf7f' },
      { id: 't3', name: 'B', color: '#ffff7f' },
      { id: 't4', name: 'C', color: '#7fff7f' },
      { id: 't5', name: 'D', color: '#7f7fff' }
    ];
  } else if (type === 'simple') {
    state.tiers = [
      { id: 't1', name: '上', color: '#ff7f7f' },
      { id: 't2', name: '中', color: '#ffff7f' },
      { id: 't3', name: '下', color: '#7fff7f' }
    ];
  }
  renderTierList();
}

function updateTierName(idx, name) { state.tiers[idx].name = name; }
function updateTierColor(idx, color) { state.tiers[idx].color = color; renderTierList(); }
function addTierRow() { state.tiers.push({ id: 't'+Date.now(), name: 'New', color: '#f8fafc' }); renderTierList(); }
function moveTier(idx, dir) {
  const to = idx + dir;
  if (to < 0 || to >= state.tiers.length) return;
  const t = state.tiers[idx];
  state.tiers[idx] = state.tiers[to];
  state.tiers[to] = t;
  renderTierList();
}
function deleteTier(idx) { if (confirm("削除しますか？")) { state.tiers.splice(idx, 1); renderTierList(); } }
function clearTierRow(id) {
  const el = document.querySelector(`.tier-items-cell[data-id="${id}"]`);
  if (el) el.innerHTML = '';
}

// --- Matchup ---
let matchupDeckIdCounter = 0;

function addToMatchup(id) {
  const icon = state.inventory.find(i => i.id === id);
  if (!icon) return;
  
  const header = document.getElementById('matchup-header');
  const body = document.getElementById('matchup-body');
  
  // Totalヘッダーの確保
  if (!header.querySelector('.score-header')) {
    const scoreTh = document.createElement('th');
    scoreTh.className = 'score-header';
    scoreTh.innerText = 'Total';
    header.appendChild(scoreTh);
  }

  const nextIdx = matchupDeckIdCounter++; // 新しいデッキのインデックス
  
  // 1. ヘッダーに新しいデッキの列を追加（Totalの前）
  const th = document.createElement('th');
  th.dataset.colIdx = nextIdx;
  th.innerHTML = `
    <div class="cell-content group">
      <img src="${icon.dataUrl}" style="width: var(--icon-size); height: var(--icon-size); border-radius: 10px; box-shadow: var(--shadow-sm);">
    </div>
  `;
  header.insertBefore(th, header.querySelector('.score-header'));

  // 2. 新しい行を作成
  const tr = document.createElement('tr');
  tr.dataset.rowIdx = nextIdx;
  tr.innerHTML = `
    <td>
      <div class="cell-content group">
        <img src="${icon.dataUrl}" style="width: var(--icon-size); height: var(--icon-size); border-radius: 10px; box-shadow: var(--shadow-sm);">
        <button class="inventory-delete-btn" onclick="deleteMatchupRow(this)">×</button>
      </div>
    </td>
  `;
  
  const options = ['+4','+3','+2','+1','±0','-1','-2','-3','-4'];
  const optionsHtml = options.map(o => `<option value="${o}" ${o === '±0' ? 'selected' : ''}>${o}</option>`).join('');

  // 3. 既存の行すべてに新しい列セルを追加（Totalの前）
  Array.from(body.rows).forEach((row) => {
    const rIdx = row.dataset.rowIdx;
    const td = document.createElement('td');
    td.innerHTML = `<div class="cell-content"><select data-row="${rIdx}" data-col="${nextIdx}" onchange="updateMatchupColor(this)" class="match-zero">${optionsHtml}</select></div>`;
    row.insertBefore(td, row.querySelector('.matchup-score-cell'));
  });

  // 4. 新しい行にセルを追加
  const existingCols = Array.from(header.querySelectorAll('th[data-col-idx]')).map(th => th.dataset.colIdx);
  existingCols.forEach(cIdx => {
    const td = document.createElement('td');
    if (cIdx == nextIdx) {
      // 対角線セル
      td.className = 'matchup-diagonal';
      td.innerHTML = `<div class="cell-content"><select data-row="${nextIdx}" data-col="${cIdx}" class="match-zero" disabled style="opacity:0; pointer-events:none;"><option value="±0">±0</option></select></div>`;
    } else {
      td.innerHTML = `<div class="cell-content"><select data-row="${nextIdx}" data-col="${cIdx}" onchange="updateMatchupColor(this)" class="match-zero">${optionsHtml}</select></div>`;
    }
    tr.appendChild(td);
  });

  // 5. 新しい行にScoreセルを追加
  const scoreTd = document.createElement('td');
  scoreTd.className = 'matchup-score-cell';
  scoreTd.innerText = '0';
  tr.appendChild(scoreTd);

  body.appendChild(tr);
}

window.updateMatchupColor = function(select, isMirror = false) {
  const val = select.value;
  const rowIdx = select.dataset.row;
  const colIdx = select.dataset.col;

  select.classList.remove('match-plus-4', 'match-plus-3', 'match-plus-2', 'match-plus-1', 'match-zero', 'match-minus-1', 'match-minus-2', 'match-minus-3', 'match-minus-4');
  
  if (val.includes('+')) select.classList.add(`match-plus-${val.replace('+', '')}`);
  else if (val.includes('-')) select.classList.add(`match-minus-${val.replace('-', '')}`);
  else select.classList.add('match-zero');

  // 自動反転ロジック
  if (!isMirror) {
    const mirrorSelect = document.querySelector(`select[data-row="${colIdx}"][data-col="${rowIdx}"]`);
    if (mirrorSelect) {
      let mirrorVal = '±0';
      if (val.includes('+')) mirrorVal = '-' + val.replace('+', '');
      else if (val.includes('-')) mirrorVal = '+' + val.replace('-', '');
      
      mirrorSelect.value = mirrorVal;
      updateMatchupColor(mirrorSelect, true); // ミラー側も色更新（再帰防止フラグ付）
    }
  }

  // 行スコアの更新
  calculateRowScore(select.closest('tr'));
  // ミラー側の行スコアも更新が必要
  if (!isMirror) {
    const mirrorRow = document.querySelector(`tr[data-row-idx="${colIdx}"]`);
    if (mirrorRow) calculateRowScore(mirrorRow);
  }
};

function calculateRowScore(row) {
  const selects = row.querySelectorAll('select');
  let total = 0;
  selects.forEach(s => {
    const v = s.value;
    if (v.includes('+')) total += parseInt(v.replace('+', ''));
    if (v.includes('-')) total -= parseInt(v.replace('-', ''));
  });
  
  const scoreCell = row.querySelector('.matchup-score-cell');
  if (scoreCell) {
    scoreCell.innerText = (total > 0 ? '+' : '') + total;
    scoreCell.style.color = total > 0 ? '#10b981' : (total < 0 ? '#f43f5e' : '#94a3b8');
  }
}

function deleteMatchupRow(btn) {
  if (confirm("このデッキを削除しますか？（行と列が削除されます）")) {
    const row = btn.closest('tr');
    const idx = row.dataset.rowIdx;
    
    // 行を削除
    row.remove();
    
    // 対応する列（ヘッダーと各行のセル）を削除
    const header = document.getElementById('matchup-header');
    const th = header.querySelector(`th[data-col-idx="${idx}"]`);
    if (th) th.remove();
    
    const body = document.getElementById('matchup-body');
    Array.from(body.rows).forEach(r => {
      const td = r.querySelector(`select[data-col="${idx}"]`)?.closest('td');
      if (td) td.remove();
      calculateRowScore(r);
    });
  }
}

function deleteMatchupCol() { /* デッキ削除で一括処理するため不要 */ }

// --- Plotter ---
function addToPlotter(id) {
  const icon = state.inventory.find(i => i.id === id);
  if (!icon) return;
  const area = document.getElementById('plot-area');
  const r = area.getBoundingClientRect();
  const jitterX = (Math.random() - 0.5) * 40;
  const jitterY = (Math.random() - 0.5) * 40;
  createPlotItem(icon.dataUrl, (r.width / 2) + jitterX, (r.height / 2) + jitterY);
}

function createPlotItem(src, x, y) {
  const el = document.createElement('div');
  el.className = 'plot-item group';
  const offset = state.iconSize / 2;
  el.style.left = `${x - offset}px`;
  el.style.top = `${y - offset}px`;
  
  el.innerHTML = `
    <img src="${src}">
    <button class="inventory-delete-btn">×</button>
  `;
  
  const del = el.querySelector('button');
  del.onclick = (e) => {
    e.stopPropagation();
    el.remove();
  };
  
  el.onmousedown = (e) => {
    if (e.target === del) return;
    e.preventDefault();
    el.style.transition = 'none';
    el.style.zIndex = '100';
    const startX = e.clientX;
    const startY = e.clientY;
    const startL = parseInt(el.style.left) || 0;
    const startT = parseInt(el.style.top) || 0;
    
    const move = (me) => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      el.style.left = `${startL + dx}px`;
      el.style.top = `${startT + dy}px`;
    };
    
    const stop = () => {
      el.style.transition = '';
      el.style.zIndex = '';
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', stop);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stop);
  };
  document.getElementById('plot-area').appendChild(el);
}

function setupPlotterLabels() {
  const x = document.getElementById('axis-x-label');
  const y = document.getElementById('axis-y-label');
  if (!x || !y) return;
  const update = () => {
    document.getElementById('label-top').innerText = `${y.value} (+)`;
    document.getElementById('label-bottom').innerText = `${y.value} (-)`;
    document.getElementById('label-right').innerText = `${x.value} (+)`;
    document.getElementById('label-left').innerText = `${x.value} (-)`;
  };
  x.oninput = update;
  y.oninput = update;
}

// --- Firebase & Export ---
async function saveToFirebase() {
  const btn = document.getElementById('save-btn');
  btn.innerText = '保存中...';
  try {
    const ref = await addDoc(collection(db, "charts"), { inventory: state.inventory, timestamp: Date.now() });
    const url = `${window.location.origin}${window.location.pathname}?id=${ref.id}`;
    navigator.clipboard.writeText(url);
    alert("クラウドに保存しました！URLをコピーしました。");
  } catch (e) { 
    console.error("Firebase Save Error:", e);
    alert("保存失敗: " + e.message); 
  } finally { 
    btn.innerText = 'クラウド保存'; 
  }
}

async function checkSharedId() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (id) {
    const snap = await getDoc(doc(db, "charts", id));
    if (snap.exists()) {
      state.inventory = snap.data().inventory;
      renderInventory();
      showToast("データを読み込みました");
    }
  }
}

async function exportAsImage() {
  const view = document.querySelector('.view-container.active');
  const area = view.querySelector('[id$="-capture-area"]') || view;
  const canvas = await html2canvas(area, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const l = document.createElement('a');
  l.download = `anokoro_pro_${Date.now()}.png`;
  l.href = canvas.toDataURL();
  l.click();
}

async function copyToClipboard() {
  const view = document.querySelector('.view-container.active');
  const area = view.querySelector('[id$="-capture-area"]') || view;
  const canvas = await html2canvas(area, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  canvas.toBlob(async (blob) => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      showToast("クリップボードにコピーしました");
    } catch (e) {
      showToast("コピーに失敗しました");
    }
  });
}

function showToast(m) {
  const t = document.createElement('div');
  t.className = 'fixed bottom-10 right-10 bg-slate-900 text-white px-8 py-4 rounded-3xl shadow-lg z-[2000] pop-in';
  t.innerText = m;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function downloadIcon() {
  const c = document.getElementById('icon-canvas');
  const l = document.createElement('a');
  l.download = 'icon.png';
  l.href = c.toDataURL();
  l.click();
}
