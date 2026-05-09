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
  setupNav();
  setupPlotterLabels();
  await checkSharedId();
  
  document.getElementById('save-btn').onclick = saveToFirebase;

  // Global functions
  window.addIconToInventory = addIconToInventory;
  window.downloadIcon = downloadIcon;
  window.addTierRow = addTierRow;
  window.addToMatchup = addToMatchup;
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
  const bgInput = document.getElementById('bg-search');
  const subInput = document.getElementById('sub-search');
  
  bgInput.oninput = (e) => renderSearchResults('bg', state.cardNames.filter(n => n.includes(e.target.value)));
  subInput.oninput = (e) => renderSearchResults('sub', state.cardNames.filter(n => n.includes(e.target.value)));
}

function renderSearchResults(type, names) {
  const container = document.getElementById(`${type}-results`);
  container.innerHTML = '';
  
  if (names.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center text-muted py-4">見つかりません</div>';
    return;
  }

  names.slice(0, 40).forEach(name => {
    const img = document.createElement('img');
    const encodedName = encodeURIComponent(name).replace(/\(/g, '%28').replace(/\)/g, '%29');
    const baseUrl = type === 'bg' ? CROPPED_IMAGE_BASE_URL : TRANSPARENT_IMAGE_BASE_URL;
    img.src = `${baseUrl}/${encodedName}${IMAGE_SUFFIX}`;
    img.title = name;
    img.crossOrigin = "Anonymous";
    img.onclick = () => {
      container.querySelectorAll('img').forEach(i => i.classList.remove('selected'));
      img.classList.add('selected');
      if (type === 'bg') state.selectedBg = img.src;
      else state.selectedSub = img.src;
      updateCanvas();
    };
    img.onerror = () => { img.style.display = 'none'; };
    container.appendChild(img);
  });
}

/**
 * AnokoroTierImageMaker の仕様を完全再現したCanvas描画
 */
function updateCanvas() {
  const canvas = document.getElementById('icon-canvas');
  const ctx = canvas.getContext('2d');
  const canvasSize = 512;
  
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  if (!state.selectedBg) {
     // 背景がない場合はテキストを表示
     ctx.fillStyle = "#f1f5f9";
     ctx.fillRect(0, 0, canvasSize, canvasSize);
     ctx.fillStyle = "#94a3b8";
     ctx.font = "bold 24px sans-serif";
     ctx.textAlign = "center";
     ctx.fillText("背景を選択してください", canvasSize/2, canvasSize/2);
     return;
  }

  const bgImg = new Image();
  bgImg.crossOrigin = "Anonymous";
  bgImg.src = state.selectedBg;
  bgImg.onload = () => {
    // 1. 背景描画 (アスペクト比維持してCanvasを埋める)
    const imgAspect = bgImg.width / bgImg.height;
    let drawW, drawH, x, y;
    if (imgAspect > 1) {
      drawH = canvasSize;
      drawW = canvasSize * imgAspect;
      x = (canvasSize - drawW) / 2;
      y = 0;
    } else {
      drawW = canvasSize;
      drawH = canvasSize / imgAspect;
      x = 0;
      y = (canvasSize - drawH) / 2;
    }
    ctx.drawImage(bgImg, x, y, drawW, drawH);

    // 2. サブカード描画 (右下に重なるように配置)
    if (state.selectedSub) {
      const subImg = new Image();
      subImg.crossOrigin = "Anonymous";
      subImg.src = state.selectedSub;
      subImg.onload = () => {
        const maxSubSize = canvasSize * (4 / 5);
        const subAspect = subImg.width / subImg.height;
        let subW, subH;
        
        if (subAspect > 1) {
          subW = maxSubSize;
          subH = maxSubSize / subAspect;
        } else {
          subH = maxSubSize;
          subW = maxSubSize * subAspect;
        }
        
        // オリジナルの配置ロジック
        const subX = canvasSize - subW * (2 / 3);
        const subY = canvasSize - subH;
        
        ctx.drawImage(subImg, subX, subY, subW, subH);
      };
    }
  };
}

function addIconToInventory() {
  if (!state.selectedBg || !state.selectedSub) {
    alert("背景とサブカードの両方を選択してください。");
    return;
  }
  const canvas = document.getElementById('icon-canvas');
  const dataUrl = canvas.toDataURL('image/png');
  const id = 'icon_' + Date.now();
  state.inventory.unshift({ id, dataUrl }); // 最新を前に
  localStorage.setItem('anokoro_inventory', JSON.stringify(state.inventory));
  renderInventory();
  
  // UX: 成功フィードバック
  const btn = event.currentTarget;
  const originalText = btn.innerText;
  btn.innerText = "追加しました！";
  btn.style.background = "#22c55e";
  setTimeout(() => {
    btn.innerText = originalText;
    btn.style.background = "";
  }, 1000);
}

function renderInventory() {
  const containers = ['icon-inventory', 'tier-inventory', 'matchup-inventory', 'plot-inventory'];
  containers.forEach(cid => {
    const container = document.getElementById(cid);
    if (!container) return;
    container.innerHTML = '';
    
    if (state.inventory.length === 0) {
       container.innerHTML = '<div class="text-muted w-full text-center py-4">アイコンがありません</div>';
       return;
    }

    state.inventory.forEach(item => {
      const wrapper = document.createElement('div');
      wrapper.className = 'relative group inline-block';
      
      const img = document.createElement('img');
      img.src = item.dataUrl;
      img.className = 'icon-item';
      img.dataset.id = item.id;
      
      if (cid === 'icon-inventory') {
        const delBtn = document.createElement('button');
        delBtn.innerHTML = '×';
        delBtn.className = 'absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full hidden group-hover:block z-10 font-bold';
        delBtn.onclick = (e) => {
          e.stopPropagation();
          deleteIcon(item.id);
        };
        wrapper.appendChild(delBtn);
      }
      
      if (cid === 'matchup-inventory') {
        img.onclick = () => addToMatchup(item.id);
        img.style.cursor = 'pointer';
        img.title = "クリックで相性表に追加";
      }

      wrapper.appendChild(img);
      container.appendChild(wrapper);
    });
  });
}

function deleteIcon(id) {
  if (confirm('このアイコンを削除しますか？')) {
    state.inventory = state.inventory.filter(i => i.id !== id);
    localStorage.setItem('anokoro_inventory', JSON.stringify(state.inventory));
    renderInventory();
  }
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
      animation: 150,
      ghostClass: 'opacity-50'
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
    state.tiers.push({ name, color: '#f1f5f9' });
    renderTierList();
  }
}

// --- Matchup Logic ---
function addToMatchup(id) {
  const icon = state.inventory.find(i => i.id === id);
  if (!icon) return;
  
  const header = document.getElementById('matchup-header');
  // 既に存在するかチェック
  if (Array.from(header.cells).some(cell => cell.querySelector('img')?.src === icon.dataUrl)) return;

  const th = document.createElement('th');
  th.innerHTML = `<img src="${icon.dataUrl}" class="w-12 h-12 mx-auto rounded shadow-sm">`;
  header.appendChild(th);
  
  const body = document.getElementById('matchup-body');
  const tr = document.createElement('tr');
  tr.innerHTML = `<td class="bg-slate-50 font-bold"><img src="${icon.dataUrl}" class="w-12 h-12 mx-auto rounded shadow-sm"></td>`;
  
  const colCount = header.cells.length - 1;
  for (let i = 0; i < colCount; i++) {
    const td = document.createElement('td');
    td.innerHTML = createMatchupSelect();
    tr.appendChild(td);
  }
  body.appendChild(tr);
  
  // 既存の行に新しい列を追加
  Array.from(body.rows).forEach((row, idx) => {
    if (idx === body.rows.length - 1) return;
    const td = document.createElement('td');
    td.innerHTML = createMatchupSelect();
    row.appendChild(td);
  });
}

function createMatchupSelect() {
  return `<select class="matchup-select">
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
  item.className = 'absolute w-14 h-14 rounded-lg shadow-lg cursor-move transition-transform hover:scale-125 z-20';
  item.style.left = `${x - 28}px`;
  item.style.top = `${y - 28}px`;
  
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

function setupPlotterLabels() {
  const xInput = document.getElementById('axis-x-label');
  const yInput = document.getElementById('axis-y-label');
  
  const update = () => {
    document.getElementById('label-top').innerText = `${yInput.value} (+)`;
    document.getElementById('label-bottom').innerText = `${yInput.value} (-)`;
    document.getElementById('label-right').innerText = `${xInput.value} (+)`;
    document.getElementById('label-left').innerText = `${xInput.value} (-)`;
  };
  
  xInput.oninput = update;
  yInput.oninput = update;
}

// --- Nav & Utilities ---
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const viewId = btn.dataset.view;
      document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
      document.getElementById(viewId).classList.add('active');
    };
  });
}

  // --- Firebase & Sharing ---
async function checkSharedId() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  if (id) {
    const btn = document.getElementById('save-btn');
    btn.innerHTML = '<span>読み込み中...</span>';
    try {
      const docSnap = await getDoc(doc(db, "charts", id));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.inventory) {
          state.inventory = data.inventory;
          localStorage.setItem('anokoro_inventory', JSON.stringify(state.inventory));
          renderInventory();
          // Optionally, we could load tiers/matchups if we saved them
          // For now, focus on inventory and UX
          alert("共有されたチャートを読み込みました！");
        }
      }
    } catch (e) {
      console.error("Load failed", e);
    } finally {
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
        保存・共有
      `;
    }
  }
}

async function saveToFirebase() {
  const btn = document.getElementById('save-btn');
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<span>保存中...</span>';
  
  try {
    const docRef = await addDoc(collection(db, "charts"), {
      inventory: state.inventory,
      timestamp: Date.now()
    });
    state.lastSavedId = docRef.id;
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${docRef.id}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl);
    alert("保存が完了し、共有URLをクリップボードにコピーしました！\n" + shareUrl);
  } catch (e) {
    alert("エラーが発生しました。");
  } finally {
    btn.innerHTML = originalHtml;
  }
}

function downloadIcon() {
  const canvas = document.getElementById('icon-canvas');
  if (!state.selectedBg) return;
  const link = document.createElement('a');
  link.download = 'anokoro_icon.png';
  link.href = canvas.toDataURL();
  link.click();
}
