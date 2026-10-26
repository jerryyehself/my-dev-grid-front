# 程式慣例

這個資料夾是前端程式慣例的唯一來源。不管是人、Claude 還是 Codex，寫程式前都照這裡的規則；`AGENTS.md`、`CLAUDE.md` 只放連結，不重複內容。

| 檔案                           | 管什麼                                                                |
| ------------------------------ | --------------------------------------------------------------------- |
| [`structure.md`](structure.md) | 檔案放哪裡：`src/features/` 與共用資料夾的分工、舊功能怎麼搬          |
| [`naming.md`](naming.md)       | 元件、檔案、資料夾、composable、store、事件、prop、型別、常數怎麼命名 |
| [`testing.md`](testing.md)     | 測試格式與「好的測試」七條                                            |
| [`security.md`](security.md)   | HTML 與程式執行、網址、憑證與秘密、部署設定                           |

已經成文、不在這裡的規則：

- 語言、註解、Base 元件、CSS 變數：`AGENTS.md`「程式慣例」
- 視覺：`.claude/skills/visual-design-language/`
- 訪客看得到的文字：`.claude/skills/copy-language/`

## 怎麼改這裡的規則

規則跟現有程式碼不一致時，先改規則或先改程式碼都可以，但同一個 PR 裡要讓兩邊對得上。不要在別的文件另外寫一份規則。
