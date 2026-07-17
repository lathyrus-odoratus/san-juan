import { Server } from 'socket.io'
import type { Server as HttpServer } from 'node:http'
import type { ChatMessage, ClientToServerEvents, ServerError, ServerToClientEvents } from '~~/types/events'
import { getRoom } from '~~/server/utils/roomStore'
import { emitChatMessage, onRoomSocketEvent } from '~~/server/utils/roomSocketEvents'
import type { Room } from '~~/types/room'

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

export function resolveSendMessage(socketId: string, roomId: string, content: string): SendMessageResult {
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
    getRoom(roomId)
    return {
      type: 'chat_message',
      roomId,
      message: {
        playerId: socketId,
        username: 'Player',
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

export function setupGameSocketServer(server: HttpServer): GameSocketServer {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    path: '/socket.io'
  })
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

    socket.on('client:send_message', (payload) => {
      const result = resolveSendMessage(socket.id, payload.roomId, payload.content)
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
