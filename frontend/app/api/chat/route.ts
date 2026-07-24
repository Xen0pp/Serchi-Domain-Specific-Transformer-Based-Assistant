import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const upstream = await fetch("http://localhost:8000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!upstream.ok) {
      return new NextResponse(
        JSON.stringify({ error: `Backend returned error ${upstream.status}` }),
        { status: upstream.status, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })
  } catch (err: any) {
    return new NextResponse(
      JSON.stringify({ error: "Backend offline. Make sure the Python server is running on port 8000." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    )
  }
}
