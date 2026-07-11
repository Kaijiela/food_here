# 美食地圖

美食地圖原本是 iOS 原生 MVP，現在專案方向調整為 Web App，讓沒有 macOS / Xcode 環境時也能在 Windows 上快速預覽、測試和迭代。

核心目標不變：幫有選擇障礙的人，在附近快速找到今天可以吃的餐廳。

## 目前主力版本

Web App 位於 `web-preview`：

```powershell
cd D:\food_here\web-preview
npm.cmd test
npm.cmd start
```

本機預覽：

```text
http://localhost:5173
```

## 外網部署

這個分支包含 GitHub Pages workflow：

```text
.github/workflows/web-preview-pages.yml
```

第一次部署前，repository owner 需要先到 GitHub 開啟 Pages：

1. 打開 repository 的 `Settings > Pages`
2. 在 `Build and deployment` 的 `Source` 選擇 `GitHub Actions`
3. 儲存後重新執行 `Deploy Web Preview to GitHub Pages` workflow

如果沒有先做這一步，Actions 會在 `Setup Pages` 出現類似錯誤：

```text
Error: Get Pages site failed.
HttpError: Not Found
```

這代表 GitHub Pages site 尚未建立，不是 web app build 壞掉。

部署完成後，網址通常會是：

```text
https://kaijiela.github.io/food_here/
```

HTTPS 是瀏覽器 GPS 定位的必要條件之一；`localhost` 也可以測試定位，但手機或外部裝置需要 HTTPS 網址。

## Google Maps / Places 設定

Web App 不會把 Google Maps API key 寫進程式碼。請在畫面上貼入 browser API key；它只會存在你的瀏覽器 `localStorage`。

Google Cloud Console 建議設定：

- 啟用 Maps JavaScript API
- 啟用 Places API
- API key 類型使用 browser key
- Application restrictions 設為 HTTP referrers
- 開發時允許 `http://localhost:5173/*`
- 外網測試時允許 `https://kaijiela.github.io/food_here/*`

## Web App 功能

- 使用瀏覽器 Geolocation 取得 GPS 位置
- 設定 Google Maps API key 後呼叫 Google Places Nearby Search
- Google Places 失敗或尚未設定 key 時，自動 fallback 到 MVP 假資料
- 根據評分、評論量、距離與營業狀態排序推薦
- 搜尋店名、餐點、分類與標籤
- 類型篩選與「只看營業中」
- 最佳推薦卡、附近地圖示意、推薦清單、店家詳情

## 專案結構

```text
web-preview/              Web App MVP
Sources/FoodMapCore/      原 Swift 核心邏輯參考
FoodMap/                  原 iOS App 程式碼參考
Tests/                    原 Swift 測試
```
