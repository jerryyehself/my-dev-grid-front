# 命名

依據 [Vue 官方風格指南](https://vuejs.org/style-guide/)，以及這個 repo 現有程式碼的寫法。下面每一條都已經是現況，寫下來是為了讓新程式照著做。

## 元件

- 檔名用 PascalCase，名稱至少兩個字：`ArticleEditLink.vue`，不寫 `Link.vue`。
- 共用的基礎元件加 `Base` 前綴：`BaseButton`、`BaseSwitch`。
- 全站只會出現一次的元件加 `The` 前綴：`TheNavbar`。
- 頁面元件以 `View` 結尾：`ArticlesView`、`NotFoundView`。
- 只給某個元件用的子元件，名稱以父元件或所屬功能開頭：`GraphShortcutsHelp`、`GraphLegendDots`。
- 名稱由大到小排列：`OntologyRelationEditView`（本體論 → 關係 → 編輯），不寫 `EditOntologyRelationView`。
- 一個 `.vue` 檔只定義一個元件。

## 其他檔案與資料夾

- 不是元件的 `.ts` 檔用 camelCase：`layeredLayout.ts`、`safeLink.ts`。
- 資料夾用 kebab-case：`article-editor`。
- 測試檔與被測檔案同名，加 `.spec.ts`：`BaseSwitch.spec.ts`。

## composable 與 store

- composable 用 `use` 開頭：`useTheme`、`useProjectsFilter`，檔名與函式名相同。
- Pinia store 寫成 `useXxxStore`：`useAuthStore`，檔名與函式名相同。

## prop 與事件

- prop：在 `<script>` 裡用 camelCase，在 template 裡用 kebab-case。
- 事件：`defineEmits` 與 `emit()` 用 camelCase（`selectNode`、`zoomIn`），在 template 監聽時用 kebab-case（`@select-node`、`@zoom-in`）。

## TypeScript

- 變數、函式用 camelCase，結尾不加底線。
- 型別、interface 用 PascalCase：`AuthUser`、`PhraseNode`。
- 模組層級、值固定不變的常數用 UPPER_CASE：`REFRESH_CONFLICT_RETRY_MS`。一般的 `const` 變數仍用 camelCase。

## 目前已知不符的地方

下次改到這些檔案時順手修正，不需要為它們單獨開 PR：

- `src/views/AboutView.vue` 在同一個檔案裡用 `defineComponent` 定義了幾個小元件。這些小元件共用頁面裡的 `MONO`、`mix()` 與型別，拆出去要一起搬，所以這個檔案用 `eslint-disable vue/one-component-per-file` 暫時放行；拆開後把那行拿掉。
