'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_EVENTS,
  ORDERS,
  WORKERS,
  RATES,
  TRACE_CARDS,
  WAGE_RUNS,
} from '@/hooks/useMockData';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [events, setEvents] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kairox_events');
      return saved ? JSON.parse(saved) : INITIAL_EVENTS;
    }
    return INITIAL_EVENTS;
  });

  const [orders, setOrders] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kairox_orders');
      return saved ? JSON.parse(saved) : ORDERS;
    }
    return ORDERS;
  });

  const [wageRuns, setWageRuns] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kairox_wage_runs');
      return saved ? JSON.parse(saved) : WAGE_RUNS;
    }
    return WAGE_RUNS;
  });

  const [traceCards, setTraceCards] = useState(() => {
    if (typeof window !== 'undefined') {
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
        // Let's calculate the progress based on finished operations
        // A standard flow has these stages: Cutting (6), Fusing (7), Pasting (8), Shell stitch (10), Lining attach (10), Lining stitch (10), Final finish (12)
        // If it's a sample order, it is already in QC.
        // Let's use our events to gauge order completion of target quantity
        const orderEvents = events.filter((e) => e.order_id === order.id);
        if (orderEvents.length === 0) return order;

        // Find the quantity produced in the furthest completed operation
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

        // Compute percentage completed
        // Let's look at average of items done at final stage or max stage
        const target = order.quantity;
        const progressPercent = Math.min(
          99,
          Math.max(
            order.progress, // baseline from mock
            Math.round(((maxStageIndex + 1) / ops.length) * 80 + (finalFinishQty / target) * 20)
          )
        );

        // If delay is > 2 days and current progress is slow, it triggers Air Freight
        // In real factory, supplier delay or defect rates drive this.
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

    // Also if this is a tracing garment event, update the tracing timeline
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

  return (
    <DataContext.Provider
      value={{
        events,
        orders,
        workers: WORKERS,
        rates: RATES,
        wageRuns,
        traceCards,
        addEvent,
        addWageRun,
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
