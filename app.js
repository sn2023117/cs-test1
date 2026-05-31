const state = {
  currentPage: 'home',
  transport: 'bus',
  taskLoc: 'home',
  taskPri: 'urgent',
  taskMealReq: 'any',
  mealEaten: false,
  tasks: JSON.parse(localStorage.getItem('gn_tasks') || '[]'),
  activeLocTab: 'all',
  nearbyFilter: 'all',
};

if (state.tasks.length === 0) {
  state.tasks = [
    { id: 1, title: '운영체제 과제 제출', loc: 'anywhere', pri: 'urgent', due: '2026-06-01', meal: 'any', done: false },
    { id: 2, title: '컴퓨터개론 보고서 작성', loc: 'school', pri: 'high', due: '2026-05-31', meal: 'any', done: false },
    { id: 3, title: '빨래 돌리기', loc: 'home', pri: 'mid', due: '', meal: 'any', done: false },
    { id: 4, title: '점심 먹기', loc: 'school', pri: 'urgent', due: '', meal: 'before', done: false },
  ];
  saveTasks();
}

const nearbyPlaces = [
  { id: 1, name: '인하 스터디 카페', cat: 'study', emoji: '📚', dist: '도보 3분', minNeeded: 30, desc: '조용한 개인실, WiFi', rating: '4.8' },
  { id: 2, name: '이디야 인하대점', cat: 'cafe', emoji: '☕', dist: '도보 2분', minNeeded: 15, desc: '아메리카노 2,500원', rating: '4.2' },
  { id: 3, name: 'GS25 인하대역점', cat: 'convenience', emoji: '🏪', dist: '도보 1분', minNeeded: 5, desc: '24시간', rating: '4.0' },
  { id: 4, name: '김밥천국', cat: 'food', emoji: '🍱', dist: '도보 5분', minNeeded: 20, desc: '김밥 2,500원~', rating: '4.1' },
  { id: 5, name: '카페 블루밍', cat: 'cafe', emoji: '🌸', dist: '도보 7분', minNeeded: 20, desc: '감성 카페, 공부하기 좋음', rating: '4.6' },
  { id: 6, name: '메가스터디카페', cat: 'study', emoji: '🏢', dist: '도보 10분', minNeeded: 60, desc: '인쇄 가능, 편의시설 완비', rating: '4.5' },
  { id: 7, name: 'CU 인하대점', cat: 'convenience', emoji: '🏪', dist: '도보 2분', minNeeded: 5, desc: '택배, ATM 가능', rating: '3.9' },
  { id: 8, name: '학식당 (학생회관)', cat: 'food', emoji: '🍚', dist: '도보 4분', minNeeded: 25, desc: '학생 할인 적용', rating: '4.3' },
];

const transportConfig = {
  bus:    { speed: 4,  baseCost: 1500, extraPer5km: 200 },
  subway: { speed: 3,  baseCost: 1400, extraPer5km: 100 },
  walk:   { speed: 13, baseCost: 0,    extraPer5km: 0   },
  taxi:   { speed: 2,  baseCost: 4800, extraPer5km: 600 },
};

const routeDistances = { default: 8 };

function goTo(page) {
  document.getElementById('screen-onboarding')?.classList.remove('active');
  document.getElementById('screen-app').classList.add('active');

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });

  state.currentPage = page;
  if (page === 'home') renderHome();
  if (page === 'nearby') renderNearby();
  if (page === 'tasks') renderTasks();
}

function renderHome() {
  const now = new Date();
  const h = now.getHours();
  const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

  document.getElementById('greeting-time').textContent = `${dateStr} · ${timeStr}`;

  let msg = '오늘 하루도 화이팅 🌤️';
  if (h < 9)       msg = '이른 아침이네요. 오늘 일정을 확인해요 ☀️';
  else if (h < 12) msg = '오전 공강이에요! 집에 다녀올까요? 🏃';
  else if (h < 14) msg = '점심 시간! 밥은 먹었나요? 🍚';
  else if (h < 18) msg = '오후 공강, 어디서 시간을 보낼까요? ☕';
  else             msg = '저녁이에요. 오늘 할 일 마무리해요 🌙';
  document.getElementById('greeting-msg').textContent = msg;

  const urgent = state.tasks.filter(t => !t.done && (t.pri === 'urgent' || t.pri === 'high')).slice(0, 3);
  const el = document.getElementById('home-task-preview');
  if (urgent.length === 0) {
    el.innerHTML = '<div class="empty-state" style="padding:16px"><div class="empty-icon">✅</div>긴급 할 일이 없어요!</div>';
  } else {
    el.innerHTML = urgent.map(t => `
      <div class="task-preview-item">
        <div class="task-preview-pri pri-${t.pri}"></div>
        <div class="task-preview-text">${t.title}</div>
        <div class="task-preview-loc">${locLabel(t.loc)}</div>
      </div>
    `).join('');
  }
}

function locLabel(loc) {
  return { home: '🏠 집', school: '🏫 학교', anywhere: '🌍 어디서나' }[loc] || loc;
}

function toggleMeal() {
  state.mealEaten = !state.mealEaten;
  const badge = document.getElementById('meal-status');
  document.getElementById('meal-icon').textContent = state.mealEaten ? '✅' : '🍚';
  document.getElementById('meal-label').textContent = state.mealEaten ? '식사 완료' : '식사 전';
  badge.classList.toggle('ate', state.mealEaten);
}

function selectTransport(btn) {
  document.querySelectorAll('.pill[data-transport]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.transport = btn.dataset.transport;
}

function calcTravel() {
  const freeMin = parseInt(document.getElementById('free-minutes').value, 10);
  const stayMin = parseInt(document.getElementById('home-stay').value, 10) || 30;

  if (!freeMin || freeMin < 10) {
    alert('공강 시간을 입력해주세요 (최소 10분)');
    return;
  }

  const cfg = transportConfig[state.transport];
  const distKm = routeDistances.default;

  const oneWayMin = Math.round(distKm * cfg.speed);
  const roundMin  = oneWayMin * 2;
  const totalNeeded = roundMin + stayMin;
  const marginMin = freeMin - totalNeeded;

  const extraSegments = Math.floor(distKm / 5);
  const oneCost = cfg.baseCost + extraSegments * cfg.extraPer5km;
  let roundCost = oneCost * 2;
  if (state.transport === 'bus' || state.transport === 'subway') roundCost -= 300;
  if (state.transport === 'walk') roundCost = 0;

  const canGo = marginMin >= 0;
  const resultCard = document.getElementById('travel-result');
  resultCard.classList.remove('hidden', 'go', 'stay');
  resultCard.classList.add(canGo ? 'go' : 'stay');

  document.getElementById('travel-verdict').textContent = canGo
    ? `✅ 다녀올 수 있어요! (+${marginMin}분 여유)`
    : `❌ 시간이 부족해요 (${Math.abs(marginMin)}분 모자람)`;

  document.getElementById('r-one-way').textContent    = `${oneWayMin}분`;
  document.getElementById('r-round-trip').textContent = `${roundMin}분`;
  document.getElementById('r-cost').textContent       = roundCost === 0 ? '무료' : `${roundCost.toLocaleString()}원`;
  document.getElementById('r-margin').textContent     = marginMin >= 0 ? `${marginMin}분` : '없음';
  document.getElementById('cost-total-display').textContent = roundCost === 0 ? '무료' : `${roundCost.toLocaleString()}원`;

  let suggestion = '';
  if (canGo && marginMin >= 30) {
    suggestion = `🎉 ${marginMin}분 여유가 있어요! 집에서 ${['빨래 돌리기','짧은 낮잠','간단한 식사','필요한 물건 챙기기'][Math.floor(Math.random()*4)]}도 할 수 있어요.`;
  } else if (canGo) {
    suggestion = `⚡ 빠듯하게 다녀올 수 있어요. 지체 없이 바로 출발하세요!`;
  } else if (marginMin > -15) {
    suggestion = `😅 조금 부족해요. 집에 있는 시간을 ${stayMin - Math.abs(marginMin)}분으로 줄이면 가능해요!`;
  } else {
    suggestion = `🏫 이번 공강엔 학교 근처에 있는 게 나을 것 같아요. 근처 카페나 스터디카페를 찾아볼까요?`;
  }
  document.getElementById('travel-suggestion').textContent = suggestion;

  document.getElementById('home-result-banner').classList.remove('hidden');
  document.getElementById('result-verdict-text').textContent = canGo ? '✅ 집에 다녀올 수 있어요!' : '❌ 이번엔 학교 근처에 있는 게 나아요';
  document.getElementById('result-detail-text').textContent = `왕복 ${roundMin}분, 교통비 ${roundCost === 0 ? '무료' : roundCost.toLocaleString()+'원'}`;

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function filterNearby(btn, cat) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.nearbyFilter = cat;
  renderNearby();
}

function renderNearby() {
  const freeMin = parseInt(document.getElementById('nearby-free-min')?.value || '60', 10);
  const cat = state.nearbyFilter;

  let places = nearbyPlaces;
  if (cat !== 'all') places = places.filter(p => p.cat === cat);

  places.sort((a, b) => {
    const aOk = freeMin >= a.minNeeded ? 1 : 0;
    const bOk = freeMin >= b.minNeeded ? 1 : 0;
    return bOk - aOk || parseFloat(b.rating) - parseFloat(a.rating);
  });

  const el = document.getElementById('nearby-list');
  if (places.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div>해당 카테고리에 장소가 없어요</div>';
    return;
  }

  el.innerHTML = places.map(p => {
    const ok = freeMin >= p.minNeeded;
    const tag = ok
      ? `<span class="nearby-tag ok">✅ 가능</span>`
      : `<span class="nearby-tag tight">⏱️ ${p.minNeeded}분 필요</span>`;
    return `
      <div class="nearby-card ${ok ? '' : 'not-enough'}">
        <div class="nearby-emoji">${p.emoji}</div>
        <div class="nearby-info">
          <div class="nearby-name">${p.name}</div>
          <div class="nearby-meta">
            <span>${p.dist}</span>
            <span>⭐ ${p.rating}</span>
            <span>${p.desc}</span>
          </div>
        </div>
        ${tag}
      </div>
    `;
  }).join('');
}

function selectLoc(btn) {
  document.querySelectorAll('.pill[data-loc]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.taskLoc = btn.dataset.loc;
}

function selectPri(btn) {
  document.querySelectorAll('.priority-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.taskPri = btn.dataset.pri;
}

function selectMealReq(btn) {
  document.querySelectorAll('.pill[data-meal]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.taskMealReq = btn.dataset.meal;
}

function addTask() {
  const title = document.getElementById('task-title').value.trim();
  if (!title) { alert('할 일을 입력해주세요!'); return; }

  const due = document.getElementById('task-due').value;
  const task = {
    id: Date.now(),
    title,
    loc: state.taskLoc,
    pri: state.taskPri,
    due,
    meal: state.taskMealReq,
    done: false,
  };

  state.tasks.unshift(task);
  saveTasks();
  renderTasks();
  renderHome();

  document.getElementById('task-title').value = '';
  document.getElementById('task-due').value = '';
}

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) { task.done = !task.done; saveTasks(); renderTasks(); renderHome(); }
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
  renderHome();
}

function switchLocTab(btn, loc) {
  document.querySelectorAll('.loc-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.activeLocTab = loc;
  renderTasks();
}

const priOrder = { urgent: 0, high: 1, mid: 2, low: 3 };

function renderTasks() {
  const filter = state.activeLocTab;
  const today = new Date().toISOString().split('T')[0];

  let tasks = [...state.tasks];
  if (filter !== 'all') tasks = tasks.filter(t => t.loc === filter);

  tasks = tasks.filter(t => {
    if (t.meal === 'any') return true;
    if (t.meal === 'after' && !state.mealEaten) return false;
    if (t.meal === 'before' && state.mealEaten) return false;
    return true;
  });

  tasks.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (priOrder[a.pri] ?? 9) - (priOrder[b.pri] ?? 9);
  });

  const el = document.getElementById('task-list');
  if (tasks.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🎉</div>할 일이 없어요!</div>';
    return;
  }

  const locBadge = { home: 'badge-home', school: 'badge-school', anywhere: 'badge-anywhere' };
  const locText  = { home: '🏠 집', school: '🏫 학교', anywhere: '🌍 어디서나' };
  const priText  = { urgent: '긴급', high: '높음', mid: '보통', low: '낮음' };
  const mealText = { after: '🍽️ 식사 후', before: '🥢 식사 전' };

  el.innerHTML = tasks.map(t => {
    const isOverdue = t.due && t.due < today && !t.done;
    const dueStr = t.due
      ? `<span class="task-due ${isOverdue ? 'overdue' : ''}">📅 ${isOverdue ? '기한 초과 · ' : ''}${t.due}</span>`
      : '';
    const mealBadge = t.meal !== 'any'
      ? `<span class="task-badge badge-meal-${t.meal}">${mealText[t.meal]}</span>`
      : '';

    return `
      <div class="task-item ${t.done ? 'done' : ''}">
        <div class="task-check ${t.done ? 'checked' : ''}" onclick="toggleTask(${t.id})">
          ${t.done ? '✓' : ''}
        </div>
        <div class="task-body">
          <div class="task-title-text">${t.title}</div>
          <div class="task-meta">
            <span class="task-badge ${locBadge[t.loc]}">${locText[t.loc]}</span>
            <span class="task-badge badge-pri-${t.pri}">${priText[t.pri]}</span>
            ${mealBadge}
            ${dueStr}
          </div>
        </div>
        <button class="task-delete" onclick="deleteTask(${t.id})">🗑️</button>
      </div>
    `;
  }).join('');
}

function saveTasks() {
  localStorage.setItem('gn_tasks', JSON.stringify(state.tasks));
}

document.addEventListener('DOMContentLoaded', () => {
  renderHome();
  renderNearby();
  renderTasks();
});
