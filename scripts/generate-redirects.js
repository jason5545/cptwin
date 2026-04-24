const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const POSTS_PATH = path.join(ROOT_DIR, 'data/posts.json');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'post.html');
const HOMEPAGE_PATH = path.join(ROOT_DIR, 'index.html');
const SITE_BASE_URL = 'https://cptwin.com';
const CLOUDINARY_OG_IMAGE_CONFIG = {
  cloudName: 'dynj7181i',
  backgroundId: 'og-background_cbst7j',
  fontId: 'notosanstc-bold.ttf'
};
const ARTICLE_TAGS_START = '<!-- ARTICLE_TAGS_START -->';
const ARTICLE_TAGS_END = '<!-- ARTICLE_TAGS_END -->';

// 從集中式設定檔載入分類映射
const categoriesConfigPath = path.join(ROOT_DIR, 'config/categories.json');
const categoriesConfig = JSON.parse(fs.readFileSync(categoriesConfigPath, 'utf8'));
const categoryMapping = categoriesConfig.categoryMapping;
const knownCategorySlugs = new Set(Object.values(categoryMapping));

const postTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf8');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildHeroPreload(coverImage) {
  if (!coverImage) return '';

  return `  <link rel="preload" as="image" href="${coverImage}" fetchpriority="high">\n`;
}

function buildHeroMarkup(post) {
  if (!post.coverImage) {
    return '<div id="post-hero" class="article-hero"></div>';
  }

  const safeCoverImage = escapeHtml(post.coverImage);
  return `<div id="post-hero" class="article-hero article-hero--image"><img class="article-hero__image" src="${safeCoverImage}" alt="" aria-hidden="true" fetchpriority="high" decoding="async"></div>`;
}

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceMarkedBlock(html, startMarker, endMarker, replacement = '') {
  const pattern = new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`);
  if (!pattern.test(html)) {
    throw new Error(`找不到 marker：${startMarker}`);
  }

  const block = replacement ? `${startMarker}\n${replacement}\n${endMarker}` : `${startMarker}\n${endMarker}`;
  return html.replace(pattern, block);
}

function extractMetaPropertyContent(html, property) {
  const pattern = new RegExp(`<meta\\s+property="${escapeRegExp(property)}"\\s+content="([^"]*)"`);
  const match = html.match(pattern);
  if (!match) {
    throw new Error(`找不到 meta property：${property}`);
  }

  return match[1];
}

function replaceMetaPropertyContent(html, property, content) {
  const pattern = new RegExp(`(<meta\\s+property="${escapeRegExp(property)}"\\s+content=")[^"]*(")`);
  if (!pattern.test(html)) {
    throw new Error(`找不到 meta property：${property}`);
  }

  return html.replace(pattern, (_, prefix, suffix) => `${prefix}${escapeHtml(content)}${suffix}`);
}

function buildCloudinaryOgImage(title) {
  const encodedTitle = encodeURIComponent(title || 'Untitled');
  return (
    `https://res.cloudinary.com/${CLOUDINARY_OG_IMAGE_CONFIG.cloudName}/image/upload/` +
    'c_fill,w_1200,h_630/' +
    'co_rgb:ffffff,' +
    `l_text:${CLOUDINARY_OG_IMAGE_CONFIG.fontId}_60_center:${encodedTitle},w_1000,c_fit/` +
    'fl_layer_apply,g_center/' +
    `${CLOUDINARY_OG_IMAGE_CONFIG.backgroundId}.png`
  );
}

function buildArticleTagMetaBlock(tags = []) {
  if (!Array.isArray(tags) || !tags.length) {
    return '';
  }

  return tags
    .filter(Boolean)
    .map((tag) => `  <meta property="article:tag" content="${escapeHtml(tag)}">`)
    .join('\n');
}

function syncHomepageMetadata() {
  const homepageTemplate = fs.readFileSync(HOMEPAGE_PATH, 'utf8');
  const homepageOgTitle = extractMetaPropertyContent(homepageTemplate, 'og:title');
  const homepageOgImage = buildCloudinaryOgImage(homepageOgTitle);

  let updatedHomepage = replaceMetaPropertyContent(homepageTemplate, 'og:image', homepageOgImage);
  updatedHomepage = replaceMetaPropertyContent(updatedHomepage, 'twitter:image', homepageOgImage);

  if (updatedHomepage !== homepageTemplate) {
    fs.writeFileSync(HOMEPAGE_PATH, updatedHomepage, 'utf8');
    console.log('🏠 已同步首頁 OG 圖片');
  } else {
    console.log('🏠 首頁 OG 圖片已是最新');
  }
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

// 生成完整的文章頁面 HTML（複製 post.html 結構）
function generatePostHTML(post) {
  const {
    slug,
    title,
    summary,
    category,
    coverImage,
    publishedAt,
    updatedAt,
    tags,
  } = post;

  const categorySlug = categoryMapping[category];
  const safeTitle = escapeHtml(title || slug || 'Untitled');
  const safeSummary = escapeHtml(summary || '');
  const safeCategory = escapeHtml(category || '');

  // 調整相對路徑，因為文章頁面在 /category/slug/ 目錄下
  // 需要往上兩層才能到根目錄
  let html = postTemplate
    .replace(/href="assets\//g, 'href="../../assets/')
    .replace(/src="assets\//g, 'src="../../assets/')
    .replace(/href="\.\/"/g, 'href="../../"')
    .replace(/href="about\.html"/g, 'href="../../about.html"')
    .replace(/href="gadgets\.html"/g, 'href="../../gadgets.html"')
    .replace(/href="feed\.json"/g, 'href="../../feed.json"');

  // 生成完整的 URL
  const fullUrl = `${SITE_BASE_URL}/${categorySlug}/${slug}/`;
  const heroPreload = buildHeroPreload(coverImage);
  const heroMarkup = buildHeroMarkup(post);

  // 生成 Open Graph 圖片 URL
  let ogImageUrl;
  if (coverImage) {
    const normalizedCoverImage = coverImage.startsWith('/') ? coverImage.slice(1) : coverImage;
    ogImageUrl = `${SITE_BASE_URL}/${normalizedCoverImage}`;
  } else {
    ogImageUrl = buildCloudinaryOgImage(title || slug || 'Untitled');
  }

  const tagsString = Array.isArray(tags) ? tags.map((tag) => escapeHtml(tag)).join(', ') : '';

  // 更新 meta tags
  html = html.replace(/<title>閱讀中 - cptwin<\/title>/, `<title>${safeTitle} - cptwin</title>`);
  html = html.replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${safeSummary}"`);
  html = html.replace(/<link rel="canonical" href="" id="canonical-url">/, `<link rel="canonical" href="${fullUrl}" id="canonical-url">`);
  html = html.replace(/<meta name="keywords" content="" id="meta-keywords">/, `<meta name="keywords" content="${tagsString}" id="meta-keywords">`);
  html = html.replace(/  <!-- 首圖 preload 會由生成腳本注入到這裡 -->\s*/,
    `  <!-- 首圖 preload 會由生成腳本注入到這裡 -->\n${heroPreload}`);
  html = html.replace(/<div id="post-hero" class="article-hero"><\/div>/, heroMarkup);
  html = replaceMarkedBlock(
    html,
    ARTICLE_TAGS_START,
    ARTICLE_TAGS_END,
    buildArticleTagMetaBlock(tags)
  );

  // Open Graph
  html = html.replace(/<meta property="og:url" content="" id="og-url">/, `<meta property="og:url" content="${fullUrl}" id="og-url">`);
  html = html.replace(/<meta property="og:title" content="閱讀中 - cptwin" id="og-title">/, `<meta property="og:title" content="${safeTitle}" id="og-title">`);
  html = html.replace(/<meta property="og:description" content="" id="og-description">/, `<meta property="og:description" content="${safeSummary}" id="og-description">`);
  html = html.replace(/<meta property="og:image" content="" id="og-image">/, `<meta property="og:image" content="${ogImageUrl}" id="og-image">`);
  html = html.replace(/<meta property="article:published_time" content="" id="og-published-time">/, `<meta property="article:published_time" content="${publishedAt || ''}" id="og-published-time">`);
  html = html.replace(/<meta property="article:modified_time" content="" id="og-modified-time">/, `<meta property="article:modified_time" content="${updatedAt || publishedAt || ''}" id="og-modified-time">`);
  html = html.replace(/<meta property="article:section" content="" id="og-section">/, `<meta property="article:section" content="${safeCategory}" id="og-section">`);

  // Twitter
  html = html.replace(/<meta property="twitter:url" content="" id="twitter-url">/, `<meta property="twitter:url" content="${fullUrl}" id="twitter-url">`);
  html = html.replace(/<meta property="twitter:title" content="閱讀中 - cptwin" id="twitter-title">/, `<meta property="twitter:title" content="${safeTitle}" id="twitter-title">`);
  html = html.replace(/<meta property="twitter:description" content="" id="twitter-description">/, `<meta property="twitter:description" content="${safeSummary}" id="twitter-description">`);
  html = html.replace(/<meta property="twitter:image" content="" id="twitter-image">/, `<meta property="twitter:image" content="${ogImageUrl}" id="twitter-image">`);

  return html;
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

function writeCurrentPostPages(posts) {
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
    const html = generatePostHTML(post);
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

  syncHomepageMetadata();
  const posts = JSON.parse(fs.readFileSync(POSTS_PATH, 'utf8'));
  const routeState = buildCurrentRouteMap(posts);
  const writeSummary = writeCurrentPostPages(posts);
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
