import { describe, expect, it, vi } from 'vitest'
import { joinCurrentSocketRoom, joinSocketRoom, type RoomSocketClient } from '~~/app/composables/useRoom'
import type { Room } from '~~/types/room'

function room(roomId = 'room-1'): Room {
  return {
    roomId,
    roomCode: 'ABC123',
    gameId: null,
    hostPlayerId: 'host',
    visibility: 'public',
    status: 'waiting',
    players: [],
    createdAt: 1,
    updatedAt: 1,
    maxPlayers: 4
  }
}

function socket(connected: boolean): RoomSocketClient {
  return {
    connected,
    connect: vi.fn(),
    emit: vi.fn()
  }
}

describe('useRoom socket helpers', () => {
  it('connects a disconnected socket before joining the room', () => {
    const gameSocket = socket(false)

    joinSocketRoom(gameSocket, 'room-1')

    expect(gameSocket.connect).toHaveBeenCalledOnce()
    expect(gameSocket.emit).toHaveBeenCalledWith('client:join_room', { roomId: 'room-1' })
  })

  it('rejoins the current room when the socket connect event fires', () => {
    const gameSocket = socket(true)

    joinCurrentSocketRoom(gameSocket, room('room-2'))

    expect(gameSocket.connect).not.toHaveBeenCalled()
    expect(gameSocket.emit).toHaveBeenCalledWith('client:join_room', { roomId: 'room-2' })
  })

  it('does not emit a join event when there is no current room', () => {
    const gameSocket = socket(true)

    joinCurrentSocketRoom(gameSocket, null)

    expect(gameSocket.connect).not.toHaveBeenCalled()
    expect(gameSocket.emit).not.toHaveBeenCalled()
  })
})
