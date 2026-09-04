# 進入遊戲後流程實作計畫

## 規格差異決策

- [x] `Prospector` 不開操作選擇 Modal，因為礦工階段沒有可選行動。
- [x] `Prospector` 抽牌結果使用通用結果確認彈窗。
- [x] `Prospector` 抽牌結果同步寫入左下遊戲指引 / event log。

## 分支 1：`feat/game-engine-core-flow`

### 目標

- [x] 完成 deterministic game engine 骨架，讓遊戲能從房間開始後產生可操作的 `GameSnapshot`。

### 實作項目

- [x] 實作 `useGameEngine.createGame(seed, players)`。
- [x] 固定 4 人檢查，修正目前 server `createGameForRoom` 只檢查玩家數大於 0 的落差。
- [x] 在 `/game/[id]` 加入離開遊戲按鈕，讓玩家可返回房間或大廳。
- [x] 離開遊戲前顯示確認流程，避免誤觸中斷目前對局。
- [x] 離開遊戲時依目前資料狀態保留 `sj.game.snapshot.v1`，不直接清除未完成對局。
- [x] 初始化每位玩家 1 個 `Indigo Plant`。
- [x] 初始化每位玩家 4 張手牌。
- [x] 實作 deterministic shuffle。
- [x] 指定 `governorPlayerId`。
- [x] 初始化 phase 為 `ROUND_ROLE_SELECTION`。
- [x] 補齊 `GameSnapshot` 需要的 turn / action 狀態欄位，例如已選職業、當前行動玩家、已完成玩家等。
- [x] 建立 event log 的基礎格式。

### 測試項目

- [x] 新增 `tests/unit/engine/useGameEngine.test.ts`。
- [x] 新增 `tests/unit/engine/state-machine.test.ts`。
- [x] 測試固定 seed 下洗牌與初始手牌 deterministic。
- [x] 測試玩家不足 4 人不可開局。
- [x] 測試玩家超過 4 人不可開局。
- [x] 測試初始 phase 正確。
- [x] 測試 Governor 正確。
- [x] 測試初始手牌、建築、deck / discard 狀態正確。
- [x] 測試離開遊戲按鈕會顯示確認流程。
- [x] 測試確認離開後導回房間或大廳。
- [x] 測試取消離開後仍停留在遊戲頁。

## 分支 2：`feat/game-role-selection-flow`

### 目標

- [x] 完成一回合內的職業選擇流程。

### 實作項目

- [x] 實作 `SELECT_ROLE`。
- [x] 已選職業不可再選。
- [x] 依 Governor 起順時鐘決定選職業順序。
- [x] 每位玩家選完後推進 active player。
- [x] 選完職業後進入該職業的 `ROUND_ACTION_RESOLUTION`。
- [x] 若本回合所有職業選擇完成，進入 `ROUND_END_CHECK`。
- [x] 擴充 Socket event type：`client:select_role`。
- [x] 擴充 Socket event type：`server:role_selection_start`。
- [x] 擴充 Socket event type：`server:role_selected`。
- [x] 擴充 Socket event type：`server:action_prompt`。
- [x] 擴充 Socket event type：`server:error`。

### 測試項目

- [x] 新增 `tests/unit/engine/roles/role-selection.test.ts`。
- [x] 測試 Governor 選職業後輪到下一位。
- [x] 測試非 active player 不可選職業。
- [x] 測試已被選的職業不可再選。
- [x] 測試所有玩家都選過後進入回合結束檢查。
- [x] 補 Socket `ILLEGAL_ACTION` 測試。

## 分支 3：`feat/game-table-ui-shell`

### 目標

- [x] 把 `/game/[id]` 做成可承載流程的桌面 UI。

### 實作項目

- [x] 實作四人桌面布局：上 / 左 / 右 / 下玩家區。
- [x] 實作中央公共區：deck、discard、Price Card、phase、round。
- [x] 實作左下遊戲指引 / event log。
- [x] 實作右下 `i` Drawer。
- [x] 玩家區顯示 avatar。
- [x] 玩家區顯示 Governor 標示。
- [x] 玩家區顯示 active player 高亮。
- [x] 玩家區顯示 hand count。
- [x] 玩家區顯示 buildings。
- [x] 玩家區依工廠分開顯示 goods。
- [x] 自己手牌區顯示完整卡片資訊。
- [x] 其他玩家只顯示手牌數，不顯示手牌內容。
- [x] 設定玩家資訊顯示模式：`hover` / `always`。
- [x] 設定建築說明模式：`compact` / `detailed`。

### 測試項目

- [x] 新增 game table Vue component / page 測試。
- [x] 測試 phase 正確顯示。
- [x] 測試 active player 正確顯示。
- [x] 測試 Governor 正確顯示。
- [x] 測試其他玩家不顯示手牌內容。
- [x] 測試 settings 切換後 UI 狀態正確。
- [x] 新增 `e2e/game-table.spec.ts` smoke test。
- [x] 測試進入 `/game/[id]` 可看到桌面主要區塊。

## 分支 4：`feat/game-action-modals`

### 目標

- [x] 完成職業操作需要的共用 UI 元件與前端互動殼。

### 實作項目

- [x] 實作通用 `CardSelectorModal`。
- [x] 實作通用結果確認彈窗。
- [x] 實作職業選擇 Modal。
- [x] 實作 `Producer` 工廠選擇 Modal。
- [x] 實作 `Builder` 兩步驟 Modal。
- [x] 實作 `Trader` 售貨 Modal。
- [x] 實作 `Councillor` 選牌 Modal。
- [x] 實作手牌超上限棄牌 Modal。
- [x] Modal 支援 `隱藏` 後保留目前選取狀態。
- [x] disabled card 維持可見但不可選。

### 測試項目

- [x] 測試 card pagination。
- [x] 測試 selected 狀態。
- [x] 測試 disabled 狀態。
- [x] 測試 `Producer` 一般玩家最多選 1 個工廠。
- [x] 測試 `Producer` 特權玩家最多選 2 個工廠。
- [x] 測試 `Builder` 不可建重複城市建築。
- [x] 測試 `Builder` 手牌不足時 card disabled。
- [x] 測試 `Councillor` 限選 1 張。
- [x] 測試 discard hand limit 選滿才可確認。
- [x] E2E 測試職業選擇 Modal 顯示已選玩家 avatar。
- [x] E2E 測試已選職業 disabled。

## 分支 5：`feat/game-role-actions-engine`

### 目標

- [x] 讓五個職業的 engine 行動實際改變遊戲狀態。

### 實作項目

- [x] 實作 `PROSPECT`。
- [x] 實作 `PRODUCE`。
- [x] 實作 `BUILD`。
- [x] 實作 `TRADE`。
- [x] 實作 `COUNCIL`。
- [x] 實作 `DISCARD`。
- [x] 每個 action 都補上 `canDispatch`。
- [x] `Producer`：有貨工廠不可再生產。
- [x] `Producer`：一般玩家可生產 1 個 goods。
- [x] `Producer`：特權玩家可生產 2 個 goods。
- [x] `Builder`：一般玩家照 cost 支付。
- [x] `Builder`：特權玩家 cost 減 1。
- [x] `Builder`：城市建築不可重複。
- [x] `Trader`：翻 Price Card。
- [x] `Trader`：一般玩家可賣 1 個 goods。
- [x] `Trader`：特權玩家可賣 2 個 goods。
- [x] `Trader`：全員完成後一次結算。
- [x] `Councillor`：一般玩家抽 2 留 1。
- [x] `Councillor`：特權玩家抽 5 留 1。
- [x] `Prospector`：特權玩家抽 1 張手牌。
- [x] 回合結束時檢查手牌上限。
- [x] 回合結束時移交 Governor。
- [x] 回合結束後進入下一回合。

### 測試項目

- [x] 新增 `tests/unit/engine/roles/producer.test.ts`。
- [x] 新增 `tests/unit/engine/roles/builder.test.ts`。
- [x] 新增 `tests/unit/engine/roles/trader.test.ts`。
- [x] 新增 `tests/unit/engine/roles/councillor.test.ts`。
- [x] 新增 `tests/unit/engine/roles/prospector.test.ts`。
- [x] 每個 `GameAction` 至少有一個正常路徑測試。
- [x] 每個 `GameAction` 至少有一個非法路徑測試。
- [x] 測試 `Trader` 全員完成後才結算。
- [x] 測試回合結束後 Governor 正確移交。
- [x] 測試 hand limit discard 流程。

## 分支 6：`feat/game-end-scoring-persistence`

### 目標

- [ ] 完成終局、計分、保存與刷新恢復。

### 實作項目

- [ ] 實作 12 棟建築終局觸發。
- [ ] 當前回合結束後進入 `GAME_END`。
- [ ] 實作基礎 VP 計算。
- [ ] 實作 `City Hall` 加分。
- [ ] 實作 `Guild Hall` 加分。
- [ ] 實作 `Palace` 加分。
- [ ] 實作 `Triumphal Arch` 加分。
- [ ] 實作 tie breaker：手牌數 + 生產建築上的 goods 數。
- [ ] 實作或補齊 `usePersistence`。
- [ ] 接上 `usePersistence` 儲存 UI settings：玩家資訊顯示模式與建築說明模式。
- [ ] 儲存 `sj.game.snapshot.v1`。
- [ ] 儲存 `sj.game.eventlog.v1`。
- [ ] 實作 migration pipeline。
- [ ] 實作 corrupted snapshot backup。
- [ ] 實作 BroadcastChannel 同瀏覽器多分頁同步。
- [ ] `/api/games/:gameId/result` 回傳實際分數。

### 測試項目

- [ ] 新增 `tests/unit/engine/scoring.test.ts`。
- [ ] 新增 `tests/unit/engine/game-end.test.ts`。
- [ ] 新增 `tests/unit/persistence/migration.test.ts`。
- [ ] 補 `tests/unit/server/games.test.ts` 實際 result cases。
- [ ] 新增 `e2e/game-round.spec.ts` 完整一輪 smoke test。
- [ ] 新增 `e2e/persistence.spec.ts` 頁面刷新後恢復對局。

## 每個分支完成條件

- [x] 執行 `npm run lint` 並通過。
- [x] 執行 `npm run build` 並通過。
- [x] 執行 `npm run test` 並通過。
- [ ] 有 UI 異動的分支執行 `npm run test:e2e` 並通過，或記錄無法執行原因。
- [ ] 提供啟動方式：`npm run dev`，開啟 `http://localhost:3000`。
- [ ] 提供本分支 UI 驗收重點。
- [ ] 等使用者確認畫面 OK 後，再提供 commit message 與 MR 描述。

## 第一支建議分支

- [ ] 從 `dev` 切出 `feat/game-engine-core-flow`。
- [ ] 等使用者切換到新 branch 後再開始修改檔案。
