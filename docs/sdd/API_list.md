# 聖胡安桌遊 API 列表

## REST API

### 會員（Auth / User）

> **[已決策 #1 #3]** V0.1 僅使用 Discord OAuth2，不保留長期 token。以下 email/password 系列 API **延後實作**，暫不開發。

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/auth/register` | 註冊帳號 |
| POST | `/api/auth/verify-email` | 驗證信箱 |
| POST | `/api/auth/login` | 登入，回傳 token |
| POST | `/api/auth/logout` | 登出，撤銷 token |
| GET | `/api/users/info` | 取得自己的帳號資料 |
| PUT | `/api/users/info` | 更新個人資料（暱稱、頭像）|
| PUT | `/api/users/change-password` | 修改密碼 |
| POST | `/api/users/forget-password` | 忘記密碼 |
| PUT | `/api/users/reset-password` | 重設密碼 |

### 大廳 / 房間（Lobby / Room）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/rooms` | 列出公開房間（可篩選狀態）|
| POST | `/api/rooms` | 建立房間 |
| GET | `/api/rooms/:roomId` | 查詢房間詳細資料 |
| POST | `/api/rooms/:roomId/join` | 加入房間 |
| POST | `/api/rooms/:roomId/leave` | 離開房間 |
| PUT | `/api/rooms/:roomId/ready` | 切換準備狀態 |
| POST | `/api/rooms/:roomId/kick/:playerId` | 踢出玩家（房主限定）|
| POST | `/api/rooms/:roomId/start` | 開始遊戲（房主限定）|

### 遊戲（Game）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/games/:gameId/state` | 取得遊戲狀態（斷線重連用）|
| GET | `/api/games/:gameId/result` | 取得終局結果與分數 |
| GET | `/api/games/:gameId/log` | 取得完整行動記錄 |

### 遊戲紀錄（History）

> **[已決策 #2]** 無後端 DB，以下歷史對局 / 統計 API **延後實作**，暫不開發。

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/users/games` | 我的歷史對局列表 |
| GET | `/api/users/stats` | 我的統計資料（勝率、場數等）|

---

## Socket.io 事件（Namespace: `/game`）

### Client → Server

| 事件名稱 | 說明 |
|----------|------|
| `client:select_role` | 選擇職業 |
| `client:build` | 建築師：選擇要建的建築（或跳過）|
| `client:pay_for_build` | 建築師：選擇用於支付的手牌 |
| `client:produce` | 生產者：執行生產 |
| `client:trade` | 貿易商：選擇賣出的商品 |
| `client:councillor_select` | 議員：選擇保留的手牌（棄牌） |
| `client:prospect` | 礦工：特權玩家觸發抽牌（不需 Modal，結果顯示於遊戲指引）|
| `client:skip_action` | 跳過當前行動 |
| `client:send_message` | 傳送聊天訊息 |

### Server → Client

#### 大廳 / 房間

| 事件名稱 | 對象 | 說明 |
|----------|------|------|
| `server:room_joined` | 私訊 | 新加入者收到房間完整當前狀態 |
| `server:room_updated` | 廣播 | 房間資訊變動（玩家加入/離開/準備）|
| `server:player_kicked` | 廣播 | 有玩家被踢出 |
| `server:room_closed` | 廣播 | 房間關閉（房主離開）|
| `server:chat_message` | 廣播 | 收到聊天訊息 |

#### 遊戲流程

| 事件名稱 | 對象 | 說明 |
|----------|------|------|
| `server:game_started` | 廣播 | 遊戲開始 |
| `server:role_selection_start` | 廣播 | 輪到 玩家OO 選職業 |
| `server:role_selected` | 廣播 | 職業選定，公布執行順序 |
| `server:action_prompt` | 私訊 | 提示目前玩家執行行動 type：要生產貨物、要建立的建築、要支付的手牌、議員選擇保留手牌、選擇賣出的貨物、價格牌、手牌超過上限棄牌 |
|  | 廣播 | 誰正在行動 |
| `server:action_performed` | 廣播 | 玩家行動結果公告 |
| `server:hand_updated` | 私訊 | 通知本人手牌變動 |
| `server:game_state_updated` | 廣播 | 遊戲公開狀態同步（如果有人建築超過 12 個，進行選擇保留） |
| `server:role_execution_complete` | 廣播 | 本角色所有玩家完成行動 |
| `server:round_end` | 廣播 | 回合結算，移交 Governor |
| `server:game_over` | 廣播 | 遊戲結束，公布最終分數 |

* 增加是誰的工廠生產的貨物提示
* 通知下一位選擇要生產貨物的工廠（提供可以選擇的工廠與數量）（如果是建築的話，就是提供可選擇、買的起的建築） 

#### 連線狀態

| 事件名稱 | 對象 | 說明 |
|----------|------|------|
| `server:player_disconnected` | 廣播 | 玩家斷線通知 |
| `server:player_reconnected` | 廣播 | 玩家重連通知 |
| `server:error` | 私訊 | 行動錯誤回應 |

---

## 遊戲相關狀態整理

### 遊戲狀態：
| 屬性 | 類別 | 備註 |
|----| ---- | ---- |
| 回合 | int | 當前是第幾回合 |
| 遊戲時間 | number | 開始遊戲的時間戳 |
| 所有玩家 | Player[] | |
| 職業階段 | string | 當前職業階段，職業 ID |
| 階段歷史 | Phase[] | 階段物件：職業 ID、玩家 ID |
| 價格牌 | Price_Card | 每種貨物的價格 |
| 總督 | Player_ID | |
| 當前玩家 | Player_ID | |
| 牌庫張數 | int | 牌庫剩餘數量|

### 玩家狀態
| 屬性 | 類別 | 備註 |
|----| ---- | ---- |
| ID | string| |
| 名稱 | string | |
| 手牌 | string[] | 重複卡牌相同 ID |
| 建築 | Building[] | 建築 ID 及卡牌上放置的卡牌數量（工廠貨物及教堂、銀行等建築的存款；後端存卡牌 ID）|

> **[已決策 #2 #6]** 無後端 DB，「後端存卡牌 ID」移除，貨物狀態由前端 LocalStorage 維護。貨物顯示以**按工廠分開**呈現（非單一彙總數字），layout-draft.md 已更新。
| 總分 | number | 當前分數 |

### 職業
所有職業的聯合型別：
| 中文 | 英文 |	
|----| ---- | 
| 礦工	|Prospector	|
| 議員	|Councillor	|
| 貿易商|	Trader	|
| 建築師	|Builder	|
| 製造商|	Producer	|


### 用戶操作
紀錄用戶操作的 log。