/**
 * Global Real-Time Event Handler Registry
 * Maps incoming WebSocket events to centralized state update functions.
 * Plugs into DashboardContext and Redux store without page refreshes.
 */

import { useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import wsClient from './wsClient';
import { EVENT_TYPES } from './eventTypes';

/**
 * useGlobalStateSync
 *
 * This is the MASTER state synchronization hook that should be mounted ONCE
 * at the DashboardProvider level.
 *
 * It receives setter functions from DashboardContext and updates state in real-time
 * without triggering full data refetches.
 *
 * @param {Object} setters - DashboardContext state setters
 */
export function useGlobalStateSync({
  orders,
  setOrders,
  catalog,
  setCatalog,
  partners,
  setPartners,
  user,
  vendorId,
  activeBusinessId
}) {
  const { token } = useSelector(state => state.auth);

  /**
   * Utility: apply version-aware update
   * Prevents older events from overwriting newer state.
   */
  const isNewer = useCallback((existingItem, incomingEvent) => {
    if (!existingItem) return true;
    const existingTs = existingItem.updatedAt ? new Date(existingItem.updatedAt).getTime() : 0;
    const incomingTs = incomingEvent.timestamp ? new Date(incomingEvent.timestamp).getTime() : 0;
    return incomingTs >= existingTs;
  }, []);

  /**
   * Determine if event is relevant to this vendor's scope
   */
  const isRelevantToVendor = useCallback((event) => {
    const targetVendorId = event?.target?.vendorId;
    if (!targetVendorId) return true; // Global event
    const myIds = new Set([
      vendorId,
      activeBusinessId,
      user?._id?.toString(),
      user?.primaryBusinessId?.toString(),
      ...(user?.businesses || []).map(b => (b._id || b.id || '').toString())
    ].filter(Boolean));
    return myIds.has(String(targetVendorId));
  }, [vendorId, activeBusinessId, user]);

  /**
   * Order Event Handlers
   */
  const handleOrderCreated = useCallback((event) => {
    if (!isRelevantToVendor(event) || !event.data) return;
    const newOrder = event.data;

    setOrders(prev => {
      if (!Array.isArray(prev)) return [newOrder];
      // Prevent duplicate insertion
      const exists = prev.some(o => String(o._id || o.id) === String(newOrder._id || newOrder.id));
      if (exists) return prev;
      return [newOrder, ...prev];
    });
  }, [isRelevantToVendor, setOrders]);

  const handleOrderStatusChanged = useCallback((event) => {
    if (!isRelevantToVendor(event) || !event.data) return;
    const updatedOrder = event.data;
    const updatedId = String(updatedOrder._id || updatedOrder.id);

    setOrders(prev => {
      if (!Array.isArray(prev)) return prev;
      return prev.map(o => {
        if (String(o._id || o.id) === updatedId) {
          if (!isNewer(o, event)) return o; // Reject stale update
          return { ...o, status: updatedOrder.status, deliveryPartnerId: updatedOrder.deliveryPartnerId, updatedAt: event.timestamp };
        }
        return o;
      });
    });
  }, [isRelevantToVendor, setOrders, isNewer]);

  /**
   * Product/Catalog Event Handlers
   */
  const handleProductCreated = useCallback((event) => {
    if (!isRelevantToVendor(event) || !event.data) return;
    const newProduct = event.data;

    setCatalog(prev => {
      if (!Array.isArray(prev)) return [newProduct];
      const exists = prev.some(p => String(p._id || p.id) === String(newProduct._id || newProduct.id));
      if (exists) return prev;
      return [newProduct, ...prev];
    });
  }, [isRelevantToVendor, setCatalog]);

  const handleProductUpdated = useCallback((event) => {
    if (!isRelevantToVendor(event) || !event.data) return;
    const updatedProduct = event.data;
    const updatedId = String(updatedProduct._id || updatedProduct.id);

    setCatalog(prev => {
      if (!Array.isArray(prev)) return prev;
      const exists = prev.some(p => String(p._id || p.id) === updatedId);
      if (!exists) {
        return [updatedProduct, ...prev]; // New item arrived via update event
      }
      return prev.map(p => {
        if (String(p._id || p.id) === updatedId) {
          if (!isNewer(p, event)) return p;
          return { ...p, ...updatedProduct, updatedAt: event.timestamp };
        }
        return p;
      });
    });
  }, [isRelevantToVendor, setCatalog, isNewer]);

  const handleProductDeleted = useCallback((event) => {
    if (!isRelevantToVendor(event) || !event.data) return;
    const deletedId = String(event.data._id || event.data.id || event.entityId);

    setCatalog(prev => {
      if (!Array.isArray(prev)) return prev;
      return prev.filter(p => String(p._id || p.id) !== deletedId);
    });
  }, [isRelevantToVendor, setCatalog]);

  /**
   * Delivery Partner Event Handlers
   */
  const handlePartnerCreated = useCallback((event) => {
    if (!isRelevantToVendor(event) || !event.data || !setPartners) return;
    const newPartner = event.data;

    setPartners(prev => {
      if (!Array.isArray(prev)) return [newPartner];
      const exists = prev.some(p => String(p._id || p.id) === String(newPartner._id || newPartner.id));
      if (exists) return prev;
      return [newPartner, ...prev];
    });
  }, [isRelevantToVendor, setPartners]);

  const handlePartnerUpdated = useCallback((event) => {
    if (!isRelevantToVendor(event) || !event.data || !setPartners) return;
    const updatedPartner = event.data;
    const updatedId = String(updatedPartner._id || updatedPartner.id);

    setPartners(prev => {
      if (!Array.isArray(prev)) return prev;
      const exists = prev.some(p => String(p._id || p.id) === updatedId);
      if (!exists) return [updatedPartner, ...prev];
      return prev.map(p => {
        if (String(p._id || p.id) === updatedId) {
          if (!isNewer(p, event)) return p;
          return { ...p, ...updatedPartner };
        }
        return p;
      });
    });
  }, [isRelevantToVendor, setPartners, isNewer]);

  const handlePartnerDeleted = useCallback((event) => {
    if (!isRelevantToVendor(event) || !setPartners) return;
    const deletedId = String(event.data?._id || event.data?.id || event.entityId);

    setPartners(prev => {
      if (!Array.isArray(prev)) return prev;
      return prev.filter(p => String(p._id || p.id) !== deletedId);
    });
  }, [isRelevantToVendor, setPartners]);

  useEffect(() => {
    if (!token) return;

    wsClient.connect(token);

    const unsubs = [
      wsClient.on(EVENT_TYPES.ORDER_CREATED, handleOrderCreated),
      wsClient.on(EVENT_TYPES.ORDER_UPDATED, handleOrderStatusChanged),
      wsClient.on(EVENT_TYPES.ORDER_STATUS_CHANGED, handleOrderStatusChanged),
      wsClient.on(EVENT_TYPES.PRODUCT_CREATED, handleProductCreated),
      wsClient.on(EVENT_TYPES.PRODUCT_UPDATED, handleProductUpdated),
      wsClient.on(EVENT_TYPES.PRODUCT_DELETED, handleProductDeleted),
      wsClient.on(EVENT_TYPES.PARTNER_CREATED, handlePartnerCreated),
      wsClient.on(EVENT_TYPES.PARTNER_UPDATED, handlePartnerUpdated),
      wsClient.on(EVENT_TYPES.PARTNER_DELETED, handlePartnerDeleted)
    ];

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [
    token,
    vendorId,
    activeBusinessId,
    handleOrderCreated,
    handleOrderStatusChanged,
    handleProductCreated,
    handleProductUpdated,
    handleProductDeleted,
    handlePartnerCreated,
    handlePartnerUpdated,
    handlePartnerDeleted
  ]);
}
