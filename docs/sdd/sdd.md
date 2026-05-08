# San Juan Online (Nuxt + Discord)  
Software Design Document (SDD) v0.1

## 1. 文件目的與範圍
本文件定義「聖胡安桌遊線上版」第一版技術設計，聚焦以下條件：
- 前端框架使用 Nuxt（TypeScript）。
- 遊戲靜態資料（牌組、建築、角色、設定）以 JSON 檔存於專案內。
- 不使用外部資料庫。
- 玩家資料與遊玩過程狀態儲存在瀏覽器 LocalStorage。
- 支援 Discord 遊玩流程（登入、建立/加入房間、分享房間連結、回合互動通知）。

本版先建立可實作骨架；詳細規則流程、完整玩法與 UI 線稿由後續版本補上。

## 2. 目標與非目標
## 2.1 目標
- 能在瀏覽器中完成固定 4 人房間制遊玩（以 San Juan 規則為基礎）。
- 透過 Discord OAuth2 取得玩家身份，降低註冊成本。
- 房間資料在「同一瀏覽器環境」中可恢復（刷新/短暫關閉後可續玩）。
- 遊戲規則由前端 deterministic engine 驅動，避免手動作弊。

## 2.2 非目標（V0.1）
- 不做跨裝置即時同步（無後端狀態伺服器）。
- 不做全球排行榜、雲端存檔、交易系統。
- 不做完整 Discord Bot 指令遊戲邏輯（僅整合登入/邀請/通知輔助）。

## 3. 系統總覽
## 3.1 架構概念
- `Nuxt Client App`：UI、狀態管理、規則運算、LocalStorage 持久化。
- `Nuxt Server API (Nitro)`：僅處理敏感流程（Discord OAuth token 交換），不保存遊戲資料。
- `Discord Platform`：OAuth2 身份提供、社群入口、房間分享。
- `Project JSON Assets`：遊戲靜態資料來源（版本化、可 PR review）。

## 3.2 關鍵限制
- 無資料庫代表多人同步僅能依賴：
- 相同裝置多分頁（`storage` event / BroadcastChannel）或
- 房主廣播狀態（後續可擴 WebRTC/Discord activity）。
- LocalStorage 容量有限（通常 ~5MB），需壓縮存檔結構。

## 4. 使用者角色
- `Guest`：未登入，可查看首頁/規則摘要。
- `Discord Player`：已 Discord 登入，可建立或加入房間、進行遊戲。
- `Room Host`：建立房間者，負責開局設定與流程控制（V0.1 可先由 Host 驅動回合推進）。

## 5. 功能需求（V0.1）
## 5.1 身份與登入
- 使用 Discord OAuth2 登入。
- 取得並保存最小身份資訊：`discordId`, `username`, `avatar`.
- 可登出並清除本地快取身份。

## 5.2 房間與對局管理
- 建立房間：固定 4 人、可選擇公開/私有（私有用 room code）。
- 加入房間：輸入 room code 或從 Discord 分享連結進入。
- 開始遊戲：由 Host 觸發；需湊滿 4 人後才可開局，並初始化牌堆與玩家初始手牌。

## 5.3 遊戲流程（骨架）
- 回合狀態機：
- `WAITING_PLAYERS`
- `ROUND_ROLE_SELECTION`
- `ROUND_ACTION_RESOLUTION`
- `ROUND_END_CHECK`
- `GAME_END`
- 支援玩家行為事件記錄（Event Log）與可重播（基於 event sourcing 簡化除錯）。

## 5.4 本地保存與恢復
- 每次關鍵事件後自動存檔至 LocalStorage。
- 頁面重整後可恢復最近一場未完成對局。
- 提供「清除本地對局資料」功能。

## 5.5 開局前介面導覽（Onboarding）
- 玩家首次進入遊戲桌面（`/game/[id]`）時，系統需先顯示介面導覽，完成或跳過後才進入可操作狀態。
- 導覽內容至少包含：
- 玩家區資訊位置（頭像、名稱、手牌數、建築數、貨物數）
- 中央公共區（牌堆、價格牌、棄牌區、階段提示）
- 左下遊戲指引區
- 右下角 `i` icon（操作與設定入口）
- 導覽流程需求：
- 可逐步下一步/上一步
- 可跳過
- 可在設定中再次開啟導覽
- 導覽狀態需保存於 LocalStorage（每位玩家裝置獨立）。

## 6. 非功能需求
- 可靠性：LocalStorage 寫入失敗要有 fallback 提示（容量滿、隱私模式）。
- 可維護性：規則 engine 與 UI 解耦，遊戲規則可單測。
- 可測試性：狀態機與規則判定需有 deterministic 測試（固定 seed）。
- 效能：單局狀態序列化/反序列化在一般桌機 < 50ms。
- 安全性：OAuth token 不落地 LocalStorage（僅 session memory 或 secure cookie）。

## 7. 資料設計
## 7.1 專案內 JSON（靜態）
建議路徑：
- `data/cards.buildings.json`
- `data/cards.roles.json`
- `data/rules.config.json`
- `data/locales/zh-TW.json`

示意結構：
```json
{
  "id": "building_indigo_plant",
  "name": "Indigo Plant",
  "cost": 1,
  "vp": 1,
  "tags": ["production"],
  "effect": {
    "type": "produce_bonus",
    "value": 1
  }
}
```

## 7.2 LocalStorage（動態）
建議 key：
- `sj.player.profile.v1`
- `sj.room.session.v1`
- `sj.game.snapshot.v1`
- `sj.game.eventlog.v1`
- `sj.ui.onboarding.v1`

`GameSnapshot` 建議欄位：
- `schemaVersion`
- `gameId`
- `roomId`
- `hostPlayerId`
- `players[]`
- `deckState`
- `discardState`
- `turnState`
- `phase`
- `winner` (nullable)
- `updatedAt`

## 8. 模組切分（Nuxt）
## 8.1 目錄建議
- `app/pages/`：`index`, `login`, `lobby`, `room/[id]`, `game/[id]`
- `app/components/`：桌面 UI 元件、手牌區、建築區、角色操作區
- `app/composables/`：
- `useAuth.ts`（Discord 身份）
- `useRoom.ts`（房間狀態）
- `useGameEngine.ts`（規則與狀態機）
- `usePersistence.ts`（LocalStorage 存取與 migrate）
- `useOnboarding.ts`（介面導覽狀態）
- `server/api/auth/discord/callback.ts`：OAuth token exchange
- `data/`：遊戲 JSON
- `types/`：`game.ts`, `room.ts`, `player.ts`, `events.ts`

## 8.2 核心介面（概念）
```ts
interface GameEngine {
  createGame(seed: string, players: PlayerProfile[]): GameSnapshot
  dispatch(action: GameAction): GameSnapshot
  canDispatch(action: GameAction, state: GameSnapshot): boolean
}
```

## 9. Discord 串接設計
## 9.1 OAuth2
- Scope：`identify`（V0.1 最小需求）。
- Client Secret 僅在 Nitro server 端使用。
- 登入成功後前端只拿到必要 profile，不保留長期 access token。

## 9.2 房間分享
- 房主可生成分享連結：
- `https://<domain>/room/<roomId>?invite=<shortCode>`
- Discord 中以一般訊息分享連結即可。

## 9.3 後續可擴充
- Discord Activity 嵌入。
- Bot 通知回合輪到誰（Webhook/Bot token）。

## 10. 狀態同步策略（無 DB）
V0.1 先定義單機優先：
- 同瀏覽器多分頁：`BroadcastChannel('sj-room')` 同步 snapshot。
- 寫入衝突解法：`updatedAt` + `turnCounter`，以較新且合法 state 為準。
- 若檢測到衝突且無法自動合併，提示使用者重新載入房主狀態。

## 11. 錯誤處理
- `AUTH_ERROR`：Discord 驗證失敗，導回登入頁。
- `LOAD_ASSET_ERROR`：JSON 資料讀取失敗，顯示維護訊息。
- `STATE_CORRUPTED`：snapshot schema 不符或損壞，提供 reset。
- `ILLEGAL_ACTION`：玩家操作不合法，阻擋並提示原因。

## 12. 版本與遷移策略
- 所有 LocalStorage 物件帶 `schemaVersion`。
- 啟動時執行 migration pipeline：
- `v1 -> v2` 欄位補值/改名
- migration 失敗則保留備份並引導重建對局

## 13. 測試策略
- 單元測試：
- 規則判定（角色效果、建築效果、回合流）
- reducer/state machine transition
- 整合測試：
- Discord callback mock
- 建房 -> 開局 -> 完成一輪 -> 存檔 -> 重載恢復
- 首次進桌面顯示導覽 -> 完成導覽 -> 可操作遊戲
- 已完成導覽再次進入桌面 -> 不重複自動彈出
- E2E（後續）：
- 多玩家流程 smoke test（可先用假資料玩家）

## 14. 里程碑（建議）
- M1：專案骨架 + Discord 登入 + Lobby/Room UI
- M2：Game Engine（核心回合 + 牌組資料）+ LocalStorage 持久化
- M3：規則完整化 + 錯誤處理 + 測試補齊
- M4：Discord 分享優化 + UI polish + Beta 測試

## 15. 待補清單（你後續提供）
- 完整玩法流程（phase、先後順序、勝利判定細節）
- 各角色/建築效果精確文字與優先權
- 線稿圖與資訊架構（頁面區塊、按鈕行為）
- 是否要支援擴充版規則
