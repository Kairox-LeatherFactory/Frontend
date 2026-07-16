'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  apiGetClients, 
  apiCreateClient, 
  apiGetClientOrders,
  apiAddClientOrder,
  apiGetEmployees,
  apiGetOperations,
  apiGetEvents,
  apiLogEvent,
  apiProductionScan,
  apiComputeWageRun,
} from '@/lib/api';
// Removed mock data imports

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
        // NOTE: /api/v1/wages/runs has no GET endpoint — wage runs start empty
        const [clientsData, empData, opsData, evtsData] = await Promise.all([
          apiGetClients(token).catch(() => []),
          apiGetEmployees(token).catch(() => []),
          apiGetOperations(token).catch(() => []),
          apiGetEvents(token).catch(() => []),
        ]);

        if (cancelled) return;

        // Map clients
        setClients(clientsData.map((c) => ({ id: c.id, key: c.name, name: c.name, country: c.country || '—' })));

        // Map workers
        setWorkers(empData.map((e) => ({ id: e.id, name: e.name, role: e.designation, wage_type: e.wage_type, monthly_salary: e.monthly_salary })));

        // Set operations
        setOperations(opsData);

        // Wage runs: not fetchable as a list from backend — stays empty until computed
        setWageRuns([]);

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

        // Set empty orders for now - let individual pages fetch what they need
        if (!cancelled) {
          setOrders([]);
          setEvents(mappedEvents);
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
  const createClient = useCallback(async (name, companyName, orderNumber) => {
    if (!token) throw new Error('Not authenticated');
    const newClient = await apiCreateClient(token, name, companyName, orderNumber);
    setClients((prev) => [...prev, { id: newClient.id, key: newClient.name, name: newClient.name, country: newClient.country || '—' }]);
    return newClient;
  }, [token]);

  // ─── Add an order to an existing client ───
  const addClientOrder = useCallback(async (clientId, payload) => {
    if (!token) throw new Error('Not authenticated');
    const newOrder = await apiAddClientOrder(token, clientId, payload);
    return newOrder;
  }, [token]);

  // ─── Log a production event ───
  const addEvent = async (event) => {
    if (!token) throw new Error('Not authenticated. Please log in.');

    const order = orders.find((o) => o.id === event.order_id);
    const sku = order?.skus?.find((s) => s.size === event.size);
    const sku_id = sku?.id;

    const operationObj = operations.find((o) => 
      o.label.toLowerCase() === event.operation.toLowerCase() || 
      o.label.toLowerCase().includes(event.operation.toLowerCase()) ||
      event.operation.toLowerCase().includes(o.label.toLowerCase())
    );
    const operation_id = operationObj?.id;

    if (!sku_id || !operation_id) {
      throw new Error(
        `Could not map to backend IDs.\n` +
        `Order: ${order ? order.style : 'NOT FOUND (id=' + event.order_id + ')'}\n` +
        `Size "${event.size}" → SKU: ${sku_id || 'NOT FOUND'}\n` +
        `Operation "${event.operation}" → ID: ${operation_id || 'NOT FOUND'}`
      );
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

  // ─── Log a scan event (per-piece tracking) ───
  const addScanEvent = async (payload) => {
    // payload: { operation_id, employee_id, work_date, sku_code, piece_seqs, piece_codes }
    const result = await apiProductionScan(token, payload);
    return result; // returning so UI can show how many logged, rework, etc.
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
        rates: {},
        clients,
        wageRuns,
        traceCards,
        addEvent,
        addScanEvent,
        addWageRun,
        createClient,
        addClientOrder,
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
