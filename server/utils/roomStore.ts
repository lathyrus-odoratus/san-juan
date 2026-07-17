import type { PlayerProfile } from '~~/types/player'
import type { CreateRoomRequest, ReadyRoomRequest, Room, RoomPlayer, RoomStatus, RoomVisibility } from '~~/types/room'

const MAX_ROOM_PLAYERS = 4
const ROOM_CODE_LENGTH = 6
const rooms = new Map<string, Room>()

function now(): number {
  return Date.now()
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}

function createRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''

  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }

  if ([...rooms.values()].some(room => room.roomCode === code)) {
    return createRoomCode()
  }

  return code
}

function toRoomPlayer(profile: PlayerProfile, isHost: boolean): RoomPlayer {
  return {
    ...profile,
    isHost,
    isReady: isHost
  }
}

function touchRoom(room: Room): Room {
  const updatedRoom = {
    ...room,
    updatedAt: now()
  }
  rooms.set(updatedRoom.roomId, updatedRoom)
  return updatedRoom
}

function cloneRoom(room: Room): Room {
  return {
    ...room,
    players: room.players.map(player => ({ ...player }))
  }
}

function findRoom(roomIdOrCode: string): Room | null {
  return rooms.get(roomIdOrCode)
    ?? [...rooms.values()].find(room => room.roomCode === roomIdOrCode)
    ?? null
}

function requireRoom(roomIdOrCode: string): Room {
  const room = findRoom(roomIdOrCode)
  if (!room || room.status === 'closed') {
    throw createError({ statusCode: 404, statusMessage: 'ROOM_NOT_FOUND' })
  }
  return room
}

function requireRoomHost(room: Room, player: PlayerProfile): void {
  if (room.hostPlayerId !== player.discordId) {
    throw createError({ statusCode: 403, statusMessage: 'HOST_ONLY' })
  }
}

function normalizeVisibility(value: unknown): RoomVisibility {
  if (value === 'private') {
    return 'private'
  }

  return 'public'
}

export function listRooms(status?: RoomStatus): Room[] {
  return [...rooms.values()]
    .filter(room => room.visibility === 'public')
    .filter(room => room.status !== 'closed')
    .filter(room => !status || room.status === status)
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .map(cloneRoom)
}

export function createRoomForPlayer(player: PlayerProfile, request: Partial<CreateRoomRequest> = {}): Room {
  const timestamp = now()
  const room: Room = {
    roomId: createId('room'),
    roomCode: createRoomCode(),
    gameId: null,
    hostPlayerId: player.discordId,
    visibility: normalizeVisibility(request.visibility),
    status: 'waiting',
    players: [toRoomPlayer(player, true)],
    createdAt: timestamp,
    updatedAt: timestamp
  }

  rooms.set(room.roomId, room)
  return cloneRoom(room)
}

export function getRoom(roomIdOrCode: string): Room {
  return cloneRoom(requireRoom(roomIdOrCode))
}

export function joinRoom(roomIdOrCode: string, player: PlayerProfile): Room {
  const room = requireRoom(roomIdOrCode)

  if (room.status !== 'waiting') {
    throw createError({ statusCode: 409, statusMessage: 'ROOM_NOT_JOINABLE' })
  }

  if (room.players.some(roomPlayer => roomPlayer.discordId === player.discordId)) {
    return cloneRoom(room)
  }

  if (room.players.length >= MAX_ROOM_PLAYERS) {
    throw createError({ statusCode: 409, statusMessage: 'ROOM_FULL' })
  }

  return cloneRoom(touchRoom({
    ...room,
    players: [...room.players, toRoomPlayer(player, false)]
  }))
}

export function leaveRoom(roomIdOrCode: string, player: PlayerProfile): Room {
  const room = requireRoom(roomIdOrCode)

  if (!room.players.some(roomPlayer => roomPlayer.discordId === player.discordId)) {
    throw createError({ statusCode: 403, statusMessage: 'NOT_IN_ROOM' })
  }

  if (room.hostPlayerId === player.discordId) {
    return cloneRoom(touchRoom({
      ...room,
      status: 'closed',
      players: []
    }))
  }

  return cloneRoom(touchRoom({
    ...room,
    players: room.players.filter(roomPlayer => roomPlayer.discordId !== player.discordId)
  }))
}

export function setPlayerReady(roomIdOrCode: string, player: PlayerProfile, request: ReadyRoomRequest = {}): Room {
  const room = requireRoom(roomIdOrCode)

  if (!room.players.some(roomPlayer => roomPlayer.discordId === player.discordId)) {
    throw createError({ statusCode: 403, statusMessage: 'NOT_IN_ROOM' })
  }

  return cloneRoom(touchRoom({
    ...room,
    players: room.players.map((roomPlayer) => {
      if (roomPlayer.discordId !== player.discordId) {
        return roomPlayer
      }

      return {
        ...roomPlayer,
        isReady: typeof request.isReady === 'boolean' ? request.isReady : !roomPlayer.isReady
      }
    })
  }))
}

export function kickPlayer(roomIdOrCode: string, playerId: string, host: PlayerProfile): Room {
  const room = requireRoom(roomIdOrCode)
  requireRoomHost(room, host)

  if (playerId === room.hostPlayerId) {
    throw createError({ statusCode: 400, statusMessage: 'CANNOT_KICK_HOST' })
  }

  if (!room.players.some(roomPlayer => roomPlayer.discordId === playerId)) {
    throw createError({ statusCode: 404, statusMessage: 'PLAYER_NOT_FOUND' })
  }

  return cloneRoom(touchRoom({
    ...room,
    players: room.players.filter(roomPlayer => roomPlayer.discordId !== playerId)
  }))
}

export function startRoom(roomIdOrCode: string, host: PlayerProfile, gameId?: string): Room {
  const room = requireRoom(roomIdOrCode)
  requireRoomHost(room, host)

  if (room.status !== 'waiting') {
    throw createError({ statusCode: 409, statusMessage: 'ROOM_NOT_STARTABLE' })
  }

  if (room.players.length !== MAX_ROOM_PLAYERS) {
    throw createError({ statusCode: 409, statusMessage: 'ROOM_NOT_FULL' })
  }

  if (!room.players.every(roomPlayer => roomPlayer.isReady)) {
    throw createError({ statusCode: 409, statusMessage: 'PLAYERS_NOT_READY' })
  }

  return cloneRoom(touchRoom({
    ...room,
    gameId: gameId ?? room.gameId,
    status: 'playing'
  }))
}

export function assignRoomGame(roomIdOrCode: string, gameId: string): Room {
  const room = requireRoom(roomIdOrCode)
  return cloneRoom(touchRoom({
    ...room,
    gameId
  }))
}

export function clearRoomStoreForTest(): void {
  rooms.clear()
}
