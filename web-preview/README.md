# 美食地圖 Web App

這是從原本 iOS MVP 轉出的瀏覽器版。目標是先把「不知道吃什麼時，快速推薦附近餐廳」的核心流程做成可以在 Windows 上即時預覽、快速迭代的 Web App。

目前版本使用新竹市附近的假資料，不會呼叫 Google Maps 或 Places API。

## 執行

```powershell
cd D:\food_here\web-preview
npm.cmd test
npm.cmd start
```

預設網址：

```text
http://localhost:5173
```

如果 5173 已被占用，可以指定其他 port：

```powershell
$env:PORT=5175
npm.cmd start
```

## 目前功能

- 根據評分、評論量、距離與營業狀態產生最佳推薦
- 搜尋店名、餐點、分類與標籤
- 依餐廳類型篩選
- 只看營業中
- 推薦卡片、附近地圖示意、排序清單與店家詳情
- 保留純 Node.js 靜態伺服器，不需要 macOS 或 Xcode

## 後續可以接上的方向

- 將 `src/restaurants.mjs` 換成 API 回傳資料
- 用 Google Places Web Service 補附近搜尋、照片與評論摘要
- 用 Google Maps JavaScript API 替換目前的地圖示意
- 加入使用者定位授權與「定位失敗 fallback 到新竹市中心」
