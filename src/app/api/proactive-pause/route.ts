// src/app/api/proactive-pause/route.ts
//
// 总开关：暂停所有主动推送（APNs push + 本地通知 + 切 together mode 的爸爸反应）。
// 存储：nearby_config.key = 'proactive_pause'，value = { paused: boolean, updated_at: iso }
//
// GET  → { paused, updated_at }
// POST → { paused: boolean }

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data } = await supabase
      .from('nearby_config')
      .select('value, updated_at')
      .eq('key', 'proactive_pause')
      .maybeSingle();

    const paused = data?.value?.paused === true;
    return NextResponse.json({
      paused,
      updated_at: data?.updated_at || null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg, paused: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const paused = body?.paused === true;
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('nearby_config')
      .upsert(
        {
          key: 'proactive_pause',
          value: { paused, updated_at: now },
          updated_at: now,
        },
        { onConflict: 'key' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, paused, updated_at: now });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
