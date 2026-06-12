# San Juan Online

聖胡安桌遊線上版，以 Nuxt（TypeScript）開發的多人瀏覽器桌遊平台。

---

## 1. 專案基本資料

- **專案名稱**：San Juan Online（聖胡安桌遊線上版）
- **框架**：Nuxt 4（TypeScript，使用 `app/` 目錄）
- **語言**：TypeScript 5（strict mode）
- **UI**：Vue 3
- **即時通訊**：Socket.io（Namespace: `/game`）
- **身份驗證**：Discord OAuth2（Scope: `identify`，Client Secret 僅在 Nitro server 端使用）
- **資料儲存**：LocalStorage（無後端資料庫）
- **靜態遊戲資料**：專案內 JSON 檔（`data/`）
- **套件管理**：npm（鎖檔為 `package-lock.json`，統一使用 npm，不新增其他鎖檔）

### 常用指令

- `npm run dev`：啟動 Nuxt 開發伺服器（預設 port 3000）
- `npm run build`：建置專案
- `npm run preview`：預覽正式環境建置結果
- `npm run generate`：靜態匯出
- `npm run lint`：執行 ESLint 檢查

---

## 2. 開發流程

每個功能都依照以下六個步驟進行，不跳步驟。

### 步驟一：閱讀文件

開始實作前，必須閱讀：

- **SDD**（`docs/sdd/sdd.md`）：確認功能邊界、資料結構、角色權限
- **線稿圖**（`docs/wireframe/`）：確認 UI 布局與互動行為
- **詞彙表**（`docs/sdd/ Glossary.md`）：涉及遊戲規則時核對術語命名
- **API 列表**（`docs/sdd/API_list.md`）：涉及 API 或 Socket.io 事件時確認介面

若設計稿、線稿圖與 SDD 有不一致，**先在回覆中說明差異並詢問以哪份為準，不自行決定**。

### 步驟二：建立分支

AI agent 提供建議 branch 名稱，**等使用者切換到新 branch 後**才開始修改檔案。

分支命名格式：`[類型]/[功能描述]`

範例：
- `feat/lobby-room-list`
- `feat/game-engine-state-machine`
- `fix/discord-oauth-callback`
- `chore/card-data-json`

不在 `main` 或 `dev` 上直接開發。

### 步驟三：實作

- 依 SDD 與線稿圖實作，若有差異須說明
- 涉及遊戲規則邏輯時，同步在 `tests/unit/` 補上對應測試
- 不自行導入新套件（需說明必要性後再確認）

### 步驟四：本地驗證

實作完成後，依序執行以下指令，全部通過才進入下一步：

```bash
npm run lint      # ESLint 檢查
npm run build     # 確認無型別錯誤、建置成功
npm run test      # Vitest 單元測試
```

若有測試失敗或 lint error，先修正再繼續，不跳過。

### 步驟五：請使用者驗收 UI

通過步驟四後，**由 AI agent 主動告知使用者**：

- 啟動方式：`npm run dev`，開啟 `http://localhost:3000`
- 驗收重點：列出本次功能的操作路徑與邊界情境
- 若有尚未實作的互動細節，一併說明

**等使用者確認畫面 OK 後**，才進入步驟六。

### 步驟六：提供 Git 資訊

使用者確認後，AI agent 提供以下資訊，Git 操作由使用者執行：

**Commit Message（English）**

格式：Conventional Commits

```text
feat(lobby): implement room list with create/join flow
feat(engine): add role selection state machine
fix(auth): handle discord oauth callback error redirect
chore(data): add buildings and roles JSON assets
```

**Merge Request 標題與描述（繁體中文）**

```text
## 變更內容
- 實作大廳房間列表頁，支援公開房間篩選。
- 建立「建立房間」與「加入房間」表單流程。

## 影響頁面 / 模組
- `app/pages/lobby.vue`
- `app/composables/useRoom.ts`

## 驗證項目
- [x] npm run lint 通過
- [x] npm run build 通過
- [x] npm run test 通過
- [x] 使用者已驗收 UI 畫面
```

使用者完成 commit、push、merge 後，切回 `main` 並 pull：

```bash
git switch main
git pull
```

確認 `main` 更新後，AI agent 提供下一個功能的建議 branch 名稱。

---

## 3. 專案文件索引

| 文件 | 路徑 |
|------|------|
| SDD（系統設計文件） | `docs/sdd/sdd.md` |
| 詞彙表 | `docs/sdd/ Glossary.md` |
| API 列表（REST + Socket.io） | `docs/sdd/API_list.md` |
| 遊戲流程圖 | `docs/gameFlow/gameFlow.md` |
| 線稿圖 | `docs/wireframe/` |
| 整體任務清單 | `docs/todo/overall-task-list.md` |
| 每週 Todo | `docs/todo/` |

### SDD 參考規則

進行以下工作前，請優先參考 SDD：

- 新增或修改頁面 / 模組
- 新增或修改 API 或 Socket.io 事件
- 調整遊戲狀態機（`GameSnapshot`、回合流程）
- 調整 LocalStorage 資料結構（需考量 schema migration）
- 調整角色權限（Guest / Discord Player / Room Host）

若實作與 SDD 不一致，需先在回覆中說明差異與原因，不要直接改變既有設計方向。

若設計稿、線稿圖與 SDD 不一致，請先在回覆中說明差異，並詢問應以哪一份為準，不要自行決定。

---

## 4. 會議記錄

每週會議後，依照以下模板在 `docs/todo/` 建立對應紀錄檔案，命名格式為 `M-DD-todo.md`（例如 `6-19-todo.md`）。

### 每週工作紀錄模板

```markdown
# 每週工作紀錄 YYYY-MM-DD

## 出席成員
- 

## 本週完成事項
- 

## 討論與決策
| 議題 | 決策內容 | 負責人 |
|------|----------|--------|
|      |          |        |

## 待解問題 / 障礙
- 

## 下週目標
- 

## 備註
- 
```

### Todo 模板

```markdown
# Todo YYYY-MM-DD

## 高優先（本週必須完成）
- [ ] 

## 中優先（本週目標）
- [ ] 

## 低優先（有餘力再做）
- [ ] 

## 待釐清（需討論後才能動）
- [ ] 
```

---

## 測試規範

### 測試工具

| 工具 | 用途 |
|------|------|
| `vitest` | 單元測試 / 元件測試 runner |
| `@vue/test-utils` | Vue 元件掛載與互動測試 |
| `@nuxt/test-utils` | Nuxt 環境整合測試 |
| `happy-dom` | 輕量 DOM 模擬環境（Vitest 預設環境） |
| `@playwright/test` | E2E 瀏覽器端對端測試 |

### 常用測試指令

- `npm run test`：執行全部單元測試（單次）
- `npm run test:watch`：監聽模式，檔案異動即重跑
- `npm run test:coverage`：產生覆蓋率報告
- `npm run test:e2e`：執行 Playwright E2E 測試（需先啟動 dev server 或由 playwright.config.ts 自動啟動）

### 測試檔命名

- 單元測試（純邏輯）：`*.test.ts`，放在與原始檔相同目錄或 `tests/unit/`
- Vue 元件測試：`*.test.ts`，使用 `@vue/test-utils` 掛載
- 整合測試（需要 Nuxt 環境）：`*.nuxt.test.ts`
- E2E 測試：`*.spec.ts`，放在 `e2e/` 目錄

### 高優先測試範圍

下列模組異動時**必須**補上對應測試：

| 模組 | 測試重點 |
|------|----------|
| `useGameEngine` | 職業流程、建築效果、合法行動判斷（`canDispatch`）；需使用固定 seed 確保 deterministic |
| 狀態機 transition | 每個 phase 轉換條件（`WAITING_PLAYERS` → `ROUND_ROLE_SELECTION` 等） |
| `usePersistence` | LocalStorage schema migration（v1→v2 欄位補值、損壞 snapshot 備份流程） |
| 遊戲 JSON 資料 | 欄位完整性（id 唯一、必要欄位非空、數值範圍合法） |
| `server/api/auth/discord/callback` | OAuth token exchange mock（驗證失敗導回登入） |
| Socket.io 行動驗證 | `ILLEGAL_ACTION` 判定（非法 dispatch 需被阻擋） |

### 測試規則

- 遊戲引擎測試使用固定 seed（不依賴 `Math.random()`），確保可重現
- 測試不直接存取 LocalStorage，透過 `usePersistence` 介面操作並 mock storage
- 不 mock 遊戲規則本身；只 mock 外部依賴（Discord API、LocalStorage、Socket）
- 每個 `GameAction` 至少有一個正常路徑測試 + 一個非法路徑測試
- 新增職業效果或建築效果時，需同步補上該效果的規則單元測試

### E2E 測試範圍

E2E 測試聚焦在完整使用者流程，不重複覆蓋單元測試已驗證的規則邏輯：

| 流程 | 測試檔 |
|------|--------|
| Discord 登入 → 進入大廳 | `e2e/auth.spec.ts` |
| 建立房間 → 加入房間 → 開始遊戲 | `e2e/lobby.spec.ts` |
| 完整一輪遊戲流程（smoke） | `e2e/game-round.spec.ts` |
| 首次進桌面顯示導覽 → 完成導覽 | `e2e/onboarding.spec.ts` |
| 頁面刷新後可恢復對局 | `e2e/persistence.spec.ts` |

### GitHub CI

推送至 `main` 或 `dev`、對 `main` 發 PR 時自動觸發（`.github/workflows/ci.yml`）：

1. **lint-and-test** job：`npm run lint` → `npm run test`
2. **e2e** job（依賴 lint-and-test 通過）：build → `npm run test:e2e`
3. E2E 測試失敗時自動上傳 Playwright report 作為 Artifact（保留 7 天）

### 測試目錄結構

所有測試檔統一放在 `tests/` 目錄，不散落在原始碼旁。

```
tests/
  unit/                              # Vitest 單元測試（*.test.ts）
    engine/
      useGameEngine.test.ts          # 核心狀態機與 dispatch
      roles/
        builder.test.ts              # 建築師職業流程
        producer.test.ts             # 製造商職業流程
      buildings/
        chapel.test.ts               # 教堂建築效果
    persistence/
      migration.test.ts              # LocalStorage schema migration
    data/
      cards.test.ts                  # JSON 資料欄位驗證
    server/
      discord-callback.nuxt.test.ts  # OAuth callback（需 Nuxt 環境）
  e2e/                               # Playwright E2E 測試（*.spec.ts）
    auth.spec.ts                     # Discord 登入 → 進入大廳
    lobby.spec.ts                    # 建立房間 → 加入 → 開始遊戲
    game-round.spec.ts               # 完整一輪遊戲流程（smoke）
    onboarding.spec.ts               # 首次導覽顯示與完成
    persistence.spec.ts              # 頁面刷新後恢復對局
```

---

## 開發規範

### 命名規範

- 變數與函式：camelCase（`getPlayerState`）
- 元件與型別：PascalCase（`GameBoard`、`PlayerProfile`）
- 常數：UPPER_SNAKE_CASE（`MAX_HAND_SIZE`）
- 元件檔案名稱：PascalCase（`GameBoard.vue`）
- 非元件檔案名稱：camelCase（`useGameEngine.ts`、`gameService.ts`）
- 布林值：`is`/`has`/`can` 前綴（`isHost`、`canBuild`）

### TypeScript

- 禁止使用 `any`，必要時使用 `unknown` 搭配型別守衛
- 使用 `interface` 定義物件型別，使用 `type` 定義聯合型別或工具型別
- 所有匯出的函式都必須標註回傳型別
- 遊戲核心型別放在 `types/`（`game.ts`、`room.ts`、`player.ts`、`events.ts`）

### Vue / Nuxt 元件開發

- 統一使用 TypeScript 撰寫 Vue 元件，檔案副檔名使用 `.vue`
- 預設使用 Nuxt `<script setup lang="ts">` 語法
- Props 使用 `defineProps<{ ... }>()` 定義
- 共用邏輯抽成 composable，例如 `app/composables/useXxx.ts`
- 共用 UI 元件放在 `app/components/`，頁面放在 `app/pages/`
- 超過 200 行或職責過多的元件應拆分為子元件
- 樣式優先使用 scoped CSS 或 Tailwind CSS（若已導入）

### 遊戲引擎規範

- 規則引擎（`useGameEngine.ts`）需與 UI 完全解耦
- 狀態機 dispatch 必須是 deterministic（相同輸入必須產生相同輸出）
- 引擎內部不得直接存取 LocalStorage，由 `usePersistence.ts` 負責
- 所有遊戲狀態異動需透過 `GameAction` dispatch，禁止直接 mutate `GameSnapshot`

### LocalStorage 規範

- 所有 LocalStorage 物件需帶 `schemaVersion`
- key 命名格式：`sj.[資料類型].[描述].v[版本]`（例如 `sj.game.snapshot.v1`）
- 啟動時需執行 migration pipeline，失敗則保留備份並引導使用者重建對局
- OAuth token 不落地 LocalStorage（僅 session memory 或 secure cookie）

### 錯誤處理

- Socket.io 行動錯誤統一使用 `server:error` 私訊回應
- LocalStorage 寫入失敗需有 fallback 提示（容量滿、隱私模式）
- OAuth 驗證失敗導回登入頁（`AUTH_ERROR`）
- 遊戲狀態損壞提供 reset 選項（`STATE_CORRUPTED`）
- 玩家操作不合法阻擋並提示原因（`ILLEGAL_ACTION`）

### 套件導入規則

不得未經確認自行導入大型依賴、替換技術棧或改變套件管理工具。

若需要新增套件，需先說明：
- 套件用途
- 為什麼現有技術不足
- 對專案結構、測試與維護成本的影響

本專案統一使用 npm，不要新增 `pnpm-lock.yaml`、`yarn.lock` 或其他套件管理器鎖檔。

---

## 回應規範

- 一律使用繁體中文回應
- commit message 使用 Conventional Commits 格式，描述使用英文
- Merge Request（MR）的標題與描述使用繁體中文
- 程式碼中的變數名稱與註解使用英文
- 遊戲領域術語依詞彙表（`docs/sdd/ Glossary.md`）使用英文命名（例如 `Governor`、`Prospector`）
