import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '~~/types/events'

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export default defineNuxtPlugin(() => {
  const gameSocket: GameSocket = io('/game', {
    autoConnect: false,
    path: '/socket.io'
  })

  return {
    provide: {
      gameSocket
    }
  }
})

declare module '#app' {
  interface NuxtApp {
    $gameSocket: GameSocket
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $gameSocket: GameSocket
  }
}
