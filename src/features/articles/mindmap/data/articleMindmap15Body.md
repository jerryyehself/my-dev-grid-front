整理Vue、Laravel、Bootstrap、Docker、TypeScript、PHP、HTML5、JavaScript八種技術官方對標誌使用的規定，以及Simple Icons、Devicon兩個圖示庫的授權、台灣《商標法》第36條與美國法nominative fair use的概念。

> 依各品牌官方頁面與法規原文整理，引述都打開原文核對過，核對日期2026-11-05。本文不是法律意見。

## 各技術的標誌規定

| 技術[^1] | 放在個人網站表示「用了這個技術」 | 標誌能不能改[^2] | 要注意的事 |
|---|---|---|---|
| Vue | 可以。官方列出的允許用途包括"to illustrate professional expertise in portfolios, resumes, and personal websites"，也就是在作品集、履歷和個人網站上展示專業能力 | 沒有明寫 | 用Vue標誌或它的變體做成T恤等實體商品販售，要先取得著作權人的書面同意 |
| Laravel | 可以。允許在討論、文章、文件裡提到Laravel，以及說明自己的軟體是built on或compatible with Laravel | 沒有明寫 | 商業使用名稱或標誌要先取得授權；不要暗示官方背書 |
| Bootstrap | 可以。提到Bootstrap時要用官方的標誌 | 不能，原文是「Do not modify our logos in any way.」 | 不能把Bootstrap的品牌用在自己的專案上[^3] |
| Docker | 允許在提到Docker時有限度地合理使用 | 不能，不能修改、重新組合或放進改造過的畫面 | 網站要放一段指定的商標聲明，見下方 |
| TypeScript | 可以。官方說藍色標誌適合部落格文章、新聞和自我行銷 | 不能改形狀；官方另外提供單色版 | 不能拿來當自己產品的標誌，也不能暗示TypeScript替產品背書 |
| PHP | 可以 | 可以，但要照授權條件 | 標誌由Colin Viebrock以CC BY-SA 4.0釋出：要標註作者和授權、註明改了什麼，改過的版本也要用同一個授權釋出 |
| HTML5 | 可以 | 可以 | W3C以CC BY 3.0釋出，頁面說可以自由使用和重新詮釋；CC BY 3.0授權本身要求標註作者與授權 |
| JavaScript | 可以 | 可以 | 常見的「JS」標誌是社群做的，2011年在JSConf EU正式發表，用MIT授權釋出 |

Docker的條款在「教育或資訊用途」那一段寫明只能用文字名稱，不能用圖形標誌。

### Docker指定的商標聲明

Docker要求網站放一段法律聲明，或放一個連到這段聲明的連結：

> Docker and the Docker logo are trademarks or registered trademarks of Docker, Inc. in the United States and/or other countries. Docker, Inc. and other parties may also have trademark rights in other terms used herein.

條款也說，這段聲明可以只保留跟Docker有關的部分。

## 圖示庫的授權

開源授權管的是檔案能不能複製、修改、散布，屬於著作權的範圍；商標[^4]由各品牌另外規定。

| 圖示庫 | 授權 | 聲明 |
|---|---|---|
| Simple Icons | CC0[^5] | 整個專案用CC0，但不代表裡面每個圖示都是CC0，個別圖示的授權要另外看；請使用者自己去取得各品牌的使用許可，出了問題它不負責 |
| Devicon | MIT[^6] | 說明頁寫著所有產品名稱、標誌與品牌都屬於各自的擁有者，使用時要照各品牌自己的規範 |

## 法律依據

台灣《商標法》第36條第1項列出幾種「不受他人商標權之效力所拘束」的情形，第2款是：

> 以符合商業交易習慣之誠實信用方法，表示商品或服務之使用目的，而有使用他人之商標用以指示該他人之商品或服務之必要者。但其使用結果有致相關消費者混淆誤認之虞者，不適用之。

白話說：為了指出「這就是那家的產品」而必須用到對方的商標，可以用；但如果用了會讓人搞混，就不行[^7]。

美國法上有類似的概念，英文稱nominative fair use，意思是為了指名某個產品而使用它的商標。國際商標協會（INTA）寫給一般讀者的說明，列出的條件是：

1. 不用這個商標，就很難指出那個產品或服務；
2. 只用到指出它所需的程度；
3. 不暗示商標擁有者贊助或背書。

## 結論

- 八種技術的官方規定，都允許用標誌指出「這個專案用了這項技術」；Laravel把商業使用列為要先取得授權。
- 明文禁止修改標誌的有Bootstrap、Docker，TypeScript禁止改形狀；Vue、Laravel沒有明寫。沒有明寫不等於允許，改過的標誌容易被看成自己的變體，離「只用到必要的程度」更遠。
- 要求附帶文字的有三種：Docker的商標聲明、PHP標誌的CC BY-SA標註、HTML5標誌的CC BY標註。
- Docker在「教育或資訊用途」只允許文字名稱，作品集要放Docker的圖形標誌，條款要再讀一次；只寫文字「Docker」最保守。
- 在作品集放標誌表示「這個專案用了它」，屬於用別人的商標指出那個產品本身；只要不讓人以為官方背書或合作，符合《商標法》第36條第1項第2款與INTA列的三個條件。
- 圖示庫的開源授權只涵蓋檔案；商標的使用範圍要看各品牌自己的規定。
- 依上面各條，照最嚴的規定放標誌，就是用官方原檔、原色，不改形狀、不重新上色、不裁切；深色背景用官方提供的反白或單色版本；頁尾加一行商標聲明，用到Docker、PHP、HTML5的標誌時再加上它們要求的文字。

## 來源

- [台灣《商標法》第36條（全國法規資料庫）](https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=J0070001&flno=36)
- [《商標法》修正沿革（全國法規資料庫）](https://law.moj.gov.tw/LawClass/LawHistory.aspx?pcode=J0070001)
- [INTA：Fair Use of Trademarks（寫給非法律背景讀者）](https://www.inta.org/fact-sheets/fair-use-of-trademarks-intended-for-a-non-legal-audience/)
- [Simple Icons免責聲明](https://github.com/simple-icons/simple-icons/blob/master/DISCLAIMER.md)
- [Devicon](https://github.com/devicons/devicon)
- [Vue官方美術資源（vuejs/art）](https://github.com/vuejs/art)
- [Laravel商標政策](https://laravel.com/legal/trademark)
- [Bootstrap品牌規範](https://getbootstrap.com/docs/5.3/about/brand/)
- [Docker商標指南](https://www.docker.com/legal/trademark-guidelines/)
- [TypeScript品牌規範](https://www.typescriptlang.org/branding/)
- [PHP標誌下載與授權](https://www.php.net/download-logos.php)
- [W3C HTML5標誌](https://www.w3.org/html/logo/)
- [創用CC姓名標示3.0授權條款](https://creativecommons.org/licenses/by/3.0/deed.zh-hant)
- [社群版JavaScript標誌（logo.js）](https://github.com/voodootikigod/logo.js/)

[^1]: 表中只列打開官方頁面核對過的技術。Python、LINE等其他技術沒在官方頁面讀到明確條文，這裡不列。
[^2]: 指改標誌本身的形狀或顏色，不是指旁邊的背景。
[^3]: 我的解讀：這句指不能把自己的專案包裝成Bootstrap，不是不能在作品集提到它。
[^4]: 商標管的是「這個名稱或圖形代表哪一家的產品」，別人能不能拿來指稱它、會不會讓人搞混。
[^5]: 作者放棄著作權，任何人都能自由使用。
[^6]: 一種寬鬆的開源授權，保留版權聲明就能自由使用。
[^7]: 這一款是2023年5月24日修正公布、2024年5月1日施行的條文。
