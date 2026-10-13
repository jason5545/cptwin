const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT_DIR = process.argv[4] ? path.resolve(process.argv[4]) : path.join(__dirname, '..');
const POSTS_PATH = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT_DIR, 'data/posts.json');
const IMG_ROOT = process.argv[3] ? path.resolve(process.argv[3]) : path.join(ROOT_DIR, 'content/img');
const MAX_BASE64_BYTES = 5 * 1024 * 1024;
const WEBP_QUALITY = 85;

function isSafeSlug(slug) {
  return typeof slug === 'string' && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug);
}

function publishedYearMonth(post) {
  const date = new Date(post.publishedAt);
  const now = Number.isNaN(date.getTime()) ? new Date() : date;
  return {
    year: String(now.getUTCFullYear()),
    month: String(now.getUTCMonth() + 1).padStart(2, '0'),
  };
}

function localPathFor(sitePath) {
  if (typeof sitePath !== 'string' || !sitePath.startsWith('/')) return null;
  const resolved = path.join(ROOT_DIR, sitePath);
  return resolved.startsWith(ROOT_DIR) ? resolved : null;
}

async function fixBase64Cover(post) {
  const match = /^data:image\/(\w+);base64,(.+)$/.exec(post.coverImage.trim());
  if (!match) return false;
  const [, format, base64Data] = match;

  if (!isSafeSlug(post.slug)) {
    console.warn(`⚠️  ${post.slug || '(無 slug)'} 的 base64 封面無法處理（slug 不安全），改由驗證擋下`);
    return false;
  }

  const raw = Buffer.from(base64Data, 'base64');
  if (raw.length === 0 || raw.length > MAX_BASE64_BYTES) {
    console.warn(`⚠️  ${post.slug} 的 base64 封面無法處理（${raw.length} bytes），改由驗證擋下`);
    return false;
  }

  try {
    const { year, month } = publishedYearMonth(post);
    const dir = path.join(IMG_ROOT, year, month);
    fs.mkdirSync(dir, { recursive: true });
    const targetAbs = path.join(dir, `${post.slug}-cover.webp`);
    const targetUrl = `/content/img/${year}/${month}/${post.slug}-cover.webp`;

    if (fs.existsSync(targetAbs)) {
      console.log(`🔧 修復 ${post.slug}：捨棄 base64，改用既有 ${targetUrl}`);
    } else {
      await sharp(raw).webp({ quality: WEBP_QUALITY }).toFile(targetAbs);
      console.log(`🔧 修復 ${post.slug}：base64 封面存為 ${targetUrl}`);
    }
    post.coverImage = targetUrl;
    return true;
  } catch (error) {
    console.warn(`⚠️  ${post.slug} 的 base64 封面轉檔失敗：${error.message}`);
    return false;
  }
}

function fixAltTextInPath(post) {
  if (!/\s/.test(post.coverImage)) return false;
  const original = post.coverImage;
  const cleaned = original.trim().split(/\s+/)[0];
  post.coverImage = cleaned;
  console.log(`🔧 修復 ${post.slug}：移除混入路徑的 alt 文字`);
  console.log(`   ${original}`);
  console.log(`   → ${cleaned}`);
  return true;
}

async function fixNonWebpExtension(post) {
  const url = post.coverImage;
  if (!/\.(jpe?g|png|gif|svg)$/i.test(url)) return false;
  const webpUrl = url.replace(/\.[^.]+$/, '.webp');
  const webpAbs = localPathFor(webpUrl);
  if (webpAbs && fs.existsSync(webpAbs)) {
    post.coverImage = webpUrl;
    console.log(`🔧 修復 ${post.slug}：副檔名改為既有的 ${webpUrl}`);
    return true;
  }

  const srcAbs = localPathFor(url);
  if (!srcAbs || !fs.existsSync(srcAbs) || !isSafeSlug(post.slug)) return false;
  try {
    await sharp(srcAbs).webp({ quality: WEBP_QUALITY }).toFile(webpAbs);
    post.coverImage = webpUrl;
    console.log(`🔧 修復 ${post.slug}：由原始檔轉出 ${webpUrl}`);
    return true;
  } catch (error) {
    console.warn(`⚠️  ${post.slug} 的封面轉檔失敗：${error.message}`);
    return false;
  }
}

async function fixCoverImage(post) {
  const coverImage = post.coverImage;
  if (typeof coverImage !== 'string' || !coverImage.trim()) return;

  if (/^data:image\//i.test(coverImage.trim())) {
    const fixed = await fixBase64Cover(post);
    if (!fixed) {
      delete post.coverImage;
      console.log(`🔧 修復 ${post.slug}：移除無法救援的 base64 封面（改用前端預設封面）`);
    }
    return;
  }

  fixAltTextInPath(post);
  if (!/\.webp$/i.test(post.coverImage)) {
    await fixNonWebpExtension(post);
  }
}

async function main() {
  const posts = JSON.parse(fs.readFileSync(POSTS_PATH, 'utf8'));
  if (!Array.isArray(posts)) {
    console.error('❌ posts.json 不是陣列，不進行自動修復');
    process.exit(1);
  }

  for (const post of posts) {
    if (post && typeof post === 'object') {
      await fixCoverImage(post);
    }
  }

  const original = fs.readFileSync(POSTS_PATH, 'utf8');
  const output = `${JSON.stringify(posts, null, 2)}\n`;
  if (output === original) {
    console.log('✅ posts.json 無需修復');
    return;
  }

  fs.writeFileSync(POSTS_PATH, output, 'utf8');
  console.log(`✅ posts.json 已修復並寫回`);
}

main().catch((error) => {
  console.error(`❌ 自動修復失敗：${error.message}`);
  process.exit(1);
});
