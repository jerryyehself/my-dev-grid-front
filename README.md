# my-dev-grid-frontend

用 Vue 3 + Vite 開發的個人網站。

## 視覺設計稿

目前實作照著這份 Claude Design 畫布走(五個頁面的版面結構重新設計,主題色票沿用既有 token):

**[My Dev Grid Site Redesign](https://claude.ai/code/artifact/41b6b24a-8dbd-4f19-a366-ed14221f202b)**

改版面/字體/共用元件前,先跟這份對一下,確認是刻意偏離(例如某段文案改用真實內容取代設計稿的示範文案)還是單純沒對齊。

## 建議的 IDE 設定

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)(記得停用 Vetur)。

## 建議的瀏覽器設定

- Chromium 系瀏覽器(Chrome、Edge、Brave 等):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [開啟 Chrome DevTools 的 Custom Object Formatter](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [開啟 Firefox DevTools 的 Custom Object Formatter](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## `.vue` 檔案在 TS 裡的型別支援

TypeScript 預設無法處理 `.vue` 檔案的型別資訊,所以改用 `vue-tsc` 取代 `tsc` CLI 做型別檢查。編輯器裡則需要 [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) 讓 TypeScript language service 認得 `.vue` 型別。

## 自訂設定

參考 [Vite 設定文件](https://vite.dev/config/)。

## 專案設置

```sh
npm install
```

### 開發模式(Compile + Hot-Reload)

```sh
npm run dev
```

### 型別檢查、編譯並壓縮成正式版

```sh
npm run build
```

### 用 [ESLint](https://eslint.org/) 檢查

```sh
npm run lint
```
