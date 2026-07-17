import type { ChatMessage } from '~~/types/events'
import type { Room } from '~~/types/room'

export type RoomSocketEvent =
  | { type: 'room_updated'; room: Room }
  | { type: 'player_kicked'; room: Room; playerId: string }
  | { type: 'room_closed'; roomId: string }
  | { type: 'chat_message'; roomId: string; message: ChatMessage }

type RoomSocketListener = (event: RoomSocketEvent) => void

const listeners = new Set<RoomSocketListener>()

export function onRoomSocketEvent(listener: RoomSocketListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emitRoomSocketEvent(event: RoomSocketEvent): void {
  for (const listener of listeners) {
    listener(event)
  }
}

export function emitRoomUpdated(room: Room): void {
  emitRoomSocketEvent({ type: 'room_updated', room })
}

export function emitPlayerKicked(room: Room, playerId: string): void {
  emitRoomSocketEvent({ type: 'player_kicked', room, playerId })
}

export function emitRoomClosed(roomId: string): void {
  emitRoomSocketEvent({ type: 'room_closed', roomId })
}

export function emitChatMessage(roomId: string, message: ChatMessage): void {
  emitRoomSocketEvent({ type: 'chat_message', roomId, message })
}
