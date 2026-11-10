// cptwin 前端：頁面都是建置時產生的靜態 HTML，這裡只做三件事
// 1. 文章頁捲到留言區時才載入 giscus
// 2. 搜尋頁（/search/）用 data/search-index.json 在瀏覽器裡找
// 3. 舊網址轉址：/?search=… 與 post.html?slug=…

const GISCUS = {
  repo: 'jason5545/cptwin',
  repoId: 'R_kgDORrAA-g',
  category: 'Announcements',
  categoryId: 'DIC_kwDORrAA-s4C4wYx',
};

function prefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function loadGiscus(container) {
  const loading = document.getElementById('giscus-loading');
  const fallback = document.getElementById('giscus-fallback');
  const script = document.createElement('script');
  script.src = 'https://giscus.app/client.js';
  script.async = true;
  script.crossOrigin = 'anonymous';
  const attrs = {
    'data-repo': GISCUS.repo,
    'data-repo-id': GISCUS.repoId,
    'data-category': GISCUS.category,
    'data-category-id': GISCUS.categoryId,
    'data-mapping': 'pathname',
    'data-strict': '0',
    'data-reactions-enabled': '1',
    'data-emit-metadata': '0',
    'data-input-position': 'top',
    'data-theme': prefersDark() ? 'dark' : 'light',
    'data-lang': 'zh-TW',
    'data-loading': 'lazy',
  };
  for (const [key, value] of Object.entries(attrs)) script.setAttribute(key, value);
  script.onload = () => { if (loading) loading.hidden = true; };
  script.onerror = () => {
    if (loading) loading.hidden = true;
    if (fallback) fallback.hidden = false;
  };
  container.appendChild(script);

  // 深色／淺色模式切換時，同步留言區配色
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
      const frame = document.querySelector('iframe.giscus-frame');
      if (!frame) return;
      frame.contentWindow.postMessage(
        { giscus: { setConfig: { theme: event.matches ? 'dark' : 'light' } } },
        'https://giscus.app',
      );
    });
  }
}

function initComments() {
  const container = document.getElementById('giscus-container');
  if (!container) return;
  if (!('IntersectionObserver' in window)) {
    loadGiscus(container);
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      loadGiscus(container);
    }
  }, { rootMargin: '400px 0px' });
  observer.observe(container);
}

let searchIndexPromise = null;
function loadSearchIndex() {
  if (!searchIndexPromise) {
    searchIndexPromise = fetch('/data/search-index.json').then((response) => {
      if (!response.ok) throw new Error(`search index ${response.status}`);
      return response.json();
    });
  }
  return searchIndexPromise;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initSearchPage() {
  const input = document.getElementById('search-q');
  const results = document.getElementById('search-results');
  const status = document.getElementById('search-status');
  if (!input || !results) return;

  const render = (index, query) => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) {
      results.innerHTML = '';
      status.textContent = '';
      return;
    }
    const matches = index.filter((item) => {
      const haystack = `${item.t} ${item.x} ${item.p}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
    status.textContent = matches.length
      ? `找到 ${matches.length} 篇和「${query}」有關的文章`
      : `沒有找到和「${query}」有關的文章，換個說法試試`;
    results.innerHTML = matches.map((item) => `<li>
          <time>${escapeHtml(item.d)}</time>
          <a href="${escapeHtml(item.u)}">${escapeHtml(item.t)}</a>
          <span class="post-row__topic">${escapeHtml(item.p)}</span>
        </li>`).join('');
  };

  const params = new URLSearchParams(window.location.search);
  const initial = (params.get('q') || '').trim();
  input.value = initial;

  loadSearchIndex().then((index) => {
    render(index, initial);
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const query = input.value.trim();
        render(index, query);
        const url = query ? `/search/?q=${encodeURIComponent(query)}` : '/search/';
        window.history.replaceState(null, '', url);
      }, 200);
    });
  }).catch(() => {
    status.textContent = '搜尋暫時無法使用，可以從首頁的主題或年份找文章。';
  });

  if (!initial) input.focus();
}

function handleLegacyUrls() {
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname;

  if ((path === '/' || path === '/index.html') && params.get('search')) {
    window.location.replace(`/search/?q=${encodeURIComponent(params.get('search'))}`);
    return true;
  }

  if (path.endsWith('/post.html')) {
    const slug = params.get('slug');
    loadSearchIndex()
      .then((index) => {
        const hit = slug && index.find((item) => item.s === slug);
        window.location.replace(hit ? hit.u : '/');
      })
      .catch(() => window.location.replace('/'));
    return true;
  }
  return false;
}

if (!handleLegacyUrls()) {
  initComments();
  initSearchPage();
}
