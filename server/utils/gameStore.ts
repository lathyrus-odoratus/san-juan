import type { GameAction, GameLogEntry, GameResult, GameSnapshot } from '~~/types/game'
import type { Room } from '~~/types/room'
import type { PlayerProfile } from '~~/types/player'
import { dispatchGameAction, useGameEngine } from '~~/app/composables/useGameEngine'

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
    turnState: {
      ...snapshot.turnState,
      selectedRoles: snapshot.turnState.selectedRoles.map(selectedRole => ({ ...selectedRole })),
      completedPlayerIds: [...snapshot.turnState.completedPlayerIds]
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
      message: 'Game state initialized from room players.',
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
  const snapshot = record.snapshot

  return {
    gameId,
    isGameOver: snapshot.phase === 'GAME_END',
    winner: snapshot.winner,
    players: snapshot.players.map(gamePlayer => ({
      playerId: gamePlayer.profile.discordId,
      username: gamePlayer.profile.username,
      score: 0,
      isWinner: snapshot.winner === gamePlayer.profile.discordId
    }))
  }
}

export function dispatchGameActionForPlayer(gameId: string, player: PlayerProfile, action: GameAction): GameSnapshot {
  const record = requireGameRecord(gameId)
  assertGameAccess(record.snapshot, player)

  if (action.playerId !== player.discordId) {
    throw createError({ statusCode: 403, statusMessage: 'GAME_ACTION_PLAYER_MISMATCH' })
  }

  try {
    const snapshot = dispatchGameAction(record.snapshot, action)
    record.snapshot = {
      ...snapshot,
      gameId: record.snapshot.gameId,
      roomId: record.snapshot.roomId,
      hostPlayerId: record.snapshot.hostPlayerId,
      updatedAt: now()
    }
    record.log.push(createActionLogEntry(record.snapshot, action))
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
  return {
    id: createId('log'),
    gameId: snapshot.gameId,
    type: action.type,
    message: createActionLogMessage(action),
    createdAt: snapshot.updatedAt,
    payload: { ...action }
  }
}

function createActionLogMessage(action: GameAction): string {
  if (action.type === 'SELECT_ROLE') {
    return `${action.playerId} selected ${action.role}.`
  }

  if (action.type === 'SKIP_ACTION') {
    return `${action.playerId} skipped the current role action.`
  }

  return `${action.playerId} performed ${action.type}.`
}

export function clearGameStoreForTest(): void {
  games.clear()
}
