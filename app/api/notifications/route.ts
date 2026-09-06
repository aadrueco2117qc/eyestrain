import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/notifications — fetch admin-sent notifications for the current user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ notifications: [] });

  let adminClient;
  try { adminClient = createAdminClient(); } catch {
    return NextResponse.json({ notifications: [] });
  }

  const { data, error } = await adminClient
    .from('admin_notifications')
    .select('id, content, severity, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ notifications: [] });
  return NextResponse.json({ notifications: data ?? [] });
}
