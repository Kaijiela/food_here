# 美食地圖

美食地圖是 iOS 原生 MVP，目標是讓有選擇障礙的人在新竹市附近快速找到餐廳。

## 開發環境

- iOS 16+
- Xcode 16+ 建議
- Swift Package Manager
- Google Maps Platform 專案需啟用 Maps SDK for iOS 與 Places SDK for iOS

## 設定 API Key

1. 複製 `Config/Secrets.xcconfig.example` 為 `Config/Secrets.xcconfig`。
2. 將 `GOOGLE_MAPS_API_KEY` 設為 Google Cloud Console 建立的 iOS API key。
3. 在 Google Cloud Console 將 key 限制到 app bundle identifier：`com.example.foodmap`，或改成你的正式 bundle identifier。
4. 在 Xcode 專案 Build Settings 將 Debug/Release 的 `GOOGLE_MAPS_API_KEY` 指向這個值，或直接在 scheme 加入 build setting。

## 驗證

核心邏輯可在有 Swift toolchain 的環境執行：

```bash
swift test
```

Windows 若使用本專案安裝的 Swift 6.3.2，可執行：

```powershell
.\Scripts\Test-Core.ps1
```

iOS App 需要在 macOS/Xcode 執行：

```bash
xcodebuild -project FoodMap.xcodeproj -scheme FoodMap -destination 'platform=iOS Simulator,name=iPhone 16' build
```

## GitHub Actions 雲端 Build

本專案已包含 `.github/workflows/ios-cloud-build.yml`。推到 GitHub 後可以到 Actions 手動執行 **iOS Cloud Build**，或在 push / pull request 時自動執行。

如果要用真實 Google key 編譯，請在 GitHub repo 設定：

1. Settings > Secrets and variables > Actions
2. 新增 Repository secret：`GOOGLE_MAPS_API_KEY`
3. 重新執行 workflow

沒有設定 secret 時，workflow 會用 `DUMMY_KEY_FOR_BUILD` 做編譯檢查；App 不能用這個 dummy key 實際載入地圖。

## 功能範圍

- CoreLocation 定位，定位拒絕時 fallback 到新竹市中心。
- Google Places Nearby Search 搜尋餐廳與咖啡店。
- 推薦引擎依評分、評論數、距離、營業狀態加權。
- Google Maps 顯示目前推薦與附近餐廳 pin。
- 餐廳詳情顯示照片、評價摘要、營業時間與 Google Maps 導航連結。
