/**
 * Centralized WebSocket Client
 * Manages secure connection, reconnection, heartbeat, and event delivery.
 */

import { io } from 'socket.io-client';
import { getBackendUrl } from '../services/apiSetup';

const HEARTBEAT_INTERVAL_MS = 20000;
const MAX_RECONNECT_ATTEMPTS = Infinity;
const RECONNECT_BASE_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.token = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.heartbeatTimer = null;
    this.eventHandlers = new Map(); // event -> Set of handlers
    this.processedEventIds = new Set(); // Deduplication
    this.lastSyncTimestamp = new Date().toISOString();
    this.stats = {
      connected: false,
      totalEventsReceived: 0,
      duplicatesDropped: 0,
      reconnects: 0,
      lastLatencyMs: null
    };
  }

  /**
   * Initialize connection with auth token
   * @param {string} token - JWT token
   */
  connect(token) {
    if (this.socket && this.isConnected && this.token === token) {
      return; // Already connected with same token
    }

    this.token = token;
    this.disconnect(); // Clean up existing connection

    const backendUrl = getBackendUrl() || 'http://localhost:8002';

    this.socket = io(backendUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECT_BASE_DELAY_MS,
      reconnectionDelayMax: MAX_RECONNECT_DELAY_MS,
      timeout: 10000
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.stats.connected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();

      console.log(`⚡ [WebSocket] Connected: ${this.socket.id}`);

      // Emit reconnect sync request for delta updates
      if (this.lastSyncTimestamp) {
        this.socket.emit('sync_request', { since: this.lastSyncTimestamp });
      }

      this._dispatch('connection_status', { connected: true, socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.stats.connected = false;
      this.stopHeartbeat();
      console.warn(`🔌 [WebSocket] Disconnected: ${reason}`);
      this._dispatch('connection_status', { connected: false, reason });
    });

    this.socket.on('connect_error', (err) => {
      console.warn(`⚠️ [WebSocket] Connection error: ${err.message}`);
      this._dispatch('connection_error', { message: err.message });
    });

    // Main real-time event channel
    this.socket.on('realtime_event', (event) => {
      this.handleIncomingEvent(event);
    });

    // Heartbeat pong response
    this.socket.on('server_pong', (data) => {
      const latency = data?.clientTimestamp ? Date.now() - data.clientTimestamp : null;
      this.stats.lastLatencyMs = latency;
    });

    // Reconnection tracking
    this.socket.on('reconnect', (attemptNumber) => {
      this.stats.reconnects++;
      this.reconnectAttempts = 0;
      this.lastSyncTimestamp = new Date(Date.now() - 60000).toISOString(); // Last 60s
      console.log(`🔄 [WebSocket] Reconnected after ${attemptNumber} attempt(s).`);
    });
  }

  handleIncomingEvent(event) {
    if (!event || !event.eventId) return;

    this.stats.totalEventsReceived++;

    // Deduplication
    if (this.processedEventIds.has(event.eventId)) {
      this.stats.duplicatesDropped++;
      return;
    }
    this.processedEventIds.add(event.eventId);

    // Cleanup old entries
    if (this.processedEventIds.size > 2000) {
      const iter = this.processedEventIds.values();
      for (let i = 0; i < 500; i++) {
        this.processedEventIds.delete(iter.next().value);
      }
    }

    this.lastSyncTimestamp = event.timestamp || new Date().toISOString();

    // Acknowledge receipt
    this.socket?.emit('event_ack', { eventId: event.eventId });

    // Dispatch to registered handlers
    this._dispatch(event.event, event);
    this._dispatch('*', event); // Wildcard handlers receive all events
  }

  /**
   * Register a handler for a specific event type
   * @param {string} eventType - EVENT_TYPES value or '*' for all events
   * @param {Function} handler - (event) => void
   * @returns {Function} Unsubscribe function
   */
  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType).add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  _dispatch(eventType, data) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`[WebSocket] Error in handler for ${eventType}:`, err);
        }
      });
    }
  }

  /**
   * Subscribe to a specific topic room on server
   */
  subscribeTopic(topic) {
    this.socket?.emit('subscribe_topic', topic);
  }

  unsubscribeTopic(topic) {
    this.socket?.emit('unsubscribe_topic', topic);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('client_ping', { timestamp: Date.now() });
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.stats.connected = false;
  }

  getStats() {
    return { ...this.stats };
  }
}

// Singleton instance
const wsClient = new WebSocketClient();
export default wsClient;
