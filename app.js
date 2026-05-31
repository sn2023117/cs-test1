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
        <div class="schedule-step">${i + 1}</div>
        <div class="schedule-item-body">
          <div class="schedule-item-title">${locText[t.loc] || '🌍'} ${escapeHtml(t.title)}</div>
          <div class="schedule-item-meta">
            <span class="schedule-time">${timeStr}</span>
            <span class="schedule-dur">${t.duration}분</span>
            <span class="schedule-pri" style="color:${priColor[t.pri]}">${priLabel[t.pri]}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div class="schedule-summary">
      <span class="schedule-mode-label">${modeLabel}</span>
      <span>총 ${totalMin}분 / ${freeMin}분</span>
      ${leftMin > 0 ? `<span class="schedule-left">여유 ${leftMin}분</span>` : ''}
    </div>
    <div class="schedule-timeline">${rows}</div>
    <div class="schedule-footer">
      ${leftMin >= 10 ? `💡 ${leftMin}분 여유가 있어요. 이동하거나 휴식을 취해보세요.` : '⚡ 공강 시간을 꽉 채웠어요!'}
    </div>
  `;

  // 홈 배너 업데이트
  updateHomeScheduleBanner(items, freeMin);
}

function updateHomeScheduleBanner(items, freeMin) {
  const banner = document.getElementById('home-schedule-banner');
  const list   = document.getElementById('home-schedule-list');
  if (!banner || !list || items.length === 0) return;

  banner.classList.remove('hidden');
  list.innerHTML = items.slice(0, 3).map(t =>
    `<div class="schedule-banner-item">
      <span class="schedule-banner-dot" style="background:${{ urgent:'#ff6b6b', high:'#ffa94d', mid:'#74c0fc', low:'#a9e34b' }[t.pri]}"></span>
      <span>${escapeHtml(t.title)}</span>
      <span class="schedule-banner-dur">${t.duration}분</span>
    </div>`
  ).join('');
}

function switchScheduleTab(btn, mode) {
  document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.scheduleMode = mode;
  renderSchedule();
}

// ══════════════════════════════════════
//  ROUTING
// ══════════════════════════════════════
function goTo(page) {
  document.getElementById('screen-onboarding')?.classList.remove('active');
  document.getElementById('screen-app').classList.add('active');

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });

  state.currentPage = page;
  if (page === 'home')   renderHome();
  if (page === 'travel') renderTravelPage();
  if (page === 'nearby') renderNearby();
  if (page === 'tasks')  { renderTasks(); renderSchedule(); }
}

// ══════════════════════════════════════
//  HOME
// ══════════════════════════════════════
function renderHome() {
  const now = new Date();
  const h = now.getHours();
  document.getElementById('greeting-time').textContent =
    now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
    + ' · '
    + now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  const msgs = [
    [0,9,  '이른 아침이네요. 오늘 일정을 확인해요 ☀️'],
    [9,12,  '오전 공강이에요! 집에 다녀올까요? 🏃'],
    [12,14, '점심 시간! 밥은 먹었나요? 🍚'],
    [14,18, '오후 공강, 어디서 시간을 보낼까요? ☕'],
    [18,25, '저녁이에요. 오늘 할 일 마무리해요 🌙'],
  ];
  const msg = (msgs.find(([s,e]) => h >= s && h < e) || msgs[4])[2];
  document.getElementById('greeting-msg').textContent = msg;

  const urgent = state.tasks.filter(t => !t.done && (t.pri === 'urgent' || t.pri === 'high')).slice(0, 3);
  const el = document.getElementById('home-task-preview');
  el.innerHTML = urgent.length === 0
    ? '<div class="empty-state" style="padding:16px"><div class="empty-icon">✅</div>긴급 할 일이 없어요!</div>'
    : urgent.map(t => `
        <div class="task-preview-item">
          <div class="task-preview-pri pri-${t.pri}"></div>
          <div class="task-preview-text">${escapeHtml(t.title)}</div>
          <div class="task-preview-loc">${t.duration ? t.duration + '분' : ''} ${locLabel(t.loc)}</div>
        </div>`).join('');

  if (state.lastTravel) updateHomeTravelBanner(state.lastTravel);

  const freeMin = getEffectiveFreeMinutes(0);
  if (freeMin > 0) {
    const { items } = buildSchedule(freeMin, state.scheduleMode);
    updateHomeScheduleBanner(items, freeMin);
  }
}

function locLabel(loc) {
  return { home: '🏠 집', school: '🏫 학교', anywhere: '🌍 어디서나' }[loc] || loc;
}

// ══════════════════════════════════════
//  MEAL
// ══════════════════════════════════════
function toggleMeal() {
  state.mealEaten = !state.mealEaten;
  document.getElementById('meal-icon').textContent  = state.mealEaten ? '✅' : '🍚';
  document.getElementById('meal-label').textContent = state.mealEaten ? '식사 완료' : '식사 전';
  document.getElementById('meal-status').classList.toggle('ate', state.mealEaten);
  renderTasks();
  renderSchedule();
}

// ══════════════════════════════════════
//  TRAVEL
// ══════════════════════════════════════
function selectTransport(btn) {
  document.querySelectorAll('.pill[data-transport]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.transport = btn.dataset.transport;
  calcTravel({ silent: true });
}

function renderTravelPage() {
  hydrateFreeMinuteInputs();
  renderPlaceOptions();
  renderRouteLibrary();
  updateRouteNote();
  renderResultPreviews();
  if (document.getElementById('free-minutes').value) calcTravel({ silent: true });
}

function renderPlaceOptions() {
  const places = [...new Set(allRoutes().flatMap(r => [r.from, r.to]))].sort((a,b) => a.localeCompare(b,'ko'));
  const el = document.getElementById('place-options');
  if (el) el.innerHTML = places.map(p => `<option value="${escapeHtml(p)}"></option>`).join('');
}

function renderRouteLibrary() {
  const el = document.getElementById('saved-route-list');
  if (!el) return;
  const query = normalizePlace(document.getElementById('route-search')?.value || '');
  const routes = allRoutes().filter(r => {
    if (!query) return true;
    return [r.from, r.to, ...(r.tags || [])].some(v => normalizePlace(v).includes(query));
  });
  if (routes.length === 0) {
    el.innerHTML = '<div class="route-empty">검색 결과가 없어요. 출발지/도착지를 입력한 뒤 저장해보세요.</div>';
    return;
  }
  el.innerHTML = routes.map(r => {
    const isCustom = r.id.startsWith('custom-');
    const sub = r.transports.subway || Object.values(r.transports)[0];
    return `<div class="route-chip" onclick="applyRoute('${r.id}')">
      <div>
        <strong>${escapeHtml(r.from)} → ${escapeHtml(r.to)}</strong>
        <span>${sub.oneWayMin}분 · ${formatWon(sub.roundCost)} · ${sub.distanceKm}km</span>
      </div>
      <em>${isCustom ? '저장됨' : '더미'}</em>
    </div>`;
  }).join('');
}

function applyRoute(routeId) {
  const route = allRoutes().find(r => r.id === routeId);
  if (!route) return;
  document.getElementById('from-place').value = route.from;
  document.getElementById('to-place').value   = route.to;
  updateRouteNote(route);
  calcTravel({ silent: true });
}

function saveCurrentRoute() {
  const from = document.getElementById('from-place').value.trim();
  const to   = document.getElementById('to-place').value.trim();
  if (!from || !to) { alert('출발지와 도착지를 모두 입력해주세요.'); return; }
  if (findRoute(from, to)?.id?.startsWith('custom-')) { alert('이미 저장된 경로예요.'); return; }
  const route = makeFallbackRoute(from, to);
  route.id = 'custom-' + Date.now();
  route.tags = ['내 저장 경로', from, to];
  route.note = '사용자가 저장한 더미 경로입니다.';
  state.customRoutes.unshift(route);
  writeStorage(STORAGE_KEYS.customRoutes, state.customRoutes);
  renderPlaceOptions();
  renderRouteLibrary();
  updateRouteNote(route);
  calcTravel({ silent: true });
}

function swapPlaces() {
  const f = document.getElementById('from-place'), t = document.getElementById('to-place');
  const tmp = f.value; f.value = t.value; t.value = tmp;
  updateRouteNote();
  calcTravel({ silent: true });
}

function updateRouteNote(route) {
  const el = document.getElementById('route-data-note');
  if (!el) return;
  const r = route || getSelectedRoute();
  if (!r) return;
  const isReg = Boolean(findRoute(r.from, r.to));
  el.textContent = isReg ? r.note : '등록된 더미 경로가 없어 앱 내부 추정값으로 계산합니다. 저장하면 검색 목록에 추가돼요.';
}

function calcTravel(options = {}) {
  const freeMin = getEffectiveFreeMinutes(0) || parseInt(document.getElementById('free-minutes')?.value, 10);
  const stayMin = parseInt(document.getElementById('home-stay').value, 10) || 30;
  const route   = getSelectedRoute();

  if (!route) { if (!options.silent) alert('출발지와 도착지를 입력해주세요.'); return; }
  if (!freeMin || freeMin < 10) { updateRouteNote(route); if (!options.silent) alert('공강 시간을 입력해주세요 (최소 10분)'); return; }

  saveFreeMinutes(freeMin);
  hydrateFreeMinuteInputs();

  const td = route.transports[state.transport] || route.transports.subway || Object.values(route.transports)[0];
  const oneWayMin = td.oneWayMin;
  const roundMin  = oneWayMin * 2;
  const marginMin = freeMin - (roundMin + stayMin);
  const roundCost = td.roundCost;
  const canGo = marginMin >= 0;

  const resultCard = document.getElementById('travel-result');
  resultCard.classList.remove('hidden','go','stay');
  resultCard.classList.add(canGo ? 'go' : 'stay');

  document.getElementById('travel-verdict').textContent = canGo
    ? '✅ 다녀올 수 있어요! (+' + marginMin + '분 여유)'
    : '❌ 시간이 부족해요 (' + Math.abs(marginMin) + '분 모자람)';

  document.getElementById('route-summary').textContent = route.from + ' → ' + route.to + ' · ' + transportLabels[state.transport] + ' · ' + td.detail;
  document.getElementById('r-one-way').textContent    = oneWayMin + '분';
  document.getElementById('r-round-trip').textContent = roundMin + '분';
  document.getElementById('r-cost').textContent       = formatWon(roundCost);
  document.getElementById('r-margin').textContent     = marginMin >= 0 ? marginMin + '분' : '없음';
  document.getElementById('cost-total-display').textContent = formatWon(roundCost);
  document.getElementById('cost-row-1-label').textContent = transportLabels[state.transport] + ' 편도 시간';
  document.getElementById('cost-row-1-val').textContent   = oneWayMin + '분';
  document.getElementById('cost-row-2-label').textContent = '더미 거리 ' + td.distanceKm + 'km';
  document.getElementById('cost-row-2-val').textContent   = formatWon(roundCost);
  document.getElementById('cost-row-3-val').textContent   = findRoute(route.from, route.to) ? '등록 더미' : '추정 더미';

  const suggestions = ['빨래 돌리기','짧은 낮잠','간단한 식사','필요한 물건 챙기기'];
  let sug = '';
  if (canGo && marginMin >= 30) sug = '🎉 ' + marginMin + '분 여유가 있어요! 집에서 ' + suggestions[Math.floor(Math.random()*4)] + '도 할 수 있어요.';
  else if (canGo) sug = '⚡ 빠듯하게 다녀올 수 있어요. 지체 없이 바로 출발하세요!';
  else if (marginMin > -15) sug = '😅 조금 부족해요. 집에 있는 시간을 ' + Math.max(0, stayMin - Math.abs(marginMin)) + '분으로 줄이면 가능해요!';
  else sug = '🏫 이번 공강엔 학교 근처에 있는 게 나을 것 같아요. 근처 카페나 스터디카페를 찾아볼까요?';
  document.getElementById('travel-suggestion').textContent = sug;

  const result = { canGo, route, roundMin, roundCost, marginMin };
  state.lastTravel = result;
  writeStorage(STORAGE_KEYS.lastRoute, result);
  updateHomeTravelBanner(result);
  updateRouteNote(route);
  renderResultPreviews();

  if (!options.silent) resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateHomeTravelBanner(result) {
  const banner = document.getElementById('home-result-banner');
  if (!banner || !result) return;
  banner.classList.remove('hidden');
  document.getElementById('result-verdict-text').textContent = result.canGo ? '✅ 집에 다녀올 수 있어요!' : '❌ 이번엔 학교 근처에 있는 게 나아요';
  document.getElementById('result-detail-text').textContent  = result.route.from + ' → ' + result.route.to + ' · 왕복 ' + result.roundMin + '분 · 교통비 ' + formatWon(result.roundCost);
}

function renderResultPreviews() {
  const taskEl   = document.getElementById('result-task-preview');
  const nearbyEl = document.getElementById('result-nearby-preview');
  if (!taskEl || !nearbyEl) return;

  const preview = [...state.tasks].filter(t => !t.done).sort((a,b) => (priOrder[a.pri]??9) - (priOrder[b.pri]??9)).slice(0,3);
  taskEl.innerHTML = preview.length
    ? preview.map(t => `<div class="preview-item"><span class="preview-dot pri-${t.pri}"></span><span>${escapeHtml(t.title)}</span>${t.duration ? '<span class="schedule-dur">' + t.duration + '분</span>' : ''}</div>`).join('')
    : '<div class="preview-empty">할 일이 없어요</div>';

  const freeMin = getEffectiveFreeMinutes(60);
  const places = getNearbyPlacesForOrigin(getOriginName())
    .filter(p => p.cat === 'cafe')
    .sort((a,b) => { const aOk = freeMin >= a.minNeeded ? 1 : 0, bOk = freeMin >= b.minNeeded ? 1 : 0; return bOk - aOk || parseFloat(b.rating) - parseFloat(a.rating); })
    .slice(0,2);

  nearbyEl.innerHTML = places.map(p => `<div class="preview-place"><strong>${p.emoji} ${escapeHtml(p.name)}</strong><span>${p.dist} · ${p.minNeeded}분 필요 · ⭐ ${p.rating}</span></div>`).join('');
}

// ══════════════════════════════════════
//  NEARBY
// ══════════════════════════════════════
function filterNearby(btn, cat) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.nearbyFilter = cat;
  renderNearby();
}

function renderNearby() {
  hydrateFreeMinuteInputs();
  const freeMin = getEffectiveFreeMinutes(60);
  const cat = state.nearbyFilter;
  const originName = getOriginName();

  const lbl = document.getElementById('nearby-origin-label');
  if (lbl) lbl.textContent = '⏱️ ' + originName + ' 주변 · 남은 공강';

  let places = [...getNearbyPlacesForOrigin(originName)];
  if (cat !== 'all') places = places.filter(p => p.cat === cat);

  places.sort((a, b) => {
    const aOk = freeMin >= a.minNeeded ? 1 : 0, bOk = freeMin >= b.minNeeded ? 1 : 0;
    return bOk - aOk || parseFloat(b.rating) - parseFloat(a.rating);
  });

  const el = document.getElementById('nearby-list');
  if (!el) return;

  el.innerHTML = places.length === 0
    ? '<div class="empty-state"><div class="empty-icon">🔍</div>해당 카테고리에 장소가 없어요</div>'
    : places.map(p => {
        const ok  = freeMin >= p.minNeeded;
        const tag = ok
          ? '<span class="nearby-tag ok">✅ 가능</span>'
          : '<span class="nearby-tag tight">⏱️ ' + p.minNeeded + '분 필요</span>';
        return `<div class="nearby-card ${ok ? '' : 'not-enough'}">
          <div class="nearby-emoji">${p.emoji}</div>
          <div class="nearby-info">
            <div class="nearby-name">${escapeHtml(p.name)}</div>
            <div class="nearby-meta"><span>${p.dist}</span><span>⭐ ${p.rating}</span><span>${escapeHtml(p.desc)}</span></div>
          </div>${tag}</div>`;
      }).join('');
}

// ══════════════════════════════════════
//  TASKS
// ══════════════════════════════════════
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

  const duration = parseInt(document.getElementById('task-duration').value, 10) || 30;
  const task = {
    id: Date.now(),
    title,
    loc: state.taskLoc,
    pri: state.taskPri,
    due: document.getElementById('task-due').value,
    meal: state.taskMealReq,
    done: false,
    duration,
  };

  state.tasks.unshift(task);
  saveTasks();
  renderTasks();
  renderSchedule();
  renderHome();
  renderResultPreviews();

  document.getElementById('task-title').value = '';
  document.getElementById('task-due').value = '';
  document.getElementById('task-duration').value = '30';
}

function toggleTask(id) {
  const t = state.tasks.find(t => t.id === id);
  if (t) { t.done = !t.done; saveTasks(); renderTasks(); renderSchedule(); renderHome(); renderResultPreviews(); }
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveTasks(); renderTasks(); renderSchedule(); renderHome(); renderResultPreviews();
}

function switchLocTab(btn, loc) {
  document.querySelectorAll('.loc-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.activeLocTab = loc;
  renderTasks();
}

function renderTasks() {
  const filter = state.activeLocTab;
  const today  = new Date().toISOString().split('T')[0];

  let tasks = [...state.tasks];
  if (filter !== 'all') tasks = tasks.filter(t => t.loc === filter);
  tasks = tasks.filter(t => {
    if (t.meal === 'any') return true;
    if (t.meal === 'after'  && !state.mealEaten) return false;
    if (t.meal === 'before' &&  state.mealEaten) return false;
    return true;
  });
  tasks.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (priOrder[a.pri] ?? 9) - (priOrder[b.pri] ?? 9);
  });

  const el = document.getElementById('task-list');
  if (!el) return;

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
    const mealBadge = t.meal !== 'any' ? `<span class="task-badge badge-meal-${t.meal}">${mealText[t.meal]}</span>` : '';
    const durBadge  = t.duration ? `<span class="task-badge badge-dur">⏳ ${t.duration}분</span>` : '';

    return `<div class="task-item ${t.done ? 'done' : ''}">
        <div class="task-check ${t.done ? 'checked' : ''}" onclick="toggleTask(${t.id})">${t.done ? '✓' : ''}</div>
        <div class="task-body">
          <div class="task-title-text">${escapeHtml(t.title)}</div>
          <div class="task-meta">
            <span class="task-badge ${locBadge[t.loc]}">${locText[t.loc]}</span>
            <span class="task-badge badge-pri-${t.pri}">${priText[t.pri]}</span>
            ${durBadge}${mealBadge}${dueStr}
          </div>
        </div>
        <button class="task-delete" onclick="deleteTask(${t.id})">🗑️</button>
      </div>`;
  }).join('');
}

function saveTasks() { writeStorage(STORAGE_KEYS.tasks, state.tasks); }

// ══════════════════════════════════════
//  INIT
// ══════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {
  hydrateFreeMinuteInputs();
  renderHome();
  renderNearby();
  renderTasks();
  renderSchedule();
  renderTravelPage();
  updateTimerUI();
  updateProgressBar();
  updateTimerStatusBar();

  ['from-place','to-place','home-stay'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      updateRouteNote();
      renderNearby();
      renderResultPreviews();
      calcTravel({ silent: true });
    });
  });
});
