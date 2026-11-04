# 測試

工具是 Vitest＋`@vue/test-utils`。寫法參考 `src/components/BaseSelect.spec.ts`。

## 格式

- 測試檔放在被測檔案旁邊，命名為 `<檔名>.spec.ts`。
- `describe` 寫受測對象（元件或函式名稱）；`it` 的說明用中文，寫成「它應該…」，條件放在後面：`它應該在 open 為 false 時不渲染面板`。（lint：`vitest/valid-title`。這條規則訂得比多數測試晚，舊檔列在 `eslint.config.ts` 的例外清單；改到某個舊檔時順手改標題，並把它移出清單）

## 好的測試

1. **測行為，不測實作。** 驗證使用者看得到的結果、函式的輸入和輸出，不驗證元件內部的變數或私有函式。
   ```ts
   // ✗ 驗證內部狀態
   expect(wrapper.vm.isOpen).toBe(true)
   // ✓ 驗證畫面
   expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
   ```
2. **功能壞了測試要會失敗。** 寫完試著想：把被測的那行改壞，這個測試會不會變紅？不會的話，它就沒有在保護任何東西。
3. **涵蓋邊界情況。** 見下面「邊界必測清單」，加上 issue 特別點名的情況。
4. **彼此獨立、結果穩定。** 不依賴執行順序、真實時間或網路。需要時間就用 `vi.useFakeTimers()`，需要瀏覽器 API 就用 `vi.stubGlobal()`，結束後還原。用到 store 的測試，每個 case 都在 `beforeEach` 建新的 Pinia（`setActivePinia(createPinia())`，參考 `src/api/client.spec.ts`），不沿用上一個 case 的狀態。
5. **好讀。** 一個 `it` 驗證一件事；準備資料、執行、驗證三段分清楚。
6. **優先用無障礙查詢。** 用 role、label、文字找元素，不要用 class 名稱。例外：純呈現的元件（例如 `Base*`），它的 class 本身就是行為，可以直接驗證。
7. **記錄已知 bug 要標明。** 只有在 issue 要求時，才把錯誤的現況寫成測試。說明寫「它應該記錄…目前…」，並加註解說明是現況、不是預期行為。

## 邊界必測清單

新增或修改下列東西時，測試要涵蓋對應的案例。同一個行為要跑多組資料時，用 `it.each`／`describe.each` 列成一張表，一眼看得出哪些情況列到了。

- **可能沒有值的資料**：`null`、`undefined`、空字串、空陣列分開測，不要只測其中一種。
- **數字與長度**：0、邊界本身、邊界前後各一（例：上限是 5，就測 4、5、6）。
- **多種型別或列舉**：每一種都要列到，不能只測一種（例：圖的每一種節點型別）。
- **API 回應**：成功、4xx（特別是 401、404）、網路錯誤，以及回應裡關聯的資料不存在或被刪除。
- **登入狀態**：沒登入、登入中、登入後換帳號或登出。

## 非同步結果寫回

會在 `await` 之後改 store 或畫面的程式，`await` 前先記下當時的世代（登入相關照 `src/stores/useAuthStore.ts` 的 `loginGeneration`：登入、登出、換帳號時加一），寫回前比對；不一樣就丟掉結果，不寫回。只比對使用者 id 不夠：同一個帳號登出再登入，id 不變，舊請求還是會通過。`watch` 裡發的請求，可以在 `await` 前用 `onWatcherCleanup` 登記中止（`AbortController`）。

每個這種地方都要有測試：

- **晚回來的舊請求**：用手動 resolve 的 Promise 控制先後，先讓新請求完成、再讓舊請求完成，斷言狀態是新請求的結果。
- **重試與時限**：用 `vi.useFakeTimers()` 加 `await vi.advanceTimersByTimeAsync(ms)`，在期限前與到期後各斷言一次（例：請求次數、是否放棄）。
