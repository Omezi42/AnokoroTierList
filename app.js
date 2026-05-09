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
};

// --- Initialization ---
window.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  await fetchCardNames();
  renderInventory();
  renderTierList();
  setupSearch();
  setupPlotter();
  setupPlotterLabels();
  await checkSharedId();
  
  document.getElementById('save-btn').onclick = saveToFirebase;

  // Global exports
  window.addIconToInventory = addIconToInventory;
  window.downloadIcon = downloadIcon;
  window.addTierRow = addTierRow;
  window.addToMatchup = addToMatchup;
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
    };
  });
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

function addIconToInventory() {
  if (!state.selectedBg || !state.selectedSub) return;
  const canvas = document.getElementById('icon-canvas');
  const dataUrl = canvas.toDataURL('image/png');
  state.inventory.unshift({ id: 'icon_' + Date.now(), dataUrl });
  localStorage.setItem('anokoro_inventory', JSON.stringify(state.inventory));
  renderInventory();
  showToast("追加しました");
}

function renderInventory() {
  const containers = ['icon-inventory', 'tier-inventory', 'matchup-inventory', 'plot-inventory'];
  containers.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    state.inventory.forEach(item => {
      const wrap = document.createElement('div');
      wrap.className = 'relative group';
      const img = document.createElement('img');
      img.src = item.dataUrl;
      img.className = 'tray-icon-img';
      img.style.width = `${state.iconSize}px`;
      img.style.height = `${state.iconSize}px`;
      
      const del = document.createElement('button');
      del.innerHTML = '×';
      del.className = 'inventory-delete-btn';
      del.onmousedown = (e) => e.stopPropagation();
      del.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (id === 'icon-inventory') {
          deleteIcon(item.id);
        } else {
          wrap.remove();
        }
      };
      
      if (id === 'matchup-inventory') {
        img.onclick = () => addToMatchup(item.id);
      }
      
      wrap.appendChild(img);
      wrap.appendChild(del);
      el.appendChild(wrap);
    });
  });
}

function deleteIcon(id) {
  if (confirm("インベントリから完全に削除しますか？\n(このデッキデータは失われます)")) {
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
  reader.onload = (e) => {
    state.inventory.unshift({ id: 'icon_custom_' + Date.now(), dataUrl: e.target.result });
    localStorage.setItem('anokoro_inventory', JSON.stringify(state.inventory));
    renderInventory();
    showToast("アップロード完了");
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
  state.iconSize = size;
  renderInventory();
}

// --- Tier List ---
function renderTierList() {
  const container = document.getElementById('tier-rows-container');
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
  new Sortable(document.getElementById('tier-inventory'), { group: { name: 'shared', pull: 'clone', put: false }, animation: 200, sort: false });
}

function applyTierPreset(type) {
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
function addToMatchup(id) {
  const icon = state.inventory.find(i => i.id === id);
  if (!icon) return;
  const colId = 'matchup-col-' + Date.now();
  const header = document.getElementById('matchup-header');
  const th = document.createElement('th');
  th.dataset.colId = colId;
  th.innerHTML = `
    <div class="cell-content group">
      <img src="${icon.dataUrl}" style="width: 56px; height: 56px; border-radius: 10px; box-shadow: var(--shadow-sm);">
      <button class="inventory-delete-btn" onclick="deleteMatchupCol('${colId}')">×</button>
    </div>
  `;
  header.appendChild(th);
  
  const body = document.getElementById('matchup-body');
  const tr = document.createElement('tr');
  tr.id = 'matchup-row-' + Date.now();
  tr.innerHTML = `
    <td class="relative">
      <div class="cell-content group">
        <img src="${icon.dataUrl}" style="width: 56px; height: 56px; border-radius: 10px; box-shadow: var(--shadow-sm);">
        <button class="inventory-delete-btn" onclick="deleteMatchupRow('${tr.id}')">×</button>
      </div>
    </td>
  `;
  
  const cols = header.cells.length - 1;
  for (let i = 0; i < cols; i++) {
    const td = document.createElement('td');
    td.innerHTML = `<div class="cell-content"><select><option>±0</option><option>+1</option><option>-1</option><option>+2</option><option>-2</option></select></div>`;
    tr.appendChild(td);
  }
  body.appendChild(tr);
  
  Array.from(body.rows).forEach((row, idx) => {
    if (idx === body.rows.length - 1) return;
    const td = document.createElement('td');
    td.innerHTML = `<div class="cell-content"><select><option>±0</option><option>+1</option><option>-1</option><option>+2</option><option>-2</option></select></div>`;
    row.appendChild(td);
  });
}

function deleteMatchupRow(id) { if (confirm("この行を削除しますか？")) document.getElementById(id).remove(); }
function deleteMatchupCol(colId) {
  if (!confirm("この列を削除しますか？")) return;
  const header = document.getElementById('matchup-header');
  const index = Array.from(header.cells).findIndex(cell => cell.dataset.colId === colId);
  if (index !== -1) {
    header.deleteCell(index);
    const body = document.getElementById('matchup-body');
    Array.from(body.rows).forEach(row => row.deleteCell(index));
  }
}

// --- Plotter ---
function setupPlotter() {
  const area = document.getElementById('plot-area');
  new Sortable(document.getElementById('plot-inventory'), {
    group: { name: 'plot', pull: 'clone', put: false },
    onEnd: (e) => {
      const r = area.getBoundingClientRect();
      // Calculate viewport coordinates correctly
      const x = (e.originalEvent.clientX || e.originalEvent.touches[0].clientX) - r.left;
      const y = (e.originalEvent.clientY || e.originalEvent.touches[0].clientY) - r.top;
      
      if (x > 0 && y > 0 && x < r.width && y < r.height) {
        const imgSrc = e.item.querySelector('img').src;
        createPlotItem(imgSrc, x, y);
      }
    }
  });
}

function createPlotItem(src, x, y) {
  const el = document.createElement('div');
  el.className = 'plot-item group';
  // Offset by half the icon size (64/2 = 32)
  el.style.left = `${x - 32}px`;
  el.style.top = `${y - 32}px`;
  el.innerHTML = `
    <img src="${src}" style="width: 64px; height: 64px; border-radius: 10px;">
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
    let sx = e.clientX - el.offsetLeft;
    let sy = e.clientY - el.offsetTop;
    document.onmousemove = (e) => {
      el.style.left = `${e.clientX - sx}px`;
      el.style.top = `${e.clientY - sy}px`;
    };
    document.onmouseup = () => document.onmousemove = null;
  };
  
  document.getElementById('plot-area').appendChild(el);
}

function setupPlotterLabels() {
  const x = document.getElementById('axis-x-label');
  const y = document.getElementById('axis-y-label');
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
  } catch (e) { alert("失敗"); } finally { btn.innerText = 'クラウド保存'; }
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
