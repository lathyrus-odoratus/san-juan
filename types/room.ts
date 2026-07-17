// Room / lobby types

import type { PlayerProfile } from './player'

export type RoomVisibility = 'public' | 'private'

export type RoomStatus = 'waiting' | 'playing' | 'closed'

export interface CreateRoomRequest {
  visibility: RoomVisibility
}

export interface ReadyRoomRequest {
  isReady?: boolean
}

/**
 * A player seated in a room, with lobby-specific flags.
 */
export interface RoomPlayer extends PlayerProfile {
  isHost: boolean
  isReady: boolean
}

/**
 * A 4-player room as managed by the lobby (Nitro in-memory for V0.1).
 */
export interface Room {
  roomId: string
  roomCode: string
  hostPlayerId: string
  visibility: RoomVisibility
  status: RoomStatus
  players: RoomPlayer[]
  createdAt: number
  updatedAt: number
}
