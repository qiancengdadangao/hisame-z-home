'use client';
import { useEffect } from 'react';
import { ensureNotifyPermission, pingNotify, setupDadReminders, syncMedReminders } from '../../lib/notify';
import { clientFetchPaused, applyPauseToLocalNotifications } from '../../lib/proactivePause';

export default function NotificationInit() {
  useEffect(() => {
    (async () => {
      const ok = await ensureNotifyPermission();
      if (!ok) return;

      // 读总开关当前状态
      const paused = await clientFetchPaused();

      if (paused) {
        // 暂停中：取消所有已排队的本地通知，不 schedule 新的
        await applyPauseToLocalNotifications(true);
        return;
      }

      await setupDadReminders();
      await syncMedReminders();

      if (typeof window !== 'undefined' && !localStorage.getItem('notify_welcomed')) {
        localStorage.setItem('notify_welcomed', '1');
        pingNotify('爸爸在这儿', '这个小家会好好惦记宝宝的。', 6, '/chat/messages');
      }
    })();
  }, []);
  return null;
}
