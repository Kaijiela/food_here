# 美食地圖 Web App

這是從原本 iOS MVP 轉出的瀏覽器版。目標是先把「不知道吃什麼時，快速推薦附近餐廳」的核心流程做成可以在 Windows 上即時預覽、快速迭代的 Web App。

目前版本可以使用假資料，也可以在設定 Google Maps API key 後，透過瀏覽器 GPS 位置呼叫 Google Places Nearby Search。

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

## 外網與定位

瀏覽器定位需要 secure context；本機 `localhost` 可以測試，手機或外部裝置請使用 HTTPS 網址。

這個 repo 的 `codex/web-gps-google-maps` 分支已加入 GitHub Pages workflow。推送分支後，GitHub Actions 會部署 `web-preview`，通常網址會是：

```text
https://kaijiela.github.io/food_here/
```

## Google Maps API key

API key 不會寫入 git。請在畫面上貼入 browser key，它只會存在目前瀏覽器的 `localStorage`。

Google Cloud Console 需啟用：

- Maps JavaScript API
- Places API

建議限制：

- Application restrictions: HTTP referrers
- `http://localhost:5173/*`
- `https://kaijiela.github.io/food_here/*`

## 目前功能

- 取得瀏覽器 GPS 位置
- 使用 Google Places Nearby Search 取得附近餐廳
- Google 服務不可用時 fallback 到新竹市假資料
- 根據評分、評論量、距離與營業狀態產生最佳推薦
- 搜尋店名、餐點、分類與標籤
- 依餐廳類型篩選
- 只看營業中
- 推薦卡片、附近地圖示意、排序清單與店家詳情
