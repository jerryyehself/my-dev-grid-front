# 檔案結構

採「依功能分」與「依類型分」並存的折衷：新功能放進 `src/features/`，共用的東西留在依類型分的資料夾，舊功能等到要大改時再搬。

## 新功能：`src/features/<功能名>/`

一個功能的頁面、元件、邏輯、API 呼叫、store、測試放在同一個資料夾。

```
src/features/graph/
  GraphView.vue          # 頁面，router 從這裡 import
  GraphCanvas.vue        # 只有這個功能用的元件
  GraphCanvas.spec.ts    # 測試放在被測檔案旁邊
  layeredLayout.ts       # 純邏輯
  graphApi.ts            # 這個功能的 API 呼叫
  useGraphStore.ts       # 這個功能的 store（需要時才有）
```

- 資料夾名用 kebab-case（`article-editor`），檔名照 [`naming.md`](naming.md)。
- 檔案少的時候全部平放。超過大約 15 個檔案、找起來不方便時，再分 `components/`、`composables/` 這類子資料夾。
- 頁面元件仍然以 `View` 結尾，放在功能資料夾根層。

## 共用的東西：留在依類型分的資料夾

兩個以上功能會用到的，放在下面這些位置：

| 位置                                         | 放什麼                                                |
| -------------------------------------------- | ----------------------------------------------------- |
| `src/components/`                            | `Base*` 基礎元件、`The*` 全站唯一元件、跨功能共用元件 |
| `src/composables/`                           | 跨功能共用的 composable（例如 `useTheme`）            |
| `src/stores/`                                | 全站狀態（例如登入狀態 `useAuthStore`）               |
| `src/api/client.ts`                          | API 用戶端本身；各功能的端點呼叫放進功能資料夾        |
| `src/layouts/`、`src/router/`、`src/assets/` | 維持原樣                                              |

## 功能之間的界線

- 不要 import 另一個功能資料夾裡的檔案。兩個功能都需要的東西，搬到上表的共用位置。
- 共用位置的檔案不能 import `src/features/` 裡的東西（共用的不能依賴特定功能）。

## 舊功能怎麼搬

現在還在依類型分資料夾裡的功能（散在 `src/views/`、`src/components/<功能>/`、`src/api/`、`src/data/`），不一次全搬：

- 某個功能下次要大改時，先把它整個搬進 `src/features/<功能名>/`，再做原本的修改。
- 一次只搬一個功能。搬檔和改內容分成不同 commit，讓 git 認得出是搬移，審查時也看得清楚哪些是真的改動。
- 搬的 commit 只動路徑與 import，不順手改程式。
- 小修（改字、修一個 bug）不用為了它搬整個功能。

沒有要大改的功能，維持原位就好。
