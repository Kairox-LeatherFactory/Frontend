/**
 * Stitching Manager Dashboard - Real Factory Data Store & Live Backend Seed
 * Modeled strictly on live endpoints:
 * /api/v1/dashboard/stitching
 * /api/v1/dashboard/stitching/employees/{employee_id}
 * /api/v1/dashboard/stitching/pieces/{piece_code}
 */

export const STITCHING_META = {
  generated_for: "2026-08-13",
  scope: "all_clients",
};

export const STITCHING_KPIS = {
  overall_pieces: 4323,
  assigned_pieces: 55,
  completed_today: 14,
  overall_completed: 8,
  pending_today: 12,
  overall_pending: 47,
  damage_pieces: 2,
  damage_today: 0,
  rework_pieces: 1,
  rework_today: 0,
  ready_for_store: 7,
  in_store: 10,
  ready_for_inspection: 1,
  target_date: "2026-08-18",
};

export const STITCHING_STAGES_DATA = [
  {
    stage: "PASTING",
    label: "Pasting",
    section: "PRE_STORE",
    total_received: 55,
    assigned_pieces: 55,
    completed_pieces: 55,
    pending_pieces: 0,
    damage_pieces: 0,
    rework_pieces: 0,
    daily_target: 30,
    daily_completed: 26,
    achievement_pct: 86.6,
    status: "Normal",
  },
  {
    stage: "FUSING",
    label: "Fusing",
    section: "PRE_STORE",
    total_received: 111,
    assigned_pieces: 111,
    completed_pieces: 55,
    pending_pieces: 56,
    damage_pieces: 1,
    rework_pieces: 1,
    daily_target: 30,
    daily_completed: 26,
    achievement_pct: 86.6,
    status: "Pending (56)",
  },
  {
    stage: "LINE_STITCHING",
    label: "Line Stitching",
    section: "POST_STORE",
    total_received: 14,
    assigned_pieces: 14,
    completed_pieces: 12,
    pending_pieces: 2,
    damage_pieces: 1,
    rework_pieces: 0,
    daily_target: 15,
    daily_completed: 12,
    achievement_pct: 80.0,
    status: "Normal",
  },
  {
    stage: "SHELL_STITCHING",
    label: "Shell Stitching",
    section: "POST_STORE",
    total_received: 12,
    assigned_pieces: 12,
    completed_pieces: 9,
    pending_pieces: 3,
    damage_pieces: 0,
    rework_pieces: 0,
    daily_target: 12,
    daily_completed: 9,
    achievement_pct: 75.0,
    status: "Normal",
  },
  {
    stage: "FINAL_FINISH",
    label: "Final Finish",
    section: "POST_STORE",
    total_received: 9,
    assigned_pieces: 9,
    completed_pieces: 8,
    pending_pieces: 1,
    damage_pieces: 0,
    rework_pieces: 0,
    daily_target: 10,
    daily_completed: 8,
    achievement_pct: 80.0,
    status: "Normal",
  }
];

export const STORE_HANDOFF_METRICS = {
  ready_for_store: 7,
  in_store: 10,
  sent_to_store: 14,
  in_drawer: 10,
  ready_for_stitching: 2,
  store_pending: 10,
};

export const CURRENT_STITCHING_STYLE = {
  style_id: "3b64e1b7-bd1b-43b8-b3c0-46ac92e758a3",
  style_name: "CARNABY",
  article: "GOAT SUEDE",
  order_id: "171bea5b-6589-4212-af05-1f085ae9f00a",
  order_number: "is1234",
  client: "Urban Heritage / Nordic",
  color: "PINE GREEN / WHISKY",
  size: "S / M / L / XL",
  total_pieces: 152,
  assigned_pieces: 55,
  completed_pieces: 8,
  pending_pieces: 47,
  damage_pieces: 2,
  rework_pieces: 1,
  target_date: "2026-08-18",
  delivery_deadline: "2026-08-20",
  status: "IN PROGRESS",
  progressPct: 42,
  stages: [
    { stage: "CUTTING", label: "Leather Cutting", section: "CUT", count: 29 },
    { stage: "FUSING", label: "Fusing", section: "PRE_STORE", count: 26 },
    { stage: "PASTING", label: "Pasting", section: "PRE_STORE", count: 26 },
    { stage: "LINE_STITCHING", label: "Line Stitching", section: "POST_STORE", count: 3 },
    { stage: "SHELL_STITCHING", label: "Shell Stitching", section: "POST_STORE", count: 3 },
    { stage: "FINAL_FINISH", label: "Final Finish", section: "POST_STORE", count: 3 },
    { stage: "FINAL_INSPECTION", label: "Final Inspection", section: "CUT", count: 2 }
  ],
  ready_for_inspection: 1
};

export const STITCHING_STYLES_SUMMARY = [
  { style_name: "CARNABY", article: "GOAT SUEDE", total_ordered: 152, minted: 152, completed: 8, pending: 144, pasting_pct: 100, fusing_pct: 50, line_stitch_pct: 85, shell_stitch_pct: 75, final_finish_pct: 88, status: "ON TRACK", target_date: "2026-08-18" },
  { style_name: "FRANCIS KNIT", article: "GOAT SUEDE", total_ordered: 139, minted: 139, completed: 0, pending: 139, pasting_pct: 90, fusing_pct: 80, line_stitch_pct: 40, shell_stitch_pct: 30, final_finish_pct: 20, status: "ON TRACK", target_date: "2026-08-19" },
  { style_name: "CLERMONT + VEST", article: "GOAT SUEDE", total_ordered: 108, minted: 108, completed: 0, pending: 108, pasting_pct: 85, fusing_pct: 70, line_stitch_pct: 50, shell_stitch_pct: 40, final_finish_pct: 30, status: "AT RISK", target_date: "2026-08-17" },
  { style_name: "SHINOBI KNIT + DETACH", article: "GOAT SUEDE", total_ordered: 157, minted: 157, completed: 0, pending: 157, pasting_pct: 70, fusing_pct: 60, line_stitch_pct: 30, shell_stitch_pct: 20, final_finish_pct: 10, status: "ON TRACK", target_date: "2026-08-21" },
  { style_name: "ADELE KNIT", article: "SHEEP NAPPA", total_ordered: 48, minted: 48, completed: 0, pending: 48, pasting_pct: 95, fusing_pct: 90, line_stitch_pct: 60, shell_stitch_pct: 50, final_finish_pct: 40, status: "ON TRACK", target_date: "2026-08-18" },
];

export const STITCHING_EMPLOYEES = [
  {
    employee_id: "bc604e5d-ef47-4008-a599-74bf6de526c2",
    name: "Ahmedasa",
    designation: "MASTER_STITCHING_OPERATOR",
    stage: "PASTING & FUSING",
    section: "PRE_STORE",
    assigned_pieces: 41,
    completed_pieces: 41,
    pending_pieces: 0,
    daily_target: 35,
    daily_completed: 32,
    achievement_pct: 91.4,
    damage_pieces: 0,
    rework_pieces: 0,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    status: "Active on Line",
  },
  {
    employee_id: "b52277ed-d2d3-457d-98ef-0dfc77116a5e",
    name: "hamthan",
    designation: "STITCHING_FLOOR_SUPERVISOR",
    stage: "LINE & SHELL STITCHING",
    section: "POST_STORE",
    assigned_pieces: 12,
    completed_pieces: 12,
    pending_pieces: 0,
    daily_target: 15,
    daily_completed: 14,
    achievement_pct: 93.3,
    damage_pieces: 1,
    rework_pieces: 1,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    status: "Supervising Line",
  },
  {
    employee_id: "f8aedd75-8de6-4f4f-ae87-f4e31e407745",
    name: "Ravi",
    designation: "LINE_STITCHING_SPECIALIST",
    stage: "LINE_STITCHING",
    section: "POST_STORE",
    assigned_pieces: 8,
    completed_pieces: 7,
    pending_pieces: 1,
    daily_target: 10,
    daily_completed: 7,
    achievement_pct: 70.0,
    damage_pieces: 0,
    rework_pieces: 0,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80",
    status: "Active on Line",
  },
  {
    employee_id: "97eca0a3-d22b-4801-abfa-42b01722e1c8",
    name: "riziziz",
    designation: "FINAL_FINISH_SPECIALIST",
    stage: "FINAL_FINISH & SHELL",
    section: "POST_STORE",
    assigned_pieces: 5,
    completed_pieces: 5,
    pending_pieces: 0,
    daily_target: 8,
    daily_completed: 8,
    achievement_pct: 100.0,
    damage_pieces: 1,
    rework_pieces: 0,
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80",
    status: "Active on Finish",
  },
];

export const STITCHING_DAILY_LOGS = [
  { work_date: "11-Aug", date: "11-Aug-2026", pasting: 26, fusing: 26, line_stitching: 3, shell_stitching: 1, final_finish: 0, target: 30, completed: 56, events: 56 },
  { work_date: "10-Aug", date: "10-Aug-2026", pasting: 15, fusing: 15, line_stitching: 0, shell_stitching: 0, final_finish: 0, target: 30, completed: 30, events: 30 },
  { work_date: "05-Aug", date: "05-Aug-2026", pasting: 12, fusing: 12, line_stitching: 9, shell_stitching: 8, final_finish: 8, target: 35, completed: 49, events: 49 },
  { work_date: "02-Aug", date: "02-Aug-2026", pasting: 2, fusing: 2, line_stitching: 0, shell_stitching: 0, final_finish: 0, target: 10, completed: 4, events: 4 },
];

export const RAW_STITCHING_PIECES_DATA = [
  // IS1234 / is1234 CARNABY
  { piece_code: "IS1234-CARNABY-PINE_GREEN-S-001", seq: 1, size: "S", colour: "PINE GREEN", style: "CARNABY", current_stage: "PASTING", previous_stage: "FUSING", employee: "Ahmedasa", order_number: "is1234", last_worked: "2026-08-11", status: "Pasting Done" },
  { piece_code: "IS1234-CARNABY-PINE_GREEN-S-002", seq: 2, size: "S", colour: "PINE GREEN", style: "CARNABY", current_stage: "FINAL_FINISH", previous_stage: "SHELL_STITCHING", employee: "riziziz", order_number: "is1234", last_worked: "2026-08-05", status: "Completed" },
  { piece_code: "IS1234-CARNABY-PINE_GREEN-S-003", seq: 3, size: "S", colour: "PINE GREEN", style: "CARNABY", current_stage: "FINAL_INSPECTION", previous_stage: "FINAL_FINISH", employee: "hamthan", order_number: "is1234", last_worked: "2026-08-05", status: "Completed" },
  { piece_code: "IS1234-CARNABY-PINE_GREEN-S-004", seq: 4, size: "S", colour: "PINE GREEN", style: "CARNABY", current_stage: "FINAL_INSPECTION", previous_stage: "FINAL_FINISH", employee: "hamthan", order_number: "is1234", last_worked: "2026-08-05", status: "Completed" },
  { piece_code: "IS1234-CARNABY-PINE_GREEN-M-005", seq: 5, size: "M", colour: "PINE GREEN", style: "CARNABY", current_stage: "FUSING", previous_stage: "CUTTING", employee: "Ahmedasa", order_number: "is1234", last_worked: "2026-08-14", status: "In Progress" },
  { piece_code: "IS1234-CARNABY-PINE_GREEN-M-006", seq: 6, size: "M", colour: "PINE GREEN", style: "CARNABY", current_stage: "LINE_STITCHING", previous_stage: "PASTING", employee: "Ravi", order_number: "is1234", last_worked: "2026-08-13", status: "Stitching Line" },
  { piece_code: "IS1234-CARNABY-PINE_GREEN-L-007", seq: 7, size: "L", colour: "PINE GREEN", style: "CARNABY", current_stage: "SHELL_STITCHING", previous_stage: "LINE_STITCHING", employee: "hamthan", order_number: "is1234", last_worked: "2026-08-12", status: "Shell Assembly" },
  { piece_code: "IS1234-CARNABY-PINE_GREEN-XL-008", seq: 8, size: "XL", colour: "PINE GREEN", style: "CARNABY", current_stage: "FINAL_FINISH", previous_stage: "SHELL_STITCHING", employee: "riziziz", order_number: "is1234", last_worked: "2026-08-14", status: "Completed" },

  // HAN123 / han123
  { piece_code: "HAN123-CARNABY-WHISKY-S-001", seq: 1, size: "S", colour: "WHISKY", style: "CARNABY", current_stage: "PASTING", previous_stage: "FUSING", employee: "Ahmedasa", order_number: "han123", last_worked: "2026-08-14", status: "Pasting Done" },
  { piece_code: "HAN123-CARNABY-WHISKY-M-002", seq: 2, size: "M", colour: "WHISKY", style: "CARNABY", current_stage: "FUSING", previous_stage: "CUTTING", employee: "Ahmedasa", order_number: "han123", last_worked: "2026-08-14", status: "In Progress" },
  { piece_code: "HAN123-CARNABY-WHISKY-L-003", seq: 3, size: "L", colour: "WHISKY", style: "CARNABY", current_stage: "LINE_STITCHING", previous_stage: "PASTING", employee: "Ravi", order_number: "han123", last_worked: "2026-08-13", status: "Stitching Line" },
  { piece_code: "HAN123-FRANCIS-DARK_BROWN-50-001", seq: 1, size: "50", colour: "DARK BROWN", style: "FRANCIS KNIT", current_stage: "SHELL_STITCHING", previous_stage: "LINE_STITCHING", employee: "hamthan", order_number: "han123", last_worked: "2026-08-12", status: "Shell Assembly" },
  { piece_code: "HAN123-FRANCIS-DARK_BROWN-52-002", seq: 2, size: "52", colour: "DARK BROWN", style: "FRANCIS KNIT", current_stage: "FINAL_FINISH", previous_stage: "SHELL_STITCHING", employee: "riziziz", order_number: "han123", last_worked: "2026-08-14", status: "Completed" },

  // 4001
  { piece_code: "PO4001-CARNABY-BLACK-M-001", seq: 1, size: "M", colour: "BLACK", style: "CARNABY", current_stage: "PASTING", previous_stage: "FUSING", employee: "Ahmedasa", order_number: "4001", last_worked: "2026-08-14", status: "Pasting Done" },
  { piece_code: "PO4001-CARNABY-BLACK-L-002", seq: 2, size: "L", colour: "BLACK", style: "CARNABY", current_stage: "FUSING", previous_stage: "CUTTING", employee: "Ahmedasa", order_number: "4001", last_worked: "2026-08-14", status: "In Progress" },
  { piece_code: "PO4001-ADELE-BLACK-38-001", seq: 1, size: "38", colour: "BLACK", style: "ADELE KNIT", current_stage: "LINE_STITCHING", previous_stage: "PASTING", employee: "Ravi", order_number: "4001", last_worked: "2026-08-13", status: "Stitching Line" },
  { piece_code: "PO4001-ADELE-BLACK-40-002", seq: 2, size: "40", colour: "BLACK", style: "ADELE KNIT", current_stage: "FINAL_FINISH", previous_stage: "SHELL_STITCHING", employee: "riziziz", order_number: "4001", last_worked: "2026-08-14", status: "Completed" },

  // E234 / e234
  { piece_code: "E234-FRANCIS-NAVY-50-001", seq: 1, size: "50", colour: "NAVY", style: "FRANCIS KNIT", current_stage: "PASTING", previous_stage: "FUSING", employee: "Ahmedasa", order_number: "e234", last_worked: "2026-08-14", status: "Pasting Done" },
  { piece_code: "E234-FRANCIS-NAVY-52-002", seq: 2, size: "52", colour: "NAVY", style: "FRANCIS KNIT", current_stage: "LINE_STITCHING", previous_stage: "PASTING", employee: "Ravi", order_number: "e234", last_worked: "2026-08-13", status: "Stitching Line" },

  // UM-1 / 2433
  { piece_code: "UM1-CARNABY-TAN-M-001", seq: 1, size: "M", colour: "TAN", style: "CARNABY", current_stage: "PASTING", previous_stage: "FUSING", employee: "Ahmedasa", order_number: "UM-1", last_worked: "2026-08-14", status: "Pasting Done" },
  { piece_code: "PO2433-CLERMONT-COGNAC-50-001", seq: 1, size: "50", colour: "COGNAC", style: "CLERMONT + VEST", current_stage: "LINE_STITCHING", previous_stage: "PASTING", employee: "hamthan", order_number: "2433", last_worked: "2026-08-13", status: "Stitching Line" },

  // ORD_1011 CARNABY
  { piece_code: "ORD_1011-CARNABY-PINE_GREEN-L-001", seq: 1, size: "L", colour: "PINE GREEN", style: "CARNABY", current_stage: "PASTING", previous_stage: "FUSING", employee: "Ahmedasa", order_number: "ORD-1011", last_worked: "2026-08-05", status: "Pasting Done" },
  { piece_code: "ORD_1011-CARNABY-PINE_GREEN-L-036", seq: 36, size: "L", colour: "PINE GREEN", style: "CARNABY", current_stage: "FUSING", previous_stage: "CUTTING", employee: "Ahmedasa", order_number: "ORD-1011", last_worked: "2026-08-11", status: "In Progress" },
  { piece_code: "ORD_1011-CARNABY-PINE_GREEN-M-001", seq: 1, size: "M", colour: "PINE GREEN", style: "CARNABY", current_stage: "LINE_STITCHING", previous_stage: "PASTING", employee: "Ravi", order_number: "ORD-1011", last_worked: "2026-08-05", status: "Stitching Line" },
  { piece_code: "ORD_1011-CARNABY-PINE_GREEN-M-028", seq: 28, size: "M", colour: "PINE GREEN", style: "CARNABY", current_stage: "SHELL_STITCHING", previous_stage: "LINE_STITCHING", employee: "hamthan", order_number: "ORD-1011", last_worked: "2026-08-05", status: "Shell Assembly" },
  { piece_code: "ORD_1011-CARNABY-PINE_GREEN-S-021", seq: 21, size: "S", colour: "PINE GREEN", style: "CARNABY", current_stage: "PASTING", previous_stage: "FUSING", employee: "Ahmedasa", order_number: "ORD-1011", last_worked: "2026-08-05", status: "Pasting Done" },
  { piece_code: "ORD_1011-CARNABY-PINE_GREEN-S-023", seq: 23, size: "S", colour: "PINE GREEN", style: "CARNABY", current_stage: "LINE_STITCHING", previous_stage: "PASTING", employee: "hamthan", order_number: "ORD-1011", last_worked: "2026-08-05", status: "Stitching Line" },

  // ORD_1011 FRANCIS KNIT
  { piece_code: "ORD_1011-FRANCIS_KNIT-DARK_BROWN-50-001", seq: 1, size: "50", colour: "WHISKY", style: "FRANCIS KNIT", current_stage: "PASTING", previous_stage: "FUSING", employee: "Ahmedasa", order_number: "ORD-1011", last_worked: "2026-08-11", status: "Pasting Done" },
  { piece_code: "ORD_1011-FRANCIS_KNIT-DARK_BROWN-50-002", seq: 2, size: "50", colour: "WHISKY", style: "FRANCIS KNIT", current_stage: "PASTING", previous_stage: "FUSING", employee: "Ahmedasa", order_number: "ORD-1011", last_worked: "2026-08-11", status: "Pasting Done" },
  { piece_code: "ORD_1011-CLERMONT_VEST-DARK_BROWN-50-010", seq: 10, size: "50", colour: "WHISKY", style: "CLERMONT + VEST", current_stage: "LINE_STITCHING", previous_stage: "PASTING", employee: "hamthan", order_number: "ORD-1011", last_worked: "2026-08-11", status: "Damaged", damage_reason: "Needle puncture on shoulder seam", rework_cutter: "hamthan" },

  // 3001 ADELE KNIT
  { piece_code: "KL_1-ADELE_KNIT-DARK_BROWN-38-001", seq: 1, size: "38", colour: "DARK BROWN", style: "ADELE KNIT", current_stage: "FINAL_FINISH", previous_stage: "SHELL_STITCHING", employee: "riziziz", order_number: "3001", last_worked: "2026-08-10", status: "Completed" },
  { piece_code: "KL_1-ADELE_KNIT-DARK_BROWN-38-005", seq: 5, size: "38", colour: "DARK BROWN", style: "ADELE KNIT", current_stage: "SHELL_STITCHING", previous_stage: "LINE_STITCHING", employee: "Ravi", order_number: "3001", last_worked: "2026-08-10", status: "Rework", damage_reason: "Tension puckering along side seam", rework_cutter: "hamthan" },
];

export const STITCHING_DEFECTS_LOG = [
  {
    piece_code: "ORD_1011-CLERMONT_VEST-DARK_BROWN-50-010",
    style_name: "CLERMONT + VEST",
    stage: "LINE_STITCHING",
    employee: "hamthan",
    damage_reason: "Needle puncture on shoulder seam",
    damage_date: "2026-08-11",
    status: "Rework in Progress",
    rework_assigned_to: "hamthan",
  },
  {
    piece_code: "KL_1-ADELE_KNIT-DARK_BROWN-38-005",
    style_name: "ADELE KNIT",
    stage: "SHELL_STITCHING",
    employee: "Ravi",
    damage_reason: "Tension puckering along side seam",
    damage_date: "2026-08-10",
    status: "Pending Re-stitch",
    rework_assigned_to: "hamthan",
  }
];
