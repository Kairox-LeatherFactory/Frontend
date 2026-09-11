// Frontend-only KairoX Procurement mock API.
// Contract follows KAIROX_PROCUREMENT_API_REFERENCE.pdf; no backend is required.

const V1 = '/api/v1';

const IDS = {
  // §40.2 canonical fixture IDs — aligned with Phase 1 API Reference
  user_md: 'a1b2c3d4-e5f6-0718-293a-4b5c6d7e8f90',     // Tanveer Ahmed MD
  submission: 'a3f2b8c1-4d5e-6f70-8192-a3b4c5d6e7f8',
  order_doc: 'b1c2d3e4-5f60-7182-93a4-b5c6d7e8f901',
  spec_doc: 'e5f60718-293a-4b5c-6d7e-8f90a1b2c3d4',
  style_clermont: '4b5c6d7e-8f90-0112-2334-4556677889900', // §40.2
  style_carnaby:  '7e8f9001-1223-3445-5667-788990011223',  // §40.2
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

function load(){
  if(typeof window==='undefined') return freshState();
  try { const raw=localStorage.getItem(key); return raw ? JSON.parse(raw) : freshState(); } catch { return freshState(); }
}
function save(s){ if(typeof window!=='undefined') localStorage.setItem(key,JSON.stringify(s)); }
function roleFromToken(token){ return token?.role || (typeof window!=='undefined' ? localStorage.getItem('kairox_mock_role') : null) || 'direct_manager'; }
function err(status, body){ const e=new Error(body?.detail?.message || body?.detail || body?.error || 'Request failed'); e.status=status; e.body=body; throw e; }
function findPO(s,id){ const p=s.pos[id]; if(!p) err(404,{detail:'Purchase order not found.'}); return p; }

export async function apiLogin(phone='9876543210',password='password'){ await sleep(200); return {access_token:'mock.jwt.token',token_type:'bearer'}; }
export async function apiMe(){ return {id:IDS.user_md,name:'Tanveer Ahmed',phone:'9000000001',email:'tanveer@ptexports.com',role:'managing_director',is_active:true}; }

export async function apiOpenSubmission(token){ const s=load(); s.submission={...s.submission,submission_id:IDS.submission,status:'open'}; save(s); await sleep(150); return {submission_id:IDS.submission,status:'open'}; }

function classify(file, expected){
  const name=(file?.name||'').toLowerCase();
  const ext=name.split('.').pop();
  const allowed=['xlsx','xls','csv','pdf'];
  if(!allowed.includes(ext)) return {status:'rejected',reason_code:'unsupported_mime',expected_kind:expected,confidence:0,method:'heuristic',signals_expected:expected==='order_sheet'?['ORDER CONFIRMATION','TAGLIA','QTY','COLORE']:['STYLE','MATERIAL','POM','SPECIFICATION'],signals_found:[]};
  const orderish=/order|boggi|confirmation|purchase|client/.test(name);
  const specish=/spec|tech|technical|bom|measurement|style/.test(name);
  if((expected==='order_sheet'&&orderish)||(expected==='spec_sheet'&&specish)) return {status:'accepted',classified_as:expected,spec_type:null,client_match:'BOGGI',confidence:.94,method:'heuristic',llm_label:null,llm_model:null,signals_matched:expected==='order_sheet'?['ORDER CONFIRMATION','TAGLIA','COLORE','QTY']:['STYLE','MATERIAL','POM'],signals_expected:expected==='order_sheet'?['ORDER CONFIRMATION','TAGLIA','QTY','COLORE']:['STYLE','MATERIAL','POM','SPECIFICATION'],signals_found:expected==='order_sheet'?['ORDER CONFIRMATION','TAGLIA','COLORE','QTY','STAGIONE']:['STYLE','MATERIAL','POM','SIZE CHART']};
  // Simulate heuristic inconclusive -> LLM fallback, matching the API error contract.
  if(/review|unknown|packing|invoice|random/.test(name)) return {status:'rejected',reason_code:expected==='order_sheet'?'not_an_order_sheet':'not_a_spec_sheet',expected_kind:expected,confidence:.31,method:'llm',signals_expected:expected==='order_sheet'?['ORDER CONFIRMATION','TAGLIA','QTY','COLORE']:['STYLE','MATERIAL','POM','SPECIFICATION'],signals_found:expected==='order_sheet'?['PACKING LIST','CARTON','NET WEIGHT']:['INVOICE','CARTON','NET WEIGHT'],closest_client_profile:'BOGGI',suggested_fix:expected==='order_sheet'?'This looks like a packing list. Upload the order confirmation instead.':'Upload the technical specification sheet for the order.'};
  return {status:'needs_manual_review',reason_code:'needs_manual_review',expected_kind:expected,confidence:.55,method:'llm',signals_expected:expected==='order_sheet'?['ORDER CONFIRMATION','TAGLIA','QTY','COLORE']:['STYLE','MATERIAL','POM','SPECIFICATION'],signals_found:[],closest_client_profile:'BOGGI',suggested_fix:'The classifier is inconclusive. Review the document or force-accept it.'};
}

export async function apiUploadSlot(token,submissionId,slot,file,force=false){
  const s=load(); const validation=classify(file,slot);
  await sleep(500);
  if(validation.status==='rejected' && validation.reason_code!=='needs_manual_review') err(422,{error:'document_validation_failed',reason_code:validation.reason_code,submission_id:submissionId,document_fingerprint:{filename:file.name,mime:file.type||'application/octet-stream',sha256:'mock-'+btoa(unescape(encodeURIComponent(file.name))).slice(0,48),size_bytes:file.size},validation});
  if(validation.status==='needs_manual_review'&&!force) err(422,{error:'document_validation_failed',reason_code:'needs_manual_review',submission_id:submissionId,document_fingerprint:{filename:file.name,mime:file.type||'application/octet-stream',size_bytes:file.size},validation});
  const doc={id:slot==='order_sheet'?IDS.order_doc:IDS.spec_doc,kind:slot,filename:file.name,mime:file.type||'application/octet-stream',sha256:'mock-'+file.name,size_bytes:file.size,page_count:null,storage_url:'mock://kairox/'+file.name,validation:{...validation,status:'accepted',classified_as:slot},scan_status:'clean'};
  s.submission[slot]=doc; save(s);
  return {submission_id:submissionId,document:doc,submission:{order_sheet:{present:!!s.submission.order_sheet,validation_status:s.submission.order_sheet?.validation?.status||null},spec_sheet:{present:!!s.submission.spec_sheet,validation_status:s.submission.spec_sheet?.validation?.status||null},complete:!!s.submission.order_sheet&&!!s.submission.spec_sheet,ready_for_stage_2:!!s.submission.order_sheet&&!!s.submission.spec_sheet,blocking:[]}};
}
export async function apiGetSubmission(token,id){ const s=load(); const o=!!s.submission.order_sheet, sp=!!s.submission.spec_sheet; return {order_sheet:{present:o,validation_status:o?'accepted':null},spec_sheet:{present:sp,validation_status:sp?'accepted':null},complete:o&&sp,ready_for_stage_2:o&&sp,blocking:o&&sp?[]:[...(o?[]:['order_sheet missing']),...(sp?[]:['spec_sheet missing'])]}; }

export async function apiStartOrderBreakdown(token,id){ const s=load(); if(!s.submission.order_sheet) err(409,{detail:'submission not ready: order document not accepted'}); s.breakdownPolls=0; s.breakdown={status:'processing'}; save(s); await sleep(150); return {submission_id:id,status:'queued',task_id:'c7f21a90-3b4c-5d6e-7f80-91a2b3c4d5e6'}; }
export async function apiGetOrderBreakdown(token,id){ const s=load(); if(!s.breakdown) return {submission_id:id,status:'not_started',styles:[],warnings:[]}; if(s.breakdown.status!=='ready'){ s.breakdownPolls=(s.breakdownPolls||0)+1; if(s.breakdownPolls>=3){ s.breakdown=clone(BREAKDOWN_READY); save(s); return clone(s.breakdown); } save(s); return {submission_id:id,status:'processing',styles:[],warnings:[]}; } return clone(s.breakdown); }

export async function apiAttachStyle(token,styleId,body={}){ const s=load(); if(!s.breakdown) err(404,{detail:'Order breakdown not found.'}); const st=s.breakdown.styles.find(x=>x.id===styleId); if(!st) err(404,{detail:'order_style_not_found'}); if(body.clear_spec&&body.spec_document_id) err(422,{detail:'clear_spec and spec_document_id are contradictory'}); if(body.spec_document_id){st.spec_document_id=body.spec_document_id;st.spec_match_status='confirmed';} else if(body.clear_spec){st.spec_document_id=null;st.spec_match_status='none';} else if(st.spec_document_id){st.spec_match_status='confirmed';} if(body.pattern_reference_id){st.pattern_reference_id=body.pattern_reference_id;st.dxf_match_status='confirmed';} else if(body.clear_dxf){st.pattern_reference_id=null;st.dxf_match_status='none';} else if(st.pattern_reference_id&&st.dxf_match_status==='suggested') st.dxf_match_status='confirmed'; save(s); return clone(st); }
export async function apiGenerateBom(token,styleId){ const s=load(); const st=s.breakdown?.styles.find(x=>x.id===styleId); if(!st) err(404,{detail:'order style not found'}); if(st.spec_match_status==='suggested') err(422,{detail:'spec suggestion is unconfirmed — confirm or clear it before generating'}); const bomId=styleId===IDS.style_clermont?IDS.bom_clermont:IDS.bom_carnaby; st.bom_id=bomId; s.boms[bomId]=s.boms[bomId]||clone(BOM_BASE); save(s); await sleep(250); return {order_style_id:styleId,status:'queued',bom_id:null,task_id:'9a8b7c6d-5e4f-3021-a1b2-c3d4e5f60718'}; }

export async function apiGetBom(token,id){ const s=load(); const b=s.boms[id]; if(!b) err(404,{detail:'BOM not found.'}); return clone(b); }
function recomputeBom(b){ b.items=b.items.map(i=>({...i,bulk_qty:Number((b.order_qty*i.qty_per_garment).toFixed(3)),total_cost:Number((i.qty_per_garment*i.unit_price).toFixed(2))})); b.garment_fob_price=Number(b.items.reduce((a,i)=>a+i.total_cost,0).toFixed(2)); b.bulk_total=Number((b.order_qty*b.garment_fob_price).toFixed(2)); return b; }
export async function apiPatchBomItems(token,id,body){ const s=load(); const b=s.boms[id]; if(!b) err(404,{detail:'BOM not found.'}); if(b.revision!==body.base_revision) err(409,{detail:{error:'stale_revision',current_revision:b.revision}}); if(['approved','locked'].includes(b.status)) err(409,{detail:{error:'bom_locked',message:'A locked/approved BOM rejects all edits.'}}); let reconfirm=false; for(const e of body.edits||[]){ const item=b.items.find(i=>i.id===e.bom_item_id); if(!item) err(422,{detail:{error:'unknown_bom_item',bom_item_id:e.bom_item_id}}); if(!['dcm','qty_per_garment','unit_price'].includes(e.field)) err(422,{detail:{error:'unsupported_field',field:e.field}}); const v=Number(e.value); if(!Number.isFinite(v)||v<0) err(422,{detail:{error:'invalid_value',field:e.field,value:e.value}}); item[e.field==='dcm'?'qty_per_garment':e.field]=v; if(e.field==='dcm'||e.field==='qty_per_garment'){item.dcm_source='manual';item.dcm_confidence=1; if(b.cutting_confirmed_at){b.cutting_confirmed_at=null;b.status='draft';reconfirm=true;}} } b.revision+=1; recomputeBom(b); save(s); return {revision:b.revision,reconfirm_required:reconfirm,recomputed:clone(b)}; }
export async function apiConfirmCutting(token,id){ const s=load(); const b=s.boms[id]; if(!b) err(404,{detail:'BOM not found.'}); if(!['draft','ready_for_review'].includes(b.status)) err(409,{detail:{error:'invalid_state_for_confirmation',current_status:b.status}}); b.status='ready_for_review'; b.cutting_confirmed_at=now(); save(s); return {bom_id:id,status:b.status,cutting_confirmed_at:b.cutting_confirmed_at,templates_backfilled:b.items.filter(i=>i.dcm_source).length,notifications_created:2}; }
export async function apiApproveBom(token,id,lock=false){ const s=load(); const b=s.boms[id]; if(!b) err(404,{detail:'BOM not found.'}); if(!b.cutting_confirmed_at) err(409,{detail:{error:'cutting_confirmation_required',message:'The cutting manager must confirm the BOM before approval.'}}); b.status=lock?'locked':'approved'; b.approved_at=now(); const tracker=s.trackers.find(t=>t.bom_id===id); if(tracker) tracker.status='bom_approved'; save(s); return {bom_id:id,status:b.status,inventory_check_id:IDS.check_clermont}; }
export async function apiRejectBom(token,id,reason){ const s=load(); const b=s.boms[id]; if(!b) err(404,{detail:'BOM not found.'}); if(!reason?.trim()) err(422,{detail:{error:'reason_required'}}); b.status='rejected';b.rejection_reason=reason;save(s);return {bom_id:id,status:'rejected',rejection_reason:reason}; }
export async function apiReopenBom(token,id){ const s=load(); const b=s.boms[id]; if(!b) err(404,{detail:'BOM not found.'}); if(b.status!=='rejected') err(409,{detail:{error:'not_rejected',current_status:b.status}});b.status='draft';b.revision+=1;b.cutting_confirmed_at=null;b.rejection_reason=null;save(s);return {bom_id:id,status:'draft',revision:b.revision}; }
export async function apiExportBom(token,id){ const s=load(); const b=s.boms[id]; if(!b) err(404,{detail:'BOM not found.'}); b.export_document_id='doc-'+id.slice(0,8);b.exported_at=now();save(s);return {bom_id:id,document_id:b.export_document_id,filename:`BOM-${id.slice(0,8)}.pdf`}; }

function checkEnvelope(){ return {inventory_check_id:IDS.check_clermont,bom_id:IDS.bom_clermont,status:'complete',run_at:now(),summary:{badge:'out_of_stock',lines_total:6,sufficient:3,partial:1,out_of_stock:2,flags:{unmatched:1,uom_mismatch:0},shortfall_value:1247.6,currency:'INR'},lines:[
 {bom_item_id:BOM_ITEMS[0].id,category:'main_material',name:'SHEEP GLASS',material_color:'BLACK',required_qty:2070,uom:'dm2',matched:{inventory_item_id:INVENTORY[0].inventory_item_id,description:INVENTORY[0].description,method:'key',uom:'dm2'},on_hand_qty:3400,available_qty:2400,reserved_for_this_bom:2070,shortfall_qty:0,status:'sufficient',flags:[],suggestion:null},
 {bom_item_id:BOM_ITEMS[1].id,category:'sub_material',name:'GOAT SUEDE',material_color:'BLACK',required_qty:156,uom:'dm2',matched:{inventory_item_id:INVENTORY[1].inventory_item_id,description:INVENTORY[1].description,method:'key',uom:'dm2'},on_hand_qty:100,available_qty:100,reserved_for_this_bom:100,shortfall_qty:56,status:'partial',flags:[],suggestion:null},
 {bom_item_id:BOM_ITEMS[2].id,category:'lining',name:'VISCOSE LINING',material_color:'BLACK',required_qty:72,uom:'mtr',matched:null,on_hand_qty:0,available_qty:0,reserved_for_this_bom:0,shortfall_qty:72,status:'out_of_stock',flags:['suggestion','unmatched'],suggestion:{inventory_item_id:INVENTORY[2].inventory_item_id,description:INVENTORY[2].description,score:.67}},
 {bom_item_id:BOM_ITEMS[3].id,category:'thread',name:'POLY THREAD 40/2',material_color:'BLACK',required_qty:7200,uom:'mtr',matched:{inventory_item_id:INVENTORY[3].inventory_item_id,description:INVENTORY[3].description,method:'alias',uom:'mtr'},on_hand_qty:50000,available_qty:44000,reserved_for_this_bom:7200,shortfall_qty:0,status:'sufficient',flags:[],suggestion:null},
 {bom_item_id:BOM_ITEMS[4].id,category:'accessory',name:'YKK ZIP #5 60CM',material_color:'BLACK',required_qty:60,uom:'pcs',matched:{inventory_item_id:INVENTORY[4].inventory_item_id,description:INVENTORY[4].description,method:'key',uom:'pcs'},on_hand_qty:240,available_qty:240,reserved_for_this_bom:60,shortfall_qty:0,status:'sufficient',flags:[],suggestion:null},
 {bom_item_id:BOM_ITEMS[6].id,category:'packaging',name:'POLYBAG + CARTON',material_color:null,required_qty:60,uom:null,matched:null,on_hand_qty:0,available_qty:0,reserved_for_this_bom:0,shortfall_qty:60,status:'out_of_stock',flags:['unmatched'],suggestion:null}],excluded:[{bom_item_id:BOM_ITEMS[5].id,name:'CUTTING + STITCHING',category:'manufacturing'},{bom_item_id:BOM_ITEMS[7].id,name:'FOB CHARGE',category:'fob_charge'}]}; }
export async function apiRunInventoryCheck(token,id){ const s=load(); const b=s.boms[id]; if(!b) err(404,{detail:'BOM not found'}); if(!['approved','locked','exported'].includes(b.status)) err(409,{detail:{error:'bom_not_approved',message:'Only approved / locked / exported BOMs can be checked'}}); const c=checkEnvelope();c.bom_id=id;c.inventory_check_id=id===IDS.bom_clermont?IDS.check_clermont:IDS.check_carnaby;s.inventoryChecks[c.inventory_check_id]=c; const t=s.trackers.find(x=>x.bom_id===id); if(t)t.status='inventory_checked';save(s);return c; }
export async function apiGetInventoryCheck(token,id){ const s=load(); const c=s.inventoryChecks[id]; if(!c) err(404,{detail:'No inventory check found.'}); return clone(c); }
export async function apiInventoryPreview(token,file){ await sleep(300); return {raw_count:84,kept:72,dropped:[{row:42,description:'CUTTING + STITCHING',reason:'non_stock'},{row:57,description:'',reason:'empty'}],rows:INVENTORY.map(x=>({...x})),warnings:['2 rows were skipped as non-stock / empty.']}; }
export async function apiInventoryCommit(token,file){ await sleep(400); return {raw_count:84,kept:72,dropped:12,warnings:[],committed:72}; }
export async function apiGetInventoryItems(token,q=''){ return {items:INVENTORY.filter(x=>!q||x.description.toLowerCase().includes(q.toLowerCase())),count:INVENTORY.length}; }

export async function apiGeneratePOs(token,id){ let s=load(); if(!s.inventoryChecks[IDS.check_clermont]) { await apiRunInventoryCheck(token,id); s=load(); } if(Object.keys(s.pos).length===0){ s.pos=seedPOs(); } const t=s.trackers.find(x=>x.bom_id===id); if(t)t.status='po_raised',t.po_count=Object.values(s.pos).filter(p=>p.bom_id===id).length; save(s); return {bom_id:id,resolved:1,needs_supplier:1,purchase_orders:Object.values(s.pos).map(clone)}; }
export async function apiGetPOs(token,filters={}){ const s=load(); let rows=Object.values(s.pos); if(filters.bom_id)rows=rows.filter(p=>p.bom_id===filters.bom_id);if(filters.needs_supplier!==undefined)rows=rows.filter(p=>p.needs_supplier===filters.needs_supplier);if(filters.status)rows=rows.filter(p=>p.status===filters.status);return {purchase_orders:rows.map(clone),count:rows.length}; }
export async function apiGetPO(token,id){ const s=load(); return clone(findPO(s,id)); }
export async function apiPatchPOItems(token,id,body){ const s=load(); const p=findPO(s,id);if(p.revision!==body.base_revision)err(409,{detail:{error:'stale_revision',current_revision:p.revision}});if(['sent','escalated','confirmed'].includes(p.status))err(409,{detail:{error:'po_locked',message:'A sent PO is frozen — cancel + re-issue.'}});if(body.po_edits?.supplier_id){p.supplier_id=body.po_edits.supplier_id;p.supplier=clone(s.suppliers.find(x=>x.id===p.supplier_id)||null);p.needs_supplier=!p.supplier_id;p.candidates={...p.candidates,ambiguous:false};p.status='draft';} for(const e of body.item_edits||[]){const item=p.items.find(x=>x.id===e.po_item_id);if(!item)err(422,{detail:{error:'unknown_po_item'}});if(!['description','color','uom','qty','unit_price'].includes(e.field))err(422,{detail:{error:'unsupported_field'}});item[e.field]=e.value;item.amount=Number((item.qty*item.unit_price).toFixed(2));}p.revision+=1;p.subtotal=Number(p.items.reduce((a,i)=>a+i.amount,0).toFixed(2));p.cgst=p.gst_mode==='INTRA'?Number((p.subtotal*.06).toFixed(2)):0;p.sgst=p.gst_mode==='INTRA'?Number((p.subtotal*.06).toFixed(2)):0;p.igst=p.gst_mode==='INTER'?Number((p.subtotal*.12).toFixed(2)):0;p.total=Number((p.subtotal+p.cgst+p.sgst+p.igst+(p.round_off||0)).toFixed(2));save(s);return clone(p); }
export async function apiSubmitPO(token,id){ const s=load();const p=findPO(s,id);if(p.needs_supplier)err(409,{detail:{error:'needs_supplier',message:'Assign a supplier before submitting.'}});if(!['draft','rejected'].includes(p.status))err(409,{detail:{error:'not_submittable',current_status:p.status}});p.status='pending_approval';save(s);return {po_id:id,status:p.status,notifications_created:2}; }
export async function apiApprovePO(token,id){ const s=load();const p=findPO(s,id);if(p.status!=='pending_approval')err(409,{detail:{error:'not_pending_approval',current_status:p.status}});p.status='approved';p.approved_at=now();save(s);return {po_id:id,status:'approved'}; }
export async function apiRejectPO(token,id,reason){ const s=load();const p=findPO(s,id);if(!reason?.trim())err(422,{detail:{error:'reason_required'}});p.status='rejected';p.rejection_reason=reason;save(s);return {po_id:id,status:'rejected',rejection_reason:reason}; }
export async function apiSendPO(token,id){ const s=load();const p=findPO(s,id);if(p.status!=='approved')err(409,{detail:{error:'not_approved',current_status:p.status}});p.po_number=p.id===IDS.po_resolved?'PO-07(25-26)':'PO-08(25-26)';p.status='sent';p.sent_at=now();p.issue_date=new Date().toISOString().slice(0,10);p.pdf_document_id='pdf-'+p.id.slice(0,8);p.next_escalation_at=new Date(Date.now()+2*3600000).toISOString();p.current_rung=0;save(s);return {po_id:id,po_number:p.po_number,status:'sent',channel:p.supplier?.email_status==='valid'?'email':null,no_contact_channel:!p.supplier?.has_contact,pdf_document_id:p.pdf_document_id}; }
export async function apiAcknowledgePO(token,id,body={}){ const s=load();const p=findPO(s,id);p.status='confirmed';p.acknowledged_at=now();p.acknowledged_channel=body.channel||'manual';p.next_escalation_at=null;const t=s.trackers.find(x=>x.bom_id===p.bom_id);if(t){t.po_confirmed_count=(t.po_confirmed_count||0)+1;if(t.po_count&&t.po_confirmed_count>=t.po_count){t.status='material_ready';t.material_ready_at=now();}}save(s);return clone(p); }

export async function apiGetSuppliers(token,q=''){ const s=load();const rows=s.suppliers.filter(x=>!q||x.name.toLowerCase().includes(q.toLowerCase())||x.service.toLowerCase().includes(q.toLowerCase()));return {suppliers:rows.map(clone),count:rows.length}; }
export async function apiCreateSupplier(token,body){ const s=load();if(!body.name?.trim())err(422,{detail:{error:'name_required'}});if(s.suppliers.some(x=>x.name.toLowerCase()===body.name.toLowerCase()))err(409,{detail:{error:'duplicate_name',name:body.name}});const p={id:crypto.randomUUID(),name:body.name,phone:body.phone||null,email:body.email||null,service:body.service||'',gstin:body.gstin||null,address:body.address||'',currency:body.currency||'INR',payment_terms_days:body.payment_terms_days||60,lead_time_days:body.lead_time_days||10,is_active:true,email_status:'unknown',supplier_type:body.supplier_type||null,state_code:body.gstin?.slice(0,2)||null,whatsapp_phone:body.whatsapp_phone||null,has_contact:!!(body.email||body.phone||body.whatsapp_phone)};s.suppliers.push(p);save(s);return clone(p); }

export async function apiGetProductionTracking(token){ const s=load();return {trackers:s.trackers.map(clone),count:s.trackers.length}; }
export async function apiTransitionTracking(token,id,status){ const s=load();const t=s.trackers.find(x=>x.id===id);if(!t)err(404,{detail:'Tracker not found.'});const valid=['awaiting_bom','bom_approved','inventory_checked','po_raised','po_confirmed','material_ready','released_to_production','in_production','completed'];if(!valid.includes(status))err(422,{error:'unknown_status',status});t.status=status;if(status==='released_to_production')t.released_at=now();save(s);return {id,status}; }
export async function apiGetNotifications(token){ const s=load();return {notifications:s.notifications.map(clone),count:s.notifications.length}; }
export async function apiOpenNotification(token,id){ const s=load();const n=s.notifications.find(x=>x.id===id);if(n)n.read=true;save(s);return n?clone(n):null; }
export async function apiChat(token,question,use_llm=false){ const q=question.toLowerCase(); if(q.includes('clermont')||q.includes('schedule')) return {answer:'CLERMONT is behind schedule. 60 ordered, 22 produced, 38 remaining with 9 working days to the deadline.',tool:'schedule_status',data:{style:'CLERMONT',ordered:60,produced:22,remaining:38,deadline:'2026-09-22',working_days_left:9,recent_daily_rate:2.1,required_daily_rate:4.2,on_track:false,shortfall_days:9}}; if(q.includes('bottleneck'))return {answer:'The bottleneck is PASTING. 41 pieces are queued against a throughput of 12/day.',tool:'bottleneck',data:{stage:'PASTING',queued:41,throughput_per_day:12,backlog_days:3.4,runner_up:{stage:'LINE_STITCHING',queued:14}}};return {answer:'I could not match that to a style or a known question. Try naming a style, or ask about the bottleneck.',tool:null,data:null}; }

export function resetMock(){ if(typeof window!=='undefined') localStorage.removeItem(key); }
export const MOCK_API_BASE_URL = V1;
export { IDS };
