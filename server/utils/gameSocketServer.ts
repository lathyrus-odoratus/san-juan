import type { Server } from 'socket.io'
import type { ChatMessage, ClientToServerEvents, ServerError, ServerToClientEvents } from '~~/types/events'
import type { PlayerProfile } from '~~/types/player'
import { getAuthSessionFromRequest } from '~~/server/utils/authSession'
import { getRoom } from '~~/server/utils/roomStore'
import { emitChatMessage, onRoomSocketEvent } from '~~/server/utils/roomSocketEvents'
import type { Room } from '~~/types/room'

export type GameIoServer = Server<ClientToServerEvents, ServerToClientEvents>

export interface GameSocketServer {
  close: () => void
}

export type JoinRoomResult =
  | { type: 'room_joined'; room: Room }
  | { type: 'error'; error: ServerError }

export type SendMessageResult =
  | { type: 'chat_message'; roomId: string; message: ChatMessage }
  | { type: 'error'; error: ServerError }

export function resolveJoinRoom(roomId: string): JoinRoomResult {
  try {
    return {
      type: 'room_joined',
      room: getRoom(roomId)
    }
  }
  catch {
    return {
      type: 'error',
      error: {
        code: 'ROOM_NOT_FOUND',
        message: 'Room does not exist or has been closed.'
      }
    }
  }
}

export function resolveSendMessage(
  sender: PlayerProfile | null,
  roomId: string,
  content: string
): SendMessageResult {
  if (!sender) {
    return {
      type: 'error',
      error: {
        code: 'AUTH_ERROR',
        message: 'Discord login is required to chat.'
      }
    }
  }

  const trimmedContent = content.trim()
  if (!trimmedContent) {
    return {
      type: 'error',
      error: {
        code: 'EMPTY_MESSAGE',
        message: 'Message content is required.'
      }
    }
  }

  try {
    const room = getRoom(roomId)
    if (!room.players.some(roomPlayer => roomPlayer.discordId === sender.discordId)) {
      return {
        type: 'error',
        error: {
          code: 'ROOM_ACCESS_DENIED',
          message: 'Only players seated in the room can chat.'
        }
      }
    }

    return {
      type: 'chat_message',
      roomId,
      message: {
        playerId: sender.discordId,
        username: sender.username,
        content: trimmedContent,
        sentAt: Date.now()
      }
    }
  }
  catch {
    return {
      type: 'error',
      error: {
        code: 'ROOM_NOT_FOUND',
        message: 'Room does not exist or has been closed.'
      }
    }
  }
}

export function setupGameSocketServer(io: GameIoServer): GameSocketServer {
  const gameNamespace = io.of('/game')

  const removeRoomSocketListener = onRoomSocketEvent((event) => {
    if (event.type === 'room_updated') {
      gameNamespace.to(event.room.roomId).emit('server:room_updated', event.room)
      return
    }

    if (event.type === 'player_kicked') {
      gameNamespace.to(event.room.roomId).emit('server:player_kicked', { playerId: event.playerId })
      gameNamespace.to(event.room.roomId).emit('server:room_updated', event.room)
      return
    }

    if (event.type === 'room_closed') {
      gameNamespace.to(event.roomId).emit('server:room_closed', { roomId: event.roomId })
      return
    }

    gameNamespace.to(event.roomId).emit('server:chat_message', event.message)
  })

  gameNamespace.on('connection', (socket) => {
    // Identity comes from the session cookie in the handshake, never from the client payload.
    const senderPromise = getAuthSessionFromRequest(socket.request).catch(() => null)

    socket.on('client:join_room', (payload) => {
      const result = resolveJoinRoom(payload.roomId)
      if (result.type === 'error') {
        socket.emit('server:error', result.error)
        return
      }

      socket.join(result.room.roomId)
      socket.emit('server:room_joined', result.room)
    })

    socket.on('client:leave_room', (payload) => {
      socket.leave(payload.roomId)
    })

    socket.on('client:send_message', async (payload) => {
      const result = resolveSendMessage(await senderPromise, payload.roomId, payload.content)
      if (result.type === 'error') {
        socket.emit('server:error', result.error)
        return
      }

      socket.join(result.roomId)
      emitChatMessage(result.roomId, result.message)
    })
  })

  return {
    close: () => {
      removeRoomSocketListener()
      io.close()
    }
  }
}
