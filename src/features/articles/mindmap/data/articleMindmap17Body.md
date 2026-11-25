整理讀者在文章列表決定「要不要點」、在內頁判斷「信不信、怎麼帶走」時用到哪些資訊，對照資訊行為研究（Ellis模型、information scent、相關性判斷）與Dublin Core的元素定義，範圍限於個人技術部落格的列表頁與文章頁。

> 引述於2026-11-17與11-19打開原文核對；標「摘要」的只讀到摘要或書目頁，標「轉述」的是經別的文獻或網站轉載。研究對象多是搜尋結果頁與資料庫書目紀錄，不是部落格列表。

## 速查表

| 讀者的問題 | 對應的概念 | Dublin Core或其他欄位 |
|---|---|---|
| 這篇是不是我要的？ | information scent；內容與主題是最常用的相關性準則；Ellis的browsing | Title、Description（專門寫的一兩句摘要）、Subject（主題標籤） |
| 這是哪一類、要讀多久？ | 文類（genre／type）準則；搜尋結果常附的篇幅資訊 | Type、篇幅或閱讀時間 |
| 夠新嗎？ | 時效（currency）準則，重要程度因人而異 | 發布日、更新日 |
| 上次來之後有什麼新的？ | Ellis的monitoring | `dcterms:modified`、RSS |
| 誰寫的、可不可信？ | Ellis的differentiating；預測與評估兩種判斷；Prominence-Interpretation理論 | Creator、Contributor、Publisher |
| 內容正不正確？ | Ellis的verifying | 參考資料、Source |
| 往下追線索 | Ellis的chaining；Bates的footnote chasing | Relation、Source |
| 收藏或引用 | information managing（Meho & Tibbo 2003） | Identifier、Rights、Language、Format、Publisher |
| 適用範圍 | Dublin Core的Coverage | Coverage |

## Ellis模型的行為定義

Ellis 1989從研究者找資料的方式歸納出六種行為：starting、chaining、browsing、differentiating、monitoring、extracting[^1]。Wilson 1999把verifying與ending也列為Ellis（1989、1993）的行為，並指出「Ellis makes no claims to the effect that the different behaviours constitute a single set of stages」：這些行為可以任意順序出現，不是先後階段。

| 行為 | 定義（原文） | 照字面容易偏離的地方 |
|---|---|---|
| monitoring | 「keeping abreast of developments in an area by regularly following particular sources」（Meho & Tibbo 2003）；「keeping up-to-date or current awareness searching」（Wilson 1999） | 指定期追蹤特定來源的新進展，不是判斷單篇文章還新不新 |
| differentiating | 「using known differences (e.g., author and journal hierarchies or nature and quality of information) between sources as a way of filtering」（Meho & Tibbo 2003） | 用作者、出處等級、資訊性質來過濾，看署名判斷可信度屬於這一項 |
| verifying | 「checking the accuracy of information」（Wilson 1999）；「checking the accuracy of the information found」（Meho & Tibbo 2003） | 核對的對象是資訊本身正不正確，不是作者可不可信 |
| extracting | 「selectively identifying relevant material」in an information source（兩者相同） | 在一個來源裡挑出相關部分，不包括引用、收藏或帶走 |

引用與收藏比較接近information managing：Meho & Tibbo 2003研究社會科學家時，在Ellis的行為之外另加accessing、networking、verifying、information managing四項，並把所有行為歸成searching、accessing、processing、ending四個階段[^2]。verifying不是他們首次提出，原文寫「Verifying was identified as a distinct category in Ellis's study, but among physical scientists and engineers rather than social scientists」。

Ellis的行為可以套到網頁瀏覽：Choo、Detlor & Turnbull 2000把browsing對應成「Scanning top-level pages: lists, headings, site maps」，monitoring對應成「Revisiting 'favorite' or bookmarked sites for new information」，chaining對應成「Following links on starting pages」，extracting則是「Systematically searches a local site to extract information of interest」，也就是站內搜尋。Makri、Blandford & Cox 2008把Ellis模型用在數位圖書館的設計（摘要）。這些研究的對象都是為工作找資料的研究者或知識工作者，不是隨意瀏覽部落格的讀者。

## 列表上的線索：information scent

Information scent出自information foraging理論（Pirolli & Card 1999），處理的正是單一頁面上「值不值得點」的判斷。Card、Pirolli等2001的定義：「Information scent is the (imperfect) perception of the value, cost, or access path of information sources obtained from proximal cues, such as WWW links」，並說scent「may be delivered by link descriptors, images, contextual clues, such as preceding headings, or by page arrangement」。列表頁的標題、摘要、標籤與排版，都是這種近端線索。

Bates 1989的berrypicking提到的footnote chasing、citation searching、author searching，則對應「相關文章」「同作者其他文章」這類往下追的連結。

## 從摘要判斷相關性的研究

| 研究 | 結果 |
|---|---|
| Maglaughlin & Sonnenwald 2002（12位研究生，看含標題、作者、期刊、出版日、摘要的書目紀錄） | 「The criteria most frequently mentioned by study participants were content, followed by criteria characterizing the full text document」；在判斷為相關的文獻裡，「the third most frequently mentioned criteria was author」 |
| Anderson 2005，引Barry & Schamber 1998等研究 | 「the most likely criteria contributing to relevance judgements were those associated with content matters」 |
| Hearst 2009《Search User Interfaces》第5章 | 「Even the most relevant document is unlikely to be selected if the title is uninformative or misleading.」 |
| Cutrell & Guan 2007（摘要） | 加長搜尋結果的摘要片段，資訊型任務表現變好，導覽型任務變差 |
| Maxwell、Azzopardi & Moshfeghi 2017（摘要） | 受試者覺得長摘要比較有資訊量，但四種長度下辨識相關結果的表現「similar」；長摘要也讓人更常點進不相關的項目 |
| Balatsoukas & Ruthven 2012（摘要） | 分析「281 predictive relevance judgments」，搜尋結果的組成（標題、摘要、網址）與排序都會影響用了哪些準則 |

Hearst第5章另外引Tombros & Sanderson 1998：依查詢詞擷取的摘要（query-biased summary），表現比顯示原文開頭幾句好。部落格列表沒有查詢詞，這個結果不能直接套用。上面的研究都沒有比較摘要要截成幾行。

Hearst也提醒，有時「an information need can be satisfied by viewing the document surrogate alone」：讀者只看列表上的摘要，就可能得到需要的資訊。

## 日期與更新標示

時效（currency）是反覆出現的相關性準則：Maglaughlin & Sonnenwald 2002表2轉載的Barry & Schamber、Schamber & Bateman研究都有。但在Maglaughlin & Sonnenwald自己的12位受試者中，9人要最新資料，其餘的人表示「currency did not matter」，重要程度因人而異。

| 來源 | 說法 |
|---|---|
| Google Search Central〈Influence your byline dates〉 | 「Add a user-visible date to the page and feature it prominently」；用「Publish」或「Last updated」這類文字標示日期；可見日期要跟結構化資料一致 |
| Stanford Web Credibility Guidelines第8條（轉述，經Wikipedia） | 「Update your site's content often (at least show it's been reviewed recently)」 |

兩者都是指引，不是比較實驗。沒找到同儕審查研究比較部落格列表上顯示更新日與發布日的效果，也沒找到「已更新」標記會不會影響點選的研究。

## 作者署名與可信度

| 來源 | 說法 |
|---|---|
| Rieh 2002（摘要） | 受試者做兩種判斷，「predictive judgment, and evaluative judgment」；影響因素包括資訊本身與來源的特徵、知識、情境、搜尋結果的排序 |
| Fogg的Prominence-Interpretation理論（轉述，NN/g，Fessenden 2018） | 「people determine a site's credibility by judging prominent attributes of the site that grab their attention」，沒被注意到的元素不會被拿來判斷 |
| Stanford Web Credibility Guidelines第3、4條（轉述，經Wikipedia） | 凸顯內容與團隊的專業；讓人看到網站背後是誠實可信的人 |
| Haas & Unkel 2017（摘要） | 點選「mainly influenced by the ranking」；研究的來源是網站或媒體，不是個人作者 |
| Maglaughlin & Sonnenwald 2002 | 在學術書目紀錄裡，作者是相關文獻第三常被提到的準則 |

預測判斷（點之前，看摘要）與評估判斷（點之後，看全文）的分界，也見於Balatsoukas & Ruthven 2012的predictive relevance judgments。Meho & Tibbo把verifying與information managing放在processing階段，也就是取得全文之後。

## 圖示與文字標籤

NN/g〈Icon Usability〉（Harley 2014）：「a text label must be present alongside an icon to clarify its meaning」、「Icon labels should be visible at all times」，並指出接近通用的圖示只有少數幾個（首頁、列印、搜尋）。這篇談的是導覽與操作圖示，不是日期這類metadata；沒找到日期該不該配圖示的研究。

## Dublin Core元素的定義

Dublin Core Metadata Element Set 1.1有15個核心元素。容易用錯的三處：

| 元素 | DCMI定義 | 說明 |
|---|---|---|
| Coverage | 「The spatial or temporal topic of the resource...」 | 15個核心元素之一，列元素清單時容易漏掉 |
| Date | 「A point or period of time associated with an event in the lifecycle of the resource」 | created、modified是DCMI Terms的細分屬性（`dcterms:created`、`dcterms:modified`），不在15個核心元素裡 |
| Source | 「A related resource from which the described resource is derived」 | 指衍生自哪個資源，不是可信度意義上的「出處」，跟Relation同屬追線索的用途 |

## 結論

- 列表頁負責「要不要點」，內頁負責「信不信、怎麼帶走」。依據：Rieh 2002的預測與評估判斷、Balatsoukas & Ruthven 2012的predictive relevance judgments、Meho & Tibbo把verifying與information managing放在取得全文之後。
- 決定列表上放什麼，information scent比Ellis模型貼切：Ellis描述的是研究者整個研究週期的找資料模式，information scent處理的是單一頁面上值不值得點的判斷；Ellis的行為名稱要照原定義用，monitoring是追蹤新進展、verifying是核對內容、extracting是挑出相關段落，引用與收藏歸information managing。
- 列表的主角是標題加一兩句專門寫的摘要，截短但不必很長。依據：內容是最常用的準則、標題不清楚就不會被點（Maglaughlin & Sonnenwald、Hearst），摘要加長不一定提高判斷正確率（Maxwell等、Cutrell & Guan）。專門寫摘要比沿用第一段好，是從「第一段常是鋪陳」推出來的判斷，沒有研究直接比較。
- 主題標籤可以全部顯示，主題是首要準則。
- 日期用文字，不配圖示；內頁同時寫「發布」與「最後更新」，列表只在有實質修改時加「已更新」。依據：Google的日期指引與NN/g的圖示研究，都是灰色文獻。
- 全站只有一位作者時，列表每一列的作者都相同，放了也沒有區辨作用；可信度改由內頁署名、關於頁與日期承擔（Stanford第3、4條，Prominence-Interpretation理論）。
- 往下追的線索在列表上用文字提示（例如「關聯3個專案」），完整的相關項目放內頁；NN/g的圖示研究支持用文字而不是只用圖示。
- 收藏與引用用的資訊（永久網址、授權、語言）放內頁頁尾，Dublin Core元素寫進頁面metadata，可見日期與結構化資料一致（Google的日期指引）。Coverage對技術文章最接近「適用版本」，可以只放metadata，或在內頁寫明。
- Type與閱讀時間等全站真的有多種文類時再放上列表，否則只增加字數。monitoring用RSS或「新文章／已更新」篩選服務，不靠每一列的圖示。

## 來源

- Wilson〈Models in information behaviour research〉（1999）：https://informationr.net/tdw/publ/1999JDoc.html
- Meho & Tibbo〈Modeling the information-seeking behavior of social scientists: Ellis's study revisited〉（2003）：http://eprints.rclis.org/8364/1/meho-tibbo.pdf
- Ellis〈A behavioural approach to information retrieval system design〉（1989）：https://doi.org/10.1108/eb026843
- Choo、Detlor & Turnbull〈Information seeking on the Web〉（2000，First Monday鏡像）：https://cybra.lodz.pl/Content/1081/issues/issue5_2/choo/index.html
- Makri、Blandford & Cox（2008）：https://discovery.ucl.ac.uk/id/eprint/5219
- Card、Pirolli等〈Information scent as a driver of Web behavior graphs〉（2001）：https://research.cs.vt.edu/ns/cs5724papers/5.usageenvir.adaptation.card.infoscent.pdf
- Pirolli & Card〈Information foraging〉（1999）：https://doi.org/10.1037/0033-295X.106.4.643
- Bates〈The design of browsing and berrypicking techniques〉（1989）：https://pages.gseis.ucla.edu/faculty/bates/berrypicking.html
- Maglaughlin & Sonnenwald〈User perspectives on relevance criteria〉（2002）：http://eprints.rclis.org/7997/1/jasist-2002-maglaughlin-sonnenwald.pdf
- Anderson〈Relevance as process〉（2005）：https://informationr.net/ir/10-2/paper226.html
- Hearst《Search User Interfaces》第5章（2009）：https://searchuserinterfaces.com/book/sui_ch5_retrieval_results.html
- Cutrell & Guan〈What are you looking for?〉（2007）：https://www.microsoft.com/en-us/research/?p=154180
- Maxwell、Azzopardi & Moshfeghi（2017）：https://strathprints.strath.ac.uk/id/eprint/62103
- Balatsoukas & Ruthven（2012）：https://strathprints.strath.ac.uk/41196/
- Rieh（2002）：https://ideas.repec.org/a/bla/jamist/v53y2002i2p145-161.html
- Haas & Unkel〈Ranking versus reputation: perception and effects of search result credibility〉（2017）：https://ideas.repec.org/a/taf/tbitxx/v36y2017i12p1285-1298.html
- Google Search Central〈Influence your byline dates〉：https://developers.google.com/search/docs/appearance/publication-dates
- Stanford Web Credibility Project（Wikipedia）：https://en.wikipedia.org/wiki/Stanford_Web_Credibility_Project
- NN/g〈Icon Usability〉：https://www.nngroup.com/articles/icon-usability/
- NN/g〈Prominence-Interpretation Theory〉：https://www.nngroup.com/articles/prominence-interpretation-theory/
- DCMI〈Dublin Core Metadata Element Set, Version 1.1〉：https://www.dublincore.org/specifications/dublin-core/dces/

[^1]: Ellis 1989原文在付費牆後，六種行為的名稱依Wilson 1999與Meho & Tibbo 2003的轉述，兩者一致。
[^2]: Meho & Tibbo的原文寫這四項是研究stateless nations的社會科學家「besides those identified by Ellis」的新增行為；verifying對社會科學家是新的，Ellis在理工研究者身上已經找到。
