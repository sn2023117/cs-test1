// ══════════════════════════════════════
//  STORAGE
// ══════════════════════════════════════
const STORAGE_KEYS = {
  tasks: 'gn_tasks',
  customRoutes: 'gn_custom_routes',
  lastRoute: 'gn_last_route',
  freeMinutes: 'gn_free_minutes',
  timerRemaining: 'gn_timer_remaining',
};

function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch (e) {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ══════════════════════════════════════
//  STATE
// ══════════════════════════════════════
const transportLabels = { bus: '버스', subway: '지하철', walk: '도보', taxi: '택시' };

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
  freeMinutes: readStorage(STORAGE_KEYS.freeMinutes, ''),
  scheduleMode: 'priority',

  // 실시간 타이머
  timerRunning: false,
  timerRemainingMs: 0,   // 남은 밀리초
  timerTotalMs: 0,       // 처음 설정 밀리초
  timerStartedAt: null,  // Date.now() 기록
  timerInterval: null,
};

// ── 샘플 태스크 ──
if (state.tasks.length === 0) {
  state.tasks = [
    { id: 1, title: '컴퓨터개론 과제 제출', loc: 'anywhere', pri: 'urgent', due: '2026-06-01', meal: 'any', done: false, duration: 60 },
    { id: 2, title: '웹앱 배포 링크 확인', loc: 'school', pri: 'high', due: '2026-05-31', meal: 'any', done: false, duration: 20 },
    { id: 3, title: '빨래 돌리기', loc: 'home', pri: 'mid', due: '', meal: 'any', done: false, duration: 10 },
    { id: 4, title: '점심 먹기', loc: 'school', pri: 'urgent', due: '', meal: 'before', done: false, duration: 30 },
    { id: 5, title: '운동하기', loc: 'anywhere', pri: 'mid', due: '', meal: 'after', done: false, duration: 30 },
  ];
  saveTasks();
}

// ══════════════════════════════════════
//  DUMMY DATA
// ══════════════════════════════════════
const dummyRoutes = [
  {
    id: 'soongsil-bugae',
    from: '숭실대입구역', to: '부개역',
    tags: ['예시', '학교', '집', '7호선', '1호선'],
    note: '지도 API 없이 과제용으로 등록한 대표 더미 경로입니다.',
    transports: {
      subway: { oneWayMin: 58, roundCost: 3400, distanceKm: 24.7, detail: '7호선 숭실대입구역 → 온수역 환승 → 1호선 부개역' },
      bus:    { oneWayMin: 92, roundCost: 3600, distanceKm: 27.2, detail: '간선버스와 지선버스 환승 가정' },
      taxi:   { oneWayMin: 48, roundCost: 62000, distanceKm: 25.5, detail: '도로 정체 보통 기준 택시 더미 값' },
      walk:   { oneWayMin: 310, roundCost: 0, distanceKm: 23.8, detail: '현실적으로 비추천, 도보 환산용' },
    },
  },
  {
    id: 'inha-bupyeong',
    from: '인하대학교', to: '부평역',
    tags: ['학교', '인천', '더미'],
    note: '인천권 더미 경로입니다.',
    transports: {
      bus:    { oneWayMin: 45, roundCost: 3000, distanceKm: 13.5, detail: '학교 앞 버스 정류장 → 부평역 방면' },
      subway: { oneWayMin: 38, roundCost: 3000, distanceKm: 12.8, detail: '인하대역 → 주안역 환승 → 부평역' },
      taxi:   { oneWayMin: 28, roundCost: 28000, distanceKm: 12.4, detail: '일반 도로 기준 택시 더미 값' },
      walk:   { oneWayMin: 165, roundCost: 0, distanceKm: 12.2, detail: '도보 이동 환산 값' },
    },
  },
  {
    id: 'soongsil-gangnam',
    from: '숭실대입구역', to: '강남역',
    tags: ['서울', '카페', '더미'],
    note: '서울 내 이동 비교용 더미 경로입니다.',
    transports: {
      subway: { oneWayMin: 32, roundCost: 3000, distanceKm: 12.1, detail: '7호선 → 고속터미널 환승 → 2호선/신분당선 권역' },
      bus:    { oneWayMin: 54, roundCost: 3000, distanceKm: 13.6, detail: '간선버스 이동 가정' },
      taxi:   { oneWayMin: 26, roundCost: 30000, distanceKm: 11.8, detail: '교통량 보통 기준 택시 더미 값' },
      walk:   { oneWayMin: 150, roundCost: 0, distanceKm: 11.1, detail: '도보 이동 환산 값' },
    },
  },
];

const nearbyCatalog = {
  soongsil: [
    { id: 1, name: '숭실 스터디 카페', cat: 'study', emoji: '📚', dist: '도보 3분', minNeeded: 30, desc: '조용한 개인석, 콘센트 많음', rating: '4.8' },
    { id: 2, name: '이디야 숭실대점', cat: 'cafe', emoji: '☕', dist: '도보 2분', minNeeded: 15, desc: '아메리카노 2,500원', rating: '4.2' },
    { id: 3, name: 'GS25 숭실대입구역점', cat: 'convenience', emoji: '🏪', dist: '도보 1분', minNeeded: 5, desc: '24시간', rating: '4.0' },
    { id: 4, name: '김밥천국 숭실대점', cat: 'food', emoji: '🍱', dist: '도보 5분', minNeeded: 20, desc: '빠른 식사 가능', rating: '4.1' },
    { id: 5, name: '카페 블루밍', cat: 'cafe', emoji: '🌸', dist: '도보 7분', minNeeded: 20, desc: '공부하기 좋은 카페', rating: '4.6' },
    { id: 6, name: '메가스터디카페', cat: 'study', emoji: '🏢', dist: '도보 10분', minNeeded: 60, desc: '인쇄 가능, 편의시설 완비', rating: '4.5' },
  ],
  bugae: [
    { id: 11, name: '부개역 투썸플레이스', cat: 'cafe', emoji: '☕', dist: '도보 4분', minNeeded: 20, desc: '좌석 넓음, 콘센트 있음', rating: '4.5' },
    { id: 12, name: '부개역 스터디라운지', cat: 'study', emoji: '📚', dist: '도보 6분', minNeeded: 40, desc: '1시간권 이용 가능', rating: '4.6' },
    { id: 13, name: 'CU 부개역점', cat: 'convenience', emoji: '🏪', dist: '도보 1분', minNeeded: 5, desc: '간식, 택배 가능', rating: '4.0' },
    { id: 14, name: '부개역 김밥', cat: 'food', emoji: '🍱', dist: '도보 3분', minNeeded: 18, desc: '빠르게 먹기 좋음', rating: '4.2' },
  ],
  inha: [
    { id: 21, name: '인하 스터디 카페', cat: 'study', emoji: '📚', dist: '도보 3분', minNeeded: 30, desc: '조용한 개인실, WiFi', rating: '4.8' },
    { id: 22, name: '이디야 인하대점', cat: 'cafe', emoji: '☕', dist: '도보 2분', minNeeded: 15, desc: '아메리카노 2,500원', rating: '4.2' },
    { id: 23, name: 'GS25 인하대역점', cat: 'convenience', emoji: '🏪', dist: '도보 1분', minNeeded: 5, desc: '24시간', rating: '4.0' },
    { id: 24, name: '학생회관 식당', cat: 'food', emoji: '🍚', dist: '도보 4분', minNeeded: 25, desc: '학생 가격 식사', rating: '4.3' },
  ],
  gangnam: [
    { id: 31, name: '강남역 카페', cat: 'cafe', emoji: '☕', dist: '도보 5분', minNeeded: 25, desc: '짧은 대기, 커피 휴식', rating: '4.4' },
    { id: 32, name: '강남역 공유 스터디룸', cat: 'study', emoji: '📚', dist: '도보 8분', minNeeded: 60, desc: '예약형 스터디룸', rating: '4.5' },
    { id: 33, name: '세븐일레븐 강남역점', cat: 'convenience', emoji: '🏪', dist: '도보 1분', minNeeded: 5, desc: '간단 구매 가능', rating: '3.9' },
    { id: 34, name: '강남역 분식집', cat: 'food', emoji: '🍜', dist: '도보 4분', minNeeded: 20, desc: '빠른 한 끼', rating: '4.1' },
  ],
  default: [
    { id: 91, name: '출발지 근처 카페', cat: 'cafe', emoji: '☕', dist: '도보 5분', minNeeded: 20, desc: '더미 추천 카페', rating: '4.2' },
    { id: 92, name: '출발지 근처 스터디존', cat: 'study', emoji: '📚', dist: '도보 8분', minNeeded: 40, desc: '공부하기 좋은 장소', rating: '4.4' },
    { id: 93, name: '출발지 근처 편의점', cat: 'convenience', emoji: '🏪', dist: '도보 2분', minNeeded: 5, desc: '간단 구매 가능', rating: '4.0' },
    { id: 94, name: '출발지 근처 식당', cat: 'food', emoji: '🍱', dist: '도보 6분', minNeeded: 25, desc: '빠른 식사 가능', rating: '4.1' },
  ],
};

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════
function normalizePlace(v) { return v.trim().replace(/\s+/g, '').toLowerCase(); }
function allRoutes() { return [...dummyRoutes, ...state.customRoutes]; }
function findRoute(from, to) {
  const fk = normalizePlace(from), tk = normalizePlace(to);
  return allRoutes().find(r => normalizePlace(r.from) === fk && normalizePlace(r.to) === tk);
}
function formatWon(v) { return v === 0 ? '무료' : v.toLocaleString() + '원'; }
function formatMinSec(totalSec) {
  const m = Math.floor(totalSec / 60), s = totalSec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
function escapeHtml(v) {
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function makeFallbackRoute(from, to) {
  const seed = [...`${from}-${to}`].reduce((s, c) => s + c.charCodeAt(0), 0);
  const d = Math.max(3, Math.min(35, Math.round((6 + (seed % 25)) * 10) / 10));
  return {
    id: 'fallback-' + Date.now(),
    from, to, tags: ['자동계산'], note: '등록된 더미 경로가 없어 추정값으로 계산했어요.',
    transports: {
      subway: { oneWayMin: Math.round(d * 2.7 + 16), roundCost: d > 10 ? 3400 : 3000, distanceKm: d, detail: '더미 거리 기반 지하철 추정' },
      bus:    { oneWayMin: Math.round(d * 3.8 + 14), roundCost: d > 10 ? 3600 : 3000, distanceKm: d, detail: '더미 거리 기반 버스 추정' },
      taxi:   { oneWayMin: Math.round(d * 1.8 + 8),  roundCost: Math.round((4800 + d * 1100) / 100) * 200, distanceKm: d, detail: '더미 거리 기반 택시 추정' },
      walk:   { oneWayMin: Math.round(d * 13), roundCost: 0, distanceKm: d, detail: '거리 기반 도보 추정' },
    },
  };
}

function getSelectedRoute() {
  const from = document.getElementById('from-place').value.trim();
  const to   = document.getElementById('to-place').value.trim();
  if (!from || !to) return null;
  return findRoute(from, to) || makeFallbackRoute(from, to);
}

function getOriginName() { return document.getElementById('from-place')?.value.trim() || '출발지'; }
function getOriginKey(place) {
  const k = normalizePlace(place || getOriginName());
  if (k.includes('숭실')) return 'soongsil';
  if (k.includes('부개')) return 'bugae';
  if (k.includes('인하')) return 'inha';
  if (k.includes('강남')) return 'gangnam';
  return 'default';
}
function getNearbyPlacesForOrigin(place) { return nearbyCatalog[getOriginKey(place)] || nearbyCatalog.default; }

function getEffectiveFreeMinutes(fallback) {
  // 타이머가 돌고 있으면 남은 타이머 시간 우선 사용
  if (state.timerRunning || state.timerRemainingMs > 0) {
    return Math.max(0, Math.ceil(state.timerRemainingMs / 60000));
  }
  const v = document.getElementById('free-minutes')?.value
         || document.getElementById('nearby-free-min')?.value
         || document.getElementById('schedule-free-min')?.value
         || state.freeMinutes
         || fallback;
  return parseInt(v, 10) || 0;
}

function saveFreeMinutes(v) {
  if (!v) return;
  state.freeMinutes = String(v);
  writeStorage(STORAGE_KEYS.freeMinutes, state.freeMinutes);
}

function syncFreeMinutes(source) {
  const ids = { travel: 'free-minutes', nearby: 'nearby-free-min', schedule: 'schedule-free-min' };
  const val = document.getElementById(ids[source])?.value;
  if (!val) return;

  saveFreeMinutes(val);
  Object.entries(ids).forEach(([k, id]) => {
    if (k !== source) {
      const el = document.getElementById(id);
      if (el) el.value = val;
    }
  });

  updateProgressBar();
  renderNearby();
  renderSchedule();
  renderResultPreviews();
  calcTravel({ silent: true });
}

function hydrateFreeMinuteInputs() {
  const saved = state.freeMinutes;
  if (!saved) return;
  ['free-minutes','nearby-free-min','schedule-free-min'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = saved;
  });
}

// ══════════════════════════════════════
//  REALTIME TIMER
// ══════════════════════════════════════
function startTimer() {
  if (state.timerRunning) return;

  // 공강 시간 읽기
  const freeMin = parseInt(
    document.getElementById('free-minutes')?.value ||
    document.getElementById('nearby-free-min')?.value ||
    document.getElementById('schedule-free-min')?.value ||
    state.freeMinutes || '0',
    10
  );

  if (!freeMin || freeMin < 1) {
    alert('먼저 공강 시간을 입력하고 타이머를 시작해주세요!');
    return;
  }

  if (state.timerRemainingMs <= 0) {
    state.timerTotalMs = freeMin * 60 * 1000;
    state.timerRemainingMs = state.timerTotalMs;
  }

  state.timerStartedAt = Date.now();
  state.timerRunning = true;

  state.timerInterval = setInterval(tickTimer, 1000);
  updateTimerUI();
  updateTimerStatusBar();
}

function pauseTimer() {
  if (!state.timerRunning) return;
  state.timerRunning = false;
  clearInterval(state.timerInterval);
  state.timerInterval = null;
  updateTimerUI();
  updateTimerStatusBar();
}

function toggleTimer() {
  if (state.timerRunning) pauseTimer();
  else startTimer();
}

function resetTimer() {
  pauseTimer();
  state.timerRemainingMs = 0;
  state.timerTotalMs = 0;
  updateTimerUI();
  updateProgressBar();
  updateTimerStatusBar();
}

function tickTimer() {
  const elapsed = Date.now() - state.timerStartedAt;
  state.timerStartedAt = Date.now();
  state.timerRemainingMs = Math.max(0, state.timerRemainingMs - elapsed);

  updateTimerUI();
  updateProgressBar();

  // 1분마다 스케줄·주변 재렌더
  if (Math.floor((state.timerRemainingMs + elapsed) / 60000) !== Math.floor(state.timerRemainingMs / 60000)) {
    renderSchedule();
    renderNearby();
    renderResultPreviews();
  }

  if (state.timerRemainingMs <= 0) {
    pauseTimer();
    document.getElementById('timer-display').textContent = '00:00:00';
    updateTimerStatusBar(true);
  }
}

function updateTimerUI() {
  const totalSec = Math.ceil(state.timerRemainingMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const display = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');

  document.getElementById('timer-display').textContent = state.timerRemainingMs > 0 ? display : '--:--:--';

  const btn = document.getElementById('timer-toggle-btn');
  if (btn) btn.textContent = state.timerRunning ? '⏸' : '▶';

  const liveTimer = document.getElementById('live-timer');
  if (liveTimer) liveTimer.classList.toggle('running', state.timerRunning);
}

function updateProgressBar() {
  const wrap = document.getElementById('progress-bar-wrap');
  const fill = document.getElementById('progress-fill');
  const label = document.getElementById('progress-label');
  if (!wrap || !fill || !label) return;

  const totalMs = state.timerTotalMs;
  const remMs   = state.timerRemainingMs;

  if (totalMs <= 0) {
    fill.style.width = '0%';
    const fm = parseInt(state.freeMinutes || '0', 10);
    label.textContent = fm > 0 ? `공강 ${fm}분 (타이머 미시작)` : '공강 시간을 입력하세요';
    return;
  }

  const pct = Math.max(0, Math.min(100, (remMs / totalMs) * 100));
  fill.style.width = pct + '%';

  const remMin = Math.ceil(remMs / 60000);
  label.textContent = `남은 공강 ${remMin}분 (${Math.round(pct)}%)`;

  // 색상 경고
  fill.className = 'progress-fill' + (pct < 20 ? ' danger' : pct < 40 ? ' warn' : '');
}

function updateTimerStatusBar(finished) {
  const bar = document.getElementById('timer-status-bar');
  const text = document.getElementById('timer-status-text');
  const btn = bar?.querySelector('.timer-status-btn');
  if (!bar || !text) return;

  if (finished) {
    text.textContent = '⏰ 공강 시간이 끝났어요!';
    if (btn) btn.textContent = '↺ 초기화';
    if (btn) btn.onclick = resetTimer;
    return;
  }

  if (state.timerRunning) {
    const remMin = Math.ceil(state.timerRemainingMs / 60000);
    text.textContent = `⏱️ 공강 ${remMin}분 남았어요 · 스케줄이 실시간으로 업데이트돼요`;
    if (btn) { btn.textContent = '⏸ 일시정지'; btn.onclick = toggleTimer; }
  } else if (state.timerRemainingMs > 0) {
    text.textContent = '⏸ 타이머 일시정지 중';
    if (btn) { btn.textContent = '▶ 재개'; btn.onclick = toggleTimer; }
  } else {
    text.textContent = '⏱️ 타이머를 시작하면 남은 공강이 실시간으로 줄어들어요';
    if (btn) { btn.textContent = '▶ 시작'; btn.onclick = toggleTimer; }
  }
}

// ══════════════════════════════════════
//  SCHEDULE ALGORITHM
// ══════════════════════════════════════
const priOrder = { urgent: 0, high: 1, mid: 2, low: 3 };

function buildSchedule(freeMin, mode) {
  // 완료 안 된 할 일만, 식사 여부 필터
  const candidates = state.tasks.filter(t => {
    if (t.done) return false;
    if (t.meal === 'after' && !state.mealEaten) return false;
    if (t.meal === 'before' && state.mealEaten) return false;
    return true;
  }).map(t => ({ ...t, duration: t.duration || 30 }));

  if (candidates.length === 0) return { items: [], totalMin: 0, leftMin: freeMin };

  let sorted;

  if (mode === 'priority') {
    // 우선순위 순 → 시간 내에 최대한 담기
    sorted = [...candidates].sort((a, b) => {
      const pd = (priOrder[a.pri] ?? 9) - (priOrder[b.pri] ?? 9);
      if (pd !== 0) return pd;
      return a.duration - b.duration; // 같은 우선순위면 짧은 것 먼저
    });
  } else if (mode === 'fit') {
    // 시간 가장 잘 맞는 조합 (그리디: 짧은 것부터, 총합이 freeMin 이하)
    sorted = [...candidates].sort((a, b) => a.duration - b.duration);
  } else {
    // 균형: 우선순위 + 다양한 장소 섞기
    sorted = [...candidates].sort((a, b) => {
      const pd = (priOrder[a.pri] ?? 9) - (priOrder[b.pri] ?? 9);
      if (pd !== 0) return pd;
      return b.duration - a.duration;
    });
  }

  // 그리디 담기
  const items = [];
  let used = 0;
  for (const t of sorted) {
    if (used + t.duration <= freeMin) {
      items.push(t);
      used += t.duration;
    }
  }

  // 여전히 비면 가장 짧은 것 1개라도
  if (items.length === 0 && candidates.length > 0) {
    const shortest = [...candidates].sort((a, b) => a.duration - b.duration)[0];
    if (shortest.duration > freeMin) {
      return { items: [], totalMin: 0, leftMin: freeMin, tooShort: shortest };
    }
  }

  return { items, totalMin: used, leftMin: freeMin - used };
}

function renderSchedule() {
  const freeMin = getEffectiveFreeMinutes(90);
  const mode = state.scheduleMode;
  const el = document.getElementById('schedule-result');
  if (!el) return;

  // 공강 분 입력 동기화
  const schedInput = document.getElementById('schedule-free-min');
  if (schedInput && !state.timerRunning) schedInput.value = freeMin || '';

  const { items, totalMin, leftMin, tooShort } = buildSchedule(freeMin, mode);

  if (!freeMin) {
    el.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-icon">⏱️</div>공강 시간을 입력하면 추천 스케줄이 나와요</div>';
    return;
  }

  if (tooShort) {
    el.innerHTML = `<div class="empty-state" style="padding:20px"><div class="empty-icon">😅</div>공강 ${freeMin}분으론 "${escapeHtml(tooShort.title)}"(${tooShort.duration}분) 하나도 빠듯해요. 할 일 소요 시간을 줄여보세요.</div>`;
    return;
  }

  if (items.length === 0) {
    el.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-icon">🎉</div>추천할 할 일이 없어요! 새로 추가해보세요.</div>';
    return;
  }

  const modeLabel = { priority: '우선순위 중심', fit: '시간 최적 배분', balance: '균형 조합' }[mode];

  let startMin = 0;
  const now = new Date();

  const rows = items.map((t, i) => {
    const startTime = new Date(now.getTime() + startMin * 60000);
    const endTime = new Date(startTime.getTime() + t.duration * 60000);
    const timeStr = startTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                  + ' ~ '
                  + endTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    startMin += t.duration;

    const locText  = { home: '🏠', school: '🏫', anywhere: '🌍' };
    const priColor = { urgent: '#ff6b6b', high: '#ffa94d', mid: '#74c0fc', low: '#a9e34b' };
    const priLabel = { urgent: '긴급', high: '높음', mid: '보통', low: '낮음' };

    return `
      <div class="schedule-item" style="--pri-color:${priColor[t.pri]}">
