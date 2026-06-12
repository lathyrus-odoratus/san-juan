# 整體任務清單

## 1. 規格與決策收斂 ✅

1. 完成 `AGENTS.md` 設定與內容確認。
2. 完成所有 UI/互動/架構待決策項目定案（共 21 項，見 `docs/todo/pending-decisions.md`）。
3. 將已定案內容同步更新至 `docs/sdd/sdd.md`、`docs/wireframe/layout-draft.md`、`docs/sdd/ Glossary.md`、`docs/sdd/API_list.md`。
4. 建立 `README.md`，含分支策略與開發流程說明。

---

## 2. 遊戲資料建置

1. ✅ 取得完整卡片列表（`docs/san-juan-cards.md`）。
2. 建立標準化 JSON 結構與欄位定義（id、名稱、費用、VP、效果類型、觸發時機）。
3. 建立 `data/cards.buildings.json`（工廠建築 + 城市建築）。
4. 建立 `data/cards.roles.json`（職業牌）。
5. 建立 `data/rules.config.json`（手牌上限、終局觸發條件等規則常數）。
6. 補齊 JSON 資料驗證測試（id 唯一、必要欄位非空、數值範圍合法）。

---

## 3. 身份驗證與大廳

1. 實作 Discord OAuth2 登入流程（`server/api/auth/discord/callback.ts`）。
2. 實作登出功能並清除本地快取身份。
3. 建立大廳頁面（`app/pages/lobby.vue`）：
   - 公開房間列表
   - 建立房間 / 輸入房間碼加入
4. 建立房間等待室頁面（`app/pages/room/[id].vue`）：
   - 玩家格（4 格，含房主標示）
   - 準備 / 開始遊戲按鈕
   - 聊天室（Socket.io `client:send_message` / `server:chat_message`）

---

## 4. 前端遊戲桌面骨架

1. 建立遊戲桌面布局（`app/pages/game/[id].vue`）：
   - CSS Grid 四人桌面（上/左/右/下玩家區 + 中央公共區）
   - RWD：手機版切換為單欄直向（media query）
2. 玩家區元件：
   - 頭像（governor 王冠、active 脈衝動畫）
   - 手牌張數 + 裝飾扇形（少/中/多三段）
   - 建築縮圖列（按工廠分開顯示貨物狀態）
   - hover 展開詳細資訊（預設 `hover` 模式）
3. 自己的手牌區（可點擊、可選取）。
4. 中央公共區（牌堆張數、棄牌數、回合數、價格牌）。
5. 左下遊戲指引區（即時行動記錄）。
6. 右下角設定抽屜（Drawer）：
   - 玩家資訊顯示模式（hover / always）
   - 建築說明模式（compact / detailed，預設 detailed）
   - 「再次開啟介面導覽」按鈕
7. 右下角聊天浮窗（遊戲中）。
8. 實作 Onboarding 介面導覽（7 步驟，首次自動觸發，可跳過，可再次開啟）。

---

## 5. 遊戲 Modal / 互動元件

1. 通用卡片選擇器（Card Selector）——其他 Modal 共用。
2. 職業選擇 Modal（已選職業 disabled，顯示選取玩家頭像）。
3. 製造商工廠選擇 Modal（一般選 1，特權選 2，二次確認）。
4. 建築師兩步驟 Modal（選建築 → 選支付手牌）。
5. 貿易商售貨 Modal（顯示有貨工廠 + 當前價格牌）。
6. 議員選牌 Modal（一般抽 2 選 1；特權抽 5 選 1，全部展開不分頁）。
7. 手牌超上限棄牌 Modal（強制，不可隱藏，選滿才可送出）。
8. 通用結果確認彈窗（單步驟結果通知）。
9. 斷線重連 UI（遮罩 + 自動重連動畫 + 手動重連 / 返回大廳）。

---

## 6. 狀態機與遊戲流程

1. 建立回合狀態機：
   - `WAITING_PLAYERS` → `ROUND_ROLE_SELECTION` → `ROUND_ACTION_RESOLUTION` → `ROUND_END_CHECK` → `GAME_END`
2. 實作職業選擇流程（順時鐘輪流，總督先選）。
3. 實作各職業行動流程（依 `docs/gameFlow/gameFlow.md`）。
4. 實作 12 棟建築終局觸發與計分結算。
5. 實作貿易商「全員完成後一次結算」邏輯。
6. 實作 `client:prospect` 事件（礦工：特權玩家觸發抽牌，結果顯示於遊戲指引，不開 Modal）。

---

## 7. 儲存與同步

1. 實作 `usePersistence.ts`：
   - LocalStorage key 格式：`sj.[type].[desc].v[n]`
   - 啟動時執行 migration pipeline（schema 版本升級）
   - 損壞時保留備份並引導重建對局
2. 儲存項目：
   - `sj.player.profile.v1`（Discord 身份）
   - `sj.room.session.v1`（房間 session）
   - `sj.game.snapshot.v1`（對局快照，`GameSnapshot`）
   - `sj.game.eventlog.v1`（事件記錄）
   - `sj.ui.onboarding.v1`（導覽完成狀態）
   - `sj.ui.settings.v1`（玩家設定：顯示模式、建築說明模式）
3. 同瀏覽器多分頁同步：`BroadcastChannel('sj-room')`。

---

## 8. 測試與驗收

### 單元測試（Vitest）
1. 遊戲引擎：職業流程、建築效果、`canDispatch` 合法行動判定（固定 seed）。
2. 狀態機 transition：各 phase 轉換條件。
3. LocalStorage migration：v1→v2 欄位補值、損壞 snapshot 備份。
4. JSON 資料欄位驗證：id 唯一、必要欄位非空、數值範圍合法。
5. Discord OAuth callback mock（`.nuxt.test.ts`）。
6. Socket.io `ILLEGAL_ACTION` 判定。

### E2E 測試（Playwright）
1. Discord 登入 → 進入大廳（`e2e/auth.spec.ts`）。
2. 建立房間 → 加入房間 → 開始遊戲（`e2e/lobby.spec.ts`）。
3. 完整一輪遊戲流程 smoke test（`e2e/game-round.spec.ts`）。
4. 首次進桌面顯示導覽 → 完成導覽（`e2e/onboarding.spec.ts`）。
5. 頁面刷新後恢復對局（`e2e/persistence.spec.ts`）。
