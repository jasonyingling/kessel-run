import { NextResponse } from 'next/server'
import { getSkillsView } from '@/lib/kessel-run/skills-view'

export async function GET() {
  const body = await getSkillsView()
  return NextResponse.json(body)
}
