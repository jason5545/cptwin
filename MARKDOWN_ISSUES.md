# Markdown 格式問題記錄

> 檢查日期：2026-03-20
> 狀態：已暫時移除壞掉的標記，待找回原始資源後恢復

---

## 一、遺失圖片（WordPress 縮圖變體未遷移）

需從 `wp.cptwin.com` 備份站撈回原圖後恢復。

| 文章 | 遺失圖片路徑 | 行號 |
|------|-------------|------|
| `assistive-device-catalog-recommendation.md` | `/content/img/2016/05/20160525_204313-300x239.webp` 等 15 張 | 50, 60, 76-83 |
| `special-earphone-recommendation.md` | `/content/img/2018/06/08101-7-300x244.webp` 等 7 張 | 19, 39, 40, 49, 58 |
| `taipei-children-amusement-park-part1.md` | `/content/img/2015/01/012201-1-268x300.webp` 等 6 張 | 106, 108, 122, 124, 128, 143 |
| `atlife-2017-assistive-device-expo-review.md` | `/content/img/2017/07/072602-4-215x300.webp` 等 6 張 | 17, 18, 22, 31, 39 |
| `friendly-taipei-mrt-app-2017.md` | `/content/img/2017/02/01-6-168x300.webp` 等 5 張 | 41, 43, 45 |
| `taipei-children-amusement-park-part3.md` | `/content/img/2015/01/0124015-300x201.webp` 等 4 張 | 5, 21, 28 |
| `ucat-accessible-campus-map.md` | `/content/img/2020/03/1010-4-300x171.webp` 等 4 張 | 40-42 |
| `smart-hospital-visit-tips.md` | `/content/img/2015/07/DSC_2082-e1439009300953-169x300.webp` 等 3 張 | 6, 12, 21 |
| `morinaga-candy-recommendation.md` | `/content/img/2016/12/dsc_0035-300x169.webp` 等 3 張 | 38, 42, 50 |
| `truly-give-way-to-disabled.md` | `/content/img/2016/06/dsc_0012-e1465484932371-169x300.webp` 等 2 張（整個 `2016/06/` 目錄不存在） | 18, 34 |
| `where-to-rent-children-assistive-devices.md` | `/content/img/2015/07/填單0712台北市租借申請兒童餵食椅輔具-300x240.webp` 等 2 張 | 24, 30 |
| `silver-assistive-device-catalog.md` | `/content/img/2017/10/1010-20-218x300.webp` 等 2 張 | 50 |
| `big-kids-outdoor-shoes.md` | `/content/img/2020/07/Image-4-2-300x170.webp` 等 2 張 | 14, 28 |
| `friendly-taipei-mrt-app-part2.md` | `/content/img/2015/02/022701-300x277.webp` 等 2 張 | 7, 26 |
| `free-online-library-resources.md` | `/content/img/2014/06/0615-300x168.webp` | 9, 34 |
| `apple-product-shopping-tips-part2.md` | `/content/img/2015/09/092201.webp` | 12 |
| `bright-smiles-in-children-assistive-devices.md` | `/content/img/2018/10/08101-1-300x187.webp` | 29 |
| `cp-child-writing-vs-reading.md` | `/content/img/2014/03/01-1-189x300.webp` | 58 |
| `deep-front-line-experience.md` | `/content/img/2018/09/0810-2-200x300.webp` | 110 |
| `friendly-hsinchu-restaurant-app.md` | `/content/img/2015/02/0227012.webp` | 3 |
| `taipei-children-amusement-park-part2.md` | `/content/img/2015/01/0124014-300x119.webp` | 17 |
| `university-exam-prep-muscle-relaxation-part3.md` | `/content/img/2015/04/2015-03-19-16-17-44_photo1-e1429807006411-225x300.webp` | 20 |
| `visit-assistive-device-center.md` | `/content/img/2019/04/1111-4-200x300.webp` | 26 |

## 二、空白圖片標籤 `![]()`

原始圖片 URL 在遷移時遺失。

| 文章 | 行號 |
|------|------|
| `assistive-device-athome-website.md` | 15, 69, 72 |
| `atlife-2017-taichung-expo-registration.md` | 85, 105 |
| `cp-child-afo-ankle-foot-orthoses.md` | 31 |
| `cp-children-mobility-positioning-aids-evolution.md` | 32, 47 |
| `assistive-device-purchase-tips.md` | 11 |
| `deep-front-line-experience.md` | 114 |
| `big-kids-outdoor-shoes.md` | 9 |
| `finding-mrt-exit-for-rehab-bus.md` | 21, 25, 29, 41 |
| `friendly-taipei-mrt-app-2017.md` | 39, 47, 57 |
| `windows-font-size-settings-part2.md` | 11, 23, 25, 26 |
| `universal-clamp-review.md` | 91, 101, 121 |

## 三、語法錯誤

| 文章 | 行 | 原始內容 | 問題 |
|------|---|---------|------|
| `168-onscreen-keyboard-program.md` | 1, 11 | `~~` 未關閉 | 刪除線未關閉 |
| `assistive-device-evaluation-center.md` | 44 | 多餘反引號 | 內聯程式碼未關閉 |
| `assistive-device-subsidy-guidebook-2018.md` | 73 | `**` 11 個（奇數） | 粗體不匹配 |
| `assistive-device-athome-website.md` | 52-53, 61, 76 | 跨行粗體、多餘 `ˊ` | 多重問題 |
| `bathroom-safety-non-destructive-method.md` | 59 | `[![](url)(](url)text)` | 可點擊圖片語法壞掉 |
| `disabled-student-english-listening-test.md` | 16, 38 | 連結缺 `(url)`、`~~` 未關閉 | 多重問題 |
| `disabled-student-exam-accommodations.md` | 16, 19 | `**##標題##**` | 標題標記在粗體內 |
| `encouraged-to-write-more.md` | 4 | `\*\*` + `~~` 未關閉 | 跳脫星號 + 刪除線 |
| `good-shoe-repair-shop.md` | 3 | `**(****~~)**` | 標題內 `~~` 未關閉 |
| `goshare-electric-scooter-sharing.md` | 47-50 | `***` / `**` / `*` 不匹配 | 粗體斜體混亂 |
| `hip-joint-surgery-experience-part1.md` | 16, 17 | `)` 位置錯、文字截斷 | 連結壞掉 |
| `hiring-foreign-caregiver-direct-part2.md` | 21 | `h[ttp://...]` | 字母在括號外 |
| `hiring-foreign-caregiver-direct-part3.md` | 9, 10, 13 | `****`、中文 URL | 多重問題 |
| `i-want-to-use-computer-too.md` | 31 | autolink + 連結重疊 | 語法混亂 |
| `moms-prepare-yourself-part2-certification.md` | 44 | `<[![...` | 多餘 `<` |
| `stair-climbing-machine-trial-2015.md` | 81-82 | 連結斷成兩行 | 連結壞掉 |
| `your-child-can-be-tsmc-shareholder.md` | 27, 44 | `ttps://`、`\_` | 文字錯誤 + 多餘跳脫 |
| `raising-twins-part3-counseling.md` | 49 | `![![` | 多餘 `!` |
| `cp-child-writing-vs-reading.md` | 39 | `*<快>***` | 混合標記 |

## 四、無效 URL（中文當網址）

| 文章 | 行 | 原始連結 |
|------|---|---------|
| `assistive-device-athome-platform.md` | 45 | `[https://goo.gl/97ipkC](http://輔具家)` |
| `day-trip-with-disabled-friends.md` | 20 | `[(點我連結：基隆客運乘車資訊)](http://基隆客運乘車資訊)` |
| `hiring-foreign-caregiver-direct-part3.md` | 10 | `(http://線上填寫「菲勞中心資料表」)` |
| `morinaga-candy-recommendation.md` | 23 | `[森永福利社](http://森永福利社)` |

## 五、其他小問題

| 文章 | 行 | 問題 |
|------|---|------|
| `add-ape-to-iep-school-life.md` | 74 | 裸 URL 未包成連結 |
| `ckc-input-method-alternative.md` | 15 | 裸 URL 未包成連結 |
| `being-a-life-practitioner.md` | 80 | 裸 URL + HTML entities |
| `custom-children-assistive-devices.md` | 82 | 重複裸 URL |
| `amblyopia-eye-specialist-part1.md` | 3, 32, 34 | 標題層級跳躍 H1→H4→H2 |
| `icf-playground-accessibility-taichung.md` | 6 | 標題層級跳躍 H1→H5 |
| `allergy-cough-home-remedy-for-cp-kids.md` | 37-43 | 表格欄數不一致 |
| `free-online-library-resources.md` | 5 | URL 前導空白 |
| `eye-care-software-recommendation.md` | 33 | URL 前導 `%20` |
| `assistive-device-athome-platform.md` | 20 | 裸路徑未包成連結 |
| `computer-assistive-devices-for-cp-part1.md` | 50 | 孤立 `」` 字元 |
| `choosing-computer-aids-for-cp-child.md` | 79, 113 | URL 含空白 / `.htm` vs `.html` 不一致 |

## 六、已失效外部圖片連結

| 文章 | 來源 | 行號 |
|------|------|------|
| `joystick-mouse-for-cp-child.md` | xuite.net 已關站 | 6, 8 |
| `junior-high-new-life-part2.md` | xuite.net 已關站 | 28 |
| `on-screen-keyboard-typing-evaluation.md` | xuite.net 已關站 | 16 |
| `lifelong-skills-for-disabled-parents.md` | Facebook CDN 過期 | 7, 52, 64 |
| `bathroom-safety-non-destructive-method.md` | Facebook CDN 過期 | 51, 58 |
| `deep-front-line-experience.md` | sopili.net emoji | 49, 76 |
