import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const native = () => Capacitor.isNativePlatform();

export async function ensureNotifyPermission(): Promise<boolean> {
  if (!native()) return false;
  try {
    let p = await LocalNotifications.checkPermissions();
    if (p.display === 'prompt' || p.display === 'prompt-with-rationale') {
      p = await LocalNotifications.requestPermissions();
    }
    return p.display === 'granted';
  } catch { return false; }
}

export async function pingNotify(title: string, body: string, afterSec = 6, url?: string) {
  if (!native()) return;
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: Math.floor(Date.now() % 100000),
        title, body,
        schedule: { at: new Date(Date.now() + afterSec * 1000) },
        ...(url ? { extra: { url } } : {}),
      }],
    });
  } catch { /* 忽略 */ }
}

export async function scheduleDaily(
  id: number, hour: number, minute: number, title: string, body: string, url?: string,
) {
  if (!native()) return;
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id, title, body,
        schedule: { on: { hour, minute }, allowWhileIdle: true },
        ...(url ? { extra: { url } } : {}),
      }],
    });
  } catch { /* 忽略 */ }
}


export async function scheduleYearly(
  id: number, month: number, day: number, hour: number, minute: number,
  title: string, body: string, url?: string,
) {
  if (!native()) return;
  try {
    await LocalNotifications.schedule({
      notifications: [{ id, title, body,
        schedule: { on: { month, day, hour, minute }, allowWhileIdle: true },
        ...(url ? { extra: { url } } : {}) }],
    });
  } catch { /* 忽略 */ }
}

export async function setupDadReminders() {
  if (!native()) return;
  try {
    await LocalNotifications.cancel({
      notifications: [9001, 9002, 9003].map((id) => ({ id })),
    });
  } catch { /* 忽略 */ }
  await scheduleDaily(9001, 23, 30, '该睡了宝宝', '爸爸守着，把眼睛闭上。', '/chat/messages');
  await scheduleYearly(9002, 4, 20, 9, 0, '今天领证日', '又一年了，爸爸的宝宝。', '/april20');
  await scheduleYearly(9003, 7, 1, 9, 0, '宝宝生日快乐', '今天全世界最重要的一天。', '/july1');
}


// 读 health 房所有在用的药 → 逐条排成本地通知（每次先清旧的重排）
// 由 Hush · 息 总开关 pause 时跳过（否则 pause 期间保存药物会反而排上）
export async function syncMedReminders() {
  if (!native()) return;
  try {
    if (typeof window !== 'undefined' &&
        window.localStorage?.getItem('v2-proactive-pause') === '1') {
      return;
    }
  } catch { /* ignore */ }
  type Med = { name: string; dose: string; reminder_times: string[];
    frequency: string; weekly_days: number[] | null; active: boolean };
  let meds: Med[] = [];
  try {
    const res = await fetch('/api/medications');
    const data = await res.json();
    meds = (data.medications || []) as Med[];
  } catch { return; }

  try {
    const prev = JSON.parse(localStorage.getItem('med_notif_ids') || '[]');
    if (Array.isArray(prev) && prev.length) {
      await LocalNotifications.cancel({ notifications: prev.map((id: number) => ({ id })) });
    }
  } catch { /* 忽略 */ }

  const list: {
    id: number; title: string; body: string;
    schedule: { on: Record<string, number>; allowWhileIdle: boolean };
    extra: { url: string };
  }[] = [];
  const usedIds: number[] = [];
  let seq = 20000;

  for (const med of meds) {
    if (!med.active || med.frequency === 'as_needed') continue;
    for (const t of med.reminder_times || []) {
      const [h, m] = t.split(':').map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) continue;
      const title = '吃药时间';
      const body = med.dose ? `${med.name} · ${med.dose}` : med.name;
      if (med.frequency === 'daily') {
        const id = seq++; usedIds.push(id);
        list.push({ id, title, body, schedule: { on: { hour: h, minute: m }, allowWhileIdle: true }, extra: { url: '/health' } });
      } else if (med.frequency === 'weekly' && Array.isArray(med.weekly_days)) {
        for (const jsDay of med.weekly_days) {
          const id = seq++; usedIds.push(id);
          list.push({ id, title, body, schedule: { on: { weekday: jsDay + 1, hour: h, minute: m }, allowWhileIdle: true }, extra: { url: '/health' } });
        }
      }
    }
  }

  if (list.length) {
    try { await LocalNotifications.schedule({ notifications: list }); } catch { /* 忽略 */ }
  }
  try { localStorage.setItem('med_notif_ids', JSON.stringify(usedIds)); } catch { /* 忽略 */ }
}
