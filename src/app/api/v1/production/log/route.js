import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[MOCK API] Received production log request:', body);

    // Mock validation
    if (!body.screen_context || !body.operation_stage) {
      return NextResponse.json({ detail: "Missing context or stage" }, { status: 422 });
    }

    if (!body.actor || !body.targets) {
      return NextResponse.json({ detail: "Missing actor or targets" }, { status: 422 });
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Return a mocked success response
    return NextResponse.json({
      message: "Successfully logged pieces",
      count_logged: body.targets.piece_barcodes?.length || 0,
      operation_stage: body.operation_stage,
      mock: true
    }, { status: 201 });
    
  } catch (err) {
    console.error('[MOCK API] Error:', err);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
