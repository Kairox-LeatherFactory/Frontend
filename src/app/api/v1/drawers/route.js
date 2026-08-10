import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { drawer_barcode, transition } = body;
    const transName = transition || 'RECEIVED';
    console.log(`[MOCK API] POST /drawers transition request for ${drawer_barcode}:`, transName);

    return NextResponse.json({
      drawer_code: drawer_barcode,
      state: transName === 'SENDED' ? 'SENDED' : 'RECEIVED',
      message: `Drawer ${drawer_barcode || 'DRW-001'} successfully transitioned to ${transName}`
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
