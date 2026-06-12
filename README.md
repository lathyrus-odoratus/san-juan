# San Juan Online

聖胡安桌遊線上版——以 Nuxt 4（TypeScript）開發的多人瀏覽器桌遊平台。

## 技術棧

- **框架**：Nuxt 4（`app/` 目錄）
- **語言**：TypeScript 5（strict mode）
- **UI**：Vue 3
- **即時通訊**：Socket.io（Namespace: `/game`）
- **身份驗證**：Discord OAuth2
- **資料儲存**：LocalStorage（無後端資料庫）
- **套件管理**：npm

---

## 安裝與啟動

```bash
npm install
npm run dev      # 開發伺服器 http://localhost:3000
```

### 完整指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器（port 3000） |
| `npm run build` | 正式環境建置 |
| `npm run preview` | 預覽正式環境建置結果 |
| `npm run lint` | ESLint 檢查 |
| `npm run test` | 執行單元測試（Vitest） |
| `npm run test:watch` | 監聽模式測試 |
| `npm run test:coverage` | 產生覆蓋率報告 |
| `npm run test:e2e` | 執行 E2E 測試（Playwright） |

---

## 分支策略

| 分支 | 用途 | 對象 |
|------|------|------|
| `main` | 正式站（Production） | 團隊外的使用者 |
| `dev` | 測試站（Staging） | 團隊內開發用 |

- 所有功能在獨立 feature branch 開發，完成後合併至 `dev`
- `dev` 測試通過後合併至 `main` 部署正式站
- 不直接在 `main` 或 `dev` 上開發

### Feature Branch 命名格式

```
feat/lobby-room-list
feat/game-engine-state-machine
fix/discord-oauth-callback
chore/card-data-json
```

---

## 開發流程

每個功能依照以下六個步驟進行：

1. **閱讀文件**：SDD、線稿圖、詞彙表、API 列表
2. **建立分支**：從 `dev` 切出 feature branch
3. **實作**：依 SDD 與線稿圖開發
4. **本地驗證**：`npm run lint` → `npm run build` → `npm run test` 全部通過
5. **UI 驗收**：啟動 `npm run dev`，人工確認畫面與互動
6. **合併**：commit → PR → merge 至 `dev`

詳見 [`AGENTS.md`](AGENTS.md)。

---

## 專案文件

| 文件 | 路徑 |
|------|------|
| 系統設計文件（SDD） | `docs/sdd/sdd.md` |
| 詞彙表 | `docs/sdd/ Glossary.md` |
| API 列表 | `docs/sdd/API_list.md` |
| 線稿圖 | `docs/wireframe/` |
| 完整牌組資料 | `docs/san-juan-cards.md` |
| 待決策問題 | `docs/todo/pending-decisions.md` |
| 整體任務清單 | `docs/todo/overall-task-list.md` |
