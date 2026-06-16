// Health check endpoint — prevents Supabase free tier from pausing
// Ping this with UptimeRobot every 5 minutes

export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
}
