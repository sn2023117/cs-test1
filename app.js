const STORAGE_KEYS = {
  tasks: 'gn_tasks',
  customRoutes: 'gn_custom_routes',
  lastRoute: 'gn_last_route',
};

const transportLabels = {
  bus: '버스',
  subway: '지하철',
  walk: '도보',
  taxi: '택시',
};

const state = {
  currentPage: 'home',
  transport: 'subway',
  taskLoc: 'home',
  taskPri: 'urgent',
  taskMealReq: 'any',
  mealEaten: false,
  tasks: readStorage(STORAGE_KEYS.tasks, []),
  customRoutes: readStorage(STORAGE_KEYS.customRoutes, []),
  activeLocTab: 'all',
  nearbyFilter: 'all',
  lastTravel: readStorage(STORAGE_KEYS.lastRoute, null),
};

if (state.tasks.length === 0) {
  state.tasks = [
    { id: 1, title: '컴퓨터개론 과제 제출', loc: 'anywhere', pri: 'urgent', due: '2026-06-01', meal: 'any', done: false },
    { id: 2, title: '웹앱 배포 링크 확인', loc: 'school', pri: 'high', due: '2026-05-31', meal: 'any', done: false },
    { id: 3, title: '빨래 돌리기', loc: 'home', pri: 'mid', due: '', meal: 'any', done: false },
    { id: 4, title: '점심 먹기', loc: 'school', pri: 'urgent', due: '', meal: 'before', done: false },
  ];
  saveTasks();
}

const dummyRoutes = [
  {
    id: 'soongsil-bugae',
    from: '숭실대입구역',
    to: '부개역',
    tags: ['예시', '학교', '집', '7호선', '1호선'],
    note: '지도 API 없이 과제용으로 등록한 대표 더미 경로입니다.',
    transports: {
      subway: { oneWayMin: 58, roundCost: 3400, distanceKm: 24.7, detail: '7호선 숭실대입구역 → 온수역 환승 → 1호선 부개역' },
      bus: { oneWayMin: 92, roundCost: 3600, distanceKm: 27.2, detail: '간선버스와 지선버스 환승 가정' },
      taxi: { oneWayMin: 48, roundCost: 62000, distanceKm: 25.5, detail: '도로 정체 보통 기준 택시 더미 값' },
      walk: { oneWayMin: 310, roundCost: 0, distanceKm: 23.8, detail: '현실적으로 비추천, 도보 환산용' },
    },
  },
  {
    id: 'inha-bupyeong',
    from: '인하대학교',
    to: '부평역',
    tags: ['학교', '인천', '더미'],
    note: '기존 앱 기본값을 살린 인천권 더미 경로입니다.',
    transports: {
      bus: { oneWayMin: 45, roundCost: 3000, distanceKm: 13.5, detail: '학교 앞 버스 정류장 → 부평역 방면' },
      subway: { oneWayMin: 38, roundCost: 3000, distanceKm: 12.8, detail: '인하대역 → 주안역 환승 → 부평역' },
      taxi: { oneWayMin: 28, roundCost: 28000, distanceKm: 12.4, detail: '일반 도로 기준 택시 더미 값' },
      walk: { oneWayMin: 165, roundCost: 0, distanceKm: 12.2, detail: '도보 이동 환산 값' },
    },
  },
  {
    id: 'soongsil-gangnam',
    from: '숭실대입구역',
    to: '강남역',
    tags: ['서울', '카페', '더미'],
    note: '서울 내 이동 비교용 더미 경로입니다.',
    transports: {
      subway: { oneWayMin: 32, roundCost: 3000, distanceKm: 12.1, detail: '7호선 → 고속터미널 환승 → 2호선/신분당선 권역' },
      bus: { oneWayMin: 54, roundCost: 3000, distanceKm: 13.6, detail: '간선버스 이동 가정' },
      taxi: { oneWayMin: 26, roundCost: 30000, distanceKm: 11.8, detail: '교통량 보통 기준 택시 더미 값' },
      walk: { oneWayMin: 150, roundCost: 0, distanceKm: 11.1, detail: '도보 이동 환산 값' },
    },
  },
];

const nearbyPlaces = [
  { id: 1, name: '숭실 스터디 카페', cat: 'study', emoji: '📚', dist: '도보 3분', minNeeded: 30, desc: '조용한 개인석, 콘센트 많음', rating: '4.8' },
  { id: 2, name: '이디야 숭실대점', cat: 'cafe', emoji: '☕', dist: '도보 2분', minNeeded: 15, desc: '아메리카노 2,500원', rating: '4.2' },
  { id: 3, name: 'GS25 숭실대입구역점', cat: 'convenience', emoji: '🏪', dist: '도보 1분', minNeeded: 5, desc: '24시간', rating: '4.0' },
  { id: 4, name: '김밥천국', cat: 'food', emoji: '🍱', dist: '도보 5분', minNeeded: 20, desc: '빠른 식사 가능', rating: '4.1' },
  { id: 5, name: '카페 블루밍', cat: 'cafe', emoji: '🌸', dist: '도보 7분', minNeeded: 20, desc: '공부하기 좋은 카페', rating: '4.6' },
  { id: 6, name: '메가스터디카페', cat: 'study', emoji: '🏢', dist: '도보 10분', minNeeded: 60, desc: '인쇄 가능, 편의시설 완비', rating: '4.5' },
  { id: 7, name: 'CU 숭실대점', cat: 'convenience', emoji: '🏪', dist: '도보 2분', minNeeded: 5, desc: '택배, ATM 가능', rating: '3.9' },
  { id: 8, name: '학생회관 식당', cat: 'food', emoji: '🍚', dist: '도보 4분', minNeeded: 25, desc: '학생 가격 식사', rating: '4.3' },
];

function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch (error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizePlace(value) {
  return value.trim().replace(/\s+/g, '').toLowerCase();
}

function allRoutes() {
  return [...dummyRoutes, ...state.customRoutes];
}

function findRoute(from, to) {
  const fromKey = normalizePlace(from);
  const toKey = normalizePlace(to);
  return allRoutes().find(route =>
    normalizePlace(route.from) === fromKey && normalizePlace(route.to) === toKey
  );
}

function makeFallbackRoute(from, to) {
  const seedText = `${from}-${to}`;
  const seed = [...seedText].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const distanceKm = Math.max(3, Math.min(35, Math.round((6 + (seed % 25) + seedText.length * 0.25) * 10) / 10));

  return {
    id: `fallback-${Date.now()}`,
    from,
    to,
    tags: ['자동계산', '저장가능'],
    note: '등록된 더미 경로가 없어 거리 기반 추정값으로 계산했어요. 저장하면 내 경로 목록에 남습니다.',
    transports: {
      subway: { oneWayMin: Math.round(distanceKm * 2.7 + 16), roundCost: distanceKm > 10 ? 3400 : 3000, distanceKm, detail: '더미 거리 기반 지하철 추정' },
      bus: { oneWayMin: Math.round(distanceKm * 3.8 + 14), roundCost: distanceKm > 10 ? 3600 : 3000, distanceKm, detail: '더미 거리 기반 버스 추정' },
      taxi: { oneWayMin: Math.round(distanceKm * 1.8 + 8), roundCost: Math.round((4800 + distanceKm * 1100) / 100) * 200, distanceKm, detail: '더미 거리 기반 택시 추정' },
      walk: { oneWayMin: Math.round(distanceKm * 13), roundCost: 0, distanceKm, detail: '거리 기반 도보 추정' },
    },
  };
}

function getSelectedRoute() {
  const from = document.getElementById('from-place').value.trim();
  const to = document.getElementById('to-place').value.trim();
  if (!from || !to) return null;
  return findRoute(from, to) || makeFallbackRoute(from, to);
}

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
  if (page === 'travel') renderTravelPage();
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
  if (h < 9) msg = '이른 아침이네요. 오늘 일정을 확인해요 ☀️';
  else if (h < 12) msg = '오전 공강이에요! 집에 다녀올까요? 🏃';
  else if (h < 14) msg = '점심 시간! 밥은 먹었나요? 🍚';
  else if (h < 18) msg = '오후 공강, 어디서 시간을 보낼까요? ☕';
  else msg = '저녁이에요. 오늘 할 일 마무리해요 🌙';

  document.getElementById('greeting-msg').textContent = msg;

  const urgent = state.tasks.filter(t => !t.done && (t.pri === 'urgent' || t.pri === 'high')).slice(0, 3);
  const el = document.getElementById('home-task-preview');

  if (urgent.length === 0) {
    el.innerHTML = '<div class="empty-state" style="padding:16px"><div class="empty-icon">✅</div>긴급 할 일이 없어요!</div>';
  } else {
    el.innerHTML = urgent.map(t => `
      <div class="task-preview-item">
        <div class="task-preview-pri pri-${t.pri}"></div>
        <div class="task-preview-text">${escapeHtml(t.title)}</div>
        <div class="task-preview-loc">${locLabel(t.loc)}</div>
      </div>
    `).join('');
  }

  if (state.lastTravel) updateHomeTravelBanner(state.lastTravel);
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
  renderTasks();
}

function selectTransport(btn) {
  document.querySelectorAll('.pill[data-transport]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.transport = btn.dataset.transport;
  calcTravel({ silent: true });
}

function renderTravelPage() {
  renderPlaceOptions();
  renderRouteLibrary();
  updateRouteNote();
  if (document.getElementById('free-minutes').value) calcTravel({ silent: true });
}

function renderPlaceOptions() {
  const places = [...new Set(allRoutes().flatMap(route => [route.from, route.to]))].sort((a, b) => a.localeCompare(b, 'ko'));
  const el = document.getElementById('place-options');
  if (!el) return;
  el.innerHTML = places.map(place => `<option value="${escapeHtml(place)}"></option>`).join('');
}

function renderRouteLibrary() {
  const el = document.getElementById('saved-route-list');
  if (!el) return;

  const query = normalizePlace(document.getElementById('route-search')?.value || '');
  const routes = allRoutes().filter(route => {
    if (!query) return true;
    return [route.from, route.to, ...(route.tags || [])].some(value => normalizePlace(value).includes(query));
  });

  if (routes.length === 0) {
    el.innerHTML = '<div class="route-empty">검색 결과가 없어요. 출발지/도착지를 입력한 뒤 저장해보세요.</div>';
    return;
  }

  el.innerHTML = routes.map(route => {
    const isCustom = route.id.startsWith('custom-');
    const subway = route.transports.subway || Object.values(route.transports)[0];

    return `
      <div class="route-chip" onclick="applyRoute('${route.id}')">
        <div>
          <strong>${escapeHtml(route.from)} → ${escapeHtml(route.to)}</strong>
          <span>${subway.oneWayMin}분 · ${formatWon(subway.roundCost)} · ${subway.distanceKm}km</span>
        </div>
        <em>${isCustom ? '저장됨' : '더미'}</em>
      </div>
    `;
  }).join('');
}

function applyRoute(routeId) {
  const route = allRoutes().find(item => item.id === routeId);
  if (!route) return;

  document.getElementById('from-place').value = route.from;
  document.getElementById('to-place').value = route.to;
  updateRouteNote(route);
  calcTravel({ silent: true });
}

function saveCurrentRoute() {
  const from = document.getElementById('from-place').value.trim();
  const to = document.getElementById('to-place').value.trim();

  if (!from || !to) {
    alert('출발지와 도착지를 모두 입력해주세요.');
    return;
  }

  if (findRoute(from, to)?.id?.startsWith('custom-')) {
    alert('이미 저장된 경로예요.');
    return;
  }

  const route = makeFallbackRoute(from, to);
  route.id = `custom-${Date.now()}`;
  route.tags = ['내 저장 경로', from, to];
  route.note = '사용자가 저장한 더미 경로입니다. API 없이 앱 안에서 계속 사용할 수 있어요.';

  state.customRoutes.unshift(route);
  writeStorage(STORAGE_KEYS.customRoutes, state.customRoutes);
  renderPlaceOptions();
  renderRouteLibrary();
  updateRouteNote(route);
  calcTravel({ silent: true });
}

function swapPlaces() {
  const fromEl = document.getElementById('from-place');
  const toEl = document.getElementById('to-place');
  const prevFrom = fromEl.value;

  fromEl.value = toEl.value;
  toEl.value = prevFrom;

  updateRouteNote();
  calcTravel({ silent: true });
}

function updateRouteNote(route = getSelectedRoute()) {
  const el = document.getElementById('route-data-note');
  if (!el || !route) return;

  const isRegistered = Boolean(findRoute(route.from, route.to));
  el.textContent = isRegistered ? route.note : '등록된 더미 경로가 없어 앱 내부 추정값으로 계산합니다. 저장하면 검색 목록에 추가돼요.';
}

function calcTravel(options = {}) {
  const freeMin = parseInt(document.getElementById('free-minutes').value, 10);
  const stayMin = parseInt(document.getElementById('home-stay').value, 10) || 30;
  const route = getSelectedRoute();

  if (!route) {
    if (!options.silent) alert('출발지와 도착지를 입력해주세요.');
    return;
  }

  if (!freeMin || freeMin < 10) {
    updateRouteNote(route);
    if (!options.silent) alert('공강 시간을 입력해주세요 (최소 10분)');
    return;
  }

  const transportData = route.transports[state.transport] || route.transports.subway || Object.values(route.transports)[0];
  const oneWayMin = transportData.oneWayMin;
  const roundMin = oneWayMin * 2;
  const totalNeeded = roundMin + stayMin;
  const marginMin = freeMin - totalNeeded;
  const roundCost = transportData.roundCost;
  const canGo = marginMin >= 0;

  const resultCard = document.getElementById('travel-result');
  resultCard.classList.remove('hidden', 'go', 'stay');
  resultCard.classList.add(canGo ? 'go' : 'stay');

  document.getElementById('travel-verdict').textContent = canGo
    ? `✅ 다녀올 수 있어요! (+${marginMin}분 여유)`
    : `❌ 시간이 부족해요 (${Math.abs(marginMin)}분 모자람)`;

  document.getElementById('route-summary').textContent = `${route.from} → ${route.to} · ${transportLabels[state.transport]} · ${transportData.detail}`;
  document.getElementById('r-one-way').textContent = `${oneWayMin}분`;
  document.getElementById('r-round-trip').textContent = `${roundMin}분`;
  document.getElementById('r-cost').textContent = formatWon(roundCost);
  document.getElementById('r-margin').textContent = marginMin >= 0 ? `${marginMin}분` : '없음';

  document.getElementById('cost-total-display').textContent = formatWon(roundCost);
  document.getElementById('cost-row-1-label').textContent = `${transportLabels[state.transport]} 편도 시간`;
  document.getElementById('cost-row-1-val').textContent = `${oneWayMin}분`;
  document.getElementById('cost-row-2-label').textContent = `더미 거리 ${transportData.distanceKm}km`;
  document.getElementById('cost-row-2-val').textContent = formatWon(roundCost);
  document.getElementById('cost-row-3-label').textContent = '계산 방식';
  document.getElementById('cost-row-3-val').textContent = findRoute(route.from, route.to) ? '등록 더미' : '추정 더미';

  let suggestion = '';

  if (canGo && marginMin >= 30) {
    suggestion = `🎉 ${marginMin}분 여유가 있어요! 집에서 ${['빨래 돌리기', '짧은 낮잠', '간단한 식사', '필요한 물건 챙기기'][Math.floor(Math.random() * 4)]}도 할 수 있어요.`;
  } else if (canGo) {
    suggestion = '⚡ 빠듯하게 다녀올 수 있어요. 지체 없이 바로 출발하세요!';
  } else if (marginMin > -15) {
    suggestion = `😅 조금 부족해요. 집에 있는 시간을 ${Math.max(0, stayMin - Math.abs(marginMin))}분으로 줄이면 가능해요!`;
  } else {
    suggestion = '🏫 이번 공강엔 학교 근처에 있는 게 나을 것 같아요. 근처 카페나 스터디카페를 찾아볼까요?';
  }

  document.getElementById('travel-suggestion').textContent = suggestion;

  const result = { canGo, route, roundMin, roundCost, marginMin };
  state.lastTravel = result;
  writeStorage(STORAGE_KEYS.lastRoute, result);
  updateHomeTravelBanner(result);
  updateRouteNote(route);

  if (!options.silent) resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateHomeTravelBanner(result) {
  const banner = document.getElementById('home-result-banner');
  if (!banner || !result) return;

  banner.classList.remove('hidden');
  document.getElementById('result-verdict-text').textContent = result.canGo ? '✅ 집에 다녀올 수 있어요!' : '❌ 이번엔 학교 근처에 있는 게 나아요';
  document.getElementById('result-detail-text').textContent = `${result.route.from} → ${result.route.to} · 왕복 ${result.roundMin}분 · 교통비 ${formatWon(result.roundCost)}`;
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

  let places = [...nearbyPlaces];
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
      ? '<span class="nearby-tag ok">✅ 가능</span>'
      : `<span class="nearby-tag tight">⏱️ ${p.minNeeded}분 필요</span>`;

    return `
      <div class="nearby-card ${ok ? '' : 'not-enough'}">
        <div class="nearby-emoji">${p.emoji}</div>
        <div class="nearby-info">
          <div class="nearby-name">${escapeHtml(p.name)}</div>
          <div class="nearby-meta">
            <span>${p.dist}</span>
            <span>⭐ ${p.rating}</span>
            <span>${escapeHtml(p.desc)}</span>
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

  if (!title) {
    alert('할 일을 입력해주세요!');
    return;
  }

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
  if (task) {
    task.done = !task.done;
    saveTasks();
    renderTasks();
    renderHome();
  }
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
  const locText = { home: '🏠 집', school: '🏫 학교', anywhere: '🌍 어디서나' };
  const priText = { urgent: '긴급', high: '높음', mid: '보통', low: '낮음' };
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
          <div class="task-title-text">${escapeHtml(t.title)}</div>
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
  writeStorage(STORAGE_KEYS.tasks, state.tasks);
}

function formatWon(value) {
  return value === 0 ? '무료' : `${value.toLocaleString()}원`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  renderHome();
  renderNearby();
  renderTasks();
  renderTravelPage();

  ['from-place', 'to-place', 'free-minutes', 'home-stay'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      updateRouteNote();
      calcTravel({ silent: true });
    });
  });
});
