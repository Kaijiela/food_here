# 美食地圖 Web Preview

這是 iOS App 開發前的互動式預覽版，用來先確認產品流程、資訊層級與視覺方向。此版本使用靜態新竹餐廳假資料，不會呼叫 Google Maps 或 Places API。

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

- 一開啟就顯示「今天吃這間」推薦卡
- 「換一家」會排除已看過的餐廳並重新推薦
- 新竹市附近候選餐廳列表
- 模擬地圖 pin 與距離資訊
- 餐廳詳情頁：照片、評分、評論摘要、營業狀態、導航連結

## 下一步

確認 Web Preview 的主要流程後，再把已定稿的互動與版面同步回 SwiftUI iOS App，接著接上 Google Maps / Places API 並跑 GitHub Actions 雲端 build。
