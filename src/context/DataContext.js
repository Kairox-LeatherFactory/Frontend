'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  apiGetClients, 
  apiCreateClient, 
  apiGetClientOrders,
  apiGetEmployees,
  apiGetOperations,
  apiGetEvents,
  apiLogEvent,
  apiGetWageRuns,
  apiComputeWageRun,
} from '@/lib/api';
import {
  RATES,
  TRACE_CARDS,
} from '@/hooks/useMockData';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { token } = useAuth();

  // ─── Backend API State ───
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [operations, setOperations] = useState([]);
  const [events, setEvents] = useState([]);
  const [wageRuns, setWageRuns] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // ─── TraceCards (no backend API yet — kept in memory) ───
  const [traceCards, setTraceCards] = useState({});

  // Fetch all data from backend when user logs in
  useEffect(() => {
    if (!token) {
      setClients([]);
      setOrders([]);
      setWorkers([]);
      setOperations([]);
      setEvents([]);
      setWageRuns([]);
      setApiError(null);
      return;
    }

    let cancelled = false;

    async function fetchFromApi() {
      setApiLoading(true);
      setApiError(null);
      try {
        // Fetch all metadata in parallel
        const [clientsData, empData, opsData, evtsData, wageRunsData] = await Promise.all([
          apiGetClients(token).catch(() => []),
          apiGetEmployees(token).catch(() => []),
          apiGetOperations(token).catch(() => []),
          apiGetEvents(token).catch(() => []),
          apiGetWageRuns(token).catch(() => []),
        ]);

        if (cancelled) return;

        // Map clients
        setClients(clientsData.map((c) => ({ id: c.id, key: c.name, name: c.name, country: c.country || '—' })));

        // Map workers
        setWorkers(empData.map((e) => ({ id: e.id, name: e.name, role: e.designation, wage_type: e.wage_type, monthly_salary: e.monthly_salary })));

        // Set operations
        setOperations(opsData);

        // Set wage runs
        setWageRuns(wageRunsData);

        // Map events (UUID → readable names)
        const mappedEvents = evtsData.map((apiE) => {
          const op = opsData.find((o) => o.id === apiE.operation_id);
          return {
            id: apiE.id,
            sku_id: apiE.sku_id,
            operation_id: apiE.operation_id,
            operation: op ? op.label : 'Unknown',
            worker_id: apiE.employee_id,
            qty: apiE.qty,
            date: apiE.work_date,
            garment_id: apiE.bundle_ref,
          };
        });
        setEvents(mappedEvents);

        // Fetch orders for each client
        const allOrders = [];
        for (const client of clientsData) {
          try {
            const ordersData = await apiGetClientOrders(token, client.id);
            if (cancelled) return;
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
                      skus: style.skus || [],
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

        // Now that orders are loaded, enrich events with order/sku info
        if (!cancelled) {
          setOrders(allOrders);
          setEvents((prev) =>
            prev.map((evt) => {
              let foundOrder = null;
              let foundSku = null;
              for (const ord of allOrders) {
                const sk = ord.skus?.find((s) => s.id === evt.sku_id);
                if (sk) { foundOrder = ord; foundSku = sk; break; }
              }
              return {
                ...evt,
                order_id: foundOrder ? foundOrder.id : 'Unknown',
                style: foundOrder ? foundOrder.style : 'Unknown',
                colorway: foundSku ? foundSku.color_name : 'Unknown',
                size: foundSku ? foundSku.size : 'Unknown',
              };
            })
          );
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch from API:', err);
          setApiError('Could not connect to backend. Please check the server.');
        }
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    }

    fetchFromApi();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // ─── Create a new client ───
  const createClient = useCallback(async (name, companyName) => {
    if (!token) throw new Error('Not authenticated');
    const newClient = await apiCreateClient(token, name, companyName);
    setClients((prev) => [...prev, { id: newClient.id, key: newClient.name, name: newClient.name, country: newClient.country || '—' }]);
    return newClient;
  }, [token]);

  // ─── Log a production event ───
  const addEvent = async (event) => {
    if (!token) throw new Error('Not authenticated. Please log in.');

    const order = orders.find((o) => o.id === event.order_id);
    const sku = order?.skus?.find((s) => s.size === event.size);
    const sku_id = sku?.id;

    const operationObj = operations.find((o) => o.label === event.operation);
    const operation_id = operationObj?.id;

    if (!sku_id || !operation_id) {
      throw new Error('Could not map size or operation to backend IDs. Please ensure backend data is loaded.');
    }

    const payload = {
      sku_id,
      operation_id,
      employee_id: event.worker_id,
      work_date: event.date,
      qty: event.qty,
      bundle_ref: event.garment_id || null,
    };

    const newApiEvent = await apiLogEvent(token, payload);

    // Add to local events state immediately (optimistic update)
    const op = operations.find((o) => o.id === newApiEvent.operation_id);
    setEvents((prev) => [...prev, {
      id: newApiEvent.id,
      sku_id: newApiEvent.sku_id,
      operation_id: newApiEvent.operation_id,
      operation: op ? op.label : event.operation,
      worker_id: newApiEvent.employee_id,
      qty: newApiEvent.qty,
      date: newApiEvent.work_date,
      garment_id: newApiEvent.bundle_ref,
      order_id: event.order_id,
      style: event.style,
      size: event.size,
    }]);

    // Update trace card
    if (event.garment_id) {
      setTraceCards((prev) => {
        const card = prev[event.garment_id] || { garment_id: event.garment_id, order_id: event.order_id, style: event.style || '', operations: [] };
        const newOp = {
          stage: `Stage: ${event.operation}`,
          operator: workers.find((w) => w.id === event.worker_id)?.name || 'Unknown',
          status: 'PASS',
          note: `Logged ${event.qty} pcs`,
          time: new Date().toISOString().replace('T', ' ').slice(0, 16),
        };
        return { ...prev, [event.garment_id]: { ...card, operations: [...card.operations, newOp] } };
      });
    }
  };

  // ─── Freeze a wage run ───
  const addWageRun = async (period) => {
    if (!token) throw new Error('Not authenticated. Please log in.');
    const newRun = await apiComputeWageRun(token, period);
    setWageRuns((prev) => [newRun, ...prev]);
    return newRun;
  };

  return (
    <DataContext.Provider
      value={{
        events,
        orders,
        workers,
        operations,
        rates: RATES,
        clients,
        wageRuns,
        traceCards,
        addEvent,
        addWageRun,
        createClient,
        apiLoading,
        apiError,
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
