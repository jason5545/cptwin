// 「家長手冊」版面：站頭、頁尾、首頁、主題／階段／年份列表頁、搜尋頁共用的產生邏輯。
// 設計規則見 cptwin/AGENT.md「設計守則」；資料來源：
//   data/posts.json          文章索引（Live Writer 後端也會寫，這裡只讀）
//   data/handbook-tags.json  每篇的主題與階段（缺的用分類對照補）
//   config/handbook.json     主題、階段、首頁精選、雙胞胎出生年
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const SITE_BASE_URL = 'https://cptwin.com';
const SITE_TITLE = '我與我雙胞胎腦麻兒的生活點滴';
const SITE_TAGLINE = '記錄腦性麻痺雙胞胎的復健、就學、輔具與無障礙生活經驗。';
const SITE_DESCRIPTION = '記錄腦性麻痺雙胞胎的復健、就學、輔具與無障礙生活經驗，分享給需要的家長們。';
const TIME_ZONE = 'Asia/Taipei';

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8'));
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function taipeiParts(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

function formatDate(value) {
  const p = taipeiParts(value);
  return p ? `${p.year}/${p.month}/${p.day}` : '';
}

function loadHandbook() {
  const config = readJson('config/handbook.json');
  const categoryMapping = readJson('config/categories.json').categoryMapping;
  const tags = fs.existsSync(path.join(ROOT_DIR, 'data/handbook-tags.json'))
    ? readJson('data/handbook-tags.json')
    : {};
  const rawPosts = readJson('data/posts.json');

  const topicByName = new Map(config.topics.map((t) => [t.name, t]));
  const stageBySlug = new Map(config.stages.map((s) => [s.slug, s]));

  const posts = rawPosts
    .filter((post) => categoryMapping[post.category])
    .map((post) => {
      const tag = tags[post.slug] || {};
      const topicName = topicByName.has(tag.topic)
        ? tag.topic
        : (config.categoryTopicFallback[post.category] || '生活點滴');
      const topic = topicByName.get(topicName);
      const stage = tag.stage && stageBySlug.has(tag.stage) ? stageBySlug.get(tag.stage) : null;
      const date = taipeiParts(post.publishedAt);
      const year = date ? date.year : null;
      const age = year ? year - config.twinsBirthYear : null;
      return {
        ...post,
        url: `/${categoryMapping[post.category]}/${post.slug}/`,
        topic,
        stage,
        year,
        age: age !== null && age >= 0 ? age : null,
        dateText: formatDate(post.publishedAt),
        updatedText: post.updatedAt ? formatDate(post.updatedAt) : '',
        minutes: Number.parseInt(post.readingTime, 10) || null,
      };
    })
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  for (const group of [...config.topics, ...config.stages]) {
    for (const slug of group.picks || []) {
      if (!bySlug.has(slug)) console.warn(`⚠️  config/handbook.json 精選找不到文章：${slug}`);
    }
  }

  return { config, posts, bySlug, topicByName, stageBySlug };
}

function ageText(post) {
  return post.age === null ? '' : `雙胞胎約 ${post.age} 歲`;
}

// ---------- 共用外框 ----------

const NAV_ITEMS = [
  ['home', '首頁', '/'],
  ['stages', '依階段', '/#stages'],
  ['topics', '依主題', '/#topics'],
  ['years', '年份', '/#years'],
  ['about', '關於我', '/about.html'],
  ['search', '搜尋', '/search/'],
];

function renderHeader(current = '', { withTagline = false } = {}) {
  const nav = NAV_ITEMS.map(([key, label, href]) => {
    const attr = key === current ? ' aria-current="page"' : '';
    return `<a href="${href}"${attr}>${label}</a>`;
  }).join('');
  const tagline = withTagline ? `<small>${SITE_TAGLINE}</small>` : '';
  return `<header class="masthead"><div class="wrap">
    <a class="brand" href="/">${SITE_TITLE}${tagline}</a>
    <nav class="nav" aria-label="主要導覽">${nav}</nav>
  </div></header>`;
}

function renderFooter(lastYear) {
  return `<footer class="site-footer"><div class="wrap">
    <p>© 2008–${lastYear} 舜英・<a href="/about.html">關於我</a>・<a href="/feed.json">訂閱（JSON Feed）</a></p>
  </div></footer>`;
}

const ANALYTICS = `<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js');}</script>
  <script>
    window.addEventListener('load',()=>{setTimeout(()=>{const counterscale=document.createElement('script');counterscale.id='counterscale-script';counterscale.defer=true;counterscale.src='https://counterscale.black-hill-f944.workers.dev/tracker.js';counterscale.dataset.siteId='cptwin.com';document.head.appendChild(counterscale);const cloudflare=document.createElement('script');cloudflare.defer=true;cloudflare.src='https://static.cloudflareinsights.com/beacon.min.js';cloudflare.setAttribute('data-cf-beacon','{"token":"a5f4a9c6be0d4b3f836b54e1524e4c67"}');document.head.appendChild(cloudflare);},1500);});
  </script>`;

function buildCloudinaryOgImage(title) {
  const encodedTitle = encodeURIComponent(title || 'Untitled');
  return 'https://res.cloudinary.com/dynj7181i/image/upload/c_fill,w_1200,h_630/' +
    `co_rgb:ffffff,l_text:notosanstc-bold.ttf_60_center:${encodedTitle},w_1000,c_fit/` +
    'fl_layer_apply,g_center/og-background_cbst7j.png';
}

function renderHead({
  title, description = SITE_DESCRIPTION, canonical, ogType = 'website', ogImage, robots = 'index, follow', extra = '',
}) {
  const image = ogImage || buildCloudinaryOgImage(SITE_TITLE);
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  return `<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  <meta name="author" content="舜英">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:site_name" content="cptwin">
  <meta property="og:locale" content="zh_TW">
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:title" content="${safeTitle}">
  <meta property="twitter:description" content="${safeDescription}">
  <meta property="twitter:image" content="${escapeHtml(image)}">
  <meta name="robots" content="${robots}">
  <meta name="theme-color" content="#f6f3ec" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#1b1916" media="(prefers-color-scheme: dark)">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@600;700&display=swap">
  <link rel="stylesheet" href="/assets/styles.min.css">
${extra}`;
}

function renderPage({ head, bodyClass, current, withTagline = false, main, lastYear, scripts = '' }) {
  return `<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
  ${head}
</head>
<body class="${bodyClass}">
  ${renderHeader(current, { withTagline })}
  <main class="wrap">
${main}
  </main>
  ${renderFooter(lastYear)}
  <script src="/assets/handbook.min.js" type="module" defer></script>
${scripts}
  ${ANALYTICS}
</body>
</html>
`;
}

// ---------- 首頁 ----------

function listItems(slugs, data) {
  return slugs
    .map((slug) => data.bySlug.get(slug))
    .filter(Boolean)
    .map((post) => `<li><a href="${post.url}">${escapeHtml(post.title)}</a></li>`)
    .join('');
}

function picksFor(group, matches, data, count = 3) {
  const picked = (group.picks || []).filter((slug) => data.bySlug.has(slug));
  if (picked.length) return picked;
  return data.posts.filter(matches).slice(0, count).map((p) => p.slug);
}

function yearCounts(posts) {
  const counts = new Map();
  for (const post of posts) {
    if (!post.year) continue;
    counts.set(post.year, (counts.get(post.year) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0] - b[0]);
}

function buildHomeMain(data) {
  const { config, posts } = data;
  const firstYear = Math.min(...posts.map((p) => p.year).filter(Boolean));

  const stages = config.stages.map((stage) => {
    const members = posts.filter((p) => p.stage === stage);
    return `<div class="stage">
          <div class="stage__step">${stage.step}</div>
          <h3><a href="/stages/${stage.slug}/">${escapeHtml(stage.name)}</a></h3>
          <p class="stage__note">${escapeHtml(stage.note)}</p>
          <ul class="link-list">${listItems(picksFor(stage, (p) => p.stage === stage, data), data)}</ul>
          <a class="more" href="/stages/${stage.slug}/">這個階段的 ${members.length} 篇 →</a>
        </div>`;
  }).join('\n        ');

  const topics = config.topics.map((topic) => {
    const members = posts.filter((p) => p.topic === topic);
    const isSchool = !(topic.picks || []).length && config.stages.length;
    const list = isSchool ? '' : `<ul class="link-list">${listItems(picksFor(topic, (p) => p.topic === topic, data), data)}</ul>`;
    const more = isSchool
      ? `<a class="more" href="/topics/${topic.slug}/">全部 ${members.length} 篇 →</a><a class="more more--quiet" href="#stages">依階段整理在上面 ↑</a>`
      : `<a class="more" href="/topics/${topic.slug}/">全部 ${members.length} 篇 →</a>`;
    return `<div class="topic">
          <h3><a href="/topics/${topic.slug}/">${escapeHtml(topic.name)}</a></h3>
          <p class="topic__note">${escapeHtml(topic.note)}</p>
          ${list}
          ${more}
        </div>`;
  }).join('\n        ');

  const recent = posts.slice(0, 5).map((post) => `<li>
          <time datetime="${escapeHtml(post.publishedAt)}">${post.dateText}</time>
          <a href="${post.url}">${escapeHtml(post.title)}</a>
          <span class="post-row__topic">${escapeHtml(post.topic.name)}</span>
        </li>`).join('\n        ');

  const years = yearCounts(posts).map(([year, count]) => {
    const age = year - config.twinsBirthYear;
    return `<a href="/years/${year}/"><span class="years__year">${year}</span><small>${count} 篇</small><small>孩子 ${age} 歲</small></a>`;
  }).join('');

  return `    <section class="opening">
      <blockquote>${escapeHtml(config.openingQuote)}<cite>${escapeHtml(config.openingQuoteBy)}</cite></blockquote>
      <div class="opening__side">
        <p>${escapeHtml(config.openingNote)}</p>
        <p class="opening__facts">${posts.length} 篇，從 ${firstYear} 年寫到現在。</p>
        <a class="more" href="/about.html">關於我們這一家 →</a>
      </div>
    </section>

    <section class="section" id="stages">
      <h2>依孩子的階段<span>照孩子現在走到哪裡找</span></h2>
      <div class="stages">
        ${stages}
      </div>
    </section>

    <section class="section" id="topics">
      <h2>依主題<span>分類說明取自「關於我」</span></h2>
      <div class="topics">
        ${topics}
      </div>
    </section>

    <section class="section" id="recent">
      <h2>最近寫的</h2>
      <ul class="post-rows">
        ${recent}
      </ul>
    </section>

    <section class="section" id="years">
      <h2>按年份翻<span>每一年寫了幾篇，那年孩子幾歲</span></h2>
      <div class="years">${years}</div>
    </section>`;
}

const WP_LEGACY_REDIRECT = `<script>
  // WordPress ?p=ID 舊連結重定向
  (function(){
    var m = location.search.match(/[?&]p=(\\d+)/);
    if (!m) return;
    var id = m[1];
    fetch('/data/wp-post-ids.json').then(function(r){return r.json()}).then(function(map){
      if (map[id]) location.replace(map[id]);
    });
  })();
  </script>`;

function buildHomePage(data) {
  const lastYear = data.posts[0]?.year || new Date().getFullYear();
  const head = renderHead({
    title: SITE_TITLE,
    canonical: `${SITE_BASE_URL}/`,
    extra: `  ${WP_LEGACY_REDIRECT}
  <meta name="keywords" content="腦性麻痺, 復健, 輔具, 無障礙, 特殊教育, 腦麻雙胞胎">
  <!-- Open Live Writer 探索：RSD 端點與編輯佈景主題 manifest（由 connector 提供） -->
  <link rel="EditURI" type="application/rsd+xml" title="RSD" href="https://cptwin-connector.black-hill-f944.workers.dev/rsd.xml">
  <link rel="wlwmanifest" type="application/wlwmanifest+xml" href="/wlwmanifest.xml">
  <link rel="alternate" type="application/feed+json" title="${SITE_TITLE}" href="/feed.json">`,
  });
  return renderPage({ head, bodyClass: 'page-home', current: 'home', withTagline: true, main: buildHomeMain(data), lastYear });
}

// ---------- 列表頁 ----------

// label：每列右邊顯示什麼。主題頁顯示階段（沒有就留空），其他列表頁顯示主題
function groupedRows(posts, { label = 'topic', groupByYear = true, config }) {
  const labelFor = (post) => (label === 'stage' ? (post.stage ? post.stage.name : '') : post.topic.name);
  const row = (post) => `<li>
          <time datetime="${escapeHtml(post.publishedAt)}">${post.dateText}</time>
          <a href="${post.url}">${escapeHtml(post.title)}</a>
          <span class="post-row__topic">${escapeHtml(labelFor(post))}</span>
        </li>`;
  if (!groupByYear) return `<ul class="post-rows">${posts.map(row).join('')}</ul>`;
  const groups = new Map();
  for (const post of posts) {
    if (!groups.has(post.year)) groups.set(post.year, []);
    groups.get(post.year).push(post);
  }
  return [...groups.entries()].map(([year, items]) => `<section class="year-group">
        <h2>${year}<span>孩子 ${year - config.twinsBirthYear} 歲・${items.length} 篇</span></h2>
        <ul class="post-rows">${items.map(row).join('')}</ul>
      </section>`).join('\n      ');
}

function buildListPage(data, { title, kicker, note, posts, canonicalPath, current, label = 'topic', groupByYear = true }) {
  const lastYear = data.posts[0]?.year || new Date().getFullYear();
  const head = renderHead({
    title: `${title} - ${SITE_TITLE}`,
    description: note || SITE_DESCRIPTION,
    canonical: `${SITE_BASE_URL}${canonicalPath}`,
  });
  const main = `    <header class="list-head">
      <div class="crumb"><a href="/">首頁</a> › ${escapeHtml(kicker)}</div>
      <h1>${escapeHtml(title)}</h1>
      ${note ? `<p class="list-head__note">${escapeHtml(note)}</p>` : ''}
      <p class="list-head__count">${posts.length} 篇，新到舊</p>
    </header>
    <div class="list-body">
      ${groupedRows(posts, { label, groupByYear, config: data.config })}
    </div>`;
  return renderPage({ head, bodyClass: 'page-list', current, main, lastYear });
}

function buildSearchPage(data) {
  const lastYear = data.posts[0]?.year || new Date().getFullYear();
  const head = renderHead({
    title: `搜尋 - ${SITE_TITLE}`,
    canonical: `${SITE_BASE_URL}/search/`,
    robots: 'noindex, follow',
  });
  const main = `    <header class="list-head">
      <div class="crumb"><a href="/">首頁</a> › 搜尋</div>
      <h1>搜尋</h1>
      <form class="search-form" role="search" action="/search/" method="get">
        <label for="search-q" class="visually-hidden">搜尋文章</label>
        <input id="search-q" name="q" type="search" placeholder="輸入關鍵字，例如：站立架、復康巴士、甄試" autocomplete="off">
        <button type="submit">搜尋</button>
      </form>
      <p class="list-head__count" id="search-status" aria-live="polite"></p>
    </header>
    <div class="list-body"><ul class="post-rows" id="search-results"></ul></div>
    <noscript><p>搜尋需要開啟 JavaScript。也可以從<a href="/#topics">主題</a>或<a href="/#years">年份</a>找文章。</p></noscript>`;
  return renderPage({ head, bodyClass: 'page-list page-search', current: 'search', main, lastYear });
}

function buildSearchIndex(data) {
  return data.posts.map((post) => ({
    s: post.slug,
    t: post.title,
    u: post.url,
    d: post.dateText,
    p: post.topic.name,
    x: [post.summary || '', ...(post.tags || [])].join(' ').slice(0, 400),
  }));
}

function writeFileIfChanged(relativePath, content) {
  const target = path.join(ROOT_DIR, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === content) return false;
  fs.writeFileSync(target, content, 'utf8');
  return true;
}

// 首頁、列表頁、搜尋頁與搜尋索引。回傳寫出的路徑，方便清掉不再需要的列表頁。
function writeHandbookPages(data) {
  const written = [];
  const write = (rel, content) => { writeFileIfChanged(rel, content); written.push(rel); };

  write('index.html', buildHomePage(data));

  for (const topic of data.config.topics) {
    write(`topics/${topic.slug}/index.html`, buildListPage(data, {
      title: topic.name, kicker: '依主題', note: topic.note,
      posts: data.posts.filter((p) => p.topic === topic),
      canonicalPath: `/topics/${topic.slug}/`, current: 'topics', label: 'stage',
    }));
  }

  for (const stage of data.config.stages) {
    write(`stages/${stage.slug}/index.html`, buildListPage(data, {
      title: stage.name, kicker: `依階段・${stage.step}`, note: stage.note,
      posts: data.posts.filter((p) => p.stage === stage),
      canonicalPath: `/stages/${stage.slug}/`, current: 'stages', label: 'topic',
    }));
  }

  for (const [year] of yearCounts(data.posts)) {
    write(`years/${year}/index.html`, buildListPage(data, {
      title: `${year} 年`, kicker: '年份',
      note: `這一年雙胞胎 ${year - data.config.twinsBirthYear} 歲。`,
      posts: data.posts.filter((p) => p.year === year),
      canonicalPath: `/years/${year}/`, current: 'years', label: 'topic', groupByYear: false,
    }));
  }

  write('search/index.html', buildSearchPage(data));
  write('data/search-index.json', `${JSON.stringify(buildSearchIndex(data))}\n`);

  // 年份、主題被改名或移除時，清掉舊的列表頁
  for (const dir of ['topics', 'stages', 'years']) {
    const base = path.join(ROOT_DIR, dir);
    if (!fs.existsSync(base)) continue;
    for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}/index.html`;
      if (entry.isDirectory() && !written.includes(rel) && fs.existsSync(path.join(ROOT_DIR, rel))) {
        fs.rmSync(path.join(base, entry.name), { recursive: true });
        console.log(`🧹 已移除不再使用的列表頁：${rel}`);
      }
    }
  }
  return written;
}

// about.html、404.html 這類手寫頁面：只同步站頭、頁尾兩段
const STATIC_MARKERS = [
  ['<!-- SITE_HEADER_START -->', '<!-- SITE_HEADER_END -->', (data, current) => renderHeader(current)],
  ['<!-- SITE_FOOTER_START -->', '<!-- SITE_FOOTER_END -->', (data) => renderFooter(data.posts[0]?.year || new Date().getFullYear())],
];

function syncStaticPage(data, relativePath, current) {
  const target = path.join(ROOT_DIR, relativePath);
  let html = fs.readFileSync(target, 'utf8');
  for (const [start, end, render] of STATIC_MARKERS) {
    const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
    if (!pattern.test(html)) throw new Error(`${relativePath} 找不到 ${start}`);
    html = html.replace(pattern, `${start}\n  ${render(data, current)}\n  ${end}`);
  }
  return writeFileIfChanged(relativePath, html);
}

module.exports = {
  ROOT_DIR,
  SITE_BASE_URL,
  SITE_TITLE,
  escapeHtml,
  formatDate,
  loadHandbook,
  ageText,
  renderHead,
  renderPage,
  buildCloudinaryOgImage,
  writeHandbookPages,
  syncStaticPage,
};
