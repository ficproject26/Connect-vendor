/**
 * Global Real-Time State Synchronization Hook
 * Establishes WebSocket connection and automatically dispatches state updates
 * to the existing DashboardContext or local state setters.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import wsClient from './wsClient';
import { EVENT_TYPES } from './eventTypes';

/**
 * useRealtimeSync
 * 
 * Generic global hook that connects to the real-time backend and fires handlers
 * for any matching event type.
 *
 * @param {Object} handlers - { [EVENT_TYPE]: (event) => void }
 * @param {Object} deps - Extra dependency values (used in memoization)
 */
export function useRealtimeSync(handlers = {}, deps = []) {
  const { token, user } = useSelector(state => state.auth);
  const unsubscribeRefs = useRef([]);

  useEffect(() => {
    if (!token) return;

    // Establish/reuse WebSocket connection
    wsClient.connect(token);

    // Clear previous subscriptions
    unsubscribeRefs.current.forEach(unsub => unsub());
    unsubscribeRefs.current = [];

    // Register event handlers
    for (const [eventType, handler] of Object.entries(handlers)) {
      const unsub = wsClient.on(eventType, handler);
      unsubscribeRefs.current.push(unsub);
    }

    return () => {
      unsubscribeRefs.current.forEach(unsub => unsub());
      unsubscribeRefs.current = [];
    };
  }, [token, user?.id, ...deps]);
}

/**
 * useOrdersSync
 * Automatically updates orders state when order events arrive.
 * 
 * @param {Object} options
 * @param {Function} options.onOrderCreated - Called when a new order is created
 * @param {Function} options.onOrderUpdated - Called when an order is updated
 * @param {Function} options.onOrderStatusChanged - Called when order status changes
 * @param {string|null} options.vendorId - Filter by specific vendor ID
 */
export function useOrdersSync({ onOrderCreated, onOrderUpdated, onOrderStatusChanged, vendorId } = {}) {
  const { user } = useSelector(state => state.auth);

  const filterByVendor = useCallback((event) => {
    if (!vendorId) return true;
    const evVendorId = event?.target?.vendorId;
    return !evVendorId || evVendorId === vendorId;
  }, [vendorId]);

  useRealtimeSync({
    [EVENT_TYPES.ORDER_CREATED]: (event) => {
      if (filterByVendor(event) && onOrderCreated) {
        onOrderCreated(event);
      }
    },
    [EVENT_TYPES.ORDER_UPDATED]: (event) => {
      if (filterByVendor(event) && onOrderUpdated) {
        onOrderUpdated(event);
      }
    },
    [EVENT_TYPES.ORDER_STATUS_CHANGED]: (event) => {
      if (filterByVendor(event) && onOrderStatusChanged) {
        onOrderStatusChanged(event);
      }
    }
  }, [vendorId, onOrderCreated, onOrderUpdated, onOrderStatusChanged]);
}

/**
 * useProductsSync
 * Automatically updates catalog state when product events arrive.
 */
export function useProductsSync({ onProductCreated, onProductUpdated, onProductDeleted, vendorId } = {}) {
  const filterByVendor = useCallback((event) => {
    if (!vendorId) return true;
    const evVendorId = event?.target?.vendorId;
    return !evVendorId || evVendorId === vendorId;
  }, [vendorId]);

  useRealtimeSync({
    [EVENT_TYPES.PRODUCT_CREATED]: (event) => {
      if (filterByVendor(event) && onProductCreated) onProductCreated(event);
    },
    [EVENT_TYPES.PRODUCT_UPDATED]: (event) => {
      if (filterByVendor(event) && onProductUpdated) onProductUpdated(event);
    },
    [EVENT_TYPES.PRODUCT_DELETED]: (event) => {
      if (filterByVendor(event) && onProductDeleted) onProductDeleted(event);
    }
  }, [vendorId]);
}

/**
 * usePartnersSync
 * Automatically updates delivery partners state when partner events arrive.
 */
export function usePartnersSync({ onPartnerCreated, onPartnerUpdated, onPartnerDeleted, vendorId } = {}) {
  const filterByVendor = useCallback((event) => {
    if (!vendorId) return true;
    const evVendorId = event?.target?.vendorId;
    return !evVendorId || evVendorId === vendorId;
  }, [vendorId]);

  useRealtimeSync({
    [EVENT_TYPES.PARTNER_CREATED]: (event) => {
      if (filterByVendor(event) && onPartnerCreated) onPartnerCreated(event);
    },
    [EVENT_TYPES.PARTNER_UPDATED]: (event) => {
      if (filterByVendor(event) && onPartnerUpdated) onPartnerUpdated(event);
    },
    [EVENT_TYPES.PARTNER_DELETED]: (event) => {
      if (filterByVendor(event) && onPartnerDeleted) onPartnerDeleted(event);
    }
  }, [vendorId]);
}

/**
 * useConnectionStatus
 * Returns live WebSocket connection status.
 */
export function useConnectionStatus() {
  const { token } = useSelector(state => state.auth);

  useEffect(() => {
    if (token) {
      wsClient.connect(token);
    }
  }, [token]);

  return {
    isConnected: wsClient.isConnected,
    stats: wsClient.getStats()
  };
}
