# Canvas Mockup Tokens

這個目錄放的是：每一份這個專案實際照著實作過的 Claude Design canvas mockup，各自對應一份 JSON。**在動手實作之前先抽取一次**，不是實作時臨時重讀，也不是事後從程式碼逆推回去。

## 為什麼要有這個目錄

`文章編輯頁`（PR #58）是這個慣例要避免重演的事故：設計稿自己的 `<style>` 區塊定義了 `.lbl`／`.hint`／`.fld`／`.chip` 這幾個共用 class，但抽 `BaseEyebrow`／`BaseHint`／`BaseInput` 這幾個共用元件時是從**既有程式碼**逆推——而那份程式碼當時已經跟設計稿有落差——結果做出一個設計稿沒有的 letter-spacing 變體、附上一段編造的理由，還悄悄讓大多數呼叫點漏掉 `letter-spacing`。型別檢查、lint、build 全部通過，因為它們都看不到 Vue template 實際渲染出來的樣式值。

設計稿自己宣告的值就是那個頁面的設計系統。讀出來之後應該找個地方存下來，不要每次都重新從 canvas 的原始 HTML 解析，更不要從可能已經漂移的程式碼反推。

## 每份檔案裡有什麼

檔名是這份 canvas artifact 的 UUID（取自 `claude.ai/code/artifact/{uuid}` 網址）——固定、不用猜，也跟 `my-dev-grid-skills/docs/design-artifacts.md` 用網址當 key 的方式一致。每份檔案分兩塊：

- **`sharedPrimitives`**——設計稿自己 `<style>` 區塊裡定義的 class（字型、顏色、圓角、陰影、間距、互動狀態），任何抽出來的共用元件都應該以這裡的值為基準。
- **`perElementOverrides`**——個別元素用 inline `style` 蓋掉的例外值。這些是例外，不是第二種變體——把重複出現的 override 直接做成元件的 prop 之前，先看 `my-dev-grid-skills` 裡 `mockup-fidelity` 那條「先數次數再決定要不要變成變體」的規則。

## 誰寫、誰讀

- **寫入**：`my-dev-grid-skills` 的 `extract-canvas-tokens` agent（`plugins/design-canvas-workflow/agents/extract-canvas-tokens.md`）——找到 mockup、準備動手實作之前先派工一次。
- **讀取**：`mockup-fidelity` 的實作步驟（直接照 `sharedPrimitives` 的值寫，不用回頭重讀設計稿），以及 `fidelity-check` agent（`plugins/mockup-fidelity/agents/fidelity-check.md`）——拿這裡的檔案跟實際渲染出來的樣式值比對，不用每次重新解析 canvas 原始 HTML。
- 這個目錄底下的檔案**不會被應用程式碼在建置或執行時匯入**——這是給設計稿保真流程用的參考/流程檔案，不是網站實際的 token 來源。全站真正的 live token（顏色、主題變數）在 `src/assets/css/variables.css`；這個目錄放的是**個別頁面/mockup 專屬**的樣式基本值（標籤樣式、欄位樣式、裝飾性樣式），不見得該進全站主題檔。

完整脈絡見 `my-dev-grid-skills/docs/README.md` §3（agent 清單）以及 `mockup-fidelity`／`design-canvas-workflow` 兩份 skill 檔案。
