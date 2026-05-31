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
