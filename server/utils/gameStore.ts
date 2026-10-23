import type { GameAction, GameLogEntry, GameResult, GameSnapshot } from '~~/types/game'
import type { Room } from '~~/types/room'
import type { PlayerProfile } from '~~/types/player'
import { calculateGameResult, dispatchGameAction, useGameEngine } from '~~/app/composables/useGameEngine'
import { getBuildingName, ROLE_NAMES_ZH } from '~~/app/utils/gameLabels'

interface GameRecord {
  snapshot: GameSnapshot
  log: GameLogEntry[]
}

const games = new Map<string, GameRecord>()

function now(): number {
  return Date.now()
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}

function cloneSnapshot(snapshot: GameSnapshot): GameSnapshot {
  return {
    ...snapshot,
    players: snapshot.players.map(player => ({
      profile: { ...player.profile },
      hand: [...player.hand],
      buildings: [...player.buildings],
      goods: { ...player.goods }
    })),
    deckState: [...snapshot.deckState],
    discardState: [...snapshot.discardState],
    priceDeck: (snapshot.priceDeck ?? []).map(priceCard => ({ ...priceCard })),
    turnState: {
      ...snapshot.turnState,
      selectedRoles: snapshot.turnState.selectedRoles.map(selectedRole => ({ ...selectedRole })),
      completedPlayerIds: [...snapshot.turnState.completedPlayerIds],
      pendingTrades: snapshot.turnState.pendingTrades.map(trade => ({
        playerId: trade.playerId,
        buildingIds: [...trade.buildingIds]
      }))
    }
  }
}

function cloneLogEntry(entry: GameLogEntry): GameLogEntry {
  return {
    ...entry,
    payload: entry.payload ? { ...entry.payload } : undefined
  }
}

function requireGameRecord(gameId: string): GameRecord {
  const record = games.get(gameId)
  if (!record) {
    throw createError({ statusCode: 404, statusMessage: 'GAME_NOT_FOUND' })
  }

  return record
}

export function createGameForRoom(room: Room): GameSnapshot {
  if (room.players.length !== room.maxPlayers) {
    throw createError({ statusCode: 400, statusMessage: 'GAME_REQUIRES_FOUR_PLAYERS' })
  }

  const timestamp = now()
  const engine = useGameEngine()
  const snapshot = engine.createGame(room.roomId, room.players.map(roomPlayer => ({
    discordId: roomPlayer.discordId,
    username: roomPlayer.username,
    avatar: roomPlayer.avatar
  })))

  snapshot.gameId = createId('game')
  snapshot.roomId = room.roomId
  snapshot.hostPlayerId = room.hostPlayerId
  snapshot.turnState.governorPlayerId = room.hostPlayerId
  snapshot.turnState.activePlayerId = room.hostPlayerId
  snapshot.updatedAt = timestamp

  games.set(snapshot.gameId, {
    snapshot,
    log: [{
      id: createId('log'),
      gameId: snapshot.gameId,
      type: 'GAME_CREATED',
      message: `遊戲開始，總督：${room.players.find(player => player.discordId === room.hostPlayerId)?.username ?? room.hostPlayerId}`,
      createdAt: timestamp,
      payload: {
        roomId: room.roomId,
        playerIds: room.players.map(player => player.discordId)
      }
    }]
  })

  return cloneSnapshot(snapshot)
}

export function getGameState(gameId: string, player: PlayerProfile): GameSnapshot {
  const record = requireGameRecord(gameId)
  assertGameAccess(record.snapshot, player)
  return cloneSnapshot(record.snapshot)
}

export function getGameLog(gameId: string, player: PlayerProfile): GameLogEntry[] {
  const record = requireGameRecord(gameId)
  assertGameAccess(record.snapshot, player)
  return record.log.map(cloneLogEntry)
}

export function getGameResult(gameId: string, player: PlayerProfile): GameResult {
  const record = requireGameRecord(gameId)
  assertGameAccess(record.snapshot, player)
  return calculateGameResult(record.snapshot)
}

export function dispatchGameActionForPlayer(gameId: string, player: PlayerProfile, action: GameAction): GameSnapshot {
  const record = requireGameRecord(gameId)
  assertGameAccess(record.snapshot, player)

  if (action.playerId !== player.discordId) {
    throw createError({ statusCode: 403, statusMessage: 'GAME_ACTION_PLAYER_MISMATCH' })
  }

  try {
    const previous = record.snapshot
    const snapshot = dispatchGameAction(previous, action)
    record.snapshot = {
      ...snapshot,
      gameId: previous.gameId,
      roomId: previous.roomId,
      hostPlayerId: previous.hostPlayerId,
      updatedAt: now()
    }
    record.log.push(createActionLogEntry(record.snapshot, action))
    record.log.push(...createTransitionLogEntries(previous, record.snapshot))
    games.set(gameId, record)
    return cloneSnapshot(record.snapshot)
  }
  catch (error) {
    if (error instanceof Error && error.message === 'ILLEGAL_ACTION') {
      throw createError({ statusCode: 409, statusMessage: 'ILLEGAL_ACTION' })
    }

    throw error
  }
}

export function assertGameAccess(snapshot: GameSnapshot, player: PlayerProfile): void {
  if (!snapshot.players.some(gamePlayer => gamePlayer.profile.discordId === player.discordId)) {
    throw createError({ statusCode: 403, statusMessage: 'GAME_ACCESS_DENIED' })
  }
}

function createActionLogEntry(snapshot: GameSnapshot, action: GameAction): GameLogEntry {
  return createLogEntry(snapshot, action.type, createActionLogMessage(snapshot, action), { ...action })
}

function createLogEntry(snapshot: GameSnapshot, type: string, message: string, payload?: Record<string, unknown>): GameLogEntry {
  return {
    id: createId('log'),
    gameId: snapshot.gameId,
    type,
    message,
    createdAt: snapshot.updatedAt,
    payload
  }
}

function getPlayerName(snapshot: GameSnapshot, playerId: string): string {
  return snapshot.players.find(player => player.profile.discordId === playerId)?.profile.username ?? playerId
}

function createActionLogMessage(snapshot: GameSnapshot, action: GameAction): string {
  const name = getPlayerName(snapshot, action.playerId)

  switch (action.type) {
    case 'SELECT_ROLE':
      return `${name} 選擇了${ROLE_NAMES_ZH[action.role]}`
    case 'SKIP_ACTION':
      return `${name} 跳過`
    case 'PROSPECT':
      return `${name} 抽了 1 張牌`
    case 'BUILD':
      return `${name} 建造了 ${getBuildingName(action.cardId)}（支付 ${action.payment.length} 張）`
    case 'PRODUCE':
      return action.buildingIds.length === 0
        ? `${name} 沒有生產`
        : `${name} 生產了 ${action.buildingIds.length} 個貨物：${action.buildingIds.map(getBuildingName).join('、')}`
    case 'TRADE':
      return action.buildingIds.length === 0
        ? `${name} 沒有賣貨物`
        : `${name} 賣出 ${action.buildingIds.length} 個貨物：${action.buildingIds.map(getBuildingName).join('、')}`
    case 'COUNCIL':
      return `${name} 從 ${action.keptCardIds.length + action.discardedCardIds.length} 張中保留 1 張`
    case 'DISCARD':
      return `${name} 超過手牌上限，棄了 ${action.cardIds.length} 張`
  }
}

/**
 * Phase-level events that happen as a side effect of an action (trade settlement, new round, game end).
 */
function createTransitionLogEntries(previous: GameSnapshot, next: GameSnapshot): GameLogEntry[] {
  const entries: GameLogEntry[] = []

  if (previous.turnState.selectedRole === 'Trader' && next.turnState.selectedRole !== 'Trader') {
    const gains = next.players
      .map((player) => {
        const before = previous.players.find(candidate => candidate.profile.discordId === player.profile.discordId)
        const gained = player.hand.length - (before?.hand.length ?? player.hand.length)
        return gained > 0 ? `${player.profile.username} +${gained}` : null
      })
      .filter(Boolean)
    entries.push(createLogEntry(next, 'TRADE_SETTLED', gains.length > 0 ? `貿易結算：${gains.join('、')} 張` : '貿易結算：沒有人賣出貨物'))
  }

  if (next.phase === 'GAME_END' && previous.phase !== 'GAME_END') {
    const winner = next.winner ? getPlayerName(next, next.winner) : '無'
    entries.push(createLogEntry(next, 'GAME_END', `遊戲結束，勝者：${winner}`))
  }
  else if (next.turnState.round > previous.turnState.round) {
    entries.push(createLogEntry(next, 'ROUND_START', `第 ${next.turnState.round} 回合開始，總督：${getPlayerName(next, next.turnState.governorPlayerId)}`))
  }

  return entries
}

export function clearGameStoreForTest(): void {
  games.clear()
}
