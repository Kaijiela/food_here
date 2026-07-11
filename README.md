# 美食地圖

美食地圖原本是 iOS 原生 MVP，現在專案方向調整為 Web App，讓沒有 macOS / Xcode 環境時也能在 Windows 上快速預覽、測試和迭代。

核心目標不變：幫有選擇障礙的人，在新竹市附近快速找到今天可以吃的餐廳。

## 目前主力版本

Web App 位於 `web-preview`：

```powershell
cd D:\food_here\web-preview
npm.cmd test
npm.cmd start
```

開啟：

```text
http://localhost:5173
```

## Web App 功能

- 根據評分、評論量、距離與營業狀態排序推薦
- 搜尋店名、餐點、分類與標籤
- 類型篩選與「只看營業中」
- 最佳推薦卡、附近地圖示意、推薦清單、店家詳情
- 使用假資料，方便先驗證產品流程，不需要 Google API key

## 專案結構

```text
web-preview/              Web App MVP
Sources/FoodMapCore/      原 Swift 核心邏輯參考
FoodMap/                  原 iOS App 程式碼參考
Tests/                    原 Swift 測試
```

## 後續方向

1. 將 `web-preview/src/restaurants.mjs` 換成後端或 Google Places Web Service 回傳資料。
2. 用 Google Maps JavaScript API 替換目前的地圖示意。
3. 加入瀏覽器定位授權，定位失敗時 fallback 到新竹市中心。
4. 視需求再決定是否保留、封存或移除 iOS 專案檔。
