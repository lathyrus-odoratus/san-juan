// Socket.io event contracts (namespace `/game`)

import type { Room } from './room'

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
  'server:error': (error: ServerError) => void
}

/**
 * Events emitted by clients to the server.
 */
export interface ClientToServerEvents {
  'client:send_message': (payload: { roomId: string; content: string }) => void
  'client:prospect': (payload: { gameId: string }) => void
}
