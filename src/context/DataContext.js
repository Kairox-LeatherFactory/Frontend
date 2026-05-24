'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiGetClients, apiCreateClient, apiGetClientOrders } from '@/lib/api';
import {
  INITIAL_EVENTS,
  ORDERS,
  WORKERS,
  RATES,
  TRACE_CARDS,
  WAGE_RUNS,
  CLIENTS,
} from '@/hooks/useMockData';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { token, user } = useAuth();

  // Automatic cache reset check if old mock data is detected in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const version = localStorage.getItem('kairox_cache_version');
      if (version !== 'v2') {
        localStorage.removeItem('kairox_events');
        localStorage.removeItem('kairox_orders');
        localStorage.removeItem('kairox_wage_runs');
        localStorage.removeItem('kairox_trace_cards');
        localStorage.setItem('kairox_cache_version', 'v2');
        // Refresh page to apply clean slate
        window.location.reload();
      }
    }
  }, []);

  // ─── API-backed clients state ───
  const [apiClients, setApiClients] = useState([]);
  const [apiClientOrders, setApiClientOrders] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);

  // Fetch clients & orders from backend API when token is available
  useEffect(() => {
    if (!token) {
      setApiClients([]);
      setApiClientOrders([]);
      return;
    }

    let cancelled = false;

    async function fetchFromApi() {
      setApiLoading(true);
      try {
        // 1. Fetch all clients
        const clientsData = await apiGetClients(token);
        if (cancelled) return;
        setApiClients(clientsData);

        // 2. Fetch orders for each client
        const allOrders = [];
        for (const client of clientsData) {
          try {
            const ordersData = await apiGetClientOrders(token, client.id);
            if (cancelled) return;
            // Map backend order structure to our frontend format
            if (Array.isArray(ordersData)) {
              ordersData.forEach((order) => {
                if (order.styles && Array.isArray(order.styles)) {
                  order.styles.forEach((style) => {
                    const sizes = Array.from(new Set((style.skus || []).map((sk) => sk.size)));
                    const colors = Array.from(new Set((style.skus || []).map((sk) => sk.color_name)));
                    const totalQty = (style.skus || []).reduce((sum, sk) => sum + (sk.qty_ordered || 0), 0);

                    allOrders.push({
                      id: `ORD-${order.po_number || order.id.substring(0, 8).toUpperCase()}`,
                      style_id: style.id,
                      type: totalQty <= 5 ? 'Sample Order' : totalQty < 100 ? 'SMS Order' : 'Bulk Production',
                      client: client.name,
                      quantity: totalQty,
                      style: style.name,
                      colorway: colors.join(', '),
                      sizes,
                      order_date: order.order_date || '—',
                      deadline: order.delivery_deadline || '—',
                      sea_cutoff: order.sea_cutoff_date || '—',
                      current_stage: 4,
                      status: 'Active',
                      delay_days: 0,
                      freight_mode: order.ship_mode === 'air' ? 'Air Freight (RISK)' : 'Sea Freight',
                      progress: 0,
                    });
                  });
                }
              });
            }
          } catch (orderErr) {
            console.warn(`Failed to fetch orders for client ${client.name}:`, orderErr);
          }
        }
        if (!cancelled) {
          setApiClientOrders(allOrders);
        }
      } catch (err) {
        console.error('Failed to fetch from API:', err);
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    }

    fetchFromApi();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Create a new client via backend API
  const createClient = useCallback(async (name, companyName) => {
    if (!token) throw new Error('Not authenticated');
    const newClient = await apiCreateClient(token, name, companyName);
    setApiClients((prev) => [...prev, newClient]);
    return newClient;
  }, [token]);

  // ─── Existing mock-based state (for non-API features) ───
  const [events, setEvents] = useState(() => {
    if (typeof window !== 'undefined') {
      const version = localStorage.getItem('kairox_cache_version');
      if (version !== 'v2') {
        return INITIAL_EVENTS;
      }
      const saved = localStorage.getItem('kairox_events');
      return saved ? JSON.parse(saved) : INITIAL_EVENTS;
    }
    return INITIAL_EVENTS;
  });

  const [orders, setOrders] = useState(() => {
    if (typeof window !== 'undefined') {
      const version = localStorage.getItem('kairox_cache_version');
      if (version !== 'v2') {
        return ORDERS;
      }
      const saved = localStorage.getItem('kairox_orders');
      return saved ? JSON.parse(saved) : ORDERS;
    }
    return ORDERS;
  });

  const [wageRuns, setWageRuns] = useState(() => {
    if (typeof window !== 'undefined') {
      const version = localStorage.getItem('kairox_cache_version');
      if (version !== 'v2') {
        return WAGE_RUNS;
      }
      const saved = localStorage.getItem('kairox_wage_runs');
      return saved ? JSON.parse(saved) : WAGE_RUNS;
    }
    return WAGE_RUNS;
  });

  const [traceCards, setTraceCards] = useState(() => {
    if (typeof window !== 'undefined') {
      const version = localStorage.getItem('kairox_cache_version');
      if (version !== 'v2') {
        return TRACE_CARDS;
      }
      const saved = localStorage.getItem('kairox_trace_cards');
      return saved ? JSON.parse(saved) : TRACE_CARDS;
    }
    return TRACE_CARDS;
  });

  // Save to local storage on changes
  useEffect(() => {
    localStorage.setItem('kairox_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('kairox_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('kairox_wage_runs', JSON.stringify(wageRuns));
  }, [wageRuns]);

  useEffect(() => {
    localStorage.setItem('kairox_trace_cards', JSON.stringify(traceCards));
  }, [traceCards]);

  // Recalculates order progress and air risk whenever events change
  useEffect(() => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        const orderEvents = events.filter((e) => e.order_id === order.id);
        if (orderEvents.length === 0) return order;

        const ops = ['Cutting', 'Fusing', 'Pasting', 'Shell stitch', 'Lining attach', 'Lining stitch', 'Final finish'];
        let maxStageIndex = 0;
        let finalFinishQty = 0;

        orderEvents.forEach((e) => {
          const idx = ops.indexOf(e.operation);
          if (idx > maxStageIndex) {
            maxStageIndex = idx;
          }
          if (e.operation === 'Final finish') {
            finalFinishQty += e.qty;
          }
        });

        const target = order.quantity;
        const progressPercent = Math.min(
          99,
          Math.max(
            order.progress,
            Math.round(((maxStageIndex + 1) / ops.length) * 80 + (finalFinishQty / target) * 20)
          )
        );

        let freightMode = order.freight_mode;
        if (order.delay_days > 2 && progressPercent < 80) {
          freightMode = 'Air Freight (RISK)';
        } else if (progressPercent >= 100) {
          freightMode = 'Delivered';
        }

        return {
          ...order,
          progress: progressPercent >= 100 ? 100 : progressPercent,
          freight_mode: freightMode,
        };
      })
    );
  }, [events]);

  const addEvent = (event) => {
    setEvents((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        ...event,
      },
    ]);

    if (event.garment_id) {
      setTraceCards((prev) => {
        const card = prev[event.garment_id] || {
          garment_id: event.garment_id,
          order_id: event.order_id,
          style: event.style || 'CARNABY Biker Jacket',
          operations: [],
        };
        const newOp = {
          stage: `Stage 10: ${event.operation}`,
          operator: WORKERS.find((w) => w.id === event.worker_id)?.name || 'Unknown Operator',
          status: 'PASS',
          note: `Logged ${event.qty} pcs at factory floor`,
          time: new Date().toISOString().replace('T', ' ').slice(0, 16),
        };
        return {
          ...prev,
          [event.garment_id]: {
            ...card,
            operations: [...card.operations, newOp],
          },
        };
      });
    }
  };

  const addWageRun = (wageRun) => {
    setWageRuns((prev) => [
      {
        id: `WR-${String(prev.length + 1).padStart(3, '0')}`,
        created_at: new Date().toISOString().slice(0, 10),
        ...wageRun,
      },
      ...prev,
    ]);
  };

  // ─── Merge: If token is available, use API clients. Otherwise fallback to mock. ───
  const mergedClients = token && apiClients.length > 0
    ? apiClients.map((c) => ({ id: c.id, key: c.name, name: c.name, country: c.country || '—' }))
    : CLIENTS;

  // Merge orders: if API orders exist for the logged-in user, use them. Otherwise mock.
  const mergedOrders = token && apiClientOrders.length > 0
    ? apiClientOrders
    : orders;

  return (
    <DataContext.Provider
      value={{
        events,
        orders: mergedOrders,
        workers: WORKERS,
        rates: RATES,
        clients: mergedClients,
        wageRuns,
        traceCards,
        addEvent,
        addWageRun,
        createClient,
        apiLoading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
