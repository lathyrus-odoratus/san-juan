import { beforeEach, describe, expect, it } from 'vitest'
import type { PlayerProfile } from '~~/types/player'
import { resolveJoinRoom, resolveSendMessage } from '~~/server/utils/gameSocketServer'
import { clearRoomStoreForTest, createRoomForPlayer } from '~~/server/utils/roomStore'

function player(discordId: string): PlayerProfile {
  return {
    discordId,
    username: `player-${discordId}`,
    avatar: null
  }
}

describe('gameSocketServer room events', () => {
  beforeEach(() => {
    clearRoomStoreForTest()
  })

  it('resolves client room join into server:room_joined payload', () => {
    const room = createRoomForPlayer(player('host'), { visibility: 'public' })

    expect(resolveJoinRoom(room.roomId)).toEqual({
      type: 'room_joined',
      room
    })
  })

  it('resolves missing room join into ROOM_NOT_FOUND error', () => {
    expect(resolveJoinRoom('missing-room')).toEqual({
      type: 'error',
      error: {
        code: 'ROOM_NOT_FOUND',
        message: 'Room does not exist or has been closed.'
      }
    })
  })

  it('resolves valid chat message into server:chat_message payload', () => {
    const host = player('host')
    const room = createRoomForPlayer(host, { visibility: 'public' })

    expect(resolveSendMessage(host, room.roomId, ' hello ')).toEqual({
      type: 'chat_message',
      roomId: room.roomId,
      message: expect.objectContaining({
        playerId: 'host',
        username: 'player-host',
        content: 'hello'
      })
    })
  })

  it('rejects chat messages from unauthenticated senders with AUTH_ERROR', () => {
    const room = createRoomForPlayer(player('host'), { visibility: 'public' })

    expect(resolveSendMessage(null, room.roomId, 'hello')).toEqual({
      type: 'error',
      error: {
        code: 'AUTH_ERROR',
        message: 'Discord login is required to chat.'
      }
    })
  })

  it('rejects chat messages from players outside the room with ROOM_ACCESS_DENIED', () => {
    const room = createRoomForPlayer(player('host'), { visibility: 'public' })

    expect(resolveSendMessage(player('outsider'), room.roomId, 'hello')).toEqual({
      type: 'error',
      error: {
        code: 'ROOM_ACCESS_DENIED',
        message: 'Only players seated in the room can chat.'
      }
    })
  })

  it('rejects empty chat messages with EMPTY_MESSAGE', () => {
    const room = createRoomForPlayer(player('host'), { visibility: 'public' })

    expect(resolveSendMessage(player('host'), room.roomId, '   ')).toEqual({
      type: 'error',
      error: {
        code: 'EMPTY_MESSAGE',
        message: 'Message content is required.'
      }
    })
  })

  it('rejects chat messages for missing rooms with ROOM_NOT_FOUND', () => {
    expect(resolveSendMessage(player('host'), 'missing-room', 'hello')).toEqual({
      type: 'error',
      error: {
        code: 'ROOM_NOT_FOUND',
        message: 'Room does not exist or has been closed.'
      }
    })
  })
})
