import type { Server } from 'socket.io'
import type { ChatMessage, ClientToServerEvents, ServerError, ServerToClientEvents } from '~~/types/events'
import type { GameSnapshot, Role } from '~~/types/game'
import type { PlayerProfile } from '~~/types/player'
import { getAuthSessionFromRequest } from '~~/server/utils/authSession'
import { getRoom } from '~~/server/utils/roomStore'
import { emitChatMessage, onRoomSocketEvent } from '~~/server/utils/roomSocketEvents'
import type { Room } from '~~/types/room'
import { dispatchGameActionForPlayer } from '~~/server/utils/gameStore'

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

export type SelectRoleResult =
  | { type: 'role_selected'; gameId: string; playerId: string; role: Role; snapshot: GameSnapshot }
  | { type: 'error'; error: ServerError }

export type SkipActionResult =
  | { type: 'action_skipped'; gameId: string; playerId: string; snapshot: GameSnapshot }
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

export function resolveSelectRole(
  sender: PlayerProfile | null,
  gameId: string,
  role: Role
): SelectRoleResult {
  if (!sender) {
    return {
      type: 'error',
      error: {
        code: 'AUTH_ERROR',
        message: 'Discord login is required to select a role.'
      }
    }
  }

  try {
    const snapshot = dispatchGameActionForPlayer(gameId, sender, {
      type: 'SELECT_ROLE',
      playerId: sender.discordId,
      role
    })

    return {
      type: 'role_selected',
      gameId,
      playerId: sender.discordId,
      role,
      snapshot
    }
  }
  catch (error) {
    return {
      type: 'error',
      error: resolveGameActionError(error)
    }
  }
}

export function resolveSkipAction(
  sender: PlayerProfile | null,
  gameId: string
): SkipActionResult {
  if (!sender) {
    return {
      type: 'error',
      error: {
        code: 'AUTH_ERROR',
        message: 'Discord login is required to skip an action.'
      }
    }
  }

  try {
    const snapshot = dispatchGameActionForPlayer(gameId, sender, {
      type: 'SKIP_ACTION',
      playerId: sender.discordId
    })

    return {
      type: 'action_skipped',
      gameId,
      playerId: sender.discordId,
      snapshot
    }
  }
  catch (error) {
    return {
      type: 'error',
      error: resolveGameActionError(error)
    }
  }
}

function resolveGameActionError(error: unknown): ServerError {
  if (typeof error === 'object' && error !== null && 'statusMessage' in error) {
    const { statusMessage } = error as { statusMessage?: string }

    if (statusMessage === 'ILLEGAL_ACTION') {
      return {
        code: 'ILLEGAL_ACTION',
        message: 'This game action is not allowed in the current state.'
      }
    }

    if (statusMessage === 'GAME_ACCESS_DENIED') {
      return {
        code: 'GAME_ACCESS_DENIED',
        message: 'Only players in this game can perform actions.'
      }
    }

    if (statusMessage === 'GAME_ACTION_PLAYER_MISMATCH') {
      return {
        code: 'ILLEGAL_ACTION',
        message: 'Players can only perform their own game actions.'
      }
    }

    if (statusMessage === 'GAME_NOT_FOUND') {
      return {
        code: 'GAME_NOT_FOUND',
        message: 'Game does not exist or has been closed.'
      }
    }
  }

  return {
    code: 'GAME_ACTION_FAILED',
    message: 'Game action failed.'
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

    socket.on('client:select_role', async (payload) => {
      const result = resolveSelectRole(await senderPromise, payload.gameId, payload.role)
      if (result.type === 'error') {
        socket.emit('server:error', result.error)
        return
      }

      socket.join(result.snapshot.roomId)
      gameNamespace.to(result.snapshot.roomId).emit('server:role_selected', {
        gameId: result.gameId,
        playerId: result.playerId,
        role: result.role
      })
      gameNamespace.to(result.snapshot.roomId).emit('server:game_state_updated', result.snapshot)

      if (result.snapshot.turnState.actionPlayerId && result.snapshot.turnState.selectedRole) {
        gameNamespace.to(result.snapshot.roomId).emit('server:action_prompt', {
          gameId: result.gameId,
          playerId: result.snapshot.turnState.actionPlayerId,
          role: result.snapshot.turnState.selectedRole
        })
      }
    })

    socket.on('client:skip_action', async (payload) => {
      const result = resolveSkipAction(await senderPromise, payload.gameId)
      if (result.type === 'error') {
        socket.emit('server:error', result.error)
        return
      }

      socket.join(result.snapshot.roomId)
      gameNamespace.to(result.snapshot.roomId).emit('server:game_state_updated', result.snapshot)

      if (result.snapshot.phase === 'ROUND_ROLE_SELECTION') {
        gameNamespace.to(result.snapshot.roomId).emit('server:role_selection_start', {
          gameId: result.gameId,
          playerId: result.snapshot.turnState.activePlayerId
        })
      }
    })
  })

  return {
    close: () => {
      removeRoomSocketListener()
      io.close()
    }
  }
}
