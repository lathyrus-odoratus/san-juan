// Core game engine types (state machine, snapshot, actions)

import type { PlayerProfile } from './player'

/**
 * Round-level state machine phases.
 */
export type GamePhase =
  | 'WAITING_PLAYERS'
  | 'ROUND_ROLE_SELECTION'
  | 'ROUND_ACTION_RESOLUTION'
  | 'ROUND_END_CHECK'
  | 'GAME_END'

/**
 * Selectable roles (English names per Glossary).
 */
export type Role =
  | 'Prospector'
  | 'Councillor'
  | 'Trader'
  | 'Builder'
  | 'Producer'

/**
 * Per-player in-game state. Card references are stored by id.
 */
export interface PlayerState {
  profile: PlayerProfile
  hand: string[]
  buildings: string[]
  goods: Record<string, string | null>
}

export interface SelectedRole {
  role: Role
  playerId: string
}

export interface TurnState {
  round: number
  governorPlayerId: string
  activePlayerId: string
  actionPlayerId: string | null
  selectedRole: Role | null
  selectedRoles: SelectedRole[]
  completedPlayerIds: string[]
}

/**
 * Serialized snapshot persisted to LocalStorage (`sj.game.snapshot.v1`).
 */
export interface GameSnapshot {
  schemaVersion: number
  gameId: string
  roomId: string
  hostPlayerId: string
  players: PlayerState[]
  deckState: string[]
  discardState: string[]
  turnState: TurnState
  phase: GamePhase
  winner: string | null
  updatedAt: number
}

export interface GameLogEntry {
  id: string
  gameId: string
  type: string
  message: string
  createdAt: number
  payload?: Record<string, unknown>
}

export interface GameResultPlayer {
  playerId: string
  username: string
  score: number
  isWinner: boolean
}

export interface GameResult {
  gameId: string
  isGameOver: boolean
  winner: string | null
  players: GameResultPlayer[]
}

/**
 * All mutations to a GameSnapshot flow through dispatched actions.
 */
export type GameAction =
  | { type: 'SELECT_ROLE'; playerId: string; role: Role }
  | { type: 'BUILD'; playerId: string; cardId: string; payment: string[] }
  | { type: 'PRODUCE'; playerId: string; buildingIds: string[] }
  | { type: 'TRADE'; playerId: string; buildingIds: string[] }
  | { type: 'COUNCIL'; playerId: string; keptCardIds: string[]; discardedCardIds: string[] }
  | { type: 'PROSPECT'; playerId: string }
  | { type: 'DISCARD'; playerId: string; cardIds: string[] }

/**
 * Deterministic rule engine, decoupled from UI and persistence.
 */
export interface GameEngine {
  createGame(seed: string, players: PlayerProfile[]): GameSnapshot
  dispatch(action: GameAction): GameSnapshot
  canDispatch(action: GameAction, state: GameSnapshot): boolean
}
