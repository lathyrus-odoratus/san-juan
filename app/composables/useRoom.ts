import type { Ref } from 'vue'
import type { ChatMessage, ServerError } from '~~/types/events'
import type { Room, RoomVisibility } from '~~/types/room'

export interface UseRoomReturn {
  rooms: Ref<Room[]>
  currentRoom: Ref<Room | null>
  chatMessages: Ref<ChatMessage[]>
  socketErrors: Ref<ServerError[]>
  fetchRooms: () => Promise<Room[]>
  getRoom: (roomId: string) => Promise<Room>
  createRoom: (visibility: RoomVisibility) => Promise<Room>
  joinRoom: (roomCode: string) => Promise<Room>
  leaveRoom: () => Promise<void>
  setReady: (isReady?: boolean) => Promise<Room>
  kickPlayer: (playerId: string) => Promise<Room>
  startRoom: () => Promise<Room>
  sendMessage: (content: string) => void
}

/**
 * Room / lobby composable (REST + Socket.io live updates).
 */
export function useRoom(): UseRoomReturn {
  const rooms = useState<Room[]>('sj-room-list', () => [])
  const currentRoom = useState<Room | null>('sj-current-room', () => null)
  const chatMessages = useState<ChatMessage[]>('sj-room-chat-messages', () => [])
  const socketErrors = useState<ServerError[]>('sj-room-socket-errors', () => [])
  const { player } = useAuth()
  // SSR 時 $fetch 不會帶上瀏覽器 cookie，內部 API 會被判為未登入
  const requestFetch = useRequestFetch()

  function upsertRoom(room: Room): void {
    rooms.value = [
      room,
      ...rooms.value.filter(existingRoom => existingRoom.roomId !== room.roomId)
    ]

    if (currentRoom.value?.roomId === room.roomId || currentRoom.value === null) {
      currentRoom.value = room
    }
  }

  function connectSocketRoom(roomId: string): void {
    if (!import.meta.client) {
      return
    }

    const { $gameSocket } = useNuxtApp()
    if (!$gameSocket.connected) {
      $gameSocket.connect()
    }
    $gameSocket.emit('client:join_room', { roomId })
  }

  if (import.meta.client) {
    const isSocketBound = useState('sj-room-socket-bound', () => false)

    if (!isSocketBound.value) {
      const { $gameSocket } = useNuxtApp()
      isSocketBound.value = true

      $gameSocket.on('server:room_joined', (room) => {
        upsertRoom(room)
      })

      $gameSocket.on('server:room_updated', (room) => {
        upsertRoom(room)
      })

      $gameSocket.on('server:player_kicked', (payload) => {
        if (payload.playerId === player.value?.discordId) {
          currentRoom.value = null
        }
      })

      $gameSocket.on('server:room_closed', (payload) => {
        rooms.value = rooms.value.filter(room => room.roomId !== payload.roomId)
        if (currentRoom.value?.roomId === payload.roomId) {
          currentRoom.value = null
        }
      })

      $gameSocket.on('server:chat_message', (message) => {
        chatMessages.value = [...chatMessages.value, message]
      })

      $gameSocket.on('server:error', (error) => {
        socketErrors.value = [...socketErrors.value, error]
      })

      watch(
        () => currentRoom.value?.roomId,
        (roomId, previousRoomId) => {
          if (previousRoomId) {
            $gameSocket.emit('client:leave_room', { roomId: previousRoomId })
          }

          if (roomId !== previousRoomId) {
            // 聊天訊息與 socket 錯誤都以房間為單位，換房時清空
            chatMessages.value = []
            socketErrors.value = []
          }

          if (roomId) {
            connectSocketRoom(roomId)
          }
        },
        { immediate: true }
      )
    }
  }

  // 房間列表
  async function fetchRooms(): Promise<Room[]> {
    rooms.value = await requestFetch<Room[]>('/api/rooms')
    return rooms.value
  }

  //個別房間
  async function getRoom(roomId: string): Promise<Room> {
    const room = await requestFetch<Room>(`/api/rooms/${roomId}`)
    upsertRoom(room)
    connectSocketRoom(room.roomId)
    return room
  }

  async function createRoom(visibility: RoomVisibility): Promise<Room> {
    const room = await requestFetch<Room>('/api/rooms', {
      method: 'POST',
      body: { visibility }
    })
    upsertRoom(room)
    connectSocketRoom(room.roomId)
    return room
  }

  async function joinRoom(roomCode: string): Promise<Room> {
    const room = await requestFetch<Room>(`/api/rooms/${roomCode}/join`, { method: 'POST' })
    upsertRoom(room)
    connectSocketRoom(room.roomId)
    return room
  }

  async function leaveRoom(): Promise<void> {
    const roomId = currentRoom.value?.roomId
    if (!roomId) {
      return
    }

    const room = await requestFetch<Room>(`/api/rooms/${roomId}/leave`, { method: 'POST' })
    rooms.value = rooms.value.filter(existingRoom => existingRoom.roomId !== room.roomId)
    currentRoom.value = null
  }

  async function setReady(isReady?: boolean): Promise<Room> {
    const roomId = currentRoom.value?.roomId
    if (!roomId) {
      throw new Error('setReady requires currentRoom')
    }

    const room = await requestFetch<Room>(`/api/rooms/${roomId}/ready`, {
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

    const room = await requestFetch<Room>(`/api/rooms/${roomId}/kick/${playerId}`, { method: 'POST' })
    upsertRoom(room)
    return room
  }

  async function startRoom(): Promise<Room> {
    const roomId = currentRoom.value?.roomId
    if (!roomId) {
      throw new Error('startRoom requires currentRoom')
    }

    const room = await requestFetch<Room>(`/api/rooms/${roomId}/start`, { method: 'POST' })
    upsertRoom(room)
    return room
  }

  function sendMessage(content: string): void {
    const roomId = currentRoom.value?.roomId
    if (!roomId || !import.meta.client) {
      return
    }

    const { $gameSocket } = useNuxtApp()
    if (!$gameSocket.connected) {
      $gameSocket.connect()
    }

    $gameSocket.emit('client:send_message', { roomId, content })
  }

  return {
    rooms,
    currentRoom,
    chatMessages,
    socketErrors,
    fetchRooms,
    getRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    kickPlayer,
    startRoom,
    sendMessage
  }
}
