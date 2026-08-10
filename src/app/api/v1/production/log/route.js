import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[MOCK API] Received production log request:', body);

    // Mock validation per official spec
    if (!body.screen_context && !body.operation_stage && !body.stage) {
      return NextResponse.json({ detail: "Missing context or stage" }, { status: 422 });
    }

    if (!body.actor || !body.targets) {
      return NextResponse.json({ detail: "Missing actor or targets" }, { status: 422 });
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const count = body.targets.piece_barcodes?.length || body.targets.piece_seqs?.length || 1;

    // Return a mocked success response matching official 201 spec
    return NextResponse.json({
      stage: body.operation_stage || body.stage || "LEATHER_CUTTING",
      count_logged: count,
      logged: body.targets.piece_barcodes || (body.targets.piece_seqs ? body.targets.piece_seqs.map(s => `JP-M-${s}`) : []),
      rework: [],
      not_found: [],
      sequence_blocked: [],
      merge_blocked: [],
      screen_role_warning: null,
      skill_blocked: [],
      consumption_recorded: body.consumption ? { lot_id: body.consumption.leather_lot_id || "lot-123", qty_total: 100, pieces_consuming: count } : null
    }, { status: 201 });
    
  } catch (err) {
    console.error('[MOCK API] Error:', err);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
