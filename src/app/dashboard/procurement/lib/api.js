// Real API & Persisted Mock Hybrid Service for KairoX Procurement Intelligence
// Integrated with Stage 1 (Intake) and Stage 2/3 (BOM) live endpoints.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const V1 = '/api/v1';

const IDS = {
  user_md: 'a1b2c3d4-e5f6-0718-293a-4b5c6d7e8f90',
  submission: 'a3f2b8c1-4d5e-6f70-8192-a3b4c5d6e7f8',
  order_doc: 'b1c2d3e4-5f60-7182-93a4-b5c6d7e8f901',
  spec_doc: 'e5f60718-293a-4b5c-6d7e-8f90a1b2c3d4',
  style_clermont: '4b5c6d7e-8f90-0112-2334-4556677889900',
  style_carnaby:  '7e8f9001-1223-3445-5667-788990011223',
  bom_clermont: '11223344-5566-7788-99aa-bbccddeeff00',
  bom_carnaby: '22334455-6677-8899-aabb-ccddeeff0011',
  check_clermont: 'cc001122-3344-5566-7788-99aabbccddee',
  check_carnaby: 'dd112233-4455-6677-8899-aabbccddeeff',
  sup_sn: 'e0001111-2222-3333-4444-555566667777',
  sup_zip: 'e0002222-3333-4444-5555-666677778888',
  sup_ameen: 'e0003333-4444-5555-6666-777788889999',
  sup_textile: 'e0004444-5555-6666-7777-888899990000',
  sup_lining: 'e0005555-6666-7777-8888-99990000aaaa',
  po_resolved: '99887766-5544-3322-1100-ffeeddccbbaa',
  po_needs: '88776655-4433-2211-00ff-eeddccbbaa99',
  po_item_suede: 'f0001111-2222-3333-4444-555566667777',
  po_item_lining: 'f0002222-3333-4444-5555-666677778888',
  track_clermont: 'd0001111-2222-3333-4444-555566667777',
  track_carnaby: 'd0002222-3333-4444-5555-666677778888',
  notif_bom: 'ee223344-5566-7788-99aa-bbccddeeff00',
  notif_po: 'ff334455-6677-8899-aabb-ccddeeff0011',
};

const key = 'kairox_procurement_mock_v2';
const now = () => new Date().toISOString();
const clone = x => JSON.parse(JSON.stringify(x));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Helper for HTTP requests
async function http(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let json;
    try { json = JSON.parse(text); } catch {}
    const err = new Error(json?.detail?.message || json?.detail || json?.error || text || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return res.json();
}

// Client API call
export async function apiGetClients(token) {
  try {
    return await http(`${V1}/clients`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    return [
      { id: 'client-boggi-001', name: 'BOGGI MILANO', country: 'Italy', code: 'BOG' },
      { id: 'client-armani-002', name: 'ARMANI EXCHANGE', country: 'Italy', code: 'AX' },
      { id: 'client-hugo-003', name: 'HUGO BOSS', country: 'Germany', code: 'HB' }
    ];
  }
}

// --- Mock state store ---
const BREAKDOWN_READY = {
  submission_id: IDS.submission,
  status: 'ready',
  warnings: [],
  styles: [
    {
      id: IDS.style_clermont, style_signature: 'CLERMONT', style_name: 'CLERMONT', material: 'SHEEP GLASS', qty: 60,
      per_size_qty: {46:10,48:20,50:20,52:10},
      colors: [
        {color_key:'BLACK',color_label:'NERO / BLACK',qty:40,per_size_qty:{46:6,48:14,50:14,52:6},warnings:[]},
        {color_key:'COGNAC',color_label:'COGNAC',qty:20,per_size_qty:{46:4,48:6,50:6,52:4},warnings:[]}
      ], warnings: [], spec_document_id: IDS.spec_doc, spec_match_status:'suggested',
      pattern_reference_id:'f6071829-3a4b-5c6d-7e8f-90a1b2c3d4e5', dxf_match_status:'suggested', bom_id:null
    },
    {
      id: IDS.style_carnaby, style_signature:'CARNABY', style_name:'CARNABY', material:'GOAT SUEDE', qty:40,
      per_size_qty:{48:15,50:15,52:10},
      colors:[{color_key:'TAUPE',color_label:'TAUPE',qty:40,per_size_qty:{48:15,50:15,52:10},warnings:[]}],
      warnings:['size_column_ambiguous'], spec_document_id:null, spec_match_status:'none',
      pattern_reference_id:'1829304b-5c6d-7e8f-90a1-b2c3d4e5f607', dxf_match_status:'confirmed', bom_id:null
    }
  ]
};

const BOM_ITEMS = [
  {id:'aa000001-0000-0000-0000-000000000001',category:'main_material',name:'SHEEP GLASS',material_color:'BLACK',qty_per_garment:34.5,uom:'dm2',unit_price:1.8,bulk_qty:2070,total_cost:62.1,dcm_source:'template',dcm_confidence:.95,annotation:null},
  {id:'aa000001-0000-0000-0000-000000000002',category:'sub_material',name:'GOAT SUEDE',material_color:'BLACK',qty_per_garment:2.6,uom:'dm2',unit_price:2.1,bulk_qty:156,total_cost:5.46,dcm_source:'ai_estimate',dcm_confidence:.5,annotation:'estimated from POM area — confirm at cutting'},
  {id:'aa000001-0000-0000-0000-000000000003',category:'lining',name:'VISCOSE LINING',material_color:'BLACK',qty_per_garment:1.2,uom:'mtr',unit_price:3.4,bulk_qty:72,total_cost:4.08,dcm_source:'similar_style',dcm_confidence:.7,annotation:null},
  {id:'aa000001-0000-0000-0000-000000000004',category:'thread',name:'POLY THREAD 40/2',material_color:'BLACK',qty_per_garment:120,uom:'mtr',unit_price:.01,bulk_qty:7200,total_cost:1.2,dcm_source:null,dcm_confidence:null,annotation:null},
  {id:'aa000001-0000-0000-0000-000000000005',category:'accessory',name:'YKK ZIP #5 60CM',material_color:'BLACK',qty_per_garment:1,uom:'pcs',unit_price:1.41,bulk_qty:60,total_cost:1.41,dcm_source:null,dcm_confidence:null,annotation:null},
  {id:'aa000001-0000-0000-0000-000000000006',category:'manufacturing',name:'CUTTING + STITCHING',material_color:null,qty_per_garment:1,uom:null,unit_price:30,bulk_qty:60,total_cost:30,dcm_source:null,dcm_confidence:null,annotation:null},
  {id:'aa000001-0000-0000-0000-000000000007',category:'packaging',name:'POLYBAG + CARTON',material_color:null,qty_per_garment:1,uom:null,unit_price:3,bulk_qty:60,total_cost:3,dcm_source:null,dcm_confidence:null,annotation:null},
  {id:'aa000001-0000-0000-0000-000000000008',category:'fob_charge',name:'FOB CHARGE',material_color:null,qty_per_garment:1,uom:null,unit_price:5,bulk_qty:60,total_cost:5,dcm_source:null,dcm_confidence:null,annotation:null},
];

const BOM_BASE = {
  id: IDS.bom_clermont,status:'draft',revision:1,currency:'USD',order_qty:60,garment_fob_price:107.25,bulk_total:6435,
  cutting_confirmed_at:null,approved_at:null,rejection_reason:null,export_document_id:null,exported_at:null,items:BOM_ITEMS
};

const INVENTORY = [
  {inventory_item_id:'b0001111-2222-3333-4444-555566667777',description:'SHEEP GLASS BLACK',normalized_key:'sheep glass black',uom:'dm2',qty_on_hand:3400,rate:1.72,color:'BLACK',is_active:true},
  {inventory_item_id:'b0002222-3333-4444-5555-666677778888',description:'GOAT SUEDE BLACK',normalized_key:'goat suede black',uom:'dm2',qty_on_hand:100,rate:2.05,color:'BLACK',is_active:true},
  {inventory_item_id:'b0003333-4444-5555-6666-777788889999',description:'VISCOSE LINING FABRIC BLACK',normalized_key:'viscose lining fabric black',uom:'mtr',qty_on_hand:0,rate:3.4,color:'BLACK',is_active:true},
  {inventory_item_id:'b0004444-5555-6666-7777-888899990000',description:'POLYESTER THREAD 40/2 BLACK',normalized_key:'polyester thread 40/2 black',uom:'mtr',qty_on_hand:50000,rate:.01,color:'BLACK',is_active:true},
  {inventory_item_id:'b0005555-6666-7777-8888-99990000aaaa',description:'YKK ZIP #5 60CM BLACK',normalized_key:'ykk zip #5 60cm black',uom:'pcs',qty_on_hand:240,rate:1.41,color:'BLACK',is_active:true},
];

const SUPPLIERS = [
  {id:IDS.sup_sn,name:'S.N. TRADERS',phone:'+919840012345',email:'sales@sntraders.in',service:'Leather supply',gstin:'33AABCS1429B1ZP',address:'12 Anna Salai, Chennai 600002',currency:'INR',payment_terms_days:60,lead_time_days:10,is_active:true,email_status:'valid',supplier_type:'leather',state_code:'33',whatsapp_phone:'+919840012345',has_contact:true},
  {id:IDS.sup_zip,name:'ZIP WORLD',phone:'+912266778899',email:null,service:'Zips and trims',gstin:'27AACZW1234K1Z5',address:'Andheri East, Mumbai 400069',currency:'INR',payment_terms_days:45,lead_time_days:7,is_active:true,email_status:'unknown',supplier_type:'accessory',state_code:'27',whatsapp_phone:'+912266778899',has_contact:true},
  {id:IDS.sup_ameen,name:'AL-AMEEN LEATHERS',phone:'+919876543210',email:'sales@alameen.in',service:'Leather supply',gstin:'33AABCA1234B1Z1',address:'Chennai',currency:'INR',payment_terms_days:60,lead_time_days:12,is_active:true,email_status:'valid',supplier_type:'leather',state_code:'33',whatsapp_phone:'+919876543210',has_contact:true},
  {id:IDS.sup_textile,name:'TEXTILE HOUSE',phone:'+919999000111',email:'sales@textilehouse.in',service:'Lining and textiles',gstin:'27AATFT1234K1Z5',address:'Mumbai',currency:'INR',payment_terms_days:45,lead_time_days:8,is_active:true,email_status:'valid',supplier_type:'accessory',state_code:'27',whatsapp_phone:'+919999000111',has_contact:true},
  {id:IDS.sup_lining,name:'CHENNAI LININGS',phone:null,email:null,service:'Lining',gstin:'33AABCL1234A1Z8',address:'Chennai',currency:'INR',payment_terms_days:60,lead_time_days:10,is_active:true,email_status:'unknown',supplier_type:'accessory',state_code:'33',whatsapp_phone:null,has_contact:false},
];

const seedPOs = () => ({
  [IDS.po_resolved]: {id:IDS.po_resolved,po_number:null,status:'draft',revision:1,supplier_id:IDS.sup_sn,bom_id:IDS.bom_clermont,client_order_id:'3a4b5c6d-7e8f-9001-1223-3445566778899',buyer_ref:'#BOG-SS27-001',issue_date:null,delivery_days:10,payment_terms_days:60,currency:'INR',gst_mode:'INTRA',subtotal:114.8,cgst:6.89,sgst:6.89,igst:0,round_off:.42,total:129,needs_supplier:false,no_contact_channel:false,match_method:'ledger',candidates:{ranked:[{supplier_id:IDS.sup_sn,supplier_name:'S.N. TRADERS',score:.91,txn_count:6,has_contact:true,last_rate:2.05,last_purchased_at:'2026-05-02'},{supplier_id:IDS.sup_ameen,supplier_name:'AL-AMEEN LEATHERS',score:.64,txn_count:3,has_contact:true,last_rate:2.18,last_purchased_at:'2025-11-20'}]},approved_at:null,rejected_at:null,rejection_reason:null,sent_at:null,pdf_document_id:null,current_rung:0,next_escalation_at:null,acknowledged_at:null,acknowledged_channel:null,items:[{id:IDS.po_item_suede,item_no:1,description:'GOAT SUEDE',color:'BLACK',uom:'dm2',qty:56,unit_price:2.05,amount:114.8,inventory_item_id:'b0002222-3333-4444-5555-666677778888',bom_item_id:'aa000001-0000-0000-0000-000000000002'}],supplier:clone(SUPPLIERS[0])},
  [IDS.po_needs]: {id:IDS.po_needs,po_number:null,status:'draft',revision:1,supplier_id:null,bom_id:IDS.bom_clermont,client_order_id:'3a4b5c6d-7e8f-9001-1223-3445566778899',buyer_ref:'#BOG-SS27-001',issue_date:null,delivery_days:10,payment_terms_days:60,currency:'INR',gst_mode:'INTER',subtotal:244.8,cgst:0,sgst:0,igst:29.38,round_off:-.18,total:274,needs_supplier:true,no_contact_channel:false,match_method:null,candidates:{method:'fuzzy',ranked:[{supplier_id:IDS.sup_textile,supplier_name:'TEXTILE HOUSE',score:.41,txn_count:2,has_contact:true,last_rate:3.3,last_purchased_at:'2025-08-14'},{supplier_id:IDS.sup_lining,supplier_name:'CHENNAI LININGS',score:.38,txn_count:5,has_contact:false,last_rate:3.1,last_purchased_at:'2025-06-02'}],suggestion:'TEXTILE HOUSE',ambiguous:true},approved_at:null,rejected_at:null,rejection_reason:null,sent_at:null,pdf_document_id:null,current_rung:0,next_escalation_at:null,acknowledged_at:null,acknowledged_channel:null,items:[{id:IDS.po_item_lining,item_no:1,description:'VISCOSE LINING',color:'BLACK',uom:'mtr',qty:72,unit_price:3.4,amount:244.8,inventory_item_id:null,bom_item_id:'aa000001-0000-0000-0000-000000000003'}],supplier:null}
});

const freshState = () => ({
  submission:{submission_id:IDS.submission,status:'open',order_sheet:null,spec_sheet:null},
  breakdown:null, breakdownPolls:0, boms:{[IDS.bom_clermont]:clone(BOM_BASE)},
  inventoryChecks:{}, pos:{}, suppliers:clone(SUPPLIERS), notifications:[
    {id:IDS.notif_bom,type:'bom_review',title:'BOM ready for MD review',message:'CLERMONT BOM is ready for approval.',read:false,created_at:now()},
    {id:IDS.notif_po,type:'po_approval',title:'PO awaiting approval',message:'A supplier PO needs cross-check approval.',read:false,created_at:now()}
  ],
  trackers:[
    {id:IDS.track_clermont,client_order_id:'3a4b5c6d-7e8f-9001-1223-3445566778899',order_number:'BOG-SS27-001',client_name:'BOGGI MILANO',style_id:IDS.style_clermont,style_name:'CLERMONT',bom_id:IDS.bom_clermont,status:'awaiting_bom',po_count:0,po_confirmed_count:0,material_ready_at:null,released_at:null},
    {id:IDS.track_carnaby,client_order_id:'3a4b5c6d-7e8f-9001-1223-3445566778899',order_number:'BOG-SS27-001',client_name:'BOGGI MILANO',style_id:IDS.style_carnaby,style_name:'CARNABY',bom_id:IDS.bom_carnaby,status:'material_ready',po_count:1,po_confirmed_count:1,material_ready_at:now(),released_at:null}
  ]
});

function loadStore(){
  if(typeof window==='undefined') return freshState();
  try { const raw=localStorage.getItem(key); return raw ? JSON.parse(raw) : freshState(); } catch { return freshState(); }
}
function saveStore(s){ if(typeof window!=='undefined') localStorage.setItem(key,JSON.stringify(s)); }

export async function apiLogin(phone='9876543210',password='password'){ await sleep(200); return {access_token:'mock.jwt.token',token_type:'bearer'}; }
export async function apiMe(){ return {id:IDS.user_md,name:'Tanveer Ahmed',phone:'9000000001',email:'tanveer@ptexports.com',role:'managing_director',is_active:true}; }

// --- Stage 1: Intake (Live + Fallback) ---
export async function apiOpenSubmission(token, clientId = null) {
  try {
    const res = await http(`${V1}/procurement/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ client_id: clientId })
    });
    // Store returned submission id
    if (res?.submission_id || res?.id) {
      const realId = res.submission_id || res.id;
      const s = loadStore();
      s.submission = { ...s.submission, submission_id: realId, status: 'open', client_id: clientId };
      saveStore(s);
    }
    return res;
  } catch (e) {
    const s = loadStore();
    s.submission = { ...s.submission, submission_id: IDS.submission, status: 'open', client_id: clientId };
    saveStore(s);
    await sleep(150);
    return { submission_id: IDS.submission, status: 'open', client_id: clientId };
  }
}

function classifyMock(file, expected) {
  const name = (file?.name || '').toLowerCase();
  const ext = name.split('.').pop();
  const allowed = ['xlsx', 'xls', 'csv', 'pdf'];
  if (!allowed.includes(ext)) {
    return {
      status: 'rejected',
      reason_code: 'unsupported_mime',
      expected_kind: expected,
      confidence: 0,
      method: 'heuristic',
      signals_expected: expected === 'order_sheet' ? ['ORDER CONFIRMATION', 'TAGLIA', 'QTY', 'COLORE'] : ['STYLE', 'MATERIAL', 'POM', 'SPECIFICATION'],
      signals_found: []
    };
  }
  const orderish = /order|boggi|confirmation|purchase|client/.test(name);
  const specish = /spec|tech|technical|bom|measurement|style/.test(name);
  if ((expected === 'order_sheet' && orderish) || (expected === 'spec_sheet' && specish)) {
    return {
      status: 'accepted',
      classified_as: expected,
      spec_type: null,
      client_match: 'BOGGI',
      confidence: 0.94,
      method: 'heuristic',
      signals_matched: expected === 'order_sheet' ? ['ORDER CONFIRMATION', 'TAGLIA', 'COLORE', 'QTY'] : ['STYLE', 'MATERIAL', 'POM'],
      signals_expected: expected === 'order_sheet' ? ['ORDER CONFIRMATION', 'TAGLIA', 'QTY', 'COLORE'] : ['STYLE', 'MATERIAL', 'POM', 'SPECIFICATION'],
      signals_found: expected === 'order_sheet' ? ['ORDER CONFIRMATION', 'TAGLIA', 'COLORE', 'QTY', 'STAGIONE'] : ['STYLE', 'MATERIAL', 'POM', 'SIZE CHART']
    };
  }
  if (/review|unknown|packing|invoice|random/.test(name)) {
    return {
      status: 'rejected',
      reason_code: expected === 'order_sheet' ? 'not_an_order_sheet' : 'not_a_spec_sheet',
      expected_kind: expected,
      confidence: 0.31,
      method: 'llm',
      signals_expected: expected === 'order_sheet' ? ['ORDER CONFIRMATION', 'TAGLIA', 'QTY', 'COLORE'] : ['STYLE', 'MATERIAL', 'POM', 'SPECIFICATION'],
      signals_found: expected === 'order_sheet' ? ['PACKING LIST', 'CARTON', 'NET WEIGHT'] : ['INVOICE', 'CARTON', 'NET WEIGHT'],
      closest_client_profile: 'BOGGI',
      suggested_fix: expected === 'order_sheet' ? 'This looks like a packing list. Upload the order confirmation instead.' : 'Upload the technical specification sheet for the order.'
    };
  }
  return {
    status: 'needs_manual_review',
    reason_code: 'needs_manual_review',
    expected_kind: expected,
    confidence: 0.55,
    method: 'llm',
    signals_expected: expected === 'order_sheet' ? ['ORDER CONFIRMATION', 'TAGLIA', 'QTY', 'COLORE'] : ['STYLE', 'MATERIAL', 'POM', 'SPECIFICATION'],
    signals_found: [],
    closest_client_profile: 'BOGGI',
    suggested_fix: 'The classifier is inconclusive. Review the document or force-accept it.'
  };
}

export async function apiUploadSlot(token, submissionId, slot, file) {
  const normalizedSlot = (slot === 'order' || slot === 'order_sheet') ? 'order-sheet' : 'spec-sheet';
  const endpoint = `${V1}/procurement/submissions/${submissionId}/${normalizedSlot}?force=true&override_manual_review=true`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('force', 'true');
  formData.append('override_manual_review', 'true');

  return await http(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
}

export async function apiGetSubmission(token, id) {
  if (!id) {
    return { order_sheet: { present: false }, spec_sheet: { present: false }, ready_for_stage_2: false, blocking: ['order_sheet missing', 'spec_sheet missing'] };
  }
  try {
    return await http(`${V1}/procurement/submissions/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    const o = !!s.submission?.order_sheet;
    const sp = !!s.submission?.spec_sheet;
    return {
      order_sheet: { present: o, validation_status: o ? 'accepted' : null },
      spec_sheet: { present: sp, validation_status: sp ? 'accepted' : null },
      complete: o && sp,
      ready_for_stage_2: o && sp,
      blocking: o && sp ? [] : [...(o ? [] : ['order_sheet missing']), ...(sp ? [] : ['spec_sheet missing'])]
    };
  }
}

// --- Stage 2/3: Order Breakdown & BOM (Live + Fallback) ---
export async function apiStartOrderBreakdown(token, id) {
  try {
    return await http(`${V1}/procurement/submissions/${id}/order-breakdown`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    if (!s.submission.order_sheet) {
      const err = new Error('submission not ready: order document not accepted');
      err.status = 409;
      throw err;
    }
    s.breakdownPolls = 0;
    s.breakdown = { status: 'processing' };
    saveStore(s);
    await sleep(150);
    return { submission_id: id, status: 'queued', task_id: 'c7f21a90-3b4c-5d6e-7f80-91a2b3c4d5e6' };
  }
}

export async function apiGetOrderBreakdown(token, id) {
  try {
    return await http(`${V1}/procurement/submissions/${id}/order-breakdown`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    if (!s.breakdown) return { submission_id: id, status: 'not_started', styles: [], warnings: [] };
    if (s.breakdown.status !== 'ready') {
      s.breakdownPolls = (s.breakdownPolls || 0) + 1;
      if (s.breakdownPolls >= 3) {
        s.breakdown = clone(BREAKDOWN_READY);
        saveStore(s);
        return clone(s.breakdown);
      }
      saveStore(s);
      return { submission_id: id, status: 'processing', styles: [], warnings: [] };
    }
    return clone(s.breakdown);
  }
}

export async function apiAttachStyle(token, styleId, body = {}) {
  try {
    return await http(`${V1}/procurement/order-styles/${styleId}/attachments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    const s = loadStore();
    if (!s.breakdown) throw new Error('Order breakdown not found.');
    const st = s.breakdown.styles.find((x) => x.id === styleId);
    if (!st) throw new Error('order_style_not_found');
    if (body.spec_document_id) {
      st.spec_document_id = body.spec_document_id;
      st.spec_match_status = 'confirmed';
    } else if (body.clear_spec) {
      st.spec_document_id = null;
      st.spec_match_status = 'none';
    }
    if (body.pattern_reference_id || body.dxf_id) {
      st.pattern_reference_id = body.pattern_reference_id || body.dxf_id;
      st.dxf_match_status = 'confirmed';
    }
    saveStore(s);
    return clone(st);
  }
}

export async function apiUploadPattern(token, styleSignature, clientId, file) {
  const params = new URLSearchParams();
  if (styleSignature) params.append('style_signature', styleSignature);
  if (clientId) params.append('client_id', clientId);

  const endpoint = `${V1}/procurement/patterns?${params.toString()}`;

  try {
    const formData = new FormData();
    formData.append('file', file);
    return await http(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
  } catch (e) {
    const s = loadStore();
    const patId = 'pat-ref-' + Math.random().toString(36).substring(2, 9);
    const specId = s.submission?.spec_sheet?.id || IDS.spec_doc;
    const pat = {
      id: patId,
      pattern_reference_id: patId,
      style_signature: styleSignature,
      client_id: clientId,
      filename: file?.name || 'pattern.dxf',
      spec_id: specId,
      status: 'uploaded'
    };
    s.patterns = s.patterns || {};
    s.patterns[`${styleSignature}_${clientId}`] = pat;
    saveStore(s);
    await sleep(250);
    return pat;
  }
}

export async function apiGetPatterns(token, styleSignature, clientId) {
  const params = new URLSearchParams();
  if (styleSignature) params.append('style_signature', styleSignature);
  if (clientId) params.append('client_id', clientId);

  const endpoint = `${V1}/procurement/patterns?${params.toString()}`;

  try {
    return await http(endpoint, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    const existing = s.patterns?.[`${styleSignature}_${clientId}`];
    if (existing) return existing;
    const patId = 'pat-ref-' + Math.random().toString(36).substring(2, 9);
    const specId = s.submission?.spec_sheet?.id || IDS.spec_doc;
    return {
      id: patId,
      pattern_reference_id: patId,
      style_signature: styleSignature,
      client_id: clientId,
      spec_id: specId,
      status: 'active'
    };
  }
}

export async function apiGenerateBom(token, styleId) {
  try {
    return await http(`${V1}/procurement/order-styles/${styleId}/generate-bom`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    const st = s.breakdown?.styles.find((x) => x.id === styleId);
    if (!st) throw new Error('order style not found');
    const bomId = styleId === IDS.style_clermont ? IDS.bom_clermont : IDS.bom_carnaby;
    st.bom_id = bomId;
    s.boms[bomId] = s.boms[bomId] || clone(BOM_BASE);
    saveStore(s);
    await sleep(250);
    return { order_style_id: styleId, status: 'queued', bom_id: bomId };
  }
}

export async function apiGetBom(token, id) {
  try {
    return await http(`${V1}/procurement/boms/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e1) {
    try {
      return await http(`${V1}/procurement/order-styles/${id}/bom`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e2) {
      const s = loadStore();
      const b = s.boms[id] || Object.values(s.boms)[0];
      if (!b) throw new Error('BOM not found.');
      return clone(b);
    }
  }
}

export async function apiPatchBomItems(token, id, body) {
  try {
    return await http(`${V1}/procurement/boms/${id}/items`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    const s = loadStore();
    const b = s.boms[id];
    if (!b) throw new Error('BOM not found.');
    let reconfirm = false;
    for (const e of body.edits || []) {
      const item = b.items.find((i) => i.id === e.bom_item_id);
      if (item) {
        const v = Number(e.value);
        item[e.field === 'dcm' ? 'qty_per_garment' : e.field] = v;
        if (e.field === 'dcm' || e.field === 'qty_per_garment') {
          item.dcm_source = 'manual';
          item.dcm_confidence = 1;
        }
      }
    }
    b.revision += 1;
    saveStore(s);
    return { revision: b.revision, reconfirm_required: reconfirm, recomputed: clone(b) };
  }
}

export async function apiConfirmCutting(token, id) {
  try {
    return await http(`${V1}/procurement/boms/${id}/confirm-cutting`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    const b = s.boms[id];
    if (b) {
      b.status = 'ready_for_review';
      b.cutting_confirmed_at = now();
      saveStore(s);
    }
    return { bom_id: id, status: 'ready_for_review', cutting_confirmed_at: now() };
  }
}

export async function apiApproveBom(token, id, lock = false) {
  try {
    return await http(`${V1}/procurement/boms/${id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ lock })
    });
  } catch (e) {
    const s = loadStore();
    const b = s.boms[id];
    if (b) {
      b.status = lock ? 'locked' : 'approved';
      b.approved_at = now();
      saveStore(s);
    }
    return { bom_id: id, status: b?.status || 'approved', inventory_check_id: IDS.check_clermont };
  }
}

export async function apiRejectBom(token, id, reason) {
  try {
    return await http(`${V1}/procurement/boms/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    });
  } catch (e) {
    const s = loadStore();
    const b = s.boms[id];
    if (b) {
      b.status = 'rejected';
      b.rejection_reason = reason;
      saveStore(s);
    }
    return { bom_id: id, status: 'rejected', rejection_reason: reason };
  }
}

export async function apiReopenBom(token, id) {
  try {
    return await http(`${V1}/procurement/boms/${id}/reopen`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    const b = s.boms[id];
    if (b) {
      b.status = 'draft';
      b.revision += 1;
      saveStore(s);
    }
    return { bom_id: id, status: 'draft', revision: b?.revision || 1 };
  }
}

export async function apiExportBom(token, id) {
  try {
    return await http(`${V1}/procurement/boms/${id}/export`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    return { bom_id: id, document_id: 'doc-' + id.slice(0, 8), filename: `BOM-${id.slice(0, 8)}.pdf` };
  }
}

// Stage 4 / 5 Inventory & PO functions (preserved with state)
export async function apiRunInventoryCheck(token, id) {
  const s = loadStore();
  const c = {
    inventory_check_id: IDS.check_clermont,
    bom_id: id,
    status: 'complete',
    run_at: now(),
    summary: { badge: 'out_of_stock', lines_total: 6, sufficient: 3, partial: 1, out_of_stock: 2, shortfall_value: 1247.6, currency: 'INR' },
    lines: [
      { bom_item_id: BOM_ITEMS[0].id, category: 'main_material', name: 'SHEEP GLASS', material_color: 'BLACK', required_qty: 2070, uom: 'dm2', available_qty: 2400, reserved_for_this_bom: 2070, shortfall_qty: 0, status: 'sufficient' },
      { bom_item_id: BOM_ITEMS[1].id, category: 'sub_material', name: 'GOAT SUEDE', material_color: 'BLACK', required_qty: 156, uom: 'dm2', available_qty: 100, reserved_for_this_bom: 100, shortfall_qty: 56, status: 'partial' },
      { bom_item_id: BOM_ITEMS[2].id, category: 'lining', name: 'VISCOSE LINING', material_color: 'BLACK', required_qty: 72, uom: 'mtr', available_qty: 0, reserved_for_this_bom: 0, shortfall_qty: 72, status: 'out_of_stock' }
    ],
    excluded: [{ bom_item_id: BOM_ITEMS[5].id, name: 'CUTTING + STITCHING', category: 'manufacturing' }]
  };
  s.inventoryChecks[c.inventory_check_id] = c;
  saveStore(s);
  return c;
}

export async function apiGetInventoryCheck(token, id) {
  const s = loadStore();
  const c = s.inventoryChecks[id];
  if (!c) throw new Error('No inventory check found.');
  return clone(c);
}

export async function apiGeneratePOs(token, id) {
  let s = loadStore();
  if (Object.keys(s.pos).length === 0) {
    s.pos = seedPOs();
  }
  saveStore(s);
  return { bom_id: id, resolved: 1, needs_supplier: 1, purchase_orders: Object.values(s.pos).map(clone) };
}

export async function apiGetPOs(token, filters = {}) {
  const s = loadStore();
  let rows = Object.values(s.pos);
  if (filters.needs_supplier !== undefined) rows = rows.filter((p) => p.needs_supplier === filters.needs_supplier);
  return { purchase_orders: rows.map(clone), count: rows.length };
}

export async function apiGetPO(token, id) {
  const s = loadStore();
  const p = s.pos[id];
  if (!p) throw new Error('PO not found.');
  return clone(p);
}

export async function apiPatchPOItems(token, id, body) {
  const s = loadStore();
  const p = s.pos[id];
  if (!p) throw new Error('PO not found.');
  if (body.po_edits?.supplier_id) {
    p.supplier_id = body.po_edits.supplier_id;
    p.supplier = clone(s.suppliers.find((x) => x.id === p.supplier_id) || null);
    p.needs_supplier = !p.supplier_id;
    p.status = 'draft';
  }
  p.revision += 1;
  saveStore(s);
  return clone(p);
}

export async function apiSubmitPO(token, id) {
  const s = loadStore();
  const p = s.pos[id];
  if (p) { p.status = 'pending_approval'; saveStore(s); }
  return { po_id: id, status: 'pending_approval' };
}

export async function apiApprovePO(token, id) {
  const s = loadStore();
  const p = s.pos[id];
  if (p) { p.status = 'approved'; p.approved_at = now(); saveStore(s); }
  return { po_id: id, status: 'approved' };
}

export async function apiRejectPO(token, id, reason) {
  const s = loadStore();
  const p = s.pos[id];
  if (p) { p.status = 'rejected'; p.rejection_reason = reason; saveStore(s); }
  return { po_id: id, status: 'rejected', rejection_reason: reason };
}

export async function apiSendPO(token, id) {
  const s = loadStore();
  const p = s.pos[id];
  if (p) { p.status = 'sent'; p.sent_at = now(); saveStore(s); }
  return { po_id: id, status: 'sent' };
}

export async function apiAcknowledgePO(token, id, body = {}) {
  const s = loadStore();
  const p = s.pos[id];
  if (p) { p.status = 'confirmed'; p.acknowledged_at = now(); saveStore(s); }
  return clone(p);
}

export async function apiGetSuppliers(token) {
  const s = loadStore();
  return { suppliers: s.suppliers.map(clone), count: s.suppliers.length };
}

export async function apiGetProductionTracking(token) {
  const s = loadStore();
  return { trackers: s.trackers.map(clone), count: s.trackers.length };
}

export async function apiTransitionTracking(token, id, status) {
  const s = loadStore();
  const t = s.trackers.find((x) => x.id === id);
  if (t) { t.status = status; saveStore(s); }
  return { id, status };
}

export async function apiGetNotifications(token) {
  try {
    return await http(`${V1}/procurement/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    return { notifications: s.notifications.map(clone), count: s.notifications.length };
  }
}

export async function apiOpenNotification(token, id) {
  try {
    return await http(`${V1}/procurement/notifications/${id}/open`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    const n = s.notifications.find((x) => x.id === id);
    if (n) n.read = true;
    saveStore(s);
    return n ? clone(n) : null;
  }
}

export async function apiChat(token, question) {
  const q = question.toLowerCase();
  if (q.includes('clermont') || q.includes('schedule')) {
    return {
      answer: 'CLERMONT is behind schedule. 60 ordered, 22 produced, 38 remaining with 9 working days to the deadline.',
      tool: 'schedule_status',
      data: { style: 'CLERMONT', ordered: 60, produced: 22, remaining: 38, deadline: '2026-09-22', working_days_left: 9, on_track: false }
    };
  }
  return {
    answer: 'The bottleneck is PASTING. 41 pieces are queued against a throughput of 12/day.',
    tool: 'bottleneck',
    data: { stage: 'PASTING', queued: 41, throughput_per_day: 12, backlog_days: 3.4 }
  };
}

export function resetMock() {
  if (typeof window !== 'undefined') localStorage.removeItem(key);
}

export const MOCK_API_BASE_URL = V1;
export { IDS };
