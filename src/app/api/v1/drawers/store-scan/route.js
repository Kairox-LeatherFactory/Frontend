import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[MOCK API] Store drawer scan request:', body);

    const { drawer_barcode, piece_barcode, part } = body;

    if (!drawer_barcode || !piece_barcode) {
      return NextResponse.json({ detail: "Missing drawer_barcode or piece_barcode" }, { status: 400 });
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Return official spec response
    return NextResponse.json({
      drawer_code: drawer_barcode,
      piece_code: piece_barcode,
      state: part === 'LINING' ? 'holding_both' : 'holding_leather',
      needs_lining: part !== 'LINING',
      awaiting: part === 'LINING' ? [] : ['LINING'],
      ready_for_received: true
    }, { status: 200 });

  } catch (err) {
    console.error('[MOCK API] Store drawer scan error:', err);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
