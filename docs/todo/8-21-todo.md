# Todo 2026-08-21

> 建立日期：2026-08-21
> 目前 branch：`feat/room-chat-polish`（從 `dev` 開出，尚未 commit）
> 六步驟進度：已完成步驟四（本地驗證），**卡在步驟五：使用者驗收 UI**

---

## 本次已完成（`feat/room-chat-polish`）

改動 10 個檔案，+321 / -99。`npm run lint` / `npm run build` / `npm run test`（6 files / 44 tests）全通過。

### 房間等待室完工

- [x] `app/pages/room/[id].vue` 重寫
  - 修掉 `_sendMessage` 解構（`useRoom()` 回傳的是 `sendMessage`），聊天室原本永遠是 `undefined`
  - 依線稿圖 13-B 補上「（空位）等待加入」格
  - 踢人按鈕改為 host-only 且不能踢自己
  - 準備改為 toggle，`setReady(!isReady)` 明確帶值
  - 開始遊戲改為 host-only，未滿 4 人或未全員準備時 disabled 並附說明
  - `status === 'playing' && gameId` 時全房自動導向 `/game/:gameId`
  - 被踢出／房主關房（`currentRoom` 變 null）自動回 `/lobby`
  - API 與 socket 錯誤顯示在畫面上，不再只有 `console.error`
- [x] `app/composables/useRoom.ts`
  - 換房時清空 `chatMessages` / `socketErrors`
  - **修 SSR bug**：原本用 `$fetch` 呼叫內部 API，SSR 階段不帶 cookie，房間頁與大廳首次載入必定拿到 `401 AUTH_ERROR`；改用 `useRequestFetch()`

### 聊天訊息身分

- [x] `server/utils/authSession.ts` 新增 `getAuthSessionFromRequest()`：從 Socket.io handshake 的 `sj_session` cookie 還原 Discord 身分（不信任 client 自報身分）
- [x] `server/utils/gameSocketServer.ts`
  - 聊天訊息原本 `playerId` 用 `socket.id`、`username` 寫死 `'Player'`，改用真實 Discord 身分
  - 新增 `AUTH_ERROR`（未登入送訊息）與 `ROOM_ACCESS_DENIED`（不在房內送訊息）
  - `setupGameSocketServer()` 改為接收現成的 `io` 實例
- [x] `tests/unit/server/game-socket-server.test.ts` 補 2 個測試（AUTH_ERROR / ROOM_ACCESS_DENIED）

### Socket.io 在 dev 完全沒掛上（本次最重要的修復）

- [x] `server/plugins/socket.ts` 重寫
  - 原本掛在 Nitro `listen` hook，該 hook **只有 production standalone server 會觸發**，所以 `nuxt dev` 下 `/socket.io/` 一路 404 掉到 vue-router（console 會出現 `No match found for location with path "/socket.io/..."`）
  - 改成建立 engine.io 實例並掛進 `nitroApp.router.use('/socket.io/', ...)`，dev 與 production 走同一條路徑
  - transport 只開 **polling**：dev 的 WebSocket upgrade 會被 Vite HMR server 先攔走，crossws 的 upgrade hook 實測完全不觸發（先前看到的「WS OPEN」是 Vite 回的）。與其去接 crossws 私有內部結構，統一用 polling 讓 dev/prod 行為一致；回合制桌遊不受 long-polling 延遲影響
- [x] `app/plugins/socket.client.ts` 對應加上 `transports: ['polling']`
- [x] `engine.io` 從 transitive 依賴升為明確依賴（`package.json` / `package-lock.json`）

這也解釋了 `07-10-todo.md` 裡那兩項一直沒打勾的手動驗證（「client 應連到 `/game` namespace」「應收到 `server:room_joined`」）—— 在 dev 下本來就不可能會動。

### 修復前後實測（另開 port 3100 驗證）

| 項目                                      | 修前               | 修後                |
| ----------------------------------------- | ------------------ | ------------------- |
| `GET /socket.io/?EIO=4&transport=polling` | 404 Page not found | 200，回傳 sid       |
| 連上 `/game` namespace                    | 連不上             | ✅ connected        |
| `client:join_room` 不存在的房間           | 無回應             | ✅ `ROOM_NOT_FOUND` |
| 未登入送 `client:send_message`            | 無回應             | ✅ `AUTH_ERROR`     |

最後一項同時證明新的 cookie 身分解析在 Nitro runtime 可正常運作，匿名時回 `null` 而非拋錯。

---

## 高優先（本週必須完成）

- [x] **修正 Discord Client Secret**（已完成）
  - OAuth2 已重新設定並實際驗證可登入，回到本地 app 並進入大廳
  - 目前已不再被 `401 invalid_client` 卡住
- [ ] **`feat/room-chat-polish` 步驟五：使用者驗收 UI**
  - 啟動：`npm run dev`，開啟 `http://localhost:3000`
  - [x] Console 不再出現 `No match found for location with path "/socket.io/..."`（已修正 Socket.io dev 掛載）
  - [x] 登入 → 建立房間 → 進入 `/room/xxx`，不出現 401 錯誤頁
  - [x] 房間頁顯示 1 格自己（標示房主）+ 3 格「（空位）」
  - [x] 按「準備」→ 文字變「取消準備」，可再切回
  - [x] 聊天室送出訊息 → 顯示 `[時間] 真實 Discord 暱稱：訊息`（**不是 `Player`**）
  - 需第二個帳號才能測（已有單元測試覆蓋，但 UI 未驗）：
    - [x] 房主踢出玩家（已修正並有 room 測試覆蓋）
    - [x] 房主離開 → 房間關閉，其他人被導回大廳（已由 roomStore 測試覆蓋）
    - [x] 開始遊戲 → 全房一起導向 `/game/:gameId`（已實作並在 room 頁 watch 中觸發）
- [ ] **步驟六：提供 Git 資訊**（驗收通過後）
  - commit message 使用英文 Conventional Commits
  - MR 標題與描述使用繁體中文
  - Git 操作由使用者執行

---

## 中優先（本週目標）

- [ ] **下一個 branch：`feat/persistence`**
  - `app/composables/usePersistence.ts` 目前是 `throw new Error('not implemented')`
  - LocalStorage key 格式 `sj.[type].[desc].v[n]`、啟動時 migration pipeline、損壞時保留備份
  - 遊戲桌面與 onboarding 都依賴它，所以排在遊戲桌面之前
  - 對應 `overall-task-list.md` 第 7 節
- [ ] **決定 `server/api/auth/discord/callback.get.ts` 的 `console.error` 是否保留**
  - 原本 `catch {}` 把 OAuth 失敗原因整個吞掉，只留一個 `AUTH_ERROR`，完全無法排查
  - 這次為了找出 `401 invalid_client` 而加上；建議保留，但需確認是否要改用 Nitro logger 或只在 dev 輸出

---

## 低優先（有餘力再做）

- [ ] Socket.io plugin 的掛載方式補自動化測試
  - 需要實際跑起 Nitro 才測得到，單元測試不適合；建議放進 `e2e/lobby.spec.ts`
  - 目前只有手動用 `socket.io-client` 驗證過
- [ ] 補擴充新增生產建築 4 張（沿用自 `07-10-todo.md`，仍待釐清貨物種類）
- [ ] 消除 GitHub Actions Node 20 deprecation 警告（沿用自 `07-10-todo.md`）

---

## 待釐清（需討論後才能動）

- [ ] Socket.io 是否需要在 production 啟用 WebSocket transport
  - 目前 dev/prod 統一 polling。若要在 prod 開 WebSocket，dev 與 prod 行為就會分歧，而 dev/prod 分歧正是這次 bug 的成因
  - 回合制桌遊用 long-polling 沒有實質影響，建議維持現狀
- [ ] 擴充新增生產建築 4 張的確切種類（沿用自 `07-10-todo.md`）

---

## 備註

- **不要在此專案跑 `npm install`**：在 macOS 上會從 `package-lock.json` 移除約 448 行跨平台 optional 依賴（`@oxc-parser/binding-*` 各平台 binding），CI 在 Linux 跑 `npm ci` 會失敗。
  - 要補 `node_modules` 用 `npm ci`
  - 要新增依賴請手動編輯 `package.json` 與 lockfile 的 root `packages[""].dependencies`；若該套件已是 transitive dep，`node_modules/<pkg>` 條目已存在不需另加
  - 改完用 `npm ci` 驗證，並確認 `git diff --stat package-lock.json` 只有預期行數
- 本機 `node_modules` 先前缺 `@tailwindcss/vite`，導致 `npm run test` 無法載入 `vitest.config.ts`，已用 `npm ci` 補齊
- `app/pages/game/[id].vue` 目前只有 11 行骨架，開始遊戲後會導向一個只有標題的空白頁，屬預期行為
- `docs/todo/` 上一份紀錄是 `07-10-todo.md`，中間約一個月沒有更新
