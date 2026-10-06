/**
 * Centralized WebSocket Server
 * High-performance, secure, multi-client real-time transport layer.
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { User } = require('../models/Schemas');

class SocketServer {
  constructor() {
    this.io = null;
    this.activeConnections = new Map(); // socketId -> metadata
    this.stats = {
      totalConnected: 0,
      currentConnected: 0,
      eventsDispatched: 0,
      acksReceived: 0,
      authenticatedUsers: 0
    };
  }

  /**
   * Initialize Socket.IO with HTTP Server
   * @param {http.Server} httpServer
   */
  init(httpServer) {
    if (this.io) return this.io;

    const allowedOrigins = [
      'https://connect-vendor.vercel.app',
      'https://connect-admin-96pc.onrender.com',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://localhost:8002',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8002'
    ];
    if (process.env.FRONTEND_URL) {
      process.env.FRONTEND_URL.split(',').forEach(o => {
        const t = o.trim();
        if (t && !allowedOrigins.includes(t)) allowedOrigins.push(t);
      });
    }
    if (process.env.ALLOWED_ORIGINS) {
      process.env.ALLOWED_ORIGINS.split(',').forEach(o => {
        const t = o.trim();
        if (t && !allowedOrigins.includes(t)) allowedOrigins.push(t);
      });
    }

    this.io = new Server(httpServer, {
      cors: {
        origin: function (origin, callback) {
          if (!origin) return callback(null, true);
          const isAllowed = allowedOrigins.includes(origin) || /^https:\/\/connect-vendor([a-z0-9-]*)\.vercel\.app$/.test(origin);
          if (isAllowed) return callback(null, true);
          return callback(new Error(`WebSocket connection denied by CORS: ${origin}`));
        },
        credentials: true,
        methods: ['GET', 'POST']
      },
      pingInterval: 20000,
      pingTimeout: 15000,
      transports: ['websocket', 'polling'],
      maxHttpBufferSize: 5e6 // 5MB buffer
    });

    this.setupAuthMiddleware();
    this.setupConnectionHandlers();

    console.log('⚡ [SocketServer] Real-time WebSocket server initialized.');
    return this.io;
  }

  /**
   * Authentication Middleware on Handshake
   */
  setupAuthMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        let token = socket.handshake.auth?.token || 
                    socket.handshake.query?.token || 
                    socket.handshake.headers?.authorization;

        if (token && typeof token === 'string' && token.startsWith('Bearer ')) {
          token = token.slice(7).trim();
        }

        if (!token) {
          // Allow guest/public connections (for public catalog views)
          socket.user = { role: 'Guest', isGuest: true };
          return next();
        }

        const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'super_secret_jwt_key_9999' : null);
        if (!jwtSecret) {
          socket.user = { role: 'Guest', isGuest: true };
          return next();
        }

        const decoded = jwt.verify(token, jwtSecret);
        let user = null;

        if (decoded.id) {
          user = await User.findById(decoded.id).select('-password -otp').lean();
          if (!user && mongoose.Types.ObjectId.isValid(decoded.id)) {
            user = await User.findById(new mongoose.Types.ObjectId(decoded.id)).select('-password -otp').lean();
          }
        }
        if (!user && decoded.email) {
          user = await User.findOne({ email: String(decoded.email).toLowerCase().trim() }).select('-password -otp').lean();
        }

        if (!user) {
          socket.user = { role: 'Guest', isGuest: true };
          return next();
        }

        // Attach sanitized user to socket
        socket.user = {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          name: user.name,
          vendorId: user.vendorId || user._id.toString(),
          businesses: (user.businesses || []).map(b => (b._id || b.id || '').toString()).filter(Boolean),
          primaryBusinessId: user.primaryBusinessId ? user.primaryBusinessId.toString() : user._id.toString()
        };

        next();
      } catch (err) {
        console.warn(`[SocketServer] Handshake auth warning: ${err.message}. Connecting as guest.`);
        socket.user = { role: 'Guest', isGuest: true };
        next();
      }
    });
  }

  /**
   * Connection and event handling
   */
  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      this.stats.totalConnected++;
      this.stats.currentConnected++;
      if (socket.user && !socket.user.isGuest) {
        this.stats.authenticatedUsers++;
      }

      this.activeConnections.set(socket.id, {
        userId: socket.user?.id || 'guest',
        role: socket.user?.role || 'Guest',
        connectedAt: Date.now()
      });

      // Join standard rooms
      socket.join('public');

      if (socket.user && !socket.user.isGuest) {
        const userId = socket.user.id;
        const role = socket.user.role;

        // User direct room
        socket.join(`user:${userId}`);

        // Role room
        socket.join(`role:${role}`);

        // Vendor rooms
        if (role === 'Vendor') {
          if (socket.user.vendorId) {
            socket.join(`vendor:${socket.user.vendorId}`);
          }
          if (socket.user.primaryBusinessId) {
            socket.join(`vendor:${socket.user.primaryBusinessId}`);
            socket.join(`business:${socket.user.primaryBusinessId}`);
          }
          // Join all outlet rooms
          if (Array.isArray(socket.user.businesses)) {
            socket.user.businesses.forEach(bId => {
              socket.join(`vendor:${bId}`);
              socket.join(`business:${bId}`);
            });
          }
        }
      }

      console.log(`🔌 [SocketServer] Client connected: ${socket.id} (User: ${socket.user?.id || 'Guest'}, Role: ${socket.user?.role || 'Guest'}) [Active: ${this.stats.currentConnected}]`);

      // Heartbeat ping-pong for latency measurement
      socket.on('client_ping', (data) => {
        socket.emit('server_pong', {
          clientTimestamp: data?.timestamp,
          serverTimestamp: Date.now()
        });
      });

      // Event acknowledgement
      socket.on('event_ack', (data) => {
        this.stats.acksReceived++;
      });

      // Dynamic room subscription (strict server-side authorization check)
      socket.on('subscribe_topic', (topic) => {
        if (typeof topic !== 'string' || topic.length > 100) return;
        const cleanTopic = topic.trim();

        // 1. Public or public entity topics (catalog changes)
        if (cleanTopic === 'public' || cleanTopic.startsWith('product:') || cleanTopic.startsWith('category:')) {
          socket.join(cleanTopic);
          return;
        }

        // 2. Role rooms: only authenticated users with that role
        if (cleanTopic.startsWith('role:')) {
          const reqRole = cleanTopic.slice(5);
          if (socket.user && !socket.user.isGuest && socket.user.role === reqRole) {
            socket.join(cleanTopic);
          } else {
            console.warn(`[Socket Security] Unauthorized role room subscription blocked: ${cleanTopic} by socket ${socket.id}`);
          }
          return;
        }

        // 3. User direct rooms: only that specific authenticated user
        if (cleanTopic.startsWith('user:')) {
          const reqUserId = cleanTopic.slice(5);
          if (socket.user && !socket.user.isGuest && String(socket.user.id) === String(reqUserId)) {
            socket.join(cleanTopic);
          } else {
            console.warn(`[Socket Security] Unauthorized user room subscription blocked: ${cleanTopic} by socket ${socket.id}`);
          }
          return;
        }

        // 4. Vendor/Business rooms: only authorized vendor owner
        if (cleanTopic.startsWith('vendor:') || cleanTopic.startsWith('business:')) {
          const targetId = cleanTopic.includes(':') ? cleanTopic.split(':')[1] : '';
          const isOwner = socket.user && !socket.user.isGuest && (
            socket.user.role === 'Admin' ||
            String(socket.user.vendorId) === String(targetId) ||
            String(socket.user.primaryBusinessId) === String(targetId) ||
            (Array.isArray(socket.user.businesses) && socket.user.businesses.includes(String(targetId)))
          );
          if (isOwner) {
            socket.join(cleanTopic);
          } else {
            console.warn(`[Socket Security] Unauthorized vendor room subscription blocked: ${cleanTopic} by socket ${socket.id}`);
          }
          return;
        }

        // 5. Default allow only for Admin role
        if (socket.user && socket.user.role === 'Admin') {
          socket.join(cleanTopic);
        }
      });

      socket.on('unsubscribe_topic', (topic) => {
        if (typeof topic === 'string') {
          socket.leave(topic);
        }
      });

      // Disconnect handling
      socket.on('disconnect', (reason) => {
        this.stats.currentConnected = Math.max(0, this.stats.currentConnected - 1);
        if (socket.user && !socket.user.isGuest) {
          this.stats.authenticatedUsers = Math.max(0, this.stats.authenticatedUsers - 1);
        }
        this.activeConnections.delete(socket.id);
        console.log(`🔌 [SocketServer] Client disconnected: ${socket.id} (Reason: ${reason}) [Active: ${this.stats.currentConnected}]`);
      });
    });
  }

  /**
   * Distribute event to relevant authorized rooms
   * @param {Object} event - Structured event object
   */
  broadcastEvent(event) {
    if (!this.io) return;

    this.stats.eventsDispatched++;
    const { target, event: eventName, entity, entityId } = event;

    // 1. Global events
    if (target?.isGlobal) {
      this.io.emit('realtime_event', event);
      return;
    }

    const roomsToNotify = new Set(['role:Admin']); // Admins receive all operational events

    // 2. Vendor scoping
    if (target?.vendorId) {
      roomsToNotify.add(`vendor:${target.vendorId}`);
      roomsToNotify.add(`business:${target.vendorId}`);
    }

    // 3. User scoping
    if (target?.userId) {
      roomsToNotify.add(`user:${target.userId}`);
    }

    // 4. Role scoping
    if (target?.role) {
      roomsToNotify.add(`role:${target.role}`);
    }

    // 5. Specific business outlet scoping
    if (target?.businessId) {
      roomsToNotify.add(`business:${target.businessId}`);
    }

    // 6. Entity topic (clients explicitly watching this specific entity)
    roomsToNotify.add(`${entity}:${entityId}`);

    // If public-facing update (e.g. available catalog changes)
    if (entity === 'product' || entity === 'category') {
      roomsToNotify.add('public');
    }

    for (const room of roomsToNotify) {
      this.io.to(room).emit('realtime_event', event);
    }
  }

  getStats() {
    return {
      currentConnected: this.stats.currentConnected,
      totalConnected: this.stats.totalConnected,
      authenticatedUsers: this.stats.authenticatedUsers,
      eventsDispatched: this.stats.eventsDispatched,
      acksReceived: this.stats.acksReceived
    };
  }
}

const socketServer = new SocketServer();
module.exports = socketServer;
