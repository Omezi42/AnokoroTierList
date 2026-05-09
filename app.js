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
    { name: 'S', color: '#ff7f7f' },
    { name: 'A', color: '#ffbf7f' },
    { name: 'B', color: '#ffff7f' },
    { name: 'C', color: '#7fff7f' }
  ],
  lastSavedId: null
};

// --- Initialization ---
window.addEventListener('DOMContentLoaded', async () => {
  await fetchCardNames();
  renderInventory();
  renderTierList();
  setupSearch();
  setupPlotter();
  
  document.getElementById('save-btn').onclick = saveToFirebase;

  // Global functions
  window.switchView = switchView;
  window.addIconToInventory = addIconToInventory;
  window.downloadIcon = downloadIcon;
  window.addTierRow = addTierRow;
  window.addToMatchup = addToMatchup;
  window.sendToDiscord = sendToDiscord;
  window.deleteIcon = deleteIcon;
});

async function fetchCardNames() {
  try {
    const res = await fetch(CARD_NAMES_URL);
    const text = await res.text();
    state.cardNames = text.split('\n').filter(n => n.trim());
    renderSearchResults('bg', state.cardNames);
    renderSearchResults('sub', state.cardNames);
  } catch (e) {
    console.error("Failed to fetch card names", e);
  }
}

function setupSearch() {
  document.getElementById('bg-search').oninput = (e) => {
    const filtered = state.cardNames.filter(n => n.includes(e.target.value));
    renderSearchResults('bg', filtered);
  };
  document.getElementById('sub-search').oninput = (e) => {
    const filtered = state.cardNames.filter(n => n.includes(e.target.value));
    renderSearchResults('sub', filtered);
  };
}

function renderSearchResults(type, names) {
  const container = document.getElementById(`${type}-results`);
  container.innerHTML = '';
  names.slice(0, 50).forEach(name => {
    const img = document.createElement('img');
    const encodedName = encodeURIComponent(name).replace(/\(/g, '%28').replace(/\)/g, '%29');
    const baseUrl = type === 'bg' ? CROPPED_IMAGE_BASE_URL : TRANSPARENT_IMAGE_BASE_URL;
    img.src = `${baseUrl}/${encodedName}${IMAGE_SUFFIX}`;
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (state.selectedBg) {
    const bg = new Image();
    bg.crossOrigin = "Anonymous";
    bg.src = state.selectedBg;
    bg.onload = () => {
      ctx.drawImage(bg, 0, 0, 512, 512);
      if (state.selectedSub) {
        const sub = new Image();
        sub.crossOrigin = "Anonymous";
        sub.src = state.selectedSub;
        sub.onload = () => {
          ctx.drawImage(sub, 512 - 350, 512 - 400, 450, 450);
        };
      }
    };
  }
}

function addIconToInventory() {
  const canvas = document.getElementById('icon-canvas');
  const dataUrl = canvas.toDataURL('image/png');
  const id = 'icon_' + Date.now();
  state.inventory.push({ id, dataUrl });
  localStorage.setItem('anokoro_inventory', JSON.stringify(state.inventory));
  renderInventory();
}

function renderInventory() {
  const containers = ['icon-inventory', 'tier-inventory', 'plot-inventory'];
  containers.forEach(cid => {
    const container = document.getElementById(cid);
    if (!container) return;
    container.innerHTML = '';
    state.inventory.forEach(item => {
      const wrapper = document.createElement('div');
      wrapper.className = 'relative group inline-block';
      
      const img = document.createElement('img');
      img.src = item.dataUrl;
      img.className = 'w-16 h-16 rounded shadow cursor-pointer border-2 border-transparent hover:border-primary transition-all';
      img.dataset.id = item.id;
      
      if (cid === 'icon-inventory') {
        const controls = document.createElement('div');
        controls.className = 'absolute -top-2 -right-2 hidden group-hover:flex flex-col gap-1 z-10';
        controls.innerHTML = `
          <button onclick="addToMatchup('${item.id}')" class="bg-blue-500 text-white p-1 rounded text-xs">M</button>
          <button onclick="deleteIcon('${item.id}')" class="bg-red-500 text-white p-1 rounded text-xs">×</button>
        `;
        wrapper.appendChild(controls);
      }
      
      wrapper.appendChild(img);
      container.appendChild(wrapper);
    });
  });
}

function deleteIcon(id) {
  state.inventory = state.inventory.filter(i => i.id !== id);
  localStorage.setItem('anokoro_inventory', JSON.stringify(state.inventory));
  renderInventory();
}

// --- Tier List Logic ---
function renderTierList() {
  const container = document.getElementById('tier-rows-container');
  container.innerHTML = '';
  state.tiers.forEach((tier, index) => {
    const row = document.createElement('div');
    row.className = 'tier-row';
    row.innerHTML = `
      <div class="tier-label" style="background: ${tier.color}">${tier.name}</div>
      <div class="tier-content" data-index="${index}"></div>
    `;
    container.appendChild(row);
    
    new Sortable(row.querySelector('.tier-content'), {
      group: 'shared',
      animation: 150
    });
  });
  
  new Sortable(document.getElementById('tier-inventory'), {
    group: { name: 'shared', pull: 'clone', put: false },
    animation: 150,
    sort: false
  });
}

function addTierRow() {
  const name = prompt('Tier名', 'New');
  if (name) {
    state.tiers.push({ name, color: '#ccc' });
    renderTierList();
  }
}

// --- Matchup Logic ---
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
  
  const colCount = header.cells.length - 1;
  for (let i = 0; i < colCount; i++) {
    const td = document.createElement('td');
    td.innerHTML = createMatchupSelect();
    tr.appendChild(td);
  }
  body.appendChild(tr);
  
  Array.from(body.rows).forEach((row, idx) => {
    if (idx === body.rows.length - 1) return;
    const td = document.createElement('td');
    td.innerHTML = createMatchupSelect();
    row.appendChild(td);
  });
}

function createMatchupSelect() {
  return `<select class="bg-transparent border-none text-xs text-white">
    <option value="even">±0</option>
    <option value="win">+1</option>
    <option value="lose">-1</option>
    <option value="great-win">+2</option>
    <option value="great-lose">-2</option>
  </select>`;
}

// --- Plotter Logic ---
function setupPlotter() {
  const plotArea = document.getElementById('plot-area');
  
  new Sortable(document.getElementById('plot-inventory'), {
    group: { name: 'plot', pull: 'clone', put: false },
    onEnd: (evt) => {
      const rect = plotArea.getBoundingClientRect();
      const x = evt.originalEvent.clientX - rect.left;
      const y = evt.originalEvent.clientY - rect.top;
      if (x > 0 && y > 0 && x < rect.width && y < rect.height) {
        createPlotItem(evt.item.src, x, y);
      }
    }
  });
}

function createPlotItem(src, x, y) {
  const plotArea = document.getElementById('plot-area');
  const item = document.createElement('img');
  item.src = src;
  item.className = 'absolute w-12 h-12 rounded shadow-lg cursor-move transition-transform hover:scale-110';
  item.style.left = `${x - 24}px`;
  item.style.top = `${y - 24}px`;
  
  item.onmousedown = (e) => {
    let startX = e.clientX - item.offsetLeft;
    let startY = e.clientY - item.offsetTop;
    document.onmousemove = (e) => {
      item.style.left = `${e.clientX - startX}px`;
      item.style.top = `${e.clientY - startY}px`;
    };
    document.onmouseup = () => { document.onmousemove = null; };
  };
  plotArea.appendChild(item);
}

// --- Firebase & Sharing ---
async function saveToFirebase() {
  const saveBtn = document.getElementById('save-btn');
  saveBtn.innerText = 'Saving...';
  
  try {
    const docRef = await addDoc(collection(db, "charts"), {
      inventory: state.inventory,
      timestamp: Date.now()
    });
    state.lastSavedId = docRef.id;
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${docRef.id}`;
    prompt("保存完了！共有用URL:", shareUrl);
  } catch (e) {
    console.error(e);
    alert("保存に失敗しました");
  } finally {
    saveBtn.innerText = 'Save & Share';
  }
}

async function sendToDiscord() {
  const webhookUrl = document.getElementById('discord-webhook').value;
  if (!webhookUrl) {
    alert("Webhook URLを入力してください。");
    return;
  }
  
  await saveToFirebase();
  if (!state.lastSavedId) return;
  
  const shareUrl = `${window.location.origin}${window.location.pathname}?id=${state.lastSavedId}`;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `新しいTier表/チャートが作成されました！\n${shareUrl}`
      })
    });
    alert("Discordに送信しました！");
  } catch (e) {
    alert("送信に失敗しました。URLを確認してください。");
  }
}

function switchView(viewId) {
  document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  event.currentTarget.classList.add('active');
}

function downloadIcon() {
  const canvas = document.getElementById('icon-canvas');
  const link = document.createElement('a');
  link.download = 'anokoro_icon.png';
  link.href = canvas.toDataURL();
  link.click();
}
