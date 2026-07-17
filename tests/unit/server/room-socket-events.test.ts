import { describe, expect, it } from 'vitest'
import type { Room } from '~~/types/room'
import {
  emitChatMessage,
  emitPlayerKicked,
  emitRoomClosed,
  emitRoomUpdated,
  onRoomSocketEvent
} from '~~/server/utils/roomSocketEvents'

function room(): Room {
  return {
    roomId: 'room-1',
    roomCode: 'ABC123',
    gameId: null,
    hostPlayerId: 'host',
    visibility: 'public',
    status: 'waiting',
    players: [],
    createdAt: 1,
    updatedAt: 1
  }
}

describe('roomSocketEvents', () => {
  it('emits room socket events to subscribed listeners', () => {
    const events: string[] = []
    const unsubscribe = onRoomSocketEvent((event) => {
      events.push(event.type)
    })

    emitRoomUpdated(room())
    emitPlayerKicked(room(), 'player-1')
    emitRoomClosed('room-1')
    emitChatMessage('room-1', {
      playerId: 'player-1',
      username: 'Player 1',
      content: 'hello',
      sentAt: 1
    })

    unsubscribe()
    emitRoomClosed('room-2')

    expect(events).toEqual([
      'room_updated',
      'player_kicked',
      'room_closed',
      'chat_message'
    ])
  })
})
