// Socket.io event contracts (namespace `/game`)

import type { Room } from './room'
import type { GameSnapshot, Role } from './game'

export interface ChatMessage {
  playerId: string
  username: string
  content: string
  sentAt: number
}

export interface ServerError {
  code: string
  message: string
}

/**
 * Events emitted by the server to clients.
 */
export interface ServerToClientEvents {
  'server:room_joined': (room: Room) => void
  'server:room_updated': (room: Room) => void
  'server:player_kicked': (payload: { playerId: string }) => void
  'server:room_closed': (payload: { roomId: string }) => void
  'server:chat_message': (message: ChatMessage) => void
  'server:role_selection_start': (payload: { gameId: string; playerId: string }) => void
  'server:role_selected': (payload: { gameId: string; playerId: string; role: Role }) => void
  'server:action_prompt': (payload: { gameId: string; playerId: string; role: Role }) => void
  'server:game_state_updated': (snapshot: GameSnapshot) => void
  'server:error': (error: ServerError) => void
}

/**
 * Events emitted by clients to the server.
 */
export interface ClientToServerEvents {
  'client:join_room': (payload: { roomId: string }) => void
  'client:leave_room': (payload: { roomId: string }) => void
  'client:send_message': (payload: { roomId: string; content: string }) => void
  'client:select_role': (payload: { gameId: string; role: Role }) => void
  'client:skip_action': (payload: { gameId: string }) => void
  'client:prospect': (payload: { gameId: string }) => void
}
