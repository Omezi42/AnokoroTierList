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
  lastSavedId: null
};

// --- Initialization ---
window.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  await fetchCardNames();
  renderInventory();
  renderTierList();
  setupSearch();
  setupPlotter();
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
});

function setupNav() {
  const btns = document.querySelectorAll('.nav-btn');
  btns.forEach(btn => {
    btn.onclick = () => {
      const viewId = btn.getAttribute('data-view');
      // Update buttons
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Update views
      document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
      document.getElementById(viewId).classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
  } catch (e) {
    console.error("Data fetch error", e);
  }
}

function setupSearch() {
  document.getElementById('bg-search').oninput = (e) => renderSearchResults('bg', state.cardNames.filter(n => n.includes(e.target.value)));
  document.getElementById('sub-search').oninput = (e) => renderSearchResults('sub', state.cardNames.filter(n => n.includes(e.target.value)));
}

function renderSearchResults(type, names) {
  const container = document.getElementById(`${type}-results`);
  container.innerHTML = '';
  names.slice(0, 30).forEach(name => {
    const img = document.createElement('img');
    const encodedName = encodeURIComponent(name).replace(/\(/g, '%28').replace(/\)/g, '%29');
    const baseUrl = type === 'bg' ? CROPPED_IMAGE_BASE_URL : TRANSPARENT_IMAGE_BASE_URL;
    img.src = `${baseUrl}/${encodedName}${IMAGE_SUFFIX}`;
    img.className = 'card-thumb';
    img.crossOrigin = "Anonymous";
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
  showToast("インベントリに追加しました");
}

function renderInventory() {
  const containers = ['icon-inventory', 'tier-inventory', 'matchup-inventory', 'plot-inventory'];
  containers.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    state.inventory.forEach(item => {
      const img = document.createElement('img');
      img.src = item.dataUrl;
      img.className = 'icon-item';
      if (id === 'icon-inventory') {
        img.onclick = () => { if(confirm("削除しますか？")) deleteIcon(item.id); };
      } else if (id === 'matchup-inventory') {
        img.onclick = () => addToMatchup(item.id);
      }
      el.appendChild(img);
    });
  });
}

function deleteIcon(id) {
  state.inventory = state.inventory.filter(i => i.id !== id);
  localStorage.setItem('anokoro_inventory', JSON.stringify(state.inventory));
  renderInventory();
}

function clearInventory() {
  if (confirm("インベントリをクリアしますか？")) {
    state.inventory = [];
    localStorage.removeItem('anokoro_inventory');
    renderInventory();
  }
}

// --- Tier List ---
function renderTierList() {
  const container = document.getElementById('tier-rows-container');
  container.innerHTML = '';
  state.tiers.forEach((tier, idx) => {
    const row = document.createElement('div');
    row.className = 'tier-row';
    row.innerHTML = `
      <div class="tier-label" style="background: ${tier.color}">
        <span contenteditable="true" onblur="updateTierName(${idx}, this.innerText)">${tier.name}</span>
        <div class="absolute top-0 right-0 flex flex-col scale-75 opacity-0 hover:opacity-100 transition-opacity">
           <button class="bg-black/10 hover:bg-black/20 px-1" onclick="moveTier(${idx}, -1)">▲</button>
           <button class="bg-black/10 hover:bg-black/20 px-1" onclick="deleteTier(${idx})">×</button>
           <button class="bg-black/10 hover:bg-black/20 px-1" onclick="moveTier(${idx}, 1)">▼</button>
           <input type="color" value="${tier.color}" class="w-4 h-4 p-0 border-none" onchange="updateTierColor(${idx}, this.value)">
        </div>
      </div>
      <div class="tier-items" data-id="${tier.id}"></div>
    `;
    container.appendChild(row);
    new Sortable(row.querySelector('.tier-items'), { group: 'shared', animation: 150 });
  });
  new Sortable(document.getElementById('tier-inventory'), { group: { name: 'shared', pull: 'clone', put: false }, animation: 150, sort: false });
}

function updateTierName(idx, name) { state.tiers[idx].name = name; }
function updateTierColor(idx, color) { state.tiers[idx].color = color; renderTierList(); }
function addTierRow() { state.tiers.push({ id: 't'+Date.now(), name: 'New', color: '#f1f5f9' }); renderTierList(); }
function moveTier(idx, dir) {
  const to = idx + dir;
  if (to < 0 || to >= state.tiers.length) return;
  const t = state.tiers[idx];
  state.tiers[idx] = state.tiers[to];
  state.tiers[to] = t;
  renderTierList();
}
function deleteTier(idx) { if (confirm("削除しますか？")) { state.tiers.splice(idx, 1); renderTierList(); } }

// --- Matchup ---
function addToMatchup(id) {
  const icon = state.inventory.find(i => i.id === id);
  if (!icon) return;
  const header = document.getElementById('matchup-header');
  const th = document.createElement('th');
  th.innerHTML = `<img src="${icon.dataUrl}" class="w-10 h-10 mx-auto">`;
  header.appendChild(th);
  const body = document.getElementById('matchup-body');
  const tr = document.createElement('tr');
  tr.innerHTML = `<td><img src="${icon.dataUrl}" class="w-10 h-10 mx-auto"></td>`;
  const cols = header.cells.length - 1;
  for (let i = 0; i < cols; i++) {
    const td = document.createElement('td');
    td.innerHTML = `<select><option>±0</option><option>+1</option><option>-1</option><option>+2</option><option>-2</option></select>`;
    tr.appendChild(td);
  }
  body.appendChild(tr);
  Array.from(body.rows).forEach((row, idx) => {
    if (idx === body.rows.length - 1) return;
    const td = document.createElement('td');
    td.innerHTML = `<select><option>±0</option><option>+1</option><option>-1</option><option>+2</option><option>-2</option></select>`;
    row.appendChild(td);
  });
}

// --- Plotter ---
function setupPlotter() {
  const area = document.getElementById('plot-area');
  new Sortable(document.getElementById('plot-inventory'), {
    group: { name: 'plot', pull: 'clone', put: false },
    onEnd: (e) => {
      const r = area.getBoundingClientRect();
      const x = e.originalEvent.clientX - r.left;
      const y = e.originalEvent.clientY - r.top;
      if (x > 0 && y > 0 && x < r.width && y < r.height) createPlotItem(e.item.src, x, y);
    }
  });
}

function createPlotItem(src, x, y) {
  const el = document.createElement('img');
  el.src = src;
  el.className = 'absolute w-12 h-12 rounded shadow-sm cursor-move';
  el.style.left = `${x - 24}px`;
  el.style.top = `${y - 24}px`;
  el.onmousedown = (e) => {
    let sx = e.clientX - el.offsetLeft;
    let sy = e.clientY - el.offsetTop;
    document.onmousemove = (e) => { el.style.left = `${e.clientX - sx}px`; el.style.top = `${e.clientY - sy}px`; };
    document.onmouseup = () => document.onmousemove = null;
  };
  document.getElementById('plot-area').appendChild(el);
}

// --- Firebase & Export ---
async function saveToFirebase() {
  const btn = document.getElementById('save-btn');
  btn.innerText = '保存中...';
  try {
    const ref = await addDoc(collection(db, "charts"), { inventory: state.inventory, timestamp: Date.now() });
    const url = `${window.location.origin}${window.location.pathname}?id=${ref.id}`;
    navigator.clipboard.writeText(url);
    alert("保存完了！URLをコピーしました。\n" + url);
  } catch (e) { alert("失敗"); } finally { btn.innerText = '保存'; }
}

async function checkSharedId() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (id) {
    const snap = await getDoc(doc(db, "charts", id));
    if (snap.exists()) { state.inventory = snap.data().inventory; renderInventory(); showToast("ロード完了"); }
  }
}

async function exportAsImage() {
  const view = document.querySelector('.view-container.active');
  const area = view.querySelector('[id$="-capture-area"]') || view;
  const canvas = await html2canvas(area, { scale: 2, useCORS: true });
  const l = document.createElement('a');
  l.download = 'chart.png';
  l.href = canvas.toDataURL();
  l.click();
}

function showToast(m) {
  const t = document.createElement('div');
  t.className = 'fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded shadow-lg z-[2000]';
  t.innerText = m;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

function downloadIcon() {
  const c = document.getElementById('icon-canvas');
  const l = document.createElement('a');
  l.download = 'icon.png';
  l.href = c.toDataURL();
  l.click();
}
