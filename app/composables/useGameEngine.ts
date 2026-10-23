import type { GameAction, GameEngine, GameResult, GameResultPlayer, GameSnapshot, PlayerState, PriceCard } from '~~/types/game'
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
  category: 'production' | 'city'
  cost: number
  vp: number
  count: number
  goodType?: keyof PriceCard
}

interface BuildingsFile {
  cards: BuildingCard[]
}

interface RulesConfig {
  playerCount: number
  initialHandSize: number
  handLimit: number
  endgameBuildingCount: number
  monuments: string[]
}

const buildings = buildingsData as BuildingsFile
const rules = rulesConfig as RulesConfig
const STARTING_BUILDING_ID = 'indigo_plant'
// Trading house tiles from the base game; one is revealed per Trader phase.
const PRICE_CARDS: PriceCard[] = [
  { indigo: 1, sugar: 1, tobacco: 1, coffee: 2, silver: 2 },
  { indigo: 1, sugar: 1, tobacco: 2, coffee: 2, silver: 2 },
  { indigo: 1, sugar: 1, tobacco: 2, coffee: 2, silver: 3 },
  { indigo: 1, sugar: 2, tobacco: 2, coffee: 2, silver: 3 },
  { indigo: 1, sugar: 2, tobacco: 2, coffee: 3, silver: 3 }
]
const DEFAULT_PRICE_CARD: PriceCard = PRICE_CARDS[0] as PriceCard
// Discard is shuffled back under the deck before it runs this low, so the
// councillor's visible top cards never change after the action is chosen.
const DECK_REFILL_THRESHOLD = 12

export function dispatchGameAction(state: GameSnapshot, action: GameAction): GameSnapshot {
  if (!canDispatchGameAction(state, action)) {
    throw new Error('ILLEGAL_ACTION')
  }

  const nextState = applyGameAction(state, action)
  refillDeck(nextState)
  return nextState
}

/**
 * Keys for each building's goods slot. The first copy of a card uses its id,
 * later copies of the same production building get `#2`, `#3`, …
 */
export function getBuildingSlotKeys(buildings: string[]): string[] {
  const seen = new Map<string, number>()
  return buildings.map((cardId) => {
    const copy = (seen.get(cardId) ?? 0) + 1
    seen.set(cardId, copy)
    return copy === 1 ? cardId : `${cardId}#${copy}`
  })
}

export function getSlotCardId(slotKey: string): string {
  return slotKey.split('#')[0] ?? slotKey
}

function applyGameAction(state: GameSnapshot, action: GameAction): GameSnapshot {
  if (action.type === 'SELECT_ROLE') {
    return selectRole(state, action)
  }

  if (action.type === 'SKIP_ACTION') {
    return completeRoleAction(state, action.playerId)
  }

  if (action.type === 'PROSPECT') {
    return prospect(state, action.playerId)
  }

  if (action.type === 'PRODUCE') {
    return produce(state, action)
  }

  if (action.type === 'BUILD') {
    return build(state, action)
  }

  if (action.type === 'TRADE') {
    return trade(state, action)
  }

  if (action.type === 'COUNCIL') {
    return council(state, action)
  }

  if (action.type === 'DISCARD') {
    return discardForHandLimit(state, action)
  }

  return assertNever(action)
}

export function calculateGameResult(snapshot: GameSnapshot): GameResult {
  const players = snapshot.players.map((player): GameResultPlayer => ({
    playerId: player.profile.discordId,
    username: player.profile.username,
    score: calculatePlayerScore(player),
    isWinner: false
  }))
  const highestScore = Math.max(...players.map(player => player.score), 0)
  const tiedPlayers = players.filter(player => player.score === highestScore)
  const winner = snapshot.phase === 'GAME_END'
    ? tiedPlayers.length === 1
      ? tiedPlayers[0]?.playerId ?? null
      : resolveTie(snapshot, tiedPlayers.map(player => player.playerId))
    : null

  return {
    gameId: snapshot.gameId,
    isGameOver: snapshot.phase === 'GAME_END',
    winner,
    players: players.map(player => ({ ...player, isWinner: player.playerId === winner }))
  }
}

export function calculatePlayerScore(player: PlayerState): number {
  const cards = player.buildings.map(getBuildingCard).filter((card): card is BuildingCard => card !== null)
  const baseScore = cards.reduce((total, card) => total + card.vp, 0)
  const cityHallBonus = cards.filter(card => card.id === 'city_hall').length
    * cards.filter(card => card.category === 'city').length
  const productionCards = cards.filter(card => card.category === 'production')
  const guildHallBonus = cards.filter(card => card.id === 'guild_hall').length
    * (productionCards.length + new Set(productionCards.map(card => card.goodType)).size)
  const palaceBonus = cards.filter(card => card.id === 'palace').length
    * Math.floor((baseScore - cards.filter(card => card.id === 'palace').reduce((total, card) => total + card.vp, 0)) / 4)
  const monumentTypes = new Set(cards.filter(card => rules.monuments.includes(card.id)).map(card => card.id)).size
  const triumphalArchBonus = cards.filter(card => card.id === 'triumphal_arch').length
    * (monumentTypes === 1 ? 4 : monumentTypes === 2 ? 6 : monumentTypes >= 3 ? 8 : 0)

  return baseScore + cityHallBonus + guildHallBonus + palaceBonus + triumphalArchBonus
}

function resolveTie(snapshot: GameSnapshot, playerIds: string[]): string | null {
  return playerIds
    .map(playerId => {
      const player = requirePlayer(snapshot, playerId)
      return {
        playerId,
        tieBreaker: player.hand.length + Object.values(player.goods).filter(Boolean).length
      }
    })
    .sort((left, right) => right.tieBreaker - left.tieBreaker)[0]?.playerId ?? null
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

  if (action.type === 'PROSPECT') {
    return isCurrentRoleAction(state, action.playerId, 'Prospector') && state.deckState.length >= 1
  }

  if (action.type === 'PRODUCE') {
    return isCurrentRoleAction(state, action.playerId, 'Producer')
      && action.buildingIds.length <= getRoleLimit(state, action.playerId, 1, 2)
      && state.deckState.length >= action.buildingIds.length
      && action.buildingIds.every((buildingId, index) => action.buildingIds.indexOf(buildingId) === index)
      && action.buildingIds.every(buildingId => canProduceAtBuilding(state, action.playerId, buildingId))
  }

  if (action.type === 'BUILD') {
    return canBuild(state, action)
  }

  if (action.type === 'TRADE') {
    return isCurrentRoleAction(state, action.playerId, 'Trader')
      && action.buildingIds.length <= getRoleLimit(state, action.playerId, 1, 2)
      && action.buildingIds.every((buildingId, index) => action.buildingIds.indexOf(buildingId) === index)
      && action.buildingIds.every(buildingId => canTradeFromBuilding(state, action.playerId, buildingId))
  }

  if (action.type === 'COUNCIL') {
    return canCouncil(state, action)
  }

  if (action.type === 'DISCARD') {
    return canDiscardForHandLimit(state, action)
  }

  return assertNever(action)
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
    hand: takeCards(deck, rules.initialHandSize),
    buildings: [STARTING_BUILDING_ID],
    goods: {
      [STARTING_BUILDING_ID]: null
    }
  }))

  const priceDeck = [...PRICE_CARDS]
  shuffle(priceDeck, `${seed}:price`)

  return {
    schemaVersion: 1,
    gameId: createDeterministicId('game', seed),
    roomId: '',
    hostPlayerId: players[0]?.discordId ?? '',
    players: gamePlayers,
    deckState: deck,
    discardState: [],
    priceDeck,
    turnState: {
      round: 1,
      governorPlayerId: gamePlayers[0]?.profile.discordId ?? '',
      activePlayerId: gamePlayers[0]?.profile.discordId ?? '',
      actionPlayerId: null,
      selectedRole: null,
      selectedRoles: [],
      completedPlayerIds: [],
      priceCard: null,
      pendingTrades: []
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
  nextState.turnState.activePlayerId = action.playerId
  nextState.turnState.completedPlayerIds = []
  nextState.turnState.pendingTrades = []
  if (action.role === 'Trader') {
    const [priceCard, ...restPriceDeck] = nextState.priceDeck ?? []
    nextState.turnState.priceCard = priceCard ?? DEFAULT_PRICE_CARD
    nextState.priceDeck = restPriceDeck
  }
  nextState.updatedAt = state.updatedAt + 1
  return nextState
}

function completeRoleAction(state: GameSnapshot, playerId: string): GameSnapshot {
  const nextState = cloneSnapshot(state)
  const completedPlayerIds = new Set(nextState.turnState.completedPlayerIds)
  completedPlayerIds.add(playerId)
  nextState.turnState.completedPlayerIds = [...completedPlayerIds]

  const nextActionPlayerId = getNextRoleActionPlayerId(nextState, playerId)
  if (nextActionPlayerId) {
    nextState.turnState.actionPlayerId = nextActionPlayerId
    nextState.turnState.activePlayerId = nextActionPlayerId
    nextState.updatedAt = state.updatedAt + 1
    return nextState
  }

  const finishedRole = nextState.turnState.selectedRole
  if (finishedRole === 'Trader') {
    resolvePendingTrades(nextState)
    // The revealed price card goes back under the price deck.
    if (nextState.turnState.priceCard) {
      nextState.priceDeck = [...(nextState.priceDeck ?? []), nextState.turnState.priceCard]
    }
    nextState.turnState.priceCard = null
  }

  nextState.turnState.selectedRole = null
  nextState.turnState.actionPlayerId = null
  nextState.turnState.pendingTrades = []

  // The game ends right after the builder phase in which someone reaches 12 buildings.
  if (finishedRole === 'Builder' && hasReachedEndgame(nextState)) {
    return endGame(nextState, state.updatedAt + 1)
  }

  if (nextState.turnState.selectedRoles.length >= nextState.players.length) {
    return resolveRoundEnd(nextState, state.updatedAt + 1)
  }
  else {
    nextState.phase = 'ROUND_ROLE_SELECTION'
    nextState.turnState.activePlayerId = getNextRoleSelectorPlayerId(nextState)
  }

  nextState.updatedAt = state.updatedAt + 1
  return nextState
}

function prospect(state: GameSnapshot, playerId: string): GameSnapshot {
  const nextState = cloneSnapshot(state)
  const player = requirePlayer(nextState, playerId)
  player.hand.push(...drawCards(nextState, 1))
  return completeRoleAction(nextState, playerId)
}

function produce(state: GameSnapshot, action: Extract<GameAction, { type: 'PRODUCE' }>): GameSnapshot {
  const nextState = cloneSnapshot(state)
  const player = requirePlayer(nextState, action.playerId)
  for (const buildingId of action.buildingIds) {
    const [good] = drawCards(nextState, 1)
    player.goods[buildingId] = good ?? null
  }

  return completeRoleAction(nextState, action.playerId)
}

function build(state: GameSnapshot, action: Extract<GameAction, { type: 'BUILD' }>): GameSnapshot {
  const nextState = cloneSnapshot(state)
  const player = requirePlayer(nextState, action.playerId)
  removeCardsFromHand(player, [action.cardId, ...action.payment])
  player.buildings.push(action.cardId)

  const card = getBuildingCard(action.cardId)
  const slotKey = getBuildingSlotKeys(player.buildings).at(-1)
  if (card?.category === 'production' && slotKey) {
    player.goods[slotKey] = null
  }

  nextState.discardState.push(...action.payment)
  return completeRoleAction(nextState, action.playerId)
}

function trade(state: GameSnapshot, action: Extract<GameAction, { type: 'TRADE' }>): GameSnapshot {
  const nextState = cloneSnapshot(state)
  nextState.turnState.pendingTrades = [
    ...nextState.turnState.pendingTrades.filter(trade => trade.playerId !== action.playerId),
    {
      playerId: action.playerId,
      buildingIds: [...action.buildingIds]
    }
  ]
  return completeRoleAction(nextState, action.playerId)
}

function council(state: GameSnapshot, action: Extract<GameAction, { type: 'COUNCIL' }>): GameSnapshot {
  const nextState = cloneSnapshot(state)
  const player = requirePlayer(nextState, action.playerId)
  const drawCount = getRoleLimit(state, action.playerId, 2, 5)
  const drawnCards = drawCards(nextState, drawCount)
  const keptCardId = action.keptCardIds[0]
  if (keptCardId) {
    player.hand.push(keptCardId)
  }
  nextState.discardState.push(...action.discardedCardIds)

  if (!hasSameCardCounts(drawnCards, [...action.keptCardIds, ...action.discardedCardIds])) {
    throw new Error('ILLEGAL_ACTION')
  }

  return completeRoleAction(nextState, action.playerId)
}

function discardForHandLimit(state: GameSnapshot, action: Extract<GameAction, { type: 'DISCARD' }>): GameSnapshot {
  const nextState = cloneSnapshot(state)
  const player = requirePlayer(nextState, action.playerId)
  removeCardsFromHand(player, action.cardIds)
  nextState.discardState.push(...action.cardIds)
  return resolveRoundEnd(nextState, state.updatedAt + 1)
}

function resolveRoundEnd(state: GameSnapshot, updatedAt: number): GameSnapshot {
  const nextState = cloneSnapshot(state)
  const playerOverLimit = nextState.players.find(player => player.hand.length > getHandLimit(player))

  if (playerOverLimit) {
    nextState.phase = 'ROUND_END_CHECK'
    nextState.turnState.activePlayerId = playerOverLimit.profile.discordId
    nextState.turnState.actionPlayerId = playerOverLimit.profile.discordId
    nextState.updatedAt = updatedAt
    return nextState
  }

  if (hasReachedEndgame(nextState)) {
    return endGame(nextState, updatedAt)
  }

  const nextGovernorPlayerId = getNextPlayerId(nextState, nextState.turnState.governorPlayerId)
  nextState.phase = 'ROUND_ROLE_SELECTION'
  nextState.turnState.round += 1
  nextState.turnState.governorPlayerId = nextGovernorPlayerId
  nextState.turnState.activePlayerId = nextGovernorPlayerId
  nextState.turnState.actionPlayerId = null
  nextState.turnState.selectedRole = null
  nextState.turnState.selectedRoles = []
  nextState.turnState.completedPlayerIds = []
  nextState.turnState.priceCard = null
  nextState.turnState.pendingTrades = []
  nextState.updatedAt = updatedAt
  return nextState
}

function hasReachedEndgame(state: GameSnapshot): boolean {
  return state.players.some(player => player.buildings.length >= rules.endgameBuildingCount)
}

function endGame(state: GameSnapshot, updatedAt: number): GameSnapshot {
  const nextState = cloneSnapshot(state)
  nextState.phase = 'GAME_END'
  nextState.turnState.activePlayerId = ''
  nextState.turnState.actionPlayerId = null
  nextState.turnState.selectedRole = null
  nextState.turnState.selectedRoles = []
  nextState.turnState.completedPlayerIds = []
  nextState.turnState.priceCard = null
  nextState.turnState.pendingTrades = []
  nextState.winner = calculateGameResult({ ...nextState, phase: 'GAME_END' }).winner
  nextState.updatedAt = updatedAt
  return nextState
}

function isCurrentRoleAction(state: GameSnapshot, playerId: string, role: GameSnapshot['turnState']['selectedRole']): boolean {
  return state.phase === 'ROUND_ACTION_RESOLUTION'
    && state.turnState.actionPlayerId === playerId
    && state.turnState.selectedRole === role
}

function getNextRoleActionPlayerId(state: GameSnapshot, completedPlayerId: string): string | null {
  if (state.turnState.selectedRole === 'Prospector') {
    return null
  }

  let nextPlayerId = getNextPlayerId(state, completedPlayerId)
  for (let checkedPlayers = 0; checkedPlayers < state.players.length - 1; checkedPlayers += 1) {
    if (!state.turnState.completedPlayerIds.includes(nextPlayerId)) {
      return nextPlayerId
    }

    nextPlayerId = getNextPlayerId(state, nextPlayerId)
  }

  return null
}

function resolvePendingTrades(state: GameSnapshot): void {
  const priceCard = state.turnState.priceCard ?? DEFAULT_PRICE_CARD
  for (const pendingTrade of state.turnState.pendingTrades) {
    const player = requirePlayer(state, pendingTrade.playerId)
    let totalCardsToDraw = 0

    for (const buildingId of pendingTrade.buildingIds) {
      const goodCardId = player.goods[buildingId]
      const building = getBuildingCard(getSlotCardId(buildingId))
      if (!goodCardId || !building?.goodType) {
        throw new Error('ILLEGAL_ACTION')
      }

      player.goods[buildingId] = null
      state.discardState.push(goodCardId)
      totalCardsToDraw += priceCard[building.goodType] ?? 0
    }

    player.hand.push(...drawCards(state, totalCardsToDraw))
  }
}

function getRoleLimit(state: GameSnapshot, playerId: string, normalLimit: number, privilegedLimit: number): number {
  const selectedRole = state.turnState.selectedRole
  const selectedRoleOwner = state.turnState.selectedRoles.find(role => role.role === selectedRole)?.playerId
  return selectedRoleOwner === playerId ? privilegedLimit : normalLimit
}

function canProduceAtBuilding(state: GameSnapshot, playerId: string, slotKey: string): boolean {
  const player = findPlayer(state, playerId)
  const building = getBuildingCard(getSlotCardId(slotKey))
  return Boolean(player
    && getBuildingSlotKeys(player.buildings).includes(slotKey)
    && building?.category === 'production'
    && !player.goods[slotKey])
}

function canTradeFromBuilding(state: GameSnapshot, playerId: string, slotKey: string): boolean {
  const player = findPlayer(state, playerId)
  const building = getBuildingCard(getSlotCardId(slotKey))
  return Boolean(player
    && getBuildingSlotKeys(player.buildings).includes(slotKey)
    && building?.category === 'production'
    && player.goods[slotKey])
}

function canBuild(state: GameSnapshot, action: Extract<GameAction, { type: 'BUILD' }>): boolean {
  if (!isCurrentRoleAction(state, action.playerId, 'Builder')) {
    return false
  }

  const player = findPlayer(state, action.playerId)
  const card = getBuildingCard(action.cardId)
  if (!player || !card || !player.hand.includes(action.cardId)) {
    return false
  }

  if (card.category === 'city' && player.buildings.includes(action.cardId)) {
    return false
  }

  const cost = Math.max(card.cost - getRoleLimit(state, action.playerId, 0, 1), 0)
  return action.payment.length === cost && hasCardsForPayment(player.hand, action.cardId, action.payment)
}

function canCouncil(state: GameSnapshot, action: Extract<GameAction, { type: 'COUNCIL' }>): boolean {
  if (!isCurrentRoleAction(state, action.playerId, 'Councillor')) {
    return false
  }

  const drawCount = getRoleLimit(state, action.playerId, 2, 5)
  const selectedCards = [...action.keptCardIds, ...action.discardedCardIds]
  return action.keptCardIds.length === 1
    && action.discardedCardIds.length === drawCount - 1
    && state.deckState.length >= drawCount
    && hasSameCardCounts(state.deckState.slice(0, drawCount), selectedCards)
}

function canDiscardForHandLimit(state: GameSnapshot, action: Extract<GameAction, { type: 'DISCARD' }>): boolean {
  if (state.phase !== 'ROUND_END_CHECK' || state.turnState.actionPlayerId !== action.playerId) {
    return false
  }

  const player = findPlayer(state, action.playerId)
  if (!player) {
    return false
  }

  const excessCardCount = player.hand.length - getHandLimit(player)
  return excessCardCount > 0
    && action.cardIds.length === excessCardCount
    && hasCardCounts(player.hand, action.cardIds)
}

function getHandLimit(player: PlayerState): number {
  return player.buildings.includes('tower') ? 12 : rules.handLimit
}

function getNextPlayerId(state: GameSnapshot, playerId: string): string {
  const playerIds = state.players.map(player => player.profile.discordId)
  const playerIndex = playerIds.indexOf(playerId)
  if (playerIndex === -1) {
    throw new Error('PLAYER_NOT_FOUND')
  }

  return playerIds[(playerIndex + 1) % playerIds.length] ?? playerId
}

function findPlayer(state: GameSnapshot, playerId: string): PlayerState | null {
  return state.players.find(player => player.profile.discordId === playerId) ?? null
}

function requirePlayer(state: GameSnapshot, playerId: string): PlayerState {
  const player = findPlayer(state, playerId)
  if (!player) {
    throw new Error('PLAYER_NOT_FOUND')
  }

  return player
}

function getBuildingCard(cardId: string): BuildingCard | null {
  return buildings.cards.find(card => card.id === cardId) ?? null
}

function removeCardsFromHand(player: PlayerState, cardIds: string[]): void {
  for (const cardId of cardIds) {
    const cardIndex = player.hand.indexOf(cardId)
    if (cardIndex === -1) {
      throw new Error('ILLEGAL_ACTION')
    }

    player.hand.splice(cardIndex, 1)
  }
}

function hasCardsForPayment(hand: string[], buildCardId: string, payment: string[]): boolean {
  const remainingCards = [...hand]
  const buildCardIndex = remainingCards.indexOf(buildCardId)
  if (buildCardIndex === -1) {
    return false
  }

  remainingCards.splice(buildCardIndex, 1)
  return hasCardCounts(remainingCards, payment)
}

function hasSameCardCounts(left: string[], right: string[]): boolean {
  return left.length === right.length && hasCardCounts(left, right) && hasCardCounts(right, left)
}

function hasCardCounts(source: string[], expected: string[]): boolean {
  const counts = new Map<string, number>()
  for (const cardId of source) {
    counts.set(cardId, (counts.get(cardId) ?? 0) + 1)
  }

  for (const cardId of expected) {
    const count = counts.get(cardId) ?? 0
    if (count <= 0) {
      return false
    }

    counts.set(cardId, count - 1)
  }

  return true
}

function assertNever(value: never): never {
  throw new Error(`Unhandled action: ${JSON.stringify(value)}`)
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

function takeCards(deck: string[], count: number): string[] {
  const cards = deck.splice(0, count)
  if (cards.length !== count) {
    throw new Error('DECK_EXHAUSTED')
  }

  return cards
}

/**
 * Draws from the deck, shuffling the discard pile back in when the deck runs short.
 * Only when both piles are empty does a player receive fewer cards than asked.
 */
function drawCards(state: GameSnapshot, count: number): string[] {
  if (state.deckState.length < count) {
    refillDeck(state, count)
  }

  return state.deckState.splice(0, count)
}

function refillDeck(state: GameSnapshot, minimum = DECK_REFILL_THRESHOLD): void {
  if (state.deckState.length >= minimum || state.discardState.length === 0) {
    return
  }

  const reshuffled = [...state.discardState]
  shuffle(reshuffled, `${state.gameId}:reshuffle:${state.turnState.round}:${state.deckState.length}:${reshuffled.length}`)
  state.deckState.push(...reshuffled)
  state.discardState = []
}

function shuffle<T>(cards: T[], seed: string): void {
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
    priceDeck: (snapshot.priceDeck ?? []).map(priceCard => ({ ...priceCard })),
    turnState: {
      ...snapshot.turnState,
      selectedRoles: snapshot.turnState.selectedRoles.map(selectedRole => ({ ...selectedRole })),
      completedPlayerIds: [...snapshot.turnState.completedPlayerIds],
      pendingTrades: snapshot.turnState.pendingTrades.map(trade => ({
        playerId: trade.playerId,
        buildingIds: [...trade.buildingIds]
      }))
    }
  }
}
