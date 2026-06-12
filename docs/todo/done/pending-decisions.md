# 待決策問題清單

來源：比對 `docs/sdd/sdd.md`、`docs/sdd/API_list.md`、`docs/sdd/ Glossary.md`、`docs/wireframe/layout-draft.md` 後整理。

決策完成後，請將結果填入對應文件，並將此處的 `[ ]` 改為 `[x]` 並補上決策結果。

---

## 架構決策（開發前必須確認）

- [x] **#1 身份驗證系統**
  - 問題：`sdd.md` 說只用 Discord OAuth2；`API_list.md` 有一整套 email/password 註冊登入系統，兩者互斥。
  - 影響：`API_list.md` 的 Auth/User 區塊是否保留、前端登入頁設計、token 管理策略。
  - 矛盾位置：`sdd.md §5.1`、`API_list.md Auth/User 區塊`
  - 決策結果：email/password 沒資料庫，標示延後。
  - 補充：Discord OAuth2 要有登出功能

- [x] **#2 後端資料庫**
  - 問題：`sdd.md` 說不使用外部資料庫，所有資料存 LocalStorage；但 `API_list.md` 有歷史對局列表與統計資料 API，這些無法只靠 LocalStorage 實現。
  - 影響：`/api/users/games`、`/api/users/stats` 是否保留；`API_list.md` 玩家狀態「後端存卡牌 ID」的備註是否成立。
  - 矛盾位置：`sdd.md §1、§3.2`、`API_list.md History 區塊`
  - 決策結果：沒資料庫，歷史對局列表與統計資料 API 標示為延後

- [x] **#3 Token 策略**
  - 問題：`sdd.md §9.1` 說不保留長期 access token；但 `API_list.md` 有 `POST /api/auth/login`（回傳 token）與 `POST /api/auth/logout`（撤銷 token）。
  - 影響：Session 管理方式、前端 API 請求的鑑權方式。
  - 矛盾位置：`sdd.md §9.1`、`API_list.md Auth 區塊`
  - 決策結果：沒資料庫，標示延後

---

## 遊戲機制

- [x] **#4 礦工（Prospector）行動**
  - 問題：礦工在 `API_list.md` 中沒有對應的 client 事件；若礦工是「自動抽一張手牌」不需玩家操作，應明確說明。
  - 影響：Socket.io 事件補充、線稿圖是否需要礦工 Modal。
  - 矛盾位置：`API_list.md Client→Server 事件`、`Glossary.md 職業表`
  - 決策結果：補上 `client:prospect` 事件（玩家觸發抽牌）；不需 Modal，結果透過左下遊戲指引動態刷新呈現。

- [x] **#5 聊天室**
  - 問題：`API_list.md` 已定義 `client:send_message` / `server:chat_message` 事件，但 `sdd.md` 完全未提及聊天功能，`layout-draft.md` 也沒有聊天室 UI。
  - 影響：是否需要補 SDD 章節、線稿圖、V0.1 實作範圍。
  - 矛盾位置：`API_list.md Socket 大廳/房間事件`
  - 決策結果：納入 V0.1 範圍。需補 SDD 章節說明聊天功能範圍，並在 `layout-draft.md` 補上聊天室 UI 位置。

---

## UI / UX

- [x] **#6 貨物數顯示粒度**
  - 問題：`layout-draft.md` 玩家區顯示單一「貨物數」；但 `API_list.md` 的建築狀態是按工廠分開記錄貨物數量。UI 應顯示彙總數字，還是按工廠分開？
  - 影響：玩家資訊區 UI 設計。
  - 矛盾位置：`layout-draft.md §2 玩家區內元素`、`API_list.md 玩家狀態表`
  - 決策結果：按工廠分開顯示各工廠的貨物狀態。`layout-draft.md` 的「貨物數」描述需更新。

- [x] **#7 設定面板「再次開啟導覽」入口**
  - 問題：`sdd.md §5.5` 要求可在設定中再次開啟 Onboarding 導覽；但 `layout-draft.md` 的 `i` 設定面板只有「玩家資訊顯示模式」與「建築說明模式」，沒有此選項。
  - 影響：`i` 面板 UI 需補上此設定項。
  - 矛盾位置：`sdd.md §5.5`、`layout-draft.md §2 輔助資訊區`
  - 決策結果：`i` 面板補上「再次開啟導覽」按鈕。`layout-draft.md` 設定選項清單需更新。

- [x] **#8 手機版版面**
  - 問題：`layout-draft.md §5` 待決策：手機版是否改為單欄直向。
  - 影響：RWD 設計、CSS Grid 調整。
  - 決策結果：與桌面版同步實作，CSS Grid + media query 切換 template area，手機版改為單欄直向布局。

- [x] **#9 其他玩家手牌顯示方式**
  - 問題：`layout-draft.md §5` 待決策：只顯示張數，還是顯示背面扇形牌。
  - 影響：玩家區元件設計。
  - 決策結果：顯示張數數字，同時搭配裝飾性背面扇形圖示（少／中／多三段式，不與實際張數對應）。扇形圖示僅作視覺氛圍，數字才是準確資訊。

- [x] **#10 `i` 操作面板展開方式**
  - 問題：`layout-draft.md §5` 待決策：點擊右下角 `i` 後，面板要用抽屜（drawer）還是彈窗（modal）。
  - 影響：操作面板元件選型。
  - 決策結果：使用抽屜（Drawer）從右側滑出，保留桌面畫面可見，不遮擋遊戲狀態。

- [x] **#11 玩家資訊顯示模式預設值**
  - 問題：`layout-draft.md §5` 待決策：預設 `always`（持續顯示）還是 `hover`（滑入才顯示）。
  - 影響：`usePersistence` 初始值設定。
  - 決策結果：預設 `hover`，滑入玩家頭像才顯示詳細資訊。

- [x] **#12 建築說明模式預設值**
  - 問題：`layout-draft.md §5` 待決策：預設 `compact`（精簡）還是 `detailed`（詳細）。
  - 影響：`usePersistence` 初始值設定。
  - 決策結果：預設 `detailed`，直接顯示建築效果說明文字。

---

## 待補線稿圖

- [x] **#13 貿易商職業行動 Modal**
  - `API_list.md` 有 `client:trade`（選擇賣出商品），但線稿圖未定義此 Modal。
  - 決策結果：已補線框圖於 `layout-draft.md §10`。顯示有貨物的工廠供選擇，無貨物者 disabled，附當前價格牌參考。一般玩家賣 1 種，特權玩家賣 2 種。

- [x] **#14 議員職業行動 Modal**
  - `API_list.md` 有 `client:councillor_select`（選擇保留手牌並棄牌），但線稿圖未定義此 Modal。
  - 決策結果：已補線框圖於 `layout-draft.md §11`。一般抽 2 選 1；特權抽 5 選 1，全部展開不分頁。

- [x] **#15 手牌超過上限棄牌 Modal**
  - `API_list.md` 的 `server:action_prompt` 有此 type，但線稿圖未定義對應畫面。
  - 決策結果：已補線框圖於 `layout-draft.md §12`。強制棄牌，不提供隱藏或放棄，選滿才可送出。

- [x] **#16 大廳 / 房間頁面**
  - `API_list.md` 有完整的房間 REST API，但線稿圖目前只涵蓋遊戲桌面。
  - 決策結果：已補線框圖於 `layout-draft.md §13`，含大廳（公開房間列表）與房間等待室（玩家格、聊天室、準備/開始）。

- [x] **#17 斷線重連 UI**
  - `sdd.md §11` 與 `API_list.md` 有斷線通知與重連事件，但未定義對應畫面。
  - 決策結果：已補線框圖於 `layout-draft.md §14`。遊戲桌面遮罩疊加，自動重連動畫，提供手動重連與返回大廳兩個出口。

---

## 詞彙表 / 文件補完

- [x] **#18 五種貨物種類清單**
  - `Glossary.md` 定義了「貨物種類」概念，但未列出實際的 5 種貨物名稱與對應英文。
  - 決策結果：依 `docs/san-juan-cards.md` 確認為 染料（Indigo）、糖（Sugar）、菸草（Tobacco）、咖啡（Coffee）、白銀（Silver）。已更新 `Glossary.md` 貨物種類欄位與工廠建築表。

- [x] **#19 完整建築列表**
  - `Glossary.md` 工廠建築只有「染坊」，城市建築只有 4 種，與完整牌組落差很大，需補齊。
  - 決策結果：依 `docs/san-juan-cards.md` 補齊全部工廠建築（5 種）與城市建築（基本版，依費用分組）。已更新 `Glossary.md`。

- [x] **#20 獲勝條件詳細說明**
  - `Glossary.md` 的「獲勝」欄位空白，`sdd.md` 只提到 12 棟建築觸發終局，但未說明勝負判定細則。
  - 決策結果：依 `docs/san-juan-cards.md §五` 確認：任一玩家達 12 棟觸發終局，當前回合結束後計分；建築 VP + 壓牌分 + 大建築加分；平手以手牌數 + 生產建築上的貨物數決定。已更新 `Glossary.md` 獲勝欄位。

- [x] **#21 手牌上限預設值**
  - `Glossary.md` 提到「可能依建築而有不同上限」，但未定義沒有特殊建築時的預設值。
  - 決策結果：預設 7 張；持有高塔（Tower）時提升至 12 張。已更新 `Glossary.md` 手牌上限欄位。
