import type { Ref } from 'vue'
import type { Room, RoomVisibility } from '~~/types/room'

export interface UseRoomReturn {
  rooms: Ref<Room[]>
  currentRoom: Ref<Room | null>
  fetchRooms: () => Promise<Room[]>
  getRoom: (roomId: string) => Promise<Room>
  createRoom: (visibility: RoomVisibility) => Promise<Room>
  joinRoom: (roomCode: string) => Promise<Room>
  leaveRoom: () => Promise<void>
  setReady: (isReady?: boolean) => Promise<Room>
  kickPlayer: (playerId: string) => Promise<Room>
  startRoom: () => Promise<Room>
}

/**
 * Room / lobby composable (REST + Socket.io).
 * Socket.io live updates are added in the next API foundation step.
 */
export function useRoom(): UseRoomReturn {
  const rooms = useState<Room[]>('sj-room-list', () => [])
  const currentRoom = useState<Room | null>('sj-current-room', () => null)

  function upsertRoom(room: Room): void {
    rooms.value = [
      room,
      ...rooms.value.filter(existingRoom => existingRoom.roomId !== room.roomId)
    ]

    if (currentRoom.value?.roomId === room.roomId || currentRoom.value === null) {
      currentRoom.value = room
    }
  }

  async function fetchRooms(): Promise<Room[]> {
    rooms.value = await $fetch<Room[]>('/api/rooms')
    return rooms.value
  }

  async function getRoom(roomId: string): Promise<Room> {
    const room = await $fetch<Room>(`/api/rooms/${roomId}`)
    upsertRoom(room)
    return room
  }

  async function createRoom(visibility: RoomVisibility): Promise<Room> {
    const room = await $fetch<Room>('/api/rooms', {
      method: 'POST',
      body: { visibility }
    })
    upsertRoom(room)
    return room
  }

  async function joinRoom(roomCode: string): Promise<Room> {
    const room = await $fetch<Room>(`/api/rooms/${roomCode}/join`, { method: 'POST' })
    upsertRoom(room)
    return room
  }

  async function leaveRoom(): Promise<void> {
    const roomId = currentRoom.value?.roomId
    if (!roomId) {
      return
    }

    const room = await $fetch<Room>(`/api/rooms/${roomId}/leave`, { method: 'POST' })
    rooms.value = rooms.value.filter(existingRoom => existingRoom.roomId !== room.roomId)
    currentRoom.value = null
  }

  async function setReady(isReady?: boolean): Promise<Room> {
    const roomId = currentRoom.value?.roomId
    if (!roomId) {
      throw new Error('setReady requires currentRoom')
    }

    const room = await $fetch<Room>(`/api/rooms/${roomId}/ready`, {
      method: 'PUT',
      body: { isReady }
    })
    upsertRoom(room)
    return room
  }

  async function kickPlayer(playerId: string): Promise<Room> {
    const roomId = currentRoom.value?.roomId
    if (!roomId) {
      throw new Error('kickPlayer requires currentRoom')
    }

    const room = await $fetch<Room>(`/api/rooms/${roomId}/kick/${playerId}`, { method: 'POST' })
    upsertRoom(room)
    return room
  }

  async function startRoom(): Promise<Room> {
    const roomId = currentRoom.value?.roomId
    if (!roomId) {
      throw new Error('startRoom requires currentRoom')
    }

    const room = await $fetch<Room>(`/api/rooms/${roomId}/start`, { method: 'POST' })
    upsertRoom(room)
    return room
  }

  return {
    rooms,
    currentRoom,
    fetchRooms,
    getRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    kickPlayer,
    startRoom
  }
}
