import type { Ref } from 'vue'
import type { Room, RoomVisibility } from '~~/types/room'

export interface UseRoomReturn {
  rooms: Ref<Room[]>
  currentRoom: Ref<Room | null>
  createRoom: (visibility: RoomVisibility) => Promise<Room>
  joinRoom: (roomCode: string) => Promise<Room>
  leaveRoom: () => Promise<void>
}

/**
 * Room / lobby composable (REST + Socket.io).
 * Skeleton — implemented in feat/api-foundation.
 */
export function useRoom(): UseRoomReturn {
  throw new Error('useRoom: not implemented')
}
