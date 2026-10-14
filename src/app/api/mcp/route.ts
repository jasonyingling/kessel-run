import { handleMcp } from '@/server/kessel-run/mcp/server';
export const runtime = 'nodejs';
export async function POST(request: Request) { return handleMcp(request); }
export const GET = POST;
export const DELETE = POST;
