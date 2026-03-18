#!/usr/bin/env python3
"""
WordPress to b-log 遷移腳本

Usage（從 repo 根目錄執行）:
    python3 cptwin/migrate.py \
        --xml ~/Downloads/WordPress.2026-03-18.xml \
        --zip ~/Downloads/cptwin.com-c5e2-2026-03-18.zip
"""

import argparse
import json
import math
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote

from markdownify import markdownify as md_convert

# ── 設定 ──────────────────────────────────────────────────────────────────────

AUTHOR = '舜英'
BASE_URL = 'https://cptwin.com'
READING_SPEED_ZH = 500  # 中文每分鐘閱讀字數

# WordPress 分類 → b-log slug
CATEGORY_MAP = {
    '媽媽經': 'parenting',
    '就學與學習~': 'education',
    '就學與學習': 'education',
    '夯話題': 'trending',
    '特製滑鼠': 'custom-mouse',
    '生活': 'life-stories',
    '螢幕鍵盤與應用': 'screen-keyboard',
    '輔具類': 'assistive-devices',
    'Uncategorized': 'uncategorized',
    '未分類': 'uncategorized',
}

# 分類中文顯示名稱（用於 categories.json）
CATEGORY_NAMES = {
    'parenting': '媽媽經',
    'education': '就學與學習',
    'trending': '夯話題',
    'custom-mouse': '特製滑鼠',
    'life-stories': '生活',
    'screen-keyboard': '螢幕鍵盤與應用',
    'assistive-devices': '輔具類',
    'uncategorized': '未分類',
}

NS = {
    'wp': 'http://wordpress.org/export/1.2/',
    'content': 'http://purl.org/rss/1.0/modules/content/',
    'dc': 'http://purl.org/dc/elements/1.1/',
    'excerpt': 'http://wordpress.org/export/1.2/excerpt/',
}

# 圖片 resize 變體的 pattern（-150x150, -512x288 等）
RESIZE_RE = re.compile(r'-\d+x\d+\.(jpg|jpeg|png|gif|webp|bmp)$', re.IGNORECASE)

# ── 主流程 ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='WordPress to b-log 遷移')
    parser.add_argument('--xml', required=True, help='WordPress 匯出 XML 路徑')
    parser.add_argument('--zip', required=True, help='WordPress 網站備份 zip 路徑')
    args = parser.parse_args()

    repo_root = Path.cwd()
    xml_path = Path(args.xml).expanduser()
    zip_path = Path(args.zip).expanduser()

    if not xml_path.exists():
        print(f'❌ 找不到 XML：{xml_path}', file=sys.stderr)
        sys.exit(1)
    if not zip_path.exists():
        print(f'❌ 找不到 zip：{zip_path}', file=sys.stderr)
        sys.exit(1)

    print('=== WordPress → b-log 遷移腳本 ===\n')

    # 1. 提取圖片
    print('[1/4] 從 zip 提取原始圖片...')
    image_map = extract_images(zip_path, repo_root)
    print(f'  ✓ 提取 {len(image_map)} 張原始圖片')

    # 2. 解析 XML
    print('\n[2/4] 解析 WordPress XML...')
    channel_info, wp_posts = parse_wordpress_xml(xml_path)
    print(f'  ✓ 找到 {len(wp_posts)} 篇已發布文章')
    print(f'  ✓ 網站標題：{channel_info["title"]}')

    # 3. 生成 Markdown + 收集 post entry
    print('\n[3/4] 生成 Markdown 檔案...')
    post_entries = []
    skipped = 0
    for post in wp_posts:
        entry = generate_markdown(post, repo_root)
        if entry:
            post_entries.append(entry)
        else:
            skipped += 1

    # 按發布時間逆序排列（最新在前）
    post_entries.sort(key=lambda x: x['publishedAt'], reverse=True)
    print(f'  ✓ 生成 {len(post_entries)} 篇，略過 {skipped} 篇（無有效內容）')

    # 4. 更新 JSON
    print('\n[4/4] 更新 JSON 設定檔...')
    update_posts_json(post_entries, repo_root)
    update_feed_json(post_entries, channel_info, repo_root)
    update_categories_json(repo_root)

    print(f'\n=== ✅ 完成！共遷移 {len(post_entries)} 篇文章 ===')
    print(f'\n下一步：')
    print(f'  git add .')
    print(f'  git commit -m "遷移 WordPress 文章 ({len(post_entries)} 篇)"')
    print(f'  git push')


# ── Step 1: 提取圖片 ──────────────────────────────────────────────────────────

def extract_images(zip_path: Path, repo_root: Path) -> dict:
    """
    從 zip 提取 public_html/wp-content/uploads/ 下的原始圖片。
    跳過 WordPress 自動生成的 resize 變體（-150x150 等）。
    輸出至 content/img/{year}/{month}/filename
    回傳 {原始 zip 路徑: 新的本地相對路徑} 對應表
    """
    img_root = repo_root / 'content' / 'img'
    image_map = {}

    with zipfile.ZipFile(zip_path, 'r') as zf:
        uploads_prefix = 'public_html/wp-content/uploads/'
        entries = [n for n in zf.namelist() if n.startswith(uploads_prefix) and not n.endswith('/')]

        for zip_name in entries:
            filename = zip_name.split('/')[-1]

            # 跳過 resize 變體
            if RESIZE_RE.search(filename):
                continue

            # 取得 year/month
            parts = zip_name[len(uploads_prefix):].split('/')
            if len(parts) < 3:
                continue
            year, month = parts[0], parts[1]
            if not (year.isdigit() and month.isdigit()):
                continue

            # 目標路徑
            dest_dir = img_root / year / month
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest_path = dest_dir / filename

            # 解壓縮（若檔案已存在則跳過）
            if not dest_path.exists():
                data = zf.read(zip_name)
                dest_path.write_bytes(data)

            rel = f'/content/img/{year}/{month}/{filename}'
            image_map[zip_name[len('public_html'):]] = rel

    return image_map


# ── Step 2: 解析 WordPress XML ─────────────────────────────────────────────────

def parse_wordpress_xml(xml_path: Path):
    """
    解析 WordPress WXR XML，回傳 (channel_info, posts_list)。
    只保留已發布的 post（status=publish, post_type=post）。
    """
    tree = ET.parse(xml_path)
    root = tree.getroot()
    channel = root.find('channel')

    channel_info = {
        'title': _text(channel.find('title')),
        'link': _text(channel.find('link')),
        'description': _text(channel.find('description')) or '',
    }

    posts = []
    for item in channel.findall('item'):
        status = _text(item.find('wp:status', NS))
        post_type = _text(item.find('wp:post_type', NS))

        if status != 'publish' or post_type != 'post':
            continue

        post_id = _text(item.find('wp:post_id', NS)) or '0'
        title = _text(item.find('title')) or f'Post {post_id}'
        post_date = _text(item.find('wp:post_date', NS)) or '2000-01-01 00:00:00'
        creator = _text(item.find('dc:creator', NS)) or ''
        content_encoded = _text(item.find('content:encoded', NS)) or ''
        excerpt = _text(item.find('excerpt:encoded', NS)) or ''

        # 分類（domain="category"）
        categories = []
        for cat in item.findall('category'):
            if cat.get('domain') == 'category' and cat.text:
                categories.append(cat.text.strip())

        # tags
        tags = []
        for cat in item.findall('category'):
            if cat.get('domain') == 'post_tag' and cat.text:
                tags.append(cat.text.strip())

        posts.append({
            'id': post_id,
            'title': title.strip(),
            'date': post_date,
            'creator': creator,
            'categories': categories,
            'tags': tags,
            'content': content_encoded,
            'excerpt': excerpt,
        })

    return channel_info, posts


def _text(el):
    if el is None:
        return None
    return el.text or None


# ── Step 3: 生成 Markdown ─────────────────────────────────────────────────────

def generate_markdown(post: dict, repo_root: Path) -> dict | None:
    """
    將 WordPress post 轉換為 Markdown 並寫入 content/posts/{slug}.md。
    回傳 posts.json entry，或 None（若跳過）。
    """
    post_id = post['id']
    slug = f'p{post_id}'
    title = post['title']

    # 解析日期
    try:
        dt = datetime.strptime(post['date'], '%Y-%m-%d %H:%M:%S')
        dt = dt.replace(tzinfo=timezone.utc)
    except ValueError:
        dt = datetime.now(timezone.utc)

    published_at = dt.strftime('%Y-%m-%dT%H:%M:%SZ')

    # 分類
    category_zh = post['categories'][0] if post['categories'] else '未分類'
    category_slug = CATEGORY_MAP.get(category_zh, 'uncategorized')

    # Tags
    tags = [t for t in post['tags'] if not re.match(r'^cheap\s', t, re.I)]

    # HTML 內容處理
    html_content = post['content']
    if not html_content.strip():
        return None

    # 替換圖片路徑（WordPress URL → 本地路徑）
    html_content = replace_image_paths(html_content)

    # HTML → Markdown
    markdown_body = convert_html_to_markdown(html_content)

    if not markdown_body.strip():
        return None

    # 計算閱讀時間
    char_count = len(re.sub(r'\s+', '', markdown_body))
    reading_minutes = max(1, math.ceil(char_count / READING_SPEED_ZH))
    reading_time = f'{reading_minutes} min'

    # 摘要：優先用 excerpt，否則從內容取前 160 字
    if post['excerpt'].strip():
        summary = clean_text(post['excerpt'])[:200].strip()
    else:
        # 移除 markdown 圖片 ![...](...) 和連結 [...](...) 後取純文字
        plain = re.sub(r'!\[[^\]]*\]\([^\)]*\)', '', markdown_body)
        plain = re.sub(r'\[[^\]]*\]\([^\)]*\)', '', plain)
        plain = re.sub(r'[#*`\[\]!]', '', plain)
        plain = re.sub(r'\s+', ' ', plain).strip()
        summary = plain[:160].strip()

    if not summary:
        summary = title

    # 寫入 Markdown 檔案
    posts_dir = repo_root / 'content' / 'posts'
    posts_dir.mkdir(parents=True, exist_ok=True)
    md_path = posts_dir / f'{slug}.md'
    md_path.write_text(f'# {title}\n\n{markdown_body}\n', encoding='utf-8')

    print(f'  → {slug}.md  [{category_slug}]  {dt.strftime("%Y-%m-%d")}  {title[:30]}')

    return {
        'slug': slug,
        'title': title,
        'summary': summary,
        'category': category_zh.rstrip('~'),
        'author': AUTHOR,
        'publishedAt': published_at,
        'updatedAt': published_at,
        'readingTime': reading_time,
        'tags': tags[:8] if tags else [category_zh.rstrip('~')],
    }


def replace_image_paths(html: str) -> str:
    """
    將 WordPress 圖片 URL 替換為本地路徑。
    https://cptwin.com/wp-content/uploads/YYYY/MM/file.jpg
    → /content/img/YYYY/MM/file.jpg
    """
    def repl(m):
        year, month, filename = m.group(1), m.group(2), m.group(3)
        return f'/content/img/{year}/{month}/{filename}'

    return re.sub(
        r'https?://(?:www\.)?cptwin\.com/wp-content/uploads/(\d{4})/(\d{2})/([^\s"\'<>]+)',
        repl,
        html
    )


def convert_html_to_markdown(html: str) -> str:
    """HTML → Markdown，清理 WordPress 特有雜訊。"""
    # 移除廣告提示段落（常見 WordPress 中文站模板）
    html = re.sub(r'<[^>]+>[^<]*(?:點入廣告|支持本站|請.*?廣告)[^<]*</[^>]+>', '', html, flags=re.IGNORECASE)

    # 移除 [caption] shortcode
    html = re.sub(r'\[caption[^\]]*\]', '', html)
    html = re.sub(r'\[/caption\]', '', html)

    # 移除其他 shortcode
    html = re.sub(r'\[[a-z_]+[^\]]*\]', '', html)
    html = re.sub(r'\[/[a-z_]+\]', '', html)

    result = md_convert(
        html,
        heading_style='ATX',
        bullets='-',
        strip=['script', 'style', 'iframe', 'form'],
    )

    # 移除空的標題行（## 後面沒有文字）
    result = re.sub(r'^#{1,6}\s*$', '', result, flags=re.MULTILINE)

    # 清理多餘空白行（超過 2 行的縮減為 2 行）
    result = re.sub(r'\n{3,}', '\n\n', result)

    return result.strip()


def clean_text(html: str) -> str:
    """去掉 HTML 標籤，取純文字。"""
    text = re.sub(r'<[^>]+>', '', html)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


# ── Step 4: 更新 JSON ─────────────────────────────────────────────────────────

def update_posts_json(entries: list, repo_root: Path):
    out_path = repo_root / 'data' / 'posts.json'
    # 只保留 posts.json 需要的欄位
    cleaned = []
    for e in entries:
        entry = {k: v for k, v in e.items() if k not in ('updatedAt',) or True}
        cleaned.append(entry)
    out_path.write_text(json.dumps(cleaned, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'  ✓ data/posts.json 已更新（{len(cleaned)} 篇）')


def update_feed_json(entries: list, channel_info: dict, repo_root: Path):
    out_path = repo_root / 'feed.json'
    feed = {
        'version': 'https://jsonfeed.org/version/1.1',
        'title': channel_info['title'],
        'home_page_url': f'{BASE_URL}/',
        'feed_url': f'{BASE_URL}/feed.json',
        'description': channel_info['description'] or channel_info['title'],
        'items': [],
    }

    for e in entries:
        feed['items'].append({
            'id': e['slug'],
            'url': f'{BASE_URL}/post.html?slug={e["slug"]}',
            'title': e['title'],
            'content_text': e['summary'],
            'date_published': e['publishedAt'],
            'date_modified': e.get('updatedAt', e['publishedAt']),
            'authors': [{'name': e['author']}],
            'tags': e['tags'],
        })

    out_path.write_text(json.dumps(feed, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'  ✓ feed.json 已更新（{len(feed["items"])} 筆）')


def update_categories_json(repo_root: Path):
    out_path = repo_root / 'config' / 'categories.json'
    mapping = {name: slug for slug, name in CATEGORY_NAMES.items()}
    data = {'categoryMapping': mapping}
    out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'  ✓ config/categories.json 已更新（{len(mapping)} 個分類）')


# ── 入口 ───────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    main()
