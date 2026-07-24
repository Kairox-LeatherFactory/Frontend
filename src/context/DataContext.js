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
  apiProductionScan,
  apiComputeWageRun,
} from '@/lib/api';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { token } = useAuth();

  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [operations, setOperations] = useState([]);
  const [events, setEvents] = useState([]);
  const [wageRuns, setWageRuns] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [traceCards, setTraceCards] = useState({});

  const fetchFromApi = useCallback(async () => {
    if (!token) return;
    setApiLoading(true);
    setApiError(null);
    try {
      
      const [clientsData, empData, opsData, evtsData] = await Promise.all([
        apiGetClients(token).catch(() => []),
        apiGetEmployees(token).catch(() => []),
        apiGetOperations(token).catch(() => []),
        apiGetEvents(token).catch(() => []),
      ]);

      let allOrders = [];
      for (const client of clientsData) {
        const clientOrders = await apiGetClientOrders(token, client.id).catch(() => []);
        allOrders.push(...clientOrders);
      }

      setClients(clientsData.map((c) => ({ id: c.id, key: c.name, name: c.name, country: c.country || '—' })));
      
      const mappedWorkers = empData.map((e) => ({ 
        id: e.id, 
        name: e.name, 
        role: e.designation,
        wage_type: e.wage_type, 
        monthly_salary: e.monthly_salary 
      }));
      setWorkers(mappedWorkers);
      
      setOperations(opsData);
      setOrders(allOrders);

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
    } catch (err) {
      console.error('Failed to fetch from API:', err);
      setApiError('Could not connect to backend.');
    } finally {
      setApiLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFromApi();
  }, [fetchFromApi]);

  const createClient = useCallback(async (name, companyName, orderNumber) => {
    const newClient = await apiCreateClient(token, name, companyName, orderNumber);
    setClients((prev) => [...prev, { id: newClient.id, key: newClient.name, name: newClient.name, country: newClient.country || '—' }]);
    return newClient;
  }, [token]);

  const addClientOrder = useCallback(async (clientId, payload) => {
    const newOrder = await apiAddClientOrder(token, clientId, payload);
    setOrders((prev) => [...prev, newOrder]);
    return newOrder;
  }, [token]);

  const addScanEvent = async (payload) => {
    return await apiProductionScan(token, payload);
  };

  const addWageRun = async (period) => {
    const newRun = await apiComputeWageRun(token, period.period_start, period.period_end);
    setWageRuns((prev) => [newRun, ...prev]);
    return newRun;
  };

 
  const refreshData = useCallback(() => {
    fetchFromApi();
  }, [fetchFromApi]);

  return (
    <DataContext.Provider value={{
      events, orders, workers, operations, clients, wageRuns, traceCards,
      addScanEvent, addWageRun, createClient, addClientOrder, refreshData,
      apiLoading, apiError
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}