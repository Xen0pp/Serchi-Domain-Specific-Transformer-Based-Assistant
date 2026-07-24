import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'
    const res = await fetch(`${BACKEND_URL}/api/status`, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ status: "offline" })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ status: "offline" })
  }
}
