import { beforeEach, describe, expect, it } from 'vitest'
import type { PlayerProfile } from '~~/types/player'
import { clearGameStoreForTest, createGameForRoom, getGameLog, getGameResult, getGameState } from '~~/server/utils/gameStore'
import { clearRoomStoreForTest, createRoomForPlayer, joinRoom, setPlayerReady, startRoom, assignRoomGame } from '~~/server/utils/roomStore'
import { startGameForRoom } from '~~/server/utils/gameLifecycle'

function player(discordId: string): PlayerProfile {
  return {
    discordId,
    username: `player-${discordId}`,
    avatar: null
  }
}

function createStartedRoom(): ReturnType<typeof startRoom> {
  const host = player('host')
  const room = createRoomForPlayer(host, { visibility: 'public' })
  const players = [player('p1'), player('p2'), player('p3')]

  for (const roomPlayer of players) {
    joinRoom(room.roomId, roomPlayer)
    setPlayerReady(room.roomId, roomPlayer, { isReady: true })
  }

  return startRoom(room.roomId, host)
}

describe('gameStore', () => {
  beforeEach(() => {
    clearGameStoreForTest()
    clearRoomStoreForTest()
  })

  it('creates a game snapshot from started room players', () => {
    const room = createStartedRoom()
    const snapshot = createGameForRoom(room)

    expect(snapshot.roomId).toBe(room.roomId)
    expect(snapshot.hostPlayerId).toBe(room.hostPlayerId)
    expect(snapshot.phase).toBe('ROUND_ROLE_SELECTION')
    expect(snapshot.turnState).toEqual(expect.objectContaining({
      round: 1,
      governorPlayerId: room.hostPlayerId,
      activePlayerId: room.hostPlayerId,
      selectedRole: null
    }))
    expect(snapshot.players.map(gamePlayer => gamePlayer.profile.discordId)).toEqual([
      'host',
      'p1',
      'p2',
      'p3'
    ])
  })

  it('returns state, result, and log for game players', () => {
    const room = createStartedRoom()
    const snapshot = createGameForRoom(room)
    const host = player('host')

    expect(getGameState(snapshot.gameId, host)).toEqual(snapshot)
    expect(getGameResult(snapshot.gameId, host)).toEqual({
      gameId: snapshot.gameId,
      isGameOver: false,
      winner: null,
      players: snapshot.players.map(gamePlayer => ({
        playerId: gamePlayer.profile.discordId,
        username: gamePlayer.profile.username,
        score: 0,
        isWinner: false
      }))
    })
    expect(getGameLog(snapshot.gameId, host)).toEqual([
      expect.objectContaining({
        gameId: snapshot.gameId,
        type: 'GAME_CREATED',
        message: 'Game state initialized from room players.'
      })
    ])
  })

  it('blocks non-player access to game state', () => {
    const room = createStartedRoom()
    const snapshot = createGameForRoom(room)

    expect(() => getGameState(snapshot.gameId, player('outsider'))).toThrow('GAME_ACCESS_DENIED')
    expect(() => getGameResult(snapshot.gameId, player('outsider'))).toThrow('GAME_ACCESS_DENIED')
    expect(() => getGameLog(snapshot.gameId, player('outsider'))).toThrow('GAME_ACCESS_DENIED')
  })

  it('attaches created game id back to the started room', () => {
    const startedRoom = createStartedRoom()
    const snapshot = createGameForRoom(startedRoom)
    const roomWithGame = assignRoomGame(startedRoom.roomId, snapshot.gameId)

    expect(roomWithGame.status).toBe('playing')
    expect(roomWithGame.gameId).toBe(snapshot.gameId)
  })

  it('starts a room and returns a room with gameId for API response', () => {
    const host = player('host')
    const room = createRoomForPlayer(host, { visibility: 'public' })
    const players = [player('p1'), player('p2'), player('p3')]

    for (const roomPlayer of players) {
      joinRoom(room.roomId, roomPlayer)
      setPlayerReady(room.roomId, roomPlayer, { isReady: true })
    }

    const startedRoom = startGameForRoom(room.roomId, host)

    expect(startedRoom.status).toBe('playing')
    expect(startedRoom.gameId).toEqual(expect.stringMatching(/^game_/))
    expect(getGameState(startedRoom.gameId ?? '', host)).toEqual(expect.objectContaining({
      gameId: startedRoom.gameId,
      roomId: room.roomId
    }))
  })

  it('returns GAME_NOT_FOUND for missing games', () => {
    expect(() => getGameState('missing-game', player('host'))).toThrow('GAME_NOT_FOUND')
  })
})
