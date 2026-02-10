/**
 * WebSocket client for real-time ticker updates.
 *
 * Provides an event-driven interface for subscribing to live price data
 * from the Luzia API. Requires a Pro plan or higher.
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Channel-based subscription management
 * - Typed event callbacks
 * - Heartbeat (ping/pong) to detect stale connections
 */

/** Runtime-agnostic WebSocket interface (browser, Bun, Node.js `ws`). */
interface IWebSocket {
  send(data: string): void
  close(code?: number, reason?: string): void
  onopen: ((event: unknown) => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onclose: ((event: { code: number; reason: string }) => void) | null
  onerror: ((event: unknown) => void) | null
}

export interface WebSocketConstructor {
  new (url: string, options?: { headers?: Record<string, string> }): IWebSocket
}

export interface WebSocketOptions {
  /** Whether to automatically reconnect on disconnection (default: true) */
  autoReconnect?: boolean
  /** Maximum number of reconnect attempts (default: 10, 0 = infinite) */
  maxReconnectAttempts?: number
  /** Initial reconnect delay in ms (default: 1000) */
  reconnectDelayMs?: number
  /** Maximum reconnect delay in ms (default: 30000) */
  maxReconnectDelayMs?: number
  /** Heartbeat interval in ms (default: 30000). Set to 0 to disable. */
  heartbeatIntervalMs?: number
  /** Custom WebSocket implementation (for testing or non-browser environments) */
  WebSocket?: WebSocketConstructor
}

export interface WSTickerData {
  type: 'ticker'
  exchange: string
  symbol: string
  data: {
    symbol: string
    exchange: string
    last: number | null
    bid: number | null
    ask: number | null
    high: number | null
    low: number | null
    open: number | null
    close: number | null
    volume: number | null
    quoteVolume: number | null
    change: number | null
    changePercent: number | null
    timestamp: number
  }
  timestamp: number
}

export interface WSConnectedData {
  type: 'connected'
  message: string
  tier: string
  limits: {
    maxSubscriptions: number
  }
}

export interface WSSubscribedData {
  type: 'subscribed'
  channel: string
}

export interface WSUnsubscribedData {
  type: 'unsubscribed'
  channel: string
}

export interface WSErrorData {
  type: 'error'
  code: string
  message: string
}

export interface WSPongData {
  type: 'pong'
  timestamp: number
}

export type WSServerMessage =
  | WSTickerData
  | WSConnectedData
  | WSSubscribedData
  | WSUnsubscribedData
  | WSErrorData
  | WSPongData

export interface WSEventMap {
  connected: WSConnectedData
  ticker: WSTickerData
  subscribed: WSSubscribedData
  unsubscribed: WSUnsubscribedData
  error: WSErrorData
  disconnected: { code: number; reason: string }
  reconnecting: { attempt: number; delayMs: number }
}

export type WSEventCallback<K extends keyof WSEventMap> = (data: WSEventMap[K]) => void

export type WSConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

type TimerHandle = ReturnType<typeof globalThis.setTimeout>

const DEFAULT_WS_OPTIONS: Required<Omit<WebSocketOptions, 'WebSocket'>> = {
  autoReconnect: true,
  maxReconnectAttempts: 10,
  reconnectDelayMs: 1000,
  maxReconnectDelayMs: 30000,
  heartbeatIntervalMs: 30000,
}

function resolveWebSocket(options?: WebSocketOptions): WebSocketConstructor {
  if (options?.WebSocket) return options.WebSocket
  const ws = (globalThis as Record<string, unknown>).WebSocket as WebSocketConstructor | undefined
  if (!ws) {
    throw new Error(
      'WebSocket is not available in this environment. Pass a WebSocket implementation via the `WebSocket` option.'
    )
  }
  return ws
}

export class LuziaWebSocket {
  private ws: IWebSocket | null = null
  private readonly url: string
  private readonly headers: Record<string, string>
  private readonly options: Required<Omit<WebSocketOptions, 'WebSocket'>>
  private readonly WSImpl: WebSocketConstructor
  private listeners = new Map<keyof WSEventMap, Set<WSEventCallback<keyof WSEventMap>>>()
  private _state: WSConnectionState = 'disconnected'
  private reconnectAttempts = 0
  private reconnectTimer: TimerHandle | null = null
  private heartbeatTimer: TimerHandle | null = null
  private pendingSubscriptions = new Set<string>()
  private activeSubscriptions = new Set<string>()

  constructor(url: string, options?: WebSocketOptions & { headers?: Record<string, string> }) {
    this.url = url
    this.headers = options?.headers ?? {}
    this.options = { ...DEFAULT_WS_OPTIONS, ...options }
    this.WSImpl = resolveWebSocket(options)
  }

  get state(): WSConnectionState {
    return this._state
  }

  get subscriptions(): ReadonlySet<string> {
    return this.activeSubscriptions
  }

  connect(): this {
    if (this._state === 'connected' || this._state === 'connecting') {
      return this
    }

    this._state = 'connecting'
    this.doConnect()
    return this
  }

  /** Close the connection and disable auto-reconnect. */
  disconnect(): void {
    this.options.autoReconnect = false
    this.cleanup()
    this._state = 'disconnected'
  }

  subscribe(channels: string[]): void {
    for (const ch of channels) {
      this.pendingSubscriptions.add(ch)
    }

    if (this._state === 'connected' && this.ws) {
      this.ws.send(JSON.stringify({ type: 'subscribe', channels }))
    }
  }

  unsubscribe(channels: string[]): void {
    for (const ch of channels) {
      this.pendingSubscriptions.delete(ch)
      this.activeSubscriptions.delete(ch)
    }

    if (this._state === 'connected' && this.ws) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', channels }))
    }
  }

  on<K extends keyof WSEventMap>(event: K, callback: WSEventCallback<K>): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)?.add(callback as WSEventCallback<keyof WSEventMap>)
    return this
  }

  off<K extends keyof WSEventMap>(event: K, callback: WSEventCallback<K>): this {
    this.listeners.get(event)?.delete(callback as WSEventCallback<keyof WSEventMap>)
    return this
  }

  ping(): void {
    if (this._state === 'connected' && this.ws) {
      this.ws.send(JSON.stringify({ type: 'ping' }))
    }
  }

  private doConnect(): void {
    try {
      const wsOptions = Object.keys(this.headers).length > 0 ? { headers: this.headers } : undefined
      this.ws = new this.WSImpl(this.url, wsOptions)
    } catch (err) {
      this.emit('error', {
        type: 'error',
        code: 'CONNECTION_FAILED',
        message: err instanceof Error ? err.message : 'Failed to create WebSocket connection',
      })
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      // Wait for 'connected' message from server before considering connected
    }

    this.ws.onmessage = (event: { data: unknown }) => {
      const raw = typeof event.data === 'string' ? event.data : String(event.data)
      this.handleMessage(raw)
    }

    this.ws.onclose = (event: { code: number; reason: string }) => {
      this.stopHeartbeat()
      const wasConnected = this._state === 'connected'
      this._state = 'disconnected'

      this.emit('disconnected', { code: event.code, reason: event.reason })

      if (wasConnected && this.options.autoReconnect) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = () => {
      // Close event will fire after this, which triggers reconnect
    }
  }

  private handleMessage(raw: string): void {
    let msg: WSServerMessage
    try {
      msg = JSON.parse(raw) as WSServerMessage
    } catch {
      return
    }

    switch (msg.type) {
      case 'connected':
        this._state = 'connected'
        this.reconnectAttempts = 0
        this.startHeartbeat()
        this.emit('connected', msg)
        if (this.pendingSubscriptions.size > 0) {
          this.ws?.send(
            JSON.stringify({ type: 'subscribe', channels: Array.from(this.pendingSubscriptions) })
          )
        }
        break

      case 'ticker':
        this.emit('ticker', msg)
        break

      case 'subscribed':
        this.activeSubscriptions.add(msg.channel)
        this.emit('subscribed', msg)
        break

      case 'unsubscribed':
        this.activeSubscriptions.delete(msg.channel)
        this.pendingSubscriptions.delete(msg.channel)
        this.emit('unsubscribed', msg)
        break

      case 'error':
        this.emit('error', msg)
        break

      case 'pong':
        break
    }
  }

  private emit<K extends keyof WSEventMap>(event: K, data: WSEventMap[K]): void {
    const callbacks = this.listeners.get(event)
    if (!callbacks) return
    for (const cb of callbacks) {
      try {
        cb(data)
      } catch {
        // Don't let listener errors break the event loop
      }
    }
  }

  private scheduleReconnect(): void {
    if (!this.options.autoReconnect) return
    if (
      this.options.maxReconnectAttempts > 0 &&
      this.reconnectAttempts >= this.options.maxReconnectAttempts
    ) {
      this.emit('error', {
        type: 'error',
        code: 'MAX_RECONNECT',
        message: `Maximum reconnect attempts (${this.options.maxReconnectAttempts}) exceeded`,
      })
      return
    }

    const delay = Math.min(
      this.options.reconnectDelayMs * 2 ** this.reconnectAttempts,
      this.options.maxReconnectDelayMs
    )
    const jitteredDelay = delay * (0.5 + Math.random()) // 50-150% jitter

    this.reconnectAttempts++
    this._state = 'reconnecting'

    this.emit('reconnecting', {
      attempt: this.reconnectAttempts,
      delayMs: Math.round(jitteredDelay),
    })

    this.reconnectTimer = globalThis.setTimeout(() => {
      this.reconnectTimer = null
      this.doConnect()
    }, jitteredDelay)
  }

  private startHeartbeat(): void {
    if (this.options.heartbeatIntervalMs <= 0) return
    this.stopHeartbeat()
    this.heartbeatTimer = globalThis.setInterval(() => {
      this.ping()
    }, this.options.heartbeatIntervalMs)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      globalThis.clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private cleanup(): void {
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      globalThis.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onclose = null
      this.ws.onerror = null
      try {
        this.ws.close()
      } catch {
        // Already closed
      }
      this.ws = null
    }
  }
}
