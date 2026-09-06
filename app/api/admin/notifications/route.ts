import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdmin } from '@/lib/admin-guard';

// GET /api/admin/notifications?userId=xxx — fetch notifications sent to a user
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let adminClient;
  try { adminClient = createAdminClient(); } catch {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const userId = new URL(request.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

  const { data, error } = await adminClient
    .from('admin_notifications')
    .select('id, content, severity, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notifications: data ?? [] });
}

// POST /api/admin/notifications — send a push notification to a user
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let adminClient;
  try { adminClient = createAdminClient(); } catch {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { userId, content, severity = 'info' } = await request.json();
  if (!userId || !content?.trim()) {
    return NextResponse.json({ error: 'userId and content are required' }, { status: 400 });
  }
  if (!['info', 'high', 'critical'].includes(severity)) {
    return NextResponse.json({ error: 'severity must be info, high, or critical' }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from('admin_notifications')
    .insert({ user_id: userId, content: content.trim(), severity, read: false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notification: data });
}
