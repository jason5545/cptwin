const fs = require('fs');
const path = require('path');

// 載入設定
const postsPath = path.join(__dirname, '../data/posts.json');
const categoriesPath = path.join(__dirname, '../config/categories.json');
const outputPath = path.join(__dirname, '../sitemap.xml');

// 網站基礎 URL
const BASE_URL = 'https://cptwin.com';

// 讀取文章資料
const posts = JSON.parse(fs.readFileSync(postsPath, 'utf8'));
const { categoryMapping } = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));

// 生成 sitemap XML
function generateSitemap() {
  // 使用最新文章的發布/更新日期作為靜態頁面的 lastmod
  // 這樣只有在真正有內容更新時，sitemap 才會改變
  const latestPostDate = posts.reduce((latest, post) => {
    const postDate = post.updatedAt || post.publishedAt;
    return postDate > latest ? postDate : latest;
  }, '');

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // 首頁 - 使用最新文章的日期
  xml += '  <url>\n';
  xml += `    <loc>${BASE_URL}/</loc>\n`;
  xml += `    <lastmod>${latestPostDate}</lastmod>\n`;
  xml += '    <changefreq>daily</changefreq>\n';
  xml += '    <priority>1.0</priority>\n';
  xml += '  </url>\n';

  // 關於頁面 - 使用最新文章的日期
  xml += '  <url>\n';
  xml += `    <loc>${BASE_URL}/about.html</loc>\n`;
  xml += `    <lastmod>${latestPostDate}</lastmod>\n`;
  xml += '    <changefreq>monthly</changefreq>\n';
  xml += '    <priority>0.8</priority>\n';
  xml += '  </url>\n';

  // 每篇文章（使用 WordPress 風格 URL）
  posts.forEach(post => {
    const categorySlug = categoryMapping[post.category];
    if (!categorySlug) {
      console.warn(`警告：找不到分類「${post.category}」的映射`);
      return;
    }

    const url = `${BASE_URL}/${categorySlug}/${post.slug}/`;
    const lastmod = post.updatedAt || post.publishedAt;

    xml += '  <url>\n';
    xml += `    <loc>${url}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += '    <changefreq>monthly</changefreq>\n';
    xml += '    <priority>0.9</priority>\n';
    xml += '  </url>\n';
  });

  xml += '</urlset>\n';

  return xml;
}

// 寫入檔案
try {
  const sitemap = generateSitemap();
  fs.writeFileSync(outputPath, sitemap, 'utf8');
  console.log(`✅ Sitemap 已成功生成：${outputPath}`);
  console.log(`📄 包含 ${posts.length + 2} 個 URL（首頁 + 關於頁面 + ${posts.length} 篇文章）`);
} catch (error) {
  console.error('❌ 生成 sitemap 時發生錯誤：', error);
  process.exit(1);
}
