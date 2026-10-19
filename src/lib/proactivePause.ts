// src/lib/proactivePause.ts
//
// 主动推送总开关 — 前端 + 后端共用的 helper。
//
// 关键点：server 的 Supabase client 用 dynamic import 懒加载，避免
// 把 service-role 代码路径打进客户端 bundle。

const LS_KEY = 'v2-proactive-pause';

// ─── 后端 ────────────────────────────────────────────────────────────────

export async function serverIsProactivePaused(): Promise<boolean> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await supabase
      .from('nearby_config')
      .select('value')
      .eq('key', 'proactive_pause')
      .maybeSingle();
    return data?.value?.paused === true;
  } catch {
    // 查询失败 fail-open（不暂停）—— 避免 Supabase 短暂故障把所有 push 封死
    return false;
  }
}

// ─── 前端 ────────────────────────────────────────────────────────────────

export function clientGetPausedCached(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(LS_KEY) === '1';
  } catch {
    return false;
  }
}

export async function clientFetchPaused(): Promise<boolean> {
  try {
    const res = await fetch('/api/proactive-pause', { cache: 'no-store' });
    const json = await res.json();
    const paused = json?.paused === true;
    try {
      localStorage.setItem(LS_KEY, paused ? '1' : '0');
    } catch { /* ignore */ }
    return paused;
  } catch {
    return clientGetPausedCached();
  }
}

export async function clientSetPaused(paused: boolean): Promise<void> {
  try {
    await fetch('/api/proactive-pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused }),
    });
  } catch { /* ignore network — 下次 fetch 时会 reconcile */ }
  try {
    localStorage.setItem(LS_KEY, paused ? '1' : '0');
  } catch { /* ignore */ }
}

// ─── 本地通知控制 ──────────────────────────────────────────────────────────
//
// paused=true  → cancel 所有已排队的本地通知（睡觉提醒 / 吃药 / 领证 / 生日 / welcome ping）
// paused=false → 重新 schedule 爸爸常规提醒 + 吃药
export async function applyPauseToLocalNotifications(paused: boolean): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    const { LocalNotifications } = await import('@capacitor/local-notifications');

    if (paused) {
      try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications && pending.notifications.length > 0) {
          await LocalNotifications.cancel({
            notifications: pending.notifications.map((n) => ({ id: n.id })),
          });
        }
      } catch { /* ignore */ }
    } else {
      try {
        const { setupDadReminders, syncMedReminders } = await import('./notify');
        await setupDadReminders();
        await syncMedReminders();
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}
