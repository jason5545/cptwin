# cptwin.com — 我與我雙胞胎腦麻兒的生活點滴

舜英（腦麻雙胞胎的媽媽）的部落格。從 2009 年起在 WordPress 經營，2026 年 3 月遷移至純靜態系統，部署在 GitHub Pages。累積超過 200 篇文章、1400+ 張圖片，紀錄了復健、就學、輔具與無障礙生活經驗。

## 專案架構

```
├── index.html                 首頁（建置產生：開場、依階段、依主題、最近寫的、按年份翻）
├── topics/ stages/ years/     主題、階段、年份列表頁（建置產生）
├── search/                    搜尋頁（建置產生，資料在 data/search-index.json）
├── post.html                  舊網址 post.html?slug= 的轉址頁
├── about.html                 關於我（內文手寫，站頭頁尾由建置同步）
├── assets/
│   ├── styles.css               全站樣式（「家長手冊」設計，守則見 cptwin/AGENT.md）
│   └── handbook.js              前端：留言、搜尋、舊網址轉址
├── content/
│   ├── posts/                   Markdown 文章（<slug>.md）
│   └── img/                     圖片（按年月分類，WebP 格式）
├── data/
│   ├── posts.json               文章元資料目錄
│   └── handbook-tags.json       每篇的主題與階段
├── config/
│   ├── categories.json          分類中英對照（文章網址用）
│   └── handbook.json            主題、階段、首頁精選、雙胞胎出生年
└── scripts/                     自動化腳本（版面在 scripts/lib/handbook.js）
```

## 文章元資料格式

在 `data/posts.json` 中新增物件：

```json
{
  "slug": "cp-child-standing-frame-experience",
  "title": "腦麻兒的站立架使用經驗分享",
  "summary": "從三歲開始使用站立架，一路用到高中畢業...",
  "category": "媽媽經",
  "author": "舜英",
  "publishedAt": "2025-10-16T00:00:00.000Z",
  "updatedAt": "2025-10-16T00:00:00.000Z",
  "readingTime": "5 min",
  "tags": ["媽媽經", "輔具"],
  "coverImage": "/content/img/2025/10/standing-frame.webp"
}
```

必填欄位：`slug`、`title`、`summary`、`category`、`author`、`publishedAt`、`tags`。

## 分類

| 中文 | slug |
|------|------|
| 媽媽經 | parenting |
| 就學與學習 | education |
| 夯話題 | trending |
| 特製滑鼠 | custom-mouse |
| 生活 | life-stories |
| 螢幕鍵盤與應用 | screen-keyboard |
| 輔具類 | assistive-devices |
| 未分類 | uncategorized |

## 新增文章

1. 在 `data/posts.json` 最前面加入元資料物件（保持逆時間排序）。
2. 撰寫 `content/posts/<slug>.md`（GitHub-flavoured Markdown）。
3. 圖片放入 `content/img/<year>/<month>/`，推送後 GitHub Actions 會自動轉 WebP。
4. 推送 `posts.json` 後 GitHub Actions 會自動生成靜態頁面、sitemap 和 feed。

## 自動化

- **content-pipeline.yml**：推送 `posts.json` 時自動生成靜態頁面、sitemap、feed。
- **convert-to-webp.yml**：推送 jpg/png 時自動轉 WebP 並更新引用。

## 本地開發

不需要建置步驟。任何靜態伺服器即可預覽：

```bash
npx serve .
```
