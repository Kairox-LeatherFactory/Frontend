// KairoX ERP — Phase 2 Mock Data Pack (§29)
// Consistent UUIDs across Stage 1 (Intake), Stage 2/3 (BOM), Stage 4 (Inventory), and Stage 5 (Supplier POs)

export const MOCK_IDS = {
  // People & Roles
  user_md: "9e1c4a70-0b2d-4c8e-9f11-6a2b3c4d5e6f",
  user_dm: "8d0b3960-1a2c-3b4d-5e6f-708192a3b4c5",
  user_cutting: "7c9a2850-0912-2a3b-4c5d-6e7f8091a2b3",

  // Client & Order
  client: "7c9e6679-7425-40de-944b-e07fc1f90ae7", // BOGGI MILANO
  client_order: "3a4b5c6d-7e8f-9001-1223-3445566778899", // BOG-SS27-001

  // Stage 1 - Intake
  submission: "a3f2b8c1-4d5e-6f70-8192-a3b4c5d6e7f8",
  doc_order_sheet: "b1c2d3e4-5f60-7182-93a4-b5c6d7e8f901",
  doc_spec_sheet: "e5f60718-293a-4b5c-6d7e-8f90a1b2c3d4",

  // Stage 2 - Styles
  order_style_clermont: "d4e5f607-1829-3a4b-5c6d-7e8f90a1b2c3",
  order_style_carnaby: "07182930-4b5c-6d7e-8f90-a1b2c3d4e5f6",
  pattern_clermont: "f6071829-3a4b-5c6d-7e8f-90a1b2c3d4e5",
  pattern_carnaby: "1829304b-5c6d-7e8f-90a1-b2c3d4e5f607",
  style_clermont: "4b5c6d7e-8f90-0112-2334-4556677889900",
  style_carnaby: "5c6d7e8f-9001-1223-3445-566778899001",

  // Stage 2/3 - BOMs
  bom_clermont: "11223344-5566-7788-99aa-bbccddeeff00",
  bom_carnaby: "22334455-6677-8899-aabb-ccddeeff0011",
  bom_export_doc: "dd112233-4455-6677-8899-aabbccddeeff",

  // BOM items (CLERMONT)
  item_sheep_glass: "aa000001-0000-0000-0000-000000000001",
  item_goat_suede: "aa000001-0000-0000-0000-000000000002",
  item_lining: "aa000001-0000-0000-0000-000000000003",
  item_thread: "aa000001-0000-0000-0000-000000000004",
  item_zip: "aa000001-0000-0000-0000-000000000005",
  item_manufacturing: "aa000001-0000-0000-0000-000000000006",
  item_packaging: "aa000001-0000-0000-0000-000000000007",
  item_fob: "aa000001-0000-0000-0000-000000000008",

  // Stage 4 - Inventory
  inv_sheep_glass: "b0001111-2222-3333-4444-555566667777",
  inv_goat_suede: "b0002222-3333-4444-5555-666677778888",
  inv_lining: "b0003333-4444-5555-6666-777788889999",
  inv_thread: "b0004444-5555-6666-7777-888899990000",
  inv_zip: "b0005555-6666-7777-8888-99990000aaaa",
  check_clermont: "cc001122-3344-5566-7788-99aabbccddee",
  check_carnaby: "dd112233-4455-6677-8899-aabbccddeeff",

  // Stage 5 - Suppliers
  sup_sn_traders: "e0001111-2222-3333-4444-555566667777", // leather, TN (33)
  sup_zip_world: "e0002222-3333-4444-5555-666677778888", // accessory, MH (27)
  sup_al_ameen: "e0003333-4444-5555-6666-777788889999", // leather
  sup_textile_house: "e0004444-5555-6666-7777-888899990000", // accessory
  sup_chennai_lining: "e0005555-6666-7777-8888-99990000aaaa", // no contact

  // Stage 5 - POs
  po_resolved: "99887766-5544-3322-1100-ffeeddccbbaa", // S.N. TRADERS
  po_needs_supplier: "88776655-4433-2211-00ff-eeddccbbaa99", // held
  po_item_suede: "f0001111-2222-3333-4444-555566667777",
  po_item_lining: "f0002222-3333-4444-5555-666677778888",
  po_pdf_doc: "aa998877-6655-4433-2211-00ffeeddccbb",
  tracking_token: "9f2a7c14e0b34d5f8a1b2c3d4e5f6071",

  // Board
  track_clermont: "d0001111-2222-3333-4444-555566667777",
  track_carnaby: "d0002222-3333-4444-5555-666677778888",
};

// Stage 4 — Inventory Check (§14.1)
export const MOCK_INVENTORY_CHECK_CLERMONT = {
  inventory_check_id: MOCK_IDS.check_clermont,
  bom_id: MOCK_IDS.bom_clermont,
  status: "complete",
  run_at: "2026-09-09T12:15:44.220118+00:00",
  summary: {
    badge: "out_of_stock",
    lines_total: 6,
    sufficient: 3,
    partial: 1,
    out_of_stock: 2,
    flags: { unmatched: 1, uom_mismatch: 0 },
    shortfall_value: 1247.60,
    currency: "INR"
  },
  lines: [
    {
      bom_item_id: MOCK_IDS.item_sheep_glass,
      category: "main_material",
      name: "SHEEP GLASS",
      material_color: "BLACK",
      required_qty: 2070.0,
      uom: "dm2",
      matched: {
        inventory_item_id: MOCK_IDS.inv_sheep_glass,
        description: "SHEEP GLASS BLACK",
        method: "key",
        uom: "dm2"
      },
      on_hand_qty: 3400.0,
      available_qty: 2400.0,
      reserved_for_this_bom: 2070.0,
      shortfall_qty: 0.0,
      status: "sufficient",
      flags: [],
      suggestion: null
    },
    {
      bom_item_id: MOCK_IDS.item_goat_suede,
      category: "sub_material",
      name: "GOAT SUEDE",
      material_color: "BLACK",
      required_qty: 156.0,
      uom: "dm2",
      matched: {
        inventory_item_id: MOCK_IDS.inv_goat_suede,
        description: "GOAT SUEDE BLACK",
        method: "key",
        uom: "dm2"
      },
      on_hand_qty: 100.0,
      available_qty: 100.0,
      reserved_for_this_bom: 100.0,
      shortfall_qty: 56.0,
      status: "partial",
      flags: [],
      suggestion: null
    },
    {
      bom_item_id: MOCK_IDS.item_lining,
      category: "lining",
      name: "VISCOSE LINING",
      material_color: "BLACK",
      required_qty: 72.0,
      uom: "mtr",
      matched: null,
      on_hand_qty: 0.0,
      available_qty: 0.0,
      reserved_for_this_bom: 0.0,
      shortfall_qty: 72.0,
      status: "out_of_stock",
      flags: ["suggestion", "unmatched"],
      suggestion: {
        inventory_item_id: MOCK_IDS.inv_lining,
        description: "VISCOSE LINING FABRIC BLACK",
        score: 0.67
      }
    },
    {
      bom_item_id: MOCK_IDS.item_thread,
      category: "thread",
      name: "POLY THREAD 40/2",
      material_color: "BLACK",
      required_qty: 7200.0,
      uom: "mtr",
      matched: {
        inventory_item_id: MOCK_IDS.inv_thread,
        description: "POLYESTER THREAD 40/2 BLACK",
        method: "alias",
        uom: "mtr"
      },
      on_hand_qty: 50000.0,
      available_qty: 44000.0,
      reserved_for_this_bom: 7200.0,
      shortfall_qty: 0.0,
      status: "sufficient",
      flags: [],
      suggestion: null
    },
    {
      bom_item_id: MOCK_IDS.item_zip,
      category: "accessory",
      name: "YKK ZIP #5 60CM",
      material_color: "BLACK",
      required_qty: 60.0,
      uom: "pcs",
      matched: {
        inventory_item_id: MOCK_IDS.inv_zip,
        description: "YKK ZIP #5 60CM BLACK",
        method: "key",
        uom: "pcs"
      },
      on_hand_qty: 240.0,
      available_qty: 240.0,
      reserved_for_this_bom: 60.0,
      shortfall_qty: 0.0,
      status: "sufficient",
      flags: [],
      suggestion: null
    },
    {
      bom_item_id: MOCK_IDS.item_packaging,
      category: "packaging",
      name: "POLYBAG + CARTON",
      material_color: null,
      required_qty: 60.0,
      uom: null,
      matched: null,
      on_hand_qty: 0.0,
      available_qty: 0.0,
      reserved_for_this_bom: 0.0,
      shortfall_qty: 60.0,
      status: "out_of_stock",
      flags: ["unmatched"],
      suggestion: null
    }
  ],
  excluded: [
    {
      bom_item_id: MOCK_IDS.item_manufacturing,
      name: "CUTTING + STITCHING",
      category: "manufacturing"
    },
    {
      bom_item_id: MOCK_IDS.item_fob,
      name: "FOB CHARGE",
      category: "fob_charge"
    }
  ]
};

// Stage 4 — Inventory Items (§13.3)
export const MOCK_INVENTORY_ITEMS = [
  {
    id: MOCK_IDS.inv_sheep_glass,
    description: "SHEEP GLASS BLACK",
    normalized_key: "sheep glass black",
    uom: "dm2",
    qty_on_hand: 3400.0,
    rate: 1.75,
    color: "BLACK",
    is_active: true
  },
  {
    id: MOCK_IDS.inv_goat_suede,
    description: "GOAT SUEDE BLACK",
    normalized_key: "goat suede black",
    uom: "dm2",
    qty_on_hand: 100.0,
    rate: 2.05,
    color: "BLACK",
    is_active: true
  },
  {
    id: MOCK_IDS.inv_lining,
    description: "VISCOSE LINING FABRIC BLACK",
    normalized_key: "viscose lining black",
    uom: "mtr",
    qty_on_hand: 0.0,
    rate: 3.40,
    color: "BLACK",
    is_active: true
  },
  {
    id: MOCK_IDS.inv_thread,
    description: "POLYESTER THREAD 40/2 BLACK",
    normalized_key: "poly thread 40/2 black",
    uom: "mtr",
    qty_on_hand: 50000.0,
    rate: 0.01,
    color: "BLACK",
    is_active: true
  },
  {
    id: MOCK_IDS.inv_zip,
    description: "YKK ZIP #5 60CM BLACK",
    normalized_key: "ykk zip 5 60cm black",
    uom: "pcs",
    qty_on_hand: 240.0,
    rate: 1.35,
    color: "BLACK",
    is_active: true
  }
];

// Stage 5 — Suppliers Directory (§15.3)
export const MOCK_SUPPLIERS = [
  {
    id: MOCK_IDS.sup_sn_traders,
    name: "S.N. TRADERS",
    phone: "+919840012345",
    email: "sales@sntraders.in",
    service: "Leather supply",
    gstin: "33AABCS1429B1ZP",
    address: "12 Anna Salai, Chennai 600002",
    currency: "INR",
    payment_terms_days: 60,
    lead_time_days: 10,
    is_active: true,
    email_status: "valid",
    supplier_type: "leather",
    state_code: "33",
    whatsapp_phone: "+919840012345",
    has_contact: true,
    supply_history: [
      {
        normalized_description: "sheep glass black",
        raw_description: "SHEEP GLASS BLACK 0.6-0.8MM",
        mode: "leather",
        uom: "dm2",
        txn_count: 14,
        last_purchased_at: "2026-07-11",
        last_rate: 1.72,
        min_rate: 1.58,
        max_rate: 1.89
      },
      {
        normalized_description: "goat suede black",
        raw_description: "GOAT SUEDE BLACK",
        mode: "leather",
        uom: "dm2",
        txn_count: 6,
        last_purchased_at: "2026-05-02",
        last_rate: 2.05,
        min_rate: 1.95,
        max_rate: 2.20
      }
    ]
  },
  {
    id: MOCK_IDS.sup_zip_world,
    name: "ZIP WORLD",
    phone: "+912266778899",
    email: "contact@zipworld.com",
    service: "Zips and trims",
    gstin: "27AACZW1234K1Z5",
    address: "Andheri East, Mumbai 400069",
    currency: "INR",
    payment_terms_days: 45,
    lead_time_days: 7,
    is_active: true,
    email_status: "valid",
    supplier_type: "accessory",
    state_code: "27",
    whatsapp_phone: "+912266778899",
    has_contact: true,
    supply_history: [
      {
        normalized_description: "ykk zip 5 60cm",
        raw_description: "YKK ZIP #5 60CM BLACK",
        mode: "accessory",
        uom: "pcs",
        txn_count: 22,
        last_purchased_at: "2026-08-01",
        last_rate: 1.30,
        min_rate: 1.25,
        max_rate: 1.45
      }
    ]
  },
  {
    id: MOCK_IDS.sup_al_ameen,
    name: "AL-AMEEN LEATHERS",
    phone: "+919444098765",
    email: "orders@alameenleathers.com",
    service: "Goat & Sheep Suede",
    gstin: "33AABCA9999Z1ZP",
    address: "Ranipet, Tamil Nadu 632401",
    currency: "INR",
    payment_terms_days: 30,
    lead_time_days: 8,
    is_active: true,
    email_status: "valid",
    supplier_type: "leather",
    state_code: "33",
    whatsapp_phone: "+919444098765",
    has_contact: true,
    supply_history: [
      {
        normalized_description: "goat suede black",
        raw_description: "GOAT SUEDE PREMIUM BLACK",
        mode: "leather",
        uom: "dm2",
        txn_count: 9,
        last_purchased_at: "2026-06-15",
        last_rate: 2.18,
        min_rate: 2.00,
        max_rate: 2.30
      }
    ]
  },
  {
    id: MOCK_IDS.sup_textile_house,
    name: "TEXTILE HOUSE",
    phone: "+919884011223",
    email: "textilehouse@linings.in",
    service: "Viscose & Taffeta Linings",
    gstin: "33AAATH4444M1Z2",
    address: "Triplicane, Chennai 600005",
    currency: "INR",
    payment_terms_days: 60,
    lead_time_days: 12,
    is_active: true,
    email_status: "valid",
    supplier_type: "accessory",
    state_code: "33",
    whatsapp_phone: "+919884011223",
    has_contact: true,
    supply_history: [
      {
        normalized_description: "viscose lining black",
        raw_description: "VISCOSE LINING FABRIC BLACK 54 INCH",
        mode: "accessory",
        uom: "mtr",
        txn_count: 2,
        last_purchased_at: "2025-08-14",
        last_rate: 3.30,
        min_rate: 3.10,
        max_rate: 3.50
      }
    ]
  },
  {
    id: MOCK_IDS.sup_chennai_lining,
    name: "CHENNAI LININGS",
    phone: null,
    email: null,
    service: "Lining supply",
    gstin: "33AAACL5555L1Z1",
    address: "Madhavaram, Chennai 600060",
    currency: "INR",
    payment_terms_days: 30,
    lead_time_days: 14,
    is_active: true,
    email_status: "unknown",
    supplier_type: "accessory",
    state_code: "33",
    whatsapp_phone: null,
    has_contact: false
  }
];

// Stage 5 — Purchase Orders (§16.1 & §16.3)
export const MOCK_POS = [
  {
    id: MOCK_IDS.po_resolved,
    po_number: "PO-07(25-26)",
    status: "draft",
    revision: 1,
    supplier_id: MOCK_IDS.sup_sn_traders,
    bom_id: MOCK_IDS.bom_clermont,
    client_order_id: MOCK_IDS.client_order,
    buyer_ref: "#BOG-SS27-001",
    issue_date: "2026-09-09",
    delivery_days: 10,
    payment_terms_days: 60,
    currency: "INR",
    gst_mode: "INTRA",
    subtotal: 114.80,
    cgst: 6.89,
    sgst: 6.89,
    igst: 0.0,
    round_off: 0.42,
    total: 129.00,
    needs_supplier: false,
    no_contact_channel: false,
    match_method: "ledger",
    candidates: {
      ranked: [
        {
          supplier_id: MOCK_IDS.sup_sn_traders,
          supplier_name: "S.N. TRADERS",
          score: 0.91,
          txn_count: 6,
          has_contact: true,
          last_rate: 2.05,
          last_purchased_at: "2026-05-02"
        },
        {
          supplier_id: MOCK_IDS.sup_al_ameen,
          supplier_name: "AL-AMEEN LEATHERS",
          score: 0.64,
          txn_count: 3,
          has_contact: true,
          last_rate: 2.18,
          last_purchased_at: "2025-11-20"
        }
      ]
    },
    approved_at: null,
    rejected_at: null,
    rejection_reason: null,
    sent_at: null,
    pdf_document_id: null,
    first_opened_at: null,
    first_clicked_at: null,
    current_rung: 0,
    next_escalation_at: null,
    acknowledged_at: null,
    acknowledged_channel: null,
    items: [
      {
        id: MOCK_IDS.po_item_suede,
        item_no: 1,
        description: "GOAT SUEDE",
        color: "BLACK",
        uom: "dm2",
        qty: 56.0,
        unit_price: 2.05,
        amount: 114.80,
        inventory_item_id: MOCK_IDS.inv_goat_suede,
        bom_item_id: MOCK_IDS.item_goat_suede
      }
    ],
    supplier: {
      id: MOCK_IDS.sup_sn_traders,
      name: "S.N. TRADERS",
      email: "sales@sntraders.in",
      phone: "+919840012345",
      gstin: "33AABCS1429B1ZP",
      address: "12 Anna Salai, Chennai 600002",
      supplier_type: "leather",
      email_status: "valid"
    }
  },
  {
    id: MOCK_IDS.po_needs_supplier,
    po_number: null,
    status: "draft",
    revision: 1,
    supplier_id: null,
    bom_id: MOCK_IDS.bom_clermont,
    client_order_id: MOCK_IDS.client_order,
    buyer_ref: "#BOG-SS27-001",
    issue_date: null,
    delivery_days: 10,
    payment_terms_days: 60,
    currency: "INR",
    gst_mode: "INTER",
    subtotal: 244.80,
    cgst: 0.0,
    sgst: 0.0,
    igst: 29.38,
    round_off: -0.18,
    total: 274.00,
    needs_supplier: true,
    no_contact_channel: false,
    match_method: null,
    candidates: {
      method: "fuzzy",
      ambiguous: true,
      suggestion: "TEXTILE HOUSE",
      ranked: [
        {
          supplier_id: MOCK_IDS.sup_textile_house,
          supplier_name: "TEXTILE HOUSE",
          score: 0.41,
          txn_count: 2,
          has_contact: true,
          last_rate: 3.30,
          last_purchased_at: "2025-08-14"
        },
        {
          supplier_id: MOCK_IDS.sup_chennai_lining,
          supplier_name: "CHENNAI LININGS",
          score: 0.38,
          txn_count: 5,
          has_contact: false,
          last_rate: 3.10,
          last_purchased_at: "2025-06-02"
        }
      ]
    },
    approved_at: null,
    rejected_at: null,
    rejection_reason: null,
    sent_at: null,
    pdf_document_id: null,
    first_opened_at: null,
    first_clicked_at: null,
    current_rung: 0,
    next_escalation_at: null,
    acknowledged_at: null,
    acknowledged_channel: null,
    items: [
      {
        id: MOCK_IDS.po_item_lining,
        item_no: 1,
        description: "VISCOSE LINING",
        color: "BLACK",
        uom: "mtr",
        qty: 72.0,
        unit_price: 3.40,
        amount: 244.80,
        inventory_item_id: null,
        bom_item_id: MOCK_IDS.item_lining
      }
    ],
    supplier: null
  }
];

// Stage 5.3 — Production Board Trackers (§18.1)
export const MOCK_PRODUCTION_BOARD = [
  {
    id: MOCK_IDS.track_clermont,
    client_order_id: MOCK_IDS.client_order,
    order_number: "BOG-SS27-001",
    client_name: "BOGGI MILANO",
    style_id: MOCK_IDS.style_clermont,
    style_name: "CLERMONT",
    bom_id: MOCK_IDS.bom_clermont,
    status: "po_raised",
    po_count: 2,
    po_confirmed_count: 0,
    material_ready_at: null,
    released_at: null
  },
  {
    id: MOCK_IDS.track_carnaby,
    client_order_id: MOCK_IDS.client_order,
    order_number: "BOG-SS27-001",
    client_name: "BOGGI MILANO",
    style_id: MOCK_IDS.style_carnaby,
    style_name: "CARNABY",
    bom_id: MOCK_IDS.bom_carnaby,
    status: "material_ready",
    po_count: 1,
    po_confirmed_count: 1,
    material_ready_at: "2026-09-09T16:40:02.118000+00:00",
    released_at: null
  }
];
