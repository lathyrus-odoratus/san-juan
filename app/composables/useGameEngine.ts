import type { GameAction, GameEngine, GameSnapshot, PlayerState } from '~~/types/game'
import type { PlayerProfile } from '~~/types/player'
import buildingsData from '~~/data/cards.buildings.json'
import rulesConfig from '~~/data/rules.config.json'

/**
 * Deterministic rule engine. Must stay decoupled from UI and LocalStorage.
 */
export function useGameEngine(): GameEngine {
  let snapshot: GameSnapshot | null = null

  return {
    createGame(seed: string, players: PlayerProfile[]): GameSnapshot {
      snapshot = createInitialGame(seed, players)
      return cloneSnapshot(snapshot)
    },
    dispatch(action: GameAction): GameSnapshot {
      if (!snapshot) {
        throw new Error('GAME_NOT_INITIALIZED')
      }

      snapshot = dispatchGameAction(snapshot, action)
      return cloneSnapshot(snapshot)
    },
    canDispatch(action: GameAction, state: GameSnapshot): boolean {
      return canDispatchGameAction(state, action)
    }
  }
}

interface BuildingCard {
  id: string
  count: number
}

interface BuildingsFile {
  cards: BuildingCard[]
}

interface RulesConfig {
  playerCount: number
  initialHandSize: number
}

const buildings = buildingsData as BuildingsFile
const rules = rulesConfig as RulesConfig
const STARTING_BUILDING_ID = 'indigo_plant'

export function dispatchGameAction(state: GameSnapshot, action: GameAction): GameSnapshot {
  if (!canDispatchGameAction(state, action)) {
    throw new Error('ILLEGAL_ACTION')
  }

  if (action.type === 'SELECT_ROLE') {
    return selectRole(state, action)
  }

  if (action.type === 'SKIP_ACTION') {
    return completeRoleAction(state, action.playerId)
  }

  throw new Error(`UNIMPLEMENTED_ACTION:${action.type}`)
}

export function canDispatchGameAction(state: GameSnapshot, action: GameAction): boolean {
  if (state.phase === 'GAME_END') {
    return false
  }

  if (!hasPlayer(state, action.playerId)) {
    return false
  }

  if (action.type === 'SELECT_ROLE') {
    return state.phase === 'ROUND_ROLE_SELECTION'
      && state.turnState.activePlayerId === action.playerId
      && !state.turnState.selectedRoles.some(selectedRole => selectedRole.role === action.role)
  }

  if (action.type === 'SKIP_ACTION') {
    return state.phase === 'ROUND_ACTION_RESOLUTION'
      && state.turnState.actionPlayerId === action.playerId
      && state.turnState.selectedRole !== null
  }

  return false
}

function createInitialGame(seed: string, players: PlayerProfile[]): GameSnapshot {
  if (players.length !== rules.playerCount) {
    throw new Error('GAME_REQUIRES_FOUR_PLAYERS')
  }

  const deck = createDeck()
  removeStartingBuildings(deck, players.length)
  shuffle(deck, seed)

  const gamePlayers = players.map<PlayerState>(player => ({
    profile: { ...player },
    hand: drawCards(deck, rules.initialHandSize),
    buildings: [STARTING_BUILDING_ID],
    goods: {
      [STARTING_BUILDING_ID]: null
    }
  }))

  return {
    schemaVersion: 1,
    gameId: createDeterministicId('game', seed),
    roomId: '',
    hostPlayerId: players[0]?.discordId ?? '',
    players: gamePlayers,
    deckState: deck,
    discardState: [],
    turnState: {
      round: 1,
      governorPlayerId: gamePlayers[0]?.profile.discordId ?? '',
      activePlayerId: gamePlayers[0]?.profile.discordId ?? '',
      actionPlayerId: null,
      selectedRole: null,
      selectedRoles: [],
      completedPlayerIds: []
    },
    phase: 'ROUND_ROLE_SELECTION',
    winner: null,
    updatedAt: 0
  }
}

function selectRole(state: GameSnapshot, action: Extract<GameAction, { type: 'SELECT_ROLE' }>): GameSnapshot {
  const nextState = cloneSnapshot(state)
  nextState.phase = 'ROUND_ACTION_RESOLUTION'
  nextState.turnState.selectedRole = action.role
  nextState.turnState.selectedRoles = [
    ...nextState.turnState.selectedRoles,
    {
      role: action.role,
      playerId: action.playerId
    }
  ]
  nextState.turnState.actionPlayerId = action.playerId
  nextState.turnState.completedPlayerIds = []
  nextState.updatedAt = state.updatedAt + 1
  return nextState
}

function completeRoleAction(state: GameSnapshot, playerId: string): GameSnapshot {
  const nextState = cloneSnapshot(state)
  const completedPlayerIds = new Set(nextState.turnState.completedPlayerIds)
  completedPlayerIds.add(playerId)
  nextState.turnState.completedPlayerIds = [...completedPlayerIds]
  nextState.turnState.selectedRole = null
  nextState.turnState.actionPlayerId = null

  if (nextState.turnState.selectedRoles.length >= nextState.players.length) {
    nextState.phase = 'ROUND_END_CHECK'
    nextState.turnState.activePlayerId = nextState.turnState.governorPlayerId
  }
  else {
    nextState.phase = 'ROUND_ROLE_SELECTION'
    nextState.turnState.activePlayerId = getNextRoleSelectorPlayerId(nextState)
  }

  nextState.updatedAt = state.updatedAt + 1
  return nextState
}

function getNextRoleSelectorPlayerId(state: GameSnapshot): string {
  const playerIds = state.players.map(player => player.profile.discordId)
  const governorIndex = playerIds.indexOf(state.turnState.governorPlayerId)
  if (governorIndex === -1) {
    throw new Error('GOVERNOR_NOT_FOUND')
  }

  const selectedPlayerIds = new Set(state.turnState.selectedRoles.map(selectedRole => selectedRole.playerId))
  for (let offset = 0; offset < playerIds.length; offset += 1) {
    const playerId = playerIds[(governorIndex + offset) % playerIds.length]
    if (playerId && !selectedPlayerIds.has(playerId)) {
      return playerId
    }
  }

  return state.turnState.governorPlayerId
}

function hasPlayer(state: GameSnapshot, playerId: string): boolean {
  return state.players.some(player => player.profile.discordId === playerId)
}

function createDeck(): string[] {
  return buildings.cards.flatMap(card => Array.from({ length: card.count }, () => card.id))
}

function removeStartingBuildings(deck: string[], count: number): void {
  for (let removed = 0; removed < count; removed += 1) {
    const index = deck.indexOf(STARTING_BUILDING_ID)
    if (index === -1) {
      throw new Error('STARTING_BUILDING_NOT_FOUND')
    }

    deck.splice(index, 1)
  }
}

function drawCards(deck: string[], count: number): string[] {
  const cards = deck.splice(0, count)
  if (cards.length !== count) {
    throw new Error('DECK_EXHAUSTED')
  }

  return cards
}

function shuffle(cards: string[], seed: string): void {
  const random = createSeededRandom(seed)
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = cards[index]
    const swap = cards[swapIndex]
    if (current === undefined || swap === undefined) {
      throw new Error('SHUFFLE_INDEX_OUT_OF_RANGE')
    }

    cards[index] = swap
    cards[swapIndex] = current
  }
}

function createSeededRandom(seed: string): () => number {
  let state = hashSeed(seed)
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function hashSeed(seed: string): number {
  let hash = 2166136261
  for (const character of seed) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0 || 1
}

function createDeterministicId(prefix: string, seed: string): string {
  return `${prefix}_${hashSeed(seed).toString(36)}`
}

function cloneSnapshot(snapshot: GameSnapshot): GameSnapshot {
  return {
    ...snapshot,
    players: snapshot.players.map(player => ({
      profile: { ...player.profile },
      hand: [...player.hand],
      buildings: [...player.buildings],
      goods: { ...player.goods }
    })),
    deckState: [...snapshot.deckState],
    discardState: [...snapshot.discardState],
    turnState: {
      ...snapshot.turnState,
      selectedRoles: snapshot.turnState.selectedRoles.map(selectedRole => ({ ...selectedRole })),
      completedPlayerIds: [...snapshot.turnState.completedPlayerIds]
    }
  }
}
