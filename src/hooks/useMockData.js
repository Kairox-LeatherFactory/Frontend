// Central mock data store — loaded dynamically from the new mock_data.json database
import mockData from './mock_data.json';

export const STAGES = [
  { id: 1,  name: 'Client Order Initiation',         icon: '📋', risks: ['Incomplete specs', 'Compliance issues'],              output: 'Approved Client Brief' },
  { id: 2,  name: 'Internal Management Review',       icon: '🏢', risks: ['Overcommitting deadlines', 'Underestimating cost'],   output: 'MD-Approved Budget Plan' },
  { id: 3,  name: 'Material Planning & BOM',          icon: '📦', risks: ['Wrong leather consumption', 'Incorrect accessory specs'], output: 'Bill of Materials Generated' },
  { id: 4,  name: 'Supplier Procurement',             icon: '🏭', risks: ['Supplier delays halt production', 'Wrong shade delivered'], output: 'Materials Dispatched by Supplier' },
  { id: 5,  name: 'Raw Material Receiving & Sorting', icon: '🔍', risks: ['Shade variation in batch', 'Surface defects reduce yield'], output: 'Assorted Leather Approved' },
  { id: 6,  name: 'Cutting Department',               icon: '✂️', risks: ['Irreversible cutting mistakes', 'Wrong pattern used'],  output: 'Cut Leather Bundles per Size' },
  { id: 7,  name: 'Fusing Process',                  icon: '🔥', risks: ['High temp burns leather', 'Poor interlining bond'],    output: 'Fused Structural Panels' },
  { id: 8,  name: 'Pasting Process',                 icon: '🖊️', risks: ['Excess glue damages leather', 'Misaligned seams'],    output: 'Aligned Components for Stitching' },
  { id: 9,  name: 'Lining Cutting',                  icon: '🧵', risks: ['Measurement mismatch', 'Bundle mixing'],              output: 'Cut Lining Matched to Shells' },
  { id: 10, name: 'Stitching Department',             icon: '🪡', risks: ['Operator bottleneck', 'Zipper misalignment defect'], output: 'Fully Assembled Garments' },
  { id: 11, name: 'Worker Accountability System',     icon: '📝', risks: ['Lost cards break tracing', 'Undigitized records'],   output: '100% Traced Production Card' },
  { id: 12, name: 'Quality Control (QC)',             icon: '✅', risks: ['Bottleneck at inspection', 'Late-stage leather defects'], output: 'QC-Certified Garments' },
  { id: 13, name: 'Packing & Dispatch',              icon: '🚢', risks: ['Missed sea cutoff → Air Freight', 'Air freight kills margin'], output: 'Cartons Loaded for Export' },
];

// Helper to map operation codes to Title-Case display names used in existing components
export const OP_MAP = {
  'CUTTING': 'Cutting',
  'FUSING': 'Fusing',
  'PASTING': 'Pasting',
  'SHELL': 'Shell stitch',
  'L/A': 'Lining attach',
  'LINING STICH': 'Lining stitch',
  'FF': 'Final finish',
  'FF-SAMPLE': 'Final finish',
  'FF-SMS': 'Final finish'
};

// 1. Map Employees to WORKERS
export const WORKERS = mockData.employees.map((emp) => ({
  id: emp.id,
  name: emp.name,
  role: emp.designation,
  wage_type: emp.wage_type === 'piece_rate' ? 'Piece-rate' : 'Monthly-salary',
  monthly_salary: emp.monthly_salary
}));

// 2. Map Rates to RATES object
// e.g. RATES[styleName][opTitleName] = rateVal
const tempRates = {};
mockData.rates.forEach((r) => {
  // Find style name corresponding to style_id
  const style = mockData.clients.flatMap((c) => c.styles).find((s) => s.id === r.style_id);
  const styleName = style ? style.name : r.style_id;
  const opName = OP_MAP[r.operation] || r.operation;
  
  if (!tempRates[styleName]) {
    tempRates[styleName] = {};
  }
  tempRates[styleName][opName] = r.rate;
});
export const RATES = tempRates;

// 3. Map styles to ORDERS
// We map all styles that are ordered as active orders
export const ORDERS = mockData.clients.flatMap((client) => {
  return client.styles.map((style) => {
    // Generate order ID
    const orderId = `ORD-2026-${style.id.substring(0, 3).toUpperCase()}`;
    
    // Determine order type based on style details
    let type = 'Bulk Production';
    if (style.name.toLowerCase().includes('sample') || style.total <= 5) {
      type = 'Sample Order';
    } else if (style.name.toLowerCase().includes('sms') || style.total < 100) {
      type = 'SMS Order';
    }
    
    // Default dates
    const orderDate = '2026-05-10';
    const deadline = '2026-06-15';
    const seaCutoff = '2026-06-05';
    
    // Extract unique sizes from SKUs
    const sizes = Array.from(new Set(style.skus.map((sk) => sk.size)));
    
    // Parse progress and status from production object if active
    let progress = 0;
    let status = 'Supplier Procurement';
    let currentStage = 4;
    let delayDays = 0;
    let freightMode = 'Sea Freight';
    
    if (style.production) {
      const prod = style.production;
      const ordered = style.total;
      
      // Furthest operation index with qty > 0
      const opsSequence = ['CUTTING', 'FUSING', 'PASTING', 'SHELL', 'L/A', 'LINING STICH', 'FF'];
      let maxSeqIndex = -1;
      
      opsSequence.forEach((opCode, index) => {
        if (prod.qty[opCode] > 0) {
          maxSeqIndex = index;
        }
      });
      
      if (maxSeqIndex >= 0) {
        const furthestOp = opsSequence[maxSeqIndex];
        const qtyCompleted = prod.qty[furthestOp] || 0;
        
        // Progress percentage based on furthest operation completeness
        progress = Math.min(99, Math.round((qtyCompleted / ordered) * 100));
        
        // Map current stage & status
        if (furthestOp === 'CUTTING') {
          currentStage = 6;
          status = 'Cutting Department';
        } else if (furthestOp === 'FUSING') {
          currentStage = 7;
          status = 'Fusing Process';
        } else if (furthestOp === 'PASTING') {
          currentStage = 8;
          status = 'Pasting Process';
        } else if (['SHELL', 'L/A', 'LINING STICH'].includes(furthestOp)) {
          currentStage = 10;
          status = 'Stitching Department';
        } else if (furthestOp === 'FF') {
          currentStage = 12;
          status = 'In Quality Control';
          progress = Math.min(100, Math.round((qtyCompleted / ordered) * 100));
        }
      }
      
      // Delay days assignments for realistic view based on client/style metadata
      if (style.name === 'RICANO-1') {
        delayDays = 8;
      } else if (style.name === 'CEYLON-HIRMA') {
        delayDays = 2;
      } else if (style.name === 'PL00032UR') {
        delayDays = 4;
      }
      
      if (delayDays > 2 && progress < 80) {
        freightMode = 'Air Freight (RISK)';
      }
    }
    
    return {
      id: orderId,
      style_id: style.id, // Keep a reference to style.id
      type,
      client: client.name,
      quantity: style.total,
      style: style.name,
      colorway: style.colors.join(', '),
      sizes,
      order_date: orderDate,
      deadline,
      sea_cutoff: seaCutoff,
      current_stage: currentStage,
      status,
      delay_days: delayDays,
      freight_mode: freightMode,
      progress,
    };
  });
});

// 4. Map Weekly counts to INITIAL_EVENTS
// We will generate event entries from production weeks
const generatedEvents = [];
let eventId = 1;

mockData.production_weeks.forEach((week) => {
  // Find style and client details
  const style = mockData.clients.flatMap((c) => c.styles).find((s) => s.id === week.style_id);
  
  if (!style) return;
  
  // Find order created for this style
  const matchedOrder = ORDERS.find((o) => o.style_id === style.id);
  const orderId = matchedOrder ? matchedOrder.id : `ORD-2026-${style.id.substring(0, 3).toUpperCase()}`;
  
  // Extract period end date
  // e.g. "14/01/2026 TO 22/01/2026" -> split and take the last part
  let eventDate = '2026-05-15';
  try {
    const parts = week.period.split(' TO ');
    const endPart = parts[parts.length - 1];
    if (endPart) {
      const [d, m, y] = endPart.replace(/[()]/g, '').split('/');
      if (d && m && y) {
        eventDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
  } catch (err) {
    // default date
  }

  // Map each operation count
  Object.entries(week.counts).forEach(([opCode, qty]) => {
    if (qty <= 0) return;
    
    const opTitle = OP_MAP[opCode] || opCode;
    
    // Assign a suitable worker based on designation match
    let matchedWorker = WORKERS.find((w) => {
      if (opCode === 'CUTTING') return w.role.toLowerCase().includes('cutter');
      if (opCode === 'FUSING') return w.role.toLowerCase().includes('fuser') || w.role.toLowerCase().includes('multi');
      if (opCode === 'PASTING') return w.role.toLowerCase().includes('paster') || w.role.toLowerCase().includes('multi');
      if (['SHELL', 'L/A', 'LINING STICH'].includes(opCode)) return w.role.toLowerCase().includes('tailor') || w.role.toLowerCase().includes('stitch');
      if (opCode.startsWith('FF')) return w.role.toLowerCase().includes('finisher') || w.role.toLowerCase().includes('tailor');
      return false;
    });
    
    if (!matchedWorker) {
      matchedWorker = WORKERS[0]; // fallback
    }

    generatedEvents.push({
      id: eventId++,
      order_id: orderId,
      style: style.name,
      colorway: style.colors[0] || 'Black',
      size: style.skus[0]?.size || 'L',
      worker_id: matchedWorker.id,
      operation: opTitle,
      qty,
      date: eventDate
    });
  });
});

export const INITIAL_EVENTS = generatedEvents;

// 5. Generate TRACE_CARDS
// We will generate the timeline tracing card for active garments dynamically
export const TRACE_CARDS = {
  'LTH-BLK-009': {
    garment_id: 'LTH-BLK-009',
    order_id: ORDERS.find(o => o.style === 'CEYLON-HIRMA')?.id || 'ORD-2026-2FB',
    style: 'CEYLON-HIRMA (Biker Jacket)',
    operations: [
      { stage: 'Stage 5: Raw Material Sorting', operator: 'Ibrahim Sherif (Store Manager)',  status: 'PASS',  note: 'Grade A Sheep Nappa approved',           time: '2026-05-12 10:15' },
      { stage: 'Stage 6: Cutting',              operator: 'Ibrahim Sherif (Master Cutter)',  status: 'PASS',  note: '100% leather yield efficiency achieved', time: '2026-05-13 14:30' },
      { stage: 'Stage 7: Fusing',               operator: 'Maharani (Fusing Helper)',     status: 'PASS',  note: 'Collar & pocket flaps fused correctly',  time: '2026-05-14 09:45' },
      { stage: 'Stage 8: Pasting',              operator: 'Karthik Raja (Paster)',           status: 'PASS',  note: 'Temporary latex adhesive applied evenly', time: '2026-05-14 15:20' },
      { stage: 'Stage 9: Lining Cut',           operator: 'Ibrahim Sherif (Lining Cutter)',  status: 'PASS',  note: 'Satin Black lining matched and aligned',  time: '2026-05-15 11:10' },
      { stage: 'Stage 10: Shell Stitch',        operator: 'Anitha Selvam (Tailor)',   status: 'PASS',  note: 'Main shell stitch completed cleanly',    time: '2026-05-18 16:30' },
      { stage: 'Stage 10: Zipper Fitting',      operator: 'Mohamed Yusuf (Tailor)',   status: 'PASS',  note: 'YKK main zipper fitted without puckering', time: '2026-05-19 12:15' },
      { stage: 'Stage 12: QC Inspection',       operator: 'MD Afzal (QC Lead)',           status: 'REWORK', note: 'Loose thread at left sleeve cuff. Rework completed.', time: '2026-05-20 10:40' },
    ]
  }
};

// 6. Map Wage runs to WAGE_RUNS
export const WAGE_RUNS = mockData.wage_runs.map((wr) => {
  const totalAmount = wr.lines.reduce((sum, line) => sum + line.amount, 0);
  const employeeCount = wr.lines.length;
  
  let periodStr = `${wr.period_start} to ${wr.period_end}`;
  try {
    const startObj = new Date(wr.period_start);
    const endObj = new Date(wr.period_end);
    const month = startObj.toLocaleString('en-US', { month: 'short' });
    periodStr = `${month} ${startObj.getDate().toString().padStart(2, '0')}–${endObj.getDate().toString().padStart(2, '0')}, ${startObj.getFullYear()}`;
  } catch (err) {}

  return {
    id: `WR-${wr.id.substring(0, 3).toUpperCase()}`,
    period: periodStr,
    employee_count: employeeCount,
    total_amount: totalAmount,
    status: wr.status === 'closed' ? 'Frozen' : 'Active',
    created_at: wr.period_end
  };
});
