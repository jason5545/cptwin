# b-log 發布操作手冊（Codex Agent）

本文件是 b-log 靜態部落格系統的文章發布指南。你的工作是將使用者提供的文章內容轉換為 Markdown 並發布到部落格。

**你只負責格式轉換和發布流程，不修改文章的觀點、語氣或內容。**

---

## 專案概述

b-log 是一個純靜態部落格系統，部署在 GitHub Pages。不需要構建步驟，文章以 Markdown 儲存，元數據以 JSON 管理。

## 檔案結構

```
b-log/
├── content/posts/          # Markdown 文章檔案（{slug}.md）
├── data/posts.json         # 文章元數據目錄
├── feed.json               # JSON Feed
├── config/categories.json  # 分類映射（單一真實來源）
└── content/img/{year}/     # 文章圖片
```

## 發布流程

### 1. 建立 Markdown 檔案

檔案路徑：`content/posts/{slug}.md`

- 第一行必須是 `#` 開頭的標題
- 使用 GitHub-flavoured Markdown
- 儲存為 UTF-8 編碼
- 圖片使用絕對路徑：`![說明](/content/img/{year}/filename.jpg)`

### 2. 決定 slug

- 使用英文小寫、連字號分隔
- 簡潔描述文章主題
- 範例：`my-first-post`、`wordpress-migration-guide`

### 3. 更新 `data/posts.json`

在陣列中插入新物件，**保持逆時間排序**（最新的在最前面）：

```json
{
  "slug": "example-slug",
  "title": "文章標題",
  "summary": "簡短摘要（約 160 字元以內）",
  "category": "分類名稱",
  "author": "作者名稱",
  "publishedAt": "2025-10-17T00:00:00.000Z",
  "updatedAt": "2025-10-17T00:00:00.000Z",
  "readingTime": "10 min",
  "tags": ["tag1", "tag2"],
  "accentColor": "#556bff"
}
```

**必填欄位**：`slug`、`title`、`summary`、`category`、`author`、`publishedAt`、`tags`

**選填欄位**：
- `coverImage`：封面圖片路徑，省略時使用 `accentColor` 漸層
- `hasAudio`：設為 `true` 時顯示語音版圖示
- `readingTime`：閱讀時間估計
- `updatedAt`：更新時間
- `accentColor`：主題色

**注意**：
- `slug` 必須與 Markdown 檔案名稱一致
- 時間戳使用 ISO 8601 UTC 格式
- 舊文章放在陣列後方（保持逆時間排序）

### 4. 更新 `feed.json`

在 `items` 陣列中插入新條目，同樣**保持逆時間排序**：

```json
{
  "id": "example-slug",
  "url": "https://b-log.to/post.html?slug=example-slug",
  "title": "文章標題",
  "content_text": "文章摘要（第一人稱撰寫）",
  "date_published": "2025-10-17T00:00:00.000Z",
  "date_modified": "2025-10-17T00:00:00.000Z",
  "authors": [{ "name": "作者名稱" }],
  "tags": ["tag1", "tag2"]
}
```

**重要**：`content_text` 必須使用**第一人稱**撰寫。

### 5. 分類

從 `config/categories.json` 讀取可用的分類。如果需要新增分類：

1. 編輯 `config/categories.json`，在 `categoryMapping` 中新增
2. 分類名稱為中文，對應的 slug 為英文小寫連字號

### 6. 提交並推送

```bash
git add content/posts/{slug}.md data/posts.json feed.json
git commit -m "新增文章：{標題}"
git push
```

GitHub Actions 會自動：
1. 生成 WordPress 風格的 URL 重定向頁面（`/{category}/{slug}/index.html`）
2. 生成 sitemap.xml
3. 部署到 GitHub Pages

## 編輯現有文章

1. 修改 `content/posts/{slug}.md`
2. 更新 `data/posts.json` 中的 `updatedAt`
3. 更新 `feed.json` 中的 `date_modified`
4. 提交並推送

## 新增圖片

1. 將圖片放到 `content/img/{year}/` 目錄
2. 在 Markdown 中使用絕對路徑：`![說明](/content/img/{year}/photo.jpg)`
3. 如需設定封面，在 `posts.json` 加入 `coverImage` 欄位
4. 提交後，GitHub Actions 會自動將圖片轉換為 WebP 格式並更新路徑

## 格式轉換注意事項

將使用者的 Word 或文字內容轉為 Markdown 時：

- **不修改內容**：不改觀點、不改語氣、不潤飾文字
- **只處理格式**：標題層級、粗體、清單、連結、圖片
- **標點符號**：中文內容使用全形標點（，。！？），英文和數字使用半形
- **編碼**：一律 UTF-8

## 台灣用語規範

文章元數據和系統訊息使用台灣正體中文：

- 設定（非「設置」）
- 執行（非「運行」）
- 最佳化（非「優化」）
- 程式（非「程序」）
- 資料夾（非「文件夾」）

## 驗證清單

發布前確認：

- [ ] Markdown 檔案第一行是 `#` 標題
- [ ] `slug` 與檔案名稱一致
- [ ] `posts.json` 格式正確且保持逆時間排序
- [ ] `feed.json` 格式正確且保持逆時間排序
- [ ] `feed.json` 的 `content_text` 是第一人稱
- [ ] 時間戳為 ISO 8601 UTC 格式
- [ ] 分類存在於 `config/categories.json`
- [ ] JSON 格式驗證通過（無語法錯誤）

## 禁止事項

- **不要**修改 `assets/handbook.js`、`assets/styles.css`、`scripts/lib/handbook.js`（版面改動先讀下面的「設計守則」）
- **不要**刪除 `data/posts.json` 中的現有屬性
- **不要**刪除任何現有檔案
- **不要**使用 PowerShell 處理中文檔案（會導致編碼損壞）
- **不要**修改文章的內容、觀點或語氣

---

## 主題與階段（家長手冊導覽）

首頁的「依孩子的階段」「依主題」讀 `data/handbook-tags.json`：

```json
{
  "wheelchair-accessible-slopes": { "topic": "友善生活" },
  "university-exam-prep-disabled-part1": { "topic": "就學與學習", "stage": "university" }
}
```

- `topic` 只能是舜英在「關於我」寫的六類：媽媽經、就學與學習、電腦輔具、輔具與無障礙、友善生活、生活點滴。
- `stage` 選填：`placement`（鑑定與安置）、`school-life`（在學）、`junior-high`（國中）、`university`（升大學）。跟就學階段無關的文章不填。
- 新文章沒有加進這個檔案也會上線，主題照 `config/handbook.json` 的 `categoryTopicFallback` 從分類推，只是不會出現在任何階段。發布後記得補一筆。
- 不要把這兩個欄位寫進 `data/posts.json`：Live Writer 後端會改寫 posts.json，另外放一個檔案才不會被洗掉。
- 文章頁的「寫這篇時，雙胞胎約 X 歲」用 `config/handbook.json` 的 `twinsBirthYear`（1997，舜英 2026/11/10 同意公開）減文章年份，不用手填。

## 設計守則

2026/11/10 改成「家長手冊」版面：把網站當成一本寫了十八年的家長手冊，讀者是後來的家長，照孩子走到的階段找文章。設計草案在 Jason 那裡（cptwin-設計草案-家長手冊-2026-11-10.docx）。

改版面之前先讀完這段。這些規則是為了不讓 AI 一改版就退回「溫暖媽媽部落格」的預設樣式：

- 不用：背景光球、漸層文字、半透明卡片、陰影、滑過浮起、進場動畫、彩色左邊框卡片、膠囊形標籤、主題切換鈕。
- 分區只用 1px 細線和留白；章節開頭用 2px 墨色粗線。不要把內容裝進圓角卡片。
- 顏色只有紙色 `#F6F3EC`、墨色 `#1F1B16` 和一個強調色（深綠 `#2F5D50`）。強調色只用在連結和「第幾站」。深色模式跟著系統設定，不另外做切換。
- 標題 Noto Serif TC，內文系統黑體。內文 18px 以上，一行約 34 字。
- 首頁開場只能用舜英自己寫過的句子（目前取自「關於我」），不另外撰寫標語。分類說明也照抄「關於我」。
- 日期寫成 2026/10/12，作者資訊用中文。
- 舊文章標題保留原樣（包括「~~」「＊＊＊」），版面要撐得住長標題。不要為了版面好看改標題或內文。
- 照片用原圖，不加框、不加陰影。Live Writer 的 `_thumb` 縮圖在建置時自動換成原圖。
- 頁面都是建置時產生的靜態 HTML（`scripts/generate-redirects.js` 呼叫 `scripts/lib/handbook.js`）。站頭、頁尾只在 `scripts/lib/handbook.js` 改一次；`about.html` 的站頭頁尾夾在 `SITE_HEADER`／`SITE_FOOTER` 標記之間，由建置同步，不要手改那兩段。
- `404.html` 是「文章上線中」等待頁，獨立樣式，不套站頭。

## 改版紀錄

每次改版面在這裡記一筆：日期、改了什麼、為什麼。

- 2026/11/10：改成家長手冊版面。拿掉光球、漸層字、卡片、陰影、動畫與主題切換；首頁改成依階段、依主題、按年份找；文章頁標題在前、右欄資料卡與段落目錄；新增主題／階段／年份列表頁和搜尋頁；前端 JS 從 main.js（約 2400 行，多數是 b-log 遺留功能）換成 handbook.js。原因：舊主題沒有概念，元素都是 AI 預設，跟舜英沒有關係；網站大部分是 2008 年起的存檔，讀者是來找答案的家長。
