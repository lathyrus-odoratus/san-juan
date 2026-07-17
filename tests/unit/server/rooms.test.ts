import { beforeEach, describe, expect, it } from 'vitest'
import type { PlayerProfile } from '~~/types/player'
import {
  clearRoomStoreForTest,
  createRoomForPlayer,
  getRoom,
  joinRoom,
  kickPlayer,
  leaveRoom,
  listRooms,
  setPlayerReady,
  startRoom
} from '~~/server/utils/roomStore'

function player(discordId: string): PlayerProfile {
  return {
    discordId,
    username: `player-${discordId}`,
    avatar: null
  }
}

describe('roomStore', () => {
  beforeEach(() => {
    clearRoomStoreForTest()
  })

  it('creates a waiting room with host ready by default', () => {
    const host = player('host')
    const room = createRoomForPlayer(host, { visibility: 'public' })

    expect(room.status).toBe('waiting')
    expect(room.visibility).toBe('public')
    expect(room.hostPlayerId).toBe('host')
    expect(room.players).toEqual([
      expect.objectContaining({
        discordId: 'host',
        isHost: true,
        isReady: true
      })
    ])
  })

  it('lists public rooms after creation and hides private rooms', () => {
    const publicRoom = createRoomForPlayer(player('host'), { visibility: 'public' })
    createRoomForPlayer(player('private-host'), { visibility: 'private' })

    expect(listRooms()).toEqual([
      expect.objectContaining({
        roomId: publicRoom.roomId,
        status: 'waiting',
        visibility: 'public'
      })
    ])
  })

  it('returns room details by room id', () => {
    const room = createRoomForPlayer(player('host'), { visibility: 'public' })

    expect(getRoom(room.roomId)).toEqual(room)
  })

  it('allows players to join by room id or room code until the room is full', () => {
    const room = createRoomForPlayer(player('host'), { visibility: 'public' })

    joinRoom(room.roomId, player('p1'))
    joinRoom(room.roomCode, player('p2'))
    const fullRoom = joinRoom(room.roomId, player('p3'))

    expect(fullRoom.players).toHaveLength(4)
    expect(() => joinRoom(room.roomId, player('p4'))).toThrow('ROOM_FULL')
  })

  it('blocks host from starting before the room has four players', () => {
    const host = player('host')
    const room = createRoomForPlayer(host, { visibility: 'public' })

    expect(() => startRoom(room.roomId, host)).toThrow('ROOM_NOT_FULL')
  })

  it('requires every player to be ready before host starts the room', () => {
    const host = player('host')
    const room = createRoomForPlayer(host, { visibility: 'public' })
    joinRoom(room.roomId, player('p1'))
    joinRoom(room.roomId, player('p2'))
    joinRoom(room.roomId, player('p3'))

    expect(() => startRoom(room.roomId, host)).toThrow('PLAYERS_NOT_READY')

    setPlayerReady(room.roomId, player('p1'), { isReady: true })
    setPlayerReady(room.roomId, player('p2'), { isReady: true })
    setPlayerReady(room.roomId, player('p3'), { isReady: true })

    expect(startRoom(room.roomId, host).status).toBe('playing')
  })

  it('blocks non-host players from kicking or starting', () => {
    const host = player('host')
    const guest = player('guest')
    const room = createRoomForPlayer(host, { visibility: 'public' })
    joinRoom(room.roomId, guest)

    expect(() => kickPlayer(room.roomId, host.discordId, guest)).toThrow('HOST_ONLY')
    expect(() => startRoom(room.roomId, guest)).toThrow('HOST_ONLY')
  })

  it('removes kicked players from the room', () => {
    const host = player('host')
    const guest = player('guest')
    const room = createRoomForPlayer(host, { visibility: 'public' })
    joinRoom(room.roomId, guest)

    const updatedRoom = kickPlayer(room.roomId, guest.discordId, host)

    expect(updatedRoom.players.map(roomPlayer => roomPlayer.discordId)).toEqual(['host'])
  })

  it('removes non-host players when they leave', () => {
    const host = player('host')
    const guest = player('guest')
    const room = createRoomForPlayer(host, { visibility: 'public' })
    joinRoom(room.roomId, guest)

    const updatedRoom = leaveRoom(room.roomId, guest)

    expect(updatedRoom.status).toBe('waiting')
    expect(updatedRoom.players.map(roomPlayer => roomPlayer.discordId)).toEqual([host.discordId])
  })

  it('closes the room when the host leaves', () => {
    const host = player('host')
    const room = createRoomForPlayer(host, { visibility: 'public' })
    joinRoom(room.roomId, player('guest'))

    const closedRoom = leaveRoom(room.roomId, host)

    expect(closedRoom.status).toBe('closed')
    expect(closedRoom.players).toHaveLength(0)
    expect(() => getRoom(room.roomId)).toThrow('ROOM_NOT_FOUND')
  })

  it('clears in-memory rooms after store reset', () => {
    createRoomForPlayer(player('host'), { visibility: 'public' })

    clearRoomStoreForTest()

    expect(listRooms()).toEqual([])
  })
})
