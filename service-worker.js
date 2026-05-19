// Service Worker for Market Signal v13
// 강화된 자동 갱신 지원:
// 1. 버전 변경 시 자동 감지 (CACHE_VERSION 변수)
// 2. SKIP_WAITING 메시지 받으면 즉시 활성화
// 3. 활성화 시 옛 캐시 모두 삭제
// 4. 정적 자산도 네트워크 우선 (변경 즉시 반영)
// 5. data_unified.json은 항상 네트워크 우선

const CACHE_VERSION = 'v13.1.0';  // 강력 신호 배너 추가
const CACHE_NAME = `signal-${CACHE_VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// ──────────────────────────────────────────────────────────
// Install: 새 service-worker 설치
// ──────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .catch(() => {})
  );
});

// ──────────────────────────────────────────────────────────
// Activate: 옛 캐시 삭제 + 즉시 모든 클라이언트 제어
// ──────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ──────────────────────────────────────────────────────────
// Message: 페이지에서 SKIP_WAITING 명령 받으면 즉시 활성화
// ──────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ──────────────────────────────────────────────────────────
// Fetch: data_unified.json은 네트워크 우선, 정적 자산도 네트워크 우선
// ──────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // 데이터는 항상 네트워크 우선
  if (url.pathname.endsWith('data_unified.json') ||
      url.hostname === 'raw.githubusercontent.com') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  
  // 정적 자산도 네트워크 우선 (캐시는 오프라인 fallback)
  // 이렇게 하면 새 index.html이 즉시 반영됨
  event.respondWith(
    fetch(event.request).then((response) => {
      // 성공한 응답은 캐시 업데이트
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        }).catch(() => {});
      }
      return response;
    }).catch(() => {
      // 네트워크 실패 시에만 캐시 사용 (오프라인 대응)
      return caches.match(event.request);
    })
  );
});
