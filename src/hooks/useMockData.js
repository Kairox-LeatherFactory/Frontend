// Central mock data store — swap fetch calls here when real FastAPI backend is ready

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

export const ORDERS = [
  {
    id: 'ORD-2026-001', type: 'Sample Order', client: 'Besta Leather Co. (Germany)',
    quantity: 1, style: 'CARNABY', colorway: 'Black', sizes: ['L'],
    order_date: '2026-05-10', deadline: '2026-05-30', sea_cutoff: '2026-05-25',
    current_stage: 12, status: 'In Quality Control', delay_days: 0,
    freight_mode: 'Sea Freight', progress: 92,
  },
  {
    id: 'ORD-2026-002', type: 'SMS Order', client: 'AeroFashion Retail (USA)',
    quantity: 35, style: 'CARNABY', colorway: 'Brown', sizes: ['S','M','L','XL'],
    order_date: '2026-05-02', deadline: '2026-06-05', sea_cutoff: '2026-06-01',
    current_stage: 10, status: 'Stitching Department', delay_days: 2,
    freight_mode: 'Sea Freight', progress: 76,
  },
  {
    id: 'ORD-2026-003', type: 'Bulk Production', client: 'Veloce Moto Gear (Italy)',
    quantity: 500, style: 'CARNABY', colorway: 'Pine Green', sizes: ['S','M','L','XL'],
    order_date: '2026-04-15', deadline: '2026-06-15', sea_cutoff: '2026-06-05',
    current_stage: 4, status: 'Supplier Procurement (Delayed)', delay_days: 8,
    freight_mode: 'Air Freight (RISK)', progress: 30,
  },
];

export const WORKERS = [
  { id: 'W-101', name: 'Rajesh Kumar',   role: 'Cutter',  wage_type: 'Piece-rate',    monthly_salary: null },
  { id: 'W-102', name: 'Mohamed Yusuf', role: 'Tailor',   wage_type: 'Piece-rate',    monthly_salary: null },
  { id: 'W-103', name: 'Anitha Selvam', role: 'Tailor',   wage_type: 'Piece-rate',    monthly_salary: null },
  { id: 'W-104', name: 'Muthu Pandi',   role: 'Fuser',    wage_type: 'Piece-rate',    monthly_salary: null },
  { id: 'W-105', name: 'Karthik Raja',  role: 'Paster',   wage_type: 'Monthly-salary', monthly_salary: 18000 },
];

export const RATES = {
  CARNABY: {
    'Cutting':       80,
    'Fusing':        30,
    'Pasting':       40,
    'Shell stitch':  400,
    'Lining attach': 120,
    'Lining stitch': 70,
    'Final finish':  50,
  }
};

// Pre-seeded production events (the central event source of truth)
export const INITIAL_EVENTS = [
  { id: 1,  order_id: 'ORD-2026-003', style: 'CARNABY', colorway: 'Pine Green', size: 'M', worker_id: 'W-101', operation: 'Cutting',       qty: 152, date: '2026-05-12' },
  { id: 2,  order_id: 'ORD-2026-003', style: 'CARNABY', colorway: 'Pine Green', size: 'M', worker_id: 'W-104', operation: 'Fusing',        qty: 152, date: '2026-05-13' },
  { id: 3,  order_id: 'ORD-2026-003', style: 'CARNABY', colorway: 'Pine Green', size: 'M', worker_id: 'W-105', operation: 'Pasting',       qty: 155, date: '2026-05-14' },
  { id: 4,  order_id: 'ORD-2026-003', style: 'CARNABY', colorway: 'Pine Green', size: 'M', worker_id: 'W-103', operation: 'Shell stitch',  qty: 120, date: '2026-05-16' },
  { id: 5,  order_id: 'ORD-2026-003', style: 'CARNABY', colorway: 'Pine Green', size: 'M', worker_id: 'W-102', operation: 'Lining attach', qty: 85,  date: '2026-05-18' },
  { id: 6,  order_id: 'ORD-2026-002', style: 'CARNABY', colorway: 'Brown',      size: 'L', worker_id: 'W-101', operation: 'Cutting',       qty: 35,  date: '2026-05-10' },
  { id: 7,  order_id: 'ORD-2026-002', style: 'CARNABY', colorway: 'Brown',      size: 'L', worker_id: 'W-104', operation: 'Fusing',        qty: 35,  date: '2026-05-11' },
  { id: 8,  order_id: 'ORD-2026-002', style: 'CARNABY', colorway: 'Brown',      size: 'L', worker_id: 'W-105', operation: 'Pasting',       qty: 35,  date: '2026-05-12' },
  { id: 9,  order_id: 'ORD-2026-002', style: 'CARNABY', colorway: 'Brown',      size: 'L', worker_id: 'W-103', operation: 'Shell stitch',  qty: 35,  date: '2026-05-14' },
  { id: 10, order_id: 'ORD-2026-002', style: 'CARNABY', colorway: 'Brown',      size: 'L', worker_id: 'W-102', operation: 'Lining attach', qty: 35,  date: '2026-05-15' },
  { id: 11, order_id: 'ORD-2026-002', style: 'CARNABY', colorway: 'Brown',      size: 'L', worker_id: 'W-103', operation: 'Lining stitch', qty: 32,  date: '2026-05-17' },
  { id: 12, order_id: 'ORD-2026-002', style: 'CARNABY', colorway: 'Brown',      size: 'L', worker_id: 'W-102', operation: 'Final finish',  qty: 30,  date: '2026-05-19' },
];

export const TRACE_CARDS = {
  'LTH-BLK-009': {
    garment_id: 'LTH-BLK-009', order_id: 'ORD-2026-002', style: 'Classic Black Biker Jacket',
    operations: [
      { stage: 'Stage 5: Raw Material Sorting', operator: 'Ganesan (Store Manager)',  status: 'PASS',  note: 'Grade A Sheep Nappa approved',           time: '2026-05-12 10:15' },
      { stage: 'Stage 6: Cutting',              operator: 'Murugan (Master Cutter)',  status: 'PASS',  note: '100% leather yield efficiency achieved', time: '2026-05-13 14:30' },
      { stage: 'Stage 7: Fusing',               operator: 'Ramu (Fusing Helper)',     status: 'PASS',  note: 'Collar & pocket flaps fused correctly',  time: '2026-05-14 09:45' },
      { stage: 'Stage 8: Pasting',              operator: 'Ramesh (Paster)',           status: 'PASS',  note: 'Temporary latex adhesive applied evenly', time: '2026-05-14 15:20' },
      { stage: 'Stage 9: Lining Cut',           operator: 'Senthil (Lining Cutter)',  status: 'PASS',  note: 'Satin Black lining matched and aligned',  time: '2026-05-15 11:10' },
      { stage: 'Stage 10: Shell Stitch',        operator: 'Anitha Selvam (Tailor)',   status: 'PASS',  note: 'Main shell stitch completed cleanly',    time: '2026-05-18 16:30' },
      { stage: 'Stage 10: Zipper Fitting',      operator: 'Mohamed Yusuf (Tailor)',   status: 'PASS',  note: 'YKK main zipper fitted without puckering', time: '2026-05-19 12:15' },
      { stage: 'Stage 12: QC Inspection',       operator: 'Deva (QC Lead)',           status: 'REWORK', note: 'Loose thread at left sleeve cuff. Rework completed.', time: '2026-05-20 10:40' },
    ]
  }
};

export const WAGE_RUNS = [
  { id: 'WR-001', period: 'May 01–15, 2026', employee_count: 5, total_amount: 43250, status: 'Frozen', created_at: '2026-05-16' },
];
