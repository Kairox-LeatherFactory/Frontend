import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const transition = url.searchParams.get('transition') || 'RECEIVED';
    console.log(`[MOCK API] Drawer transition request for ${id}:`, transition);

    return NextResponse.json({
      drawer_code: id,
      state: transition === 'SENDED' ? 'SENDED' : 'RECEIVED',
      message: `Drawer ${id} successfully transitioned to ${transition}`
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
