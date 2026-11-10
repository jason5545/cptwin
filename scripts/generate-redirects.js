const fs = require('fs');
const path = require('path');
const marked = require('../assets/marked.min.js');
const {
  SITE_BASE_URL,
  loadHandbook,
  ageText,
  renderHead,
  renderPage,
  buildCloudinaryOgImage,
  writeHandbookPages,
  syncStaticPage,
} = require('./lib/handbook');

const ROOT_DIR = path.join(__dirname, '..');
const POSTS_PATH = path.join(ROOT_DIR, 'data/posts.json');
const POSTS_DIR = path.join(ROOT_DIR, 'content/posts');
const HERO_IMAGE_WIDTHS = [480, 828, 1200];
const ARTICLE_COVER_SIZES = '(min-width: 1100px) 780px, 100vw';

// 從集中式設定檔載入分類映射
const categoriesConfigPath = path.join(ROOT_DIR, 'config/categories.json');
const categoriesConfig = JSON.parse(fs.readFileSync(categoriesConfigPath, 'utf8'));
const categoryMapping = categoriesConfig.categoryMapping;
const knownCategorySlugs = new Set(Object.values(categoryMapping));

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function stripTrailingWhitespace(html) {
  return html
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function decodeImagePathSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function imageUrlToPath(imageUrl) {
  if (!imageUrl || /^https?:\/\//i.test(imageUrl)) return null;
  return path.join(ROOT_DIR, decodeImagePathSegment(imageUrl.replace(/^\//, '')));
}

// 只讀 WebP 檔頭取寬度，不必為了 srcset 把整個產生流程改成非同步
function readWebpWidth(filePath) {
  try {
    const buf = Buffer.alloc(30);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buf, 0, 30, 0);
    } finally {
      fs.closeSync(fd);
    }
    if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') return buf.readUInt16LE(26) & 0x3fff;
    if (chunk === 'VP8L') return 1 + (((buf[22] & 0x3f) << 8) | buf[21]);
    if (chunk === 'VP8X') return 1 + buf.readUIntLE(24, 3);
  } catch {
    return null;
  }
  return null;
}

function buildResponsiveImageSrcset(imageUrl) {
  const imagePath = imageUrlToPath(imageUrl);
  if (!imagePath) return '';

  const parsed = path.parse(imagePath);
  const entries = HERO_IMAGE_WIDTHS
    .map((width) => {
      const variantPath = path.join(parsed.dir, `${parsed.name}-${width}w.webp`);
      if (!fs.existsSync(variantPath)) return null;
      const variantUrl = imageUrl.replace(/\.[^/.]+$/, `-${width}w.webp`);
      return { url: variantUrl, width };
    })
    .filter(Boolean);

  // 原圖比最大變體還小時（例如 576 寬），不會有 828w／1200w 變體；
  // 不把原圖列進來，瀏覽器在大螢幕上也只會拿到 480w。
  const largestVariant = entries.length ? entries[entries.length - 1].width : 0;
  const maxHeroWidth = HERO_IMAGE_WIDTHS[HERO_IMAGE_WIDTHS.length - 1];
  if (largestVariant && largestVariant < maxHeroWidth && /\.webp$/i.test(imagePath)) {
    const sourceWidth = readWebpWidth(imagePath);
    if (sourceWidth && sourceWidth > largestVariant) {
      entries.push({ url: imageUrl, width: sourceWidth });
    }
  }

  return entries.map(({ url, width }) => `${url} ${width}w`).join(', ');
}

function buildCoverImageAttributes(coverImage) {
  const safeCoverImage = escapeHtml(coverImage);
  const srcset = buildResponsiveImageSrcset(coverImage);
  const srcsetAttr = srcset ? ` srcset="${escapeHtml(srcset)}" sizes="${escapeHtml(ARTICLE_COVER_SIZES)}"` : '';
  return `src="${safeCoverImage}"${srcsetAttr} alt="" fetchpriority="high" decoding="async"`;
}

function buildCoverPreload(coverImage) {
  if (!coverImage) return '';
  const srcset = buildResponsiveImageSrcset(coverImage);
  const responsiveAttrs = srcset
    ? ` imagesrcset="${escapeHtml(srcset)}" imagesizes="${escapeHtml(ARTICLE_COVER_SIZES)}"`
    : '';
  return `  <link rel="preload" as="image" href="${escapeHtml(coverImage)}"${responsiveAttrs} fetchpriority="high">\n`;
}

function buildArticleTagMetaBlock(tags = []) {
  if (!Array.isArray(tags) || !tags.length) return '';
  return tags
    .filter(Boolean)
    .map((tag) => `  <meta property="article:tag" content="${escapeHtml(tag)}">`)
    .join('\n');
}

function buildAudioPlayerHTML(audioFile) {
  const safeAudioFile = escapeHtml(audioFile);
  return `<figure class="audio-note"><audio controls preload="metadata" src="/content/audio/${safeAudioFile}"></audio></figure>`;
}

function stripMarkdownTitle(markdown) {
  const lines = markdown.split('\n');
  if (lines[0]?.trim().startsWith('#')) {
    lines.shift();
    while (lines.length > 0 && lines[0].trim() === '') {
      lines.shift();
    }
  }
  return lines.join('\n');
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Live Writer 會在內文放 _thumb 縮圖並連到原圖；原圖存在時直接顯示原圖
function preferOriginalImage(src) {
  const match = /^(\/content\/img\/.+)_thumb(\.webp)$/i.exec(src);
  if (!match) return src;
  const original = `${match[1]}${match[2]}`;
  const originalPath = imageUrlToPath(original);
  return originalPath && fs.existsSync(originalPath) ? original : src;
}

function renderArticleBody(post) {
  const markdownPath = path.join(POSTS_DIR, `${post.slug}.md`);
  if (!fs.existsSync(markdownPath)) {
    throw new Error(`找不到 Markdown 檔案：content/posts/${post.slug}.md`);
  }

  let markdown = stripMarkdownTitle(fs.readFileSync(markdownPath, 'utf8'));
  markdown = markdown.replace(/<!--\s*audio:\s*(.+?)\s*-->/g, (_, audioFile) => buildAudioPlayerHTML(audioFile.trim()));

  let html = marked
    .parse(markdown)
    .replace(/\b(src|srcset)="content\//g, '$1="/content/');

  html = html.replace(/<img\b([^>]*)>/g, (tag, attrs) => {
    let next = attrs.replace(/\bsrc="([^"]+)"/, (_, src) => `src="${preferOriginalImage(src)}"`);
    if (!/\bloading=/.test(next)) next += ' loading="lazy"';
    if (!/\bdecoding=/.test(next)) next += ' decoding="async"';
    return `<img${next}>`;
  });

  const toc = [];
  html = html.replace(/<h([2-5])([^>]*)>([\s\S]*?)<\/h\1>/g, (tag, level, attrs, inner) => {
    const text = stripTags(inner);
    if (!text) return tag;
    let id = (/\bid="([^"]+)"/.exec(attrs) || [])[1];
    if (!id) {
      id = `sec-${toc.length + 1}`;
      attrs = `${attrs} id="${id}"`;
    }
    toc.push({ id, text });
    return `<h${level}${attrs}>${inner}</h${level}>`;
  });

  return { html, toc };
}

function buildStructuredData(post, fullUrl, imageUrl) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title || post.slug || 'Untitled',
    description: post.summary || '',
    author: { '@type': 'Person', name: post.author || '舜英' },
    publisher: { '@type': 'Person', name: '舜英' },
    datePublished: post.publishedAt || '',
    dateModified: post.updatedAt || post.publishedAt || '',
    mainEntityOfPage: { '@type': 'WebPage', '@id': fullUrl },
    url: fullUrl,
    inLanguage: 'zh-Hant-TW',
  };
  if (imageUrl) schema.image = [imageUrl];
  if (Array.isArray(post.tags) && post.tags.length) schema.keywords = post.tags.join(', ');
  if (post.topic) schema.articleSection = post.topic.name;
  return `  <script type="application/ld+json">${escapeJsonForScript(schema)}</script>\n`;
}

function removeEmptyDirsUpward(startDir, stopDir) {
  let current = startDir;
  while (current.startsWith(stopDir) && current !== stopDir) {
    if (!fs.existsSync(current)) break;

    const entries = fs.readdirSync(current);
    if (entries.length > 0) break;

    fs.rmdirSync(current);
    current = path.dirname(current);
  }
}

function isRedirectPage(html) {
  if (!html) return false;
  return (
    html.includes('meta http-equiv="refresh"') ||
    html.includes('window.location.replace(') ||
    html.includes('meta name="robots" content="noindex"')
  );
}

function listGeneratedIndexFiles() {
  const files = [];

  for (const categorySlug of knownCategorySlugs) {
    const categoryDir = path.join(ROOT_DIR, categorySlug);
    if (!fs.existsSync(categoryDir)) continue;

    const entries = fs.readdirSync(categoryDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const indexPath = path.join(categoryDir, entry.name, 'index.html');
      if (!fs.existsSync(indexPath)) continue;

      files.push({
        categorySlug,
        slug: entry.name,
        indexPath,
      });
    }
  }

  return files;
}

function relatedInTopic(post, data, count = 5) {
  const time = new Date(post.publishedAt).getTime();
  return data.posts
    .filter((other) => other !== post && other.topic === post.topic)
    .sort((a, b) => Math.abs(new Date(a.publishedAt) - time) - Math.abs(new Date(b.publishedAt) - time))
    .slice(0, count)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

// 文章頁：標題先、封面後；右欄是這篇的資料卡與段落目錄
function generatePostHTML(rawPost, data) {
  const post = data.bySlug.get(rawPost.slug);
  const fullUrl = `${SITE_BASE_URL}${post.url}`;
  const title = post.title || post.slug || 'Untitled';
  const safeTitle = escapeHtml(title);
  const { html: bodyHtml, toc } = renderArticleBody(post);

  const ogImageUrl = post.coverImage
    ? `${SITE_BASE_URL}/${post.coverImage.replace(/^\//, '')}`
    : buildCloudinaryOgImage(title);

  const extra = [
    `  <meta property="article:published_time" content="${escapeHtml(post.publishedAt || '')}">`,
    `  <meta property="article:modified_time" content="${escapeHtml(post.updatedAt || post.publishedAt || '')}">`,
    `  <meta property="article:section" content="${escapeHtml(post.topic.name)}">`,
    buildArticleTagMetaBlock(post.tags),
    Array.isArray(post.tags) && post.tags.length ? `  <meta name="keywords" content="${escapeHtml(post.tags.join(', '))}">` : '',
    buildCoverPreload(post.coverImage).trimEnd(),
    buildStructuredData(post, fullUrl, ogImageUrl).trimEnd(),
  ].filter(Boolean).join('\n');

  const head = renderHead({
    title: `${title} - cptwin`,
    description: post.summary || '',
    canonical: fullUrl,
    ogType: 'article',
    ogImage: ogImageUrl,
    extra,
  });

  const author = escapeHtml(post.author || '舜英');
  const updated = post.updatedText && post.updatedText !== post.dateText ? `（${post.updatedText} 更新）` : '';
  const minutes = post.minutes ? `・約 ${post.minutes} 分鐘讀完` : '';
  const topicLink = `<a href="/topics/${post.topic.slug}/">${escapeHtml(post.topic.name)}</a>`;
  const stageLink = post.stage ? `<a href="/stages/${post.stage.slug}/">${escapeHtml(post.stage.name)}</a>` : '';
  const age = ageText(post);

  const cover = post.coverImage
    ? `<figure class="cover"><img ${buildCoverImageAttributes(post.coverImage)}></figure>`
    : '';

  const mobileMeta = [`這篇在「${topicLink}」`, age ? `寫這篇時，${age}` : ''].filter(Boolean).join('・');

  const related = relatedInTopic(post, data);
  const relatedBlock = related.length
    ? `<section class="related">
          <h2>${escapeHtml(post.topic.name)}的其他文章</h2>
          <ul class="link-list">${related.map((r) => `<li><a href="${r.url}">${escapeHtml(r.title)}</a><time datetime="${escapeHtml(r.publishedAt)}">${r.dateText}</time></li>`).join('')}</ul>
          <a class="more" href="/topics/${post.topic.slug}/">${escapeHtml(post.topic.name)}全部文章 →</a>
        </section>`
    : '';

  const index = data.posts.indexOf(post);
  const older = data.posts[index + 1];
  const newer = data.posts[index - 1];
  const prevNext = (older || newer)
    ? `<nav class="prev-next" aria-label="前後文章">
          ${older ? `<a class="prev-next__older" href="${older.url}"><small>上一篇（較早）</small>${escapeHtml(older.title)}</a>` : '<span></span>'}
          ${newer ? `<a class="prev-next__newer" href="${newer.url}"><small>下一篇（較新）</small>${escapeHtml(newer.title)}</a>` : '<span></span>'}
        </nav>`
    : '';

  const tocBlock = toc.length >= 2
    ? `<h2 class="margin__title">這篇的段落</h2>
        <ol class="toc">${toc.map((item) => `<li><a href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a></li>`).join('')}</ol>`
    : '';

  const main = `    <div class="post">
      <article class="article">
        <div class="crumb"><a href="/">首頁</a> › ${topicLink}</div>
        <h1>${safeTitle}</h1>
        <p class="byline">${author}・${post.dateText}${updated}${minutes}</p>
        <p class="mobile-meta">${mobileMeta}</p>
        ${cover}
        <div class="body" id="post-content">${bodyHtml}</div>
        ${relatedBlock}
        ${prevNext}
        <section class="comments" id="comments">
          <h2>留言</h2>
          <div id="giscus-container" class="giscus-container">
            <p class="giscus-status" id="giscus-loading">留言載入中…</p>
            <p class="giscus-status" id="giscus-fallback" hidden>無法載入留言系統。可以到 <a href="https://github.com/jason5545/cptwin/discussions" target="_blank" rel="noopener noreferrer">GitHub Discussions</a> 留言。</p>
          </div>
        </section>
      </article>
      <aside class="margin" aria-label="這篇的資料">
        <dl class="factsheet">
          <dt>主題</dt><dd>${topicLink}</dd>
          ${stageLink ? `<dt>階段</dt><dd>${stageLink}</dd>` : ''}
          ${age ? `<dt>寫這篇時</dt><dd>${age}</dd>` : ''}
          <dt>寫於${updated ? '／更新' : ''}</dt><dd>${post.dateText}${updated ? `／${post.updatedText}` : ''}</dd>
        </dl>
        ${tocBlock}
      </aside>
    </div>`;

  const html = renderPage({
    head,
    bodyClass: 'page-article',
    current: '',
    main,
    lastYear: data.posts[0]?.year || new Date().getFullYear(),
  });
  return stripTrailingWhitespace(html);
}

// 生成重定向頁面 HTML
function generateRedirectHTML(newCategorySlug, slug) {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=/${newCategorySlug}/${slug}/">
    <meta name="robots" content="noindex">
    <link rel="canonical" href="https://cptwin.com/${newCategorySlug}/${slug}/">
    <title>重定向中...</title>
    <script>
        window.location.replace('/${newCategorySlug}/${slug}/');
    </script>
</head>
<body>
    <p>頁面已移動至 <a href="/${newCategorySlug}/${slug}/">新位置</a>...</p>
</body>
</html>`;
}

function buildCurrentRouteMap(posts) {
  const slugToCurrentCategory = new Map();
  let skippedCount = 0;

  for (const post of posts) {
    const { slug, title, category } = post;
    const categorySlug = categoryMapping[category];

    if (!categorySlug) {
      console.warn(`⚠️  警告：未知的分類 "${category}"，跳過文章 "${title}"`);
      skippedCount++;
      continue;
    }

    if (slugToCurrentCategory.has(slug)) {
      throw new Error(`重複的 slug：${slug}`);
    }

    slugToCurrentCategory.set(slug, categorySlug);
  }

  return {
    skippedCount,
    slugToCurrentCategory,
  };
}

function writeCurrentPostPages(posts, data) {
  let createdCount = 0;
  let redirectCount = 0;

  for (const post of posts) {
    const { slug, title, category } = post;
    const categorySlug = categoryMapping[category];

    if (!categorySlug) continue;

    const categoryDir = path.join(ROOT_DIR, categorySlug);
    ensureDir(categoryDir);

    const postDir = path.join(categoryDir, slug);
    ensureDir(postDir);

    const indexPath = path.join(postDir, 'index.html');
    const html = generatePostHTML(post, data);
    fs.writeFileSync(indexPath, html, 'utf8');

    console.log(`✅ 已建立：${categorySlug}/${slug}/index.html`);
    createdCount++;

    if (post.previousCategory) {
      const previousCategorySlug = categoryMapping[post.previousCategory];
      if (previousCategorySlug && previousCategorySlug !== categorySlug) {
        const oldPostDir = path.join(ROOT_DIR, previousCategorySlug, slug);
        ensureDir(oldPostDir);

        const redirectPath = path.join(oldPostDir, 'index.html');
        const redirectHTML = generateRedirectHTML(categorySlug, slug);
        fs.writeFileSync(redirectPath, redirectHTML, 'utf8');

        console.log(`🔀 已建立重定向：${previousCategorySlug}/${slug}/ → ${categorySlug}/${slug}/`);
        redirectCount++;
      }
    }
  }

  return {
    createdCount,
    redirectCount,
  };
}

function reconcileGeneratedRoutes(slugToCurrentCategory) {
  let orphanRemovedCount = 0;
  let staleConvertedCount = 0;
  const existingIndexFiles = listGeneratedIndexFiles();

  for (const fileInfo of existingIndexFiles) {
    const { categorySlug, slug, indexPath } = fileInfo;
    const currentCategorySlug = slugToCurrentCategory.get(slug);

    // 不在 posts.json 的孤兒頁面
    if (!currentCategorySlug) {
      fs.unlinkSync(indexPath);
      removeEmptyDirsUpward(path.dirname(indexPath), ROOT_DIR);
      console.log(`🧹 已刪除孤兒頁面：${categorySlug}/${slug}/index.html`);
      orphanRemovedCount++;
      continue;
    }

    // 分類已變更：覆蓋成重定向
    if (categorySlug !== currentCategorySlug) {
      const existingHtml = fs.readFileSync(indexPath, 'utf8');
      const targetPath = `/${currentCategorySlug}/${slug}/`;
      const alreadyCorrectRedirect = isRedirectPage(existingHtml) && existingHtml.includes(targetPath);

      if (!alreadyCorrectRedirect) {
        const redirectHTML = generateRedirectHTML(currentCategorySlug, slug);
        fs.writeFileSync(indexPath, redirectHTML, 'utf8');
        console.log(`♻️  已修正分類殘留頁：${categorySlug}/${slug}/ → ${currentCategorySlug}/${slug}/`);
        staleConvertedCount++;
      }
    }
  }

  return {
    orphanRemovedCount,
    staleConvertedCount,
  };
}

function printSyncSummary({
  createdCount,
  redirectCount,
  skippedCount,
  orphanRemovedCount,
  staleConvertedCount,
}) {
  console.log(`\n完成！共建立 ${createdCount} 個文章頁面`);
  if (redirectCount > 0) {
    console.log(`🔀 額外建立 ${redirectCount} 個顯式重定向頁面`);
  }
  if (staleConvertedCount > 0) {
    console.log(`♻️  自動修正 ${staleConvertedCount} 個舊分類殘留頁面`);
  }
  if (orphanRemovedCount > 0) {
    console.log(`🧹 清理 ${orphanRemovedCount} 個孤兒頁面`);
  }
  if (skippedCount > 0) {
    console.log(`⚠️  跳過 ${skippedCount} 個文章`);
  }
}

function syncGeneratedContent() {
  console.log('開始同步內容產物與 WordPress 風格文章頁面...\n');

  const posts = JSON.parse(fs.readFileSync(POSTS_PATH, 'utf8'));
  const data = loadHandbook();
  const handbookPages = writeHandbookPages(data);
  console.log(`🏠 已同步首頁、列表頁與搜尋索引（${handbookPages.length} 個檔案）`);
  for (const [page, current] of [['about.html', 'about']]) {
    if (syncStaticPage(data, page, current)) console.log(`🔄 已同步 ${page} 的站頭與頁尾`);
  }
  const routeState = buildCurrentRouteMap(posts);
  const writeSummary = writeCurrentPostPages(posts, data);
  const reconcileSummary = reconcileGeneratedRoutes(routeState.slugToCurrentCategory);

  printSyncSummary({
    ...routeState,
    ...writeSummary,
    ...reconcileSummary,
  });
}

// 執行腳本
try {
  syncGeneratedContent();
} catch (error) {
  console.error('❌ 錯誤：', error.message);
  process.exit(1);
}
