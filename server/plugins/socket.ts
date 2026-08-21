import { Server as Engine } from 'engine.io'
import { Server } from 'socket.io'
import { defineEventHandler } from 'h3'
import type { ClientToServerEvents, ServerToClientEvents } from '~~/types/events'
import { setupGameSocketServer } from '~~/server/utils/gameSocketServer'

/**
 * Socket.io is bound to Nitro's router rather than the `listen` hook:
 * `listen` only fires on the standalone production server, so `nuxt dev`
 * left `/socket.io/` unhandled and it fell through to the Vue router.
 *
 * Transport is HTTP long-polling only — Vite's HMR server takes the
 * WebSocket upgrade in dev, so `/socket.io/` never sees it. Keeping one
 * transport keeps dev and production on the same path.
 */
export default defineNitroPlugin((nitroApp) => {
  const engine = new Engine({ transports: ['polling'] })
  const io = new Server<ClientToServerEvents, ServerToClientEvents>()
  io.bind(engine as unknown as Parameters<typeof io.bind>[0])

  const gameSocketServer = setupGameSocketServer(io)

  nitroApp.router.use('/socket.io/', defineEventHandler((event) => {
    engine.handleRequest(event.node.req, event.node.res)
    event._handled = true
  }))

  nitroApp.hooks.hookOnce('close', () => {
    gameSocketServer.close()
    engine.close()
  })
})
