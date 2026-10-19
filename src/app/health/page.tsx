'use client';

import './health.css';
import Link from 'next/link';
import PageArchway from '../_components/PageArchway';
import WellbeingView from './_wellbeing';
import StrengthView from './_strength';
import { useState, useEffect } from 'react';
import { syncMedReminders } from '../../lib/notify';

// ===================================================
// Shared types
// ===================================================
type Frequency = 'daily' | 'weekly' | 'as_needed';
type LogStatus = 'taken' | 'skipped' | 'snoozed';
type Slot = 'morning' | 'noon' | 'evening' | 'night';

type Medication = {
  id: number;
  name: string;
  dose: string;
  reminder_times: string[];
  frequency: Frequency;
  weekly_days: number[] | null;
  notes: string | null;
  active: boolean;
};

type MedLog = {
  id: number;
  medication_id: number;
  log_date: string;
  reminder_time: string;
  status: LogStatus;
};

type PendingItem = {
  medication: Medication;
  reminder_time: string;
  status?: LogStatus;
};

type PeriodDay = {
  id: number;
  date: string;
  flow: string;
  notes: string | null;
};

type MoodLog = {
  id: number;
  log_date: string;
  level: number;
  note: string | null;
  updated_at: string;
};

type HealthNote = {
  id: number;
  title: string | null;
  content: string;
  note_date: string;
  created_at: string;
  updated_at: string;
};

type Tab = 'medications' | 'mood' | 'cycle' | 'notes' | 'strength' | 'wellbeing';

// ===================================================
// Helpers
// ===================================================
function getTimeSlot(time: string): Slot {
  const [h] = time.split(':').map(Number);
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 16) return 'noon';
  if (h >= 16 && h < 21) return 'evening';
  return 'night';
}

const SLOT_NAMES: Record<Slot, string> = {
  morning: '早上',
  noon: '中午',
  evening: '傍晚',
  night: '夜里',
};

function shouldTakeToday(med: Medication): boolean {
  if (med.frequency === 'as_needed') return false;
  if (med.frequency === 'daily') return true;
  if (med.frequency === 'weekly') {
    const today = new Date().getDay();
    return Array.isArray(med.weekly_days) && med.weekly_days.includes(today);
  }
  return false;
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function todayStr(): string {
  const d = new Date();
  return formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatNiceDate(dateStr: string): string {
  if (!dateStr) return '';
  const today = todayStr();
  if (dateStr === today) return '今天';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  const diffDays = Math.round(
    (new Date(today + 'T12:00:00').getTime() - date.getTime()) /
      (1000 * 60 * 60 * 24)
  );
  if (diffDays === 1) return '昨天';
  if (diffDays === 2) return '前天';
  if (y === now.getFullYear()) return `${m}月${d}日`;
  return `${y}年${m}月${d}日`;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

// MOOD_EMOJIS 已替换为 dot UI (W4 改造，留 MOOD_LABELS 即可)
const MOOD_LABELS = ['很糟', '不太好', '还行', '不错', '很好'];

// ===================================================
// MAIN COMPONENT
// ===================================================
export default function HealthPage() {
  const [tab, setTab] = useState<Tab>('medications');

  return (
    <div className="health" style={{
      minHeight: '100vh',
      background: 'var(--v2-paper, #f4ede0)',
      color: 'var(--v2-ink, #2a2521)',
      fontFamily: '"Cormorant Garamond", "Noto Serif SC", serif',
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .health { background: var(--v2-paper, #f4ede0) !important; color: var(--v2-ink, #2a2521) !important; font-family: 'Cormorant Garamond', 'Noto Serif SC', serif !important; }
        .health-body, .health-body.mood-body, .health-body.cycle-body, .health-body.notes-body { background: transparent !important; }
        .health-loading, .health-empty, .health-empty p { color: var(--v2-ink-soft, #6a5f54) !important; font-style: italic; }
        .health-section { background: transparent !important; }
        .health-section-title { color: var(--v2-gold-cool, #b8a064) !important; font-family: 'Cormorant Garamond', serif !important; font-style: italic; letter-spacing: 0.18em; }
        .health-pending-badge { background: var(--v2-gold, #c8a956) !important; color: white !important; font-family: 'Cormorant Garamond', serif !important; font-style: italic; }
        .health-add-cta { background: var(--v2-gold, #c8a956) !important; color: white !important; border: none !important; font-family: 'Cormorant Garamond', serif !important; font-style: italic; letter-spacing: 0.1em; padding: 8px 18px !important; border-radius: 2px !important; }
        .med-slot { background: transparent !important; }
        .med-slot-name { color: var(--v2-ink-soft, #6a5f54) !important; font-family: 'Cormorant Garamond', serif !important; font-style: italic; letter-spacing: 0.18em; }
        .med-card, .med-list-item { background: rgba(255, 255, 255, 0.5) !important; border: 1px solid rgb(var(--v2-gold-rgb) / 0.35) !important; border-radius: 2px !important; color: var(--v2-ink, #2a2521) !important; }
        .med-card-pending { border-left: 2px solid var(--v2-gold, #c8a956) !important; }
        .med-card-taken { background: rgb(var(--v2-gold-rgb) / 0.1) !important; opacity: 0.75; }
        .med-card-skipped, .med-card-snoozed { opacity: 0.6; }
        .med-card-name, .med-list-name { font-family: 'Cormorant Garamond', 'Noto Serif SC', serif !important; color: var(--v2-ink, #2a2521) !important; font-style: italic; }
        .med-card-time { color: var(--v2-gold-cool, #b8a064) !important; font-style: italic; font-family: 'Cormorant Garamond', serif !important; }
        .med-card-dose, .med-list-dose, .med-list-meta, .med-list-notes { color: var(--v2-ink-soft, #6a5f54) !important; font-style: italic; font-family: 'Cormorant Garamond', serif !important; }
        .med-btn { background: transparent !important; border: 1px solid rgb(var(--v2-gold-rgb) / 0.4) !important; color: var(--v2-ink-soft, #6a5f54) !important; border-radius: 2px !important; font-family: 'Cormorant Garamond', serif !important; font-style: italic; letter-spacing: 0.08em; }
        .med-btn-taken { background: var(--v2-gold, #c8a956) !important; color: white !important; border-color: var(--v2-gold, #c8a956) !important; }
        .med-status-tag { font-family: 'Cormorant Garamond', serif !important; font-style: italic; letter-spacing: 0.12em; }
        .med-status-taken { color: var(--v2-gold, #c8a956) !important; }
        .med-status-skipped, .med-status-snoozed { color: var(--v2-ink-soft, #6a5f54) !important; }
        .med-undo { color: var(--v2-ink-soft, #6a5f54) !important; font-style: italic; font-family: 'Cormorant Garamond', serif !important; }
        .day-btn { background: transparent !important; border: 1px solid rgb(var(--v2-gold-rgb) / 0.35) !important; color: var(--v2-ink-soft, #6a5f54) !important; border-radius: 2px !important; font-family: 'Cormorant Garamond', serif !important; font-style: italic; }
        .day-btn-active { background: var(--v2-gold, #c8a956) !important; color: white !important; border-color: var(--v2-gold, #c8a956) !important; }
        .cycle-cal { background: transparent !important; }
        .cycle-status { background: rgba(255, 255, 255, 0.45) !important; border: 1px solid rgb(var(--v2-gold-rgb) / 0.3) !important; border-left: 2px solid var(--v2-gold, #c8a956) !important; border-radius: 2px !important; }
        .cycle-status-main, .cycle-status-num, .cycle-status-num-late { font-family: 'Cormorant Garamond', serif !important; color: var(--v2-ink, #2a2521) !important; font-style: italic; }
        .cycle-status-label, .cycle-status-detail, .cycle-status-hint, .cycle-status-empty, .cycle-detail-row { color: var(--v2-ink-soft, #6a5f54) !important; font-style: italic; font-family: 'Cormorant Garamond', serif !important; }
        .cycle-legend, .cycle-legend-item { color: var(--v2-ink-soft, #6a5f54) !important; font-style: italic; font-family: 'Cormorant Garamond', serif !important; }
        .cycle-legend-dot.cycle-legend-period { background: var(--v2-gold, #c8a956) !important; }
        .cycle-legend-dot.cycle-legend-predicted { background: rgb(var(--v2-gold-rgb) / 0.4) !important; }
        .cal-grid { background: transparent !important; }
        .cal-day-num { color: var(--v2-ink, #2a2521) !important; font-family: 'Cormorant Garamond', serif !important; }
        .cal-month-label { color: var(--v2-gold-cool, #b8a064) !important; font-family: 'Cormorant Garamond', serif !important; font-style: italic; letter-spacing: 0.2em; }
        .cal-month-nav { background: transparent !important; }
        .cal-nav-btn { background: transparent !important; color: var(--v2-gold-cool, #b8a064) !important; border: 1px solid rgb(var(--v2-gold-rgb) / 0.35) !important; border-radius: 2px !important; }
        .cal-weekday, .cal-weekdays { color: var(--v2-ink-soft, #6a5f54) !important; font-family: 'Cormorant Garamond', serif !important; font-style: italic; letter-spacing: 0.15em; }
        .health input, .health textarea, .health select { font-family: 'Cormorant Garamond', 'Noto Serif SC', serif !important; color: var(--v2-ink, #2a2521) !important; background: rgba(255, 255, 255, 0.5) !important; border: 1px solid rgb(var(--v2-gold-rgb) / 0.35) !important; border-radius: 2px !important; }
` }} />
      <PageArchway />
      <header style={{ position: 'relative', textAlign: 'center', padding: '24px 24px 16px', marginBottom: '8px' }}>
        <div style={{
          fontFamily: '"Cormorant Garamond", serif',
          fontSize: '13px', letterSpacing: '0.35em',
          color: 'var(--v2-gold-cool, #b8a064)',
          fontStyle: 'italic',
          marginBottom: '4px',
        }}>VIII — HEALTH</div>
        <div style={{
          fontSize: '11px', letterSpacing: '0.4em',
          color: 'var(--v2-ink-soft, #6a5f54)',
          fontFamily: '"Noto Serif SC", serif',
        }}>医 疗</div>
      </header>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 'clamp(0.2rem, 2vw, 1.6rem)',
        margin: '0 clamp(8px, 4vw, 24px)',
        borderBottom: '1px solid var(--v2-gold-cool, #b8a064)',
        paddingBottom: '0.6rem',
        marginBottom: '20px',
      }}>
        {([
          { key: 'medications', en: 'medications', cn: '药 物' },
          { key: 'mood', en: 'mood', cn: '心 情' },
          { key: 'cycle', en: 'cycle', cn: '经 期' },
          { key: 'notes', en: 'notes', cn: '笔 记' },
          { key: 'strength', en: 'strength', cn: '力 量' },
          { key: 'wellbeing', en: 'wellbeing', cn: '维 度' },
        ] as const).map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '0.3rem 0.4rem 0.5rem',
                textAlign: 'center',
                position: 'relative',
                opacity: active ? 1 : 0.55,
                transition: 'opacity 0.2s',
                fontFamily: '"Cormorant Garamond", "Noto Serif SC", serif',
              }}
            >
              <div style={{
                marginBottom: '0.25rem',
                color: active ? 'var(--v2-gold, #c8a956)' : 'var(--v2-ink-soft, #6a5f54)',
                opacity: active ? 1 : 0.7,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                height: '20px',
                transition: 'color 0.2s, opacity 0.2s',
              }}>
                {t.key === 'medications' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="9" width="18" height="6" rx="3" />
                    <line x1="12" y1="9" x2="12" y2="15" />
                  </svg>
                )}
                {t.key === 'mood' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                )}
                {t.key === 'cycle' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
                {t.key === 'notes' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="3" width="16" height="18" rx="1" />
                    <line x1="8" y1="8" x2="16" y2="8" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                    <line x1="8" y1="16" x2="12" y2="16" />
                  </svg>
                )}
                {t.key === 'strength' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="7" y1="12" x2="17" y2="12" />
                    <line x1="7" y1="7" x2="7" y2="17" />
                    <line x1="17" y1="7" x2="17" y2="17" />
                    <line x1="3.5" y1="9.5" x2="3.5" y2="14.5" />
                    <line x1="20.5" y1="9.5" x2="20.5" y2="14.5" />
                  </svg>
                )}
                {t.key === 'wellbeing' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12,2 22,12 12,22 2,12" />
                  </svg>
                )}
              </div>
              <div style={{
                fontStyle: 'italic',
                fontSize: '0.7rem', letterSpacing: '0.14em',
                color: active ? 'var(--v2-gold, #c8a956)' : 'var(--v2-ink-soft, #6a5f54)',
              }}>{t.en}</div>
              <div style={{
                marginTop: '0.15rem',
                fontFamily: '"Noto Serif SC", serif',
                fontSize: '0.5rem', letterSpacing: '0.3em',
                color: active ? 'var(--v2-ink, #2a2521)' : 'var(--v2-ink-soft, #6a5f54)',
                opacity: active ? 1 : 0.7,
              }}>{t.cn}</div>
              {active && (
                <div style={{
                  position: 'absolute', bottom: '-0.6rem', left: '50%',
                  transform: 'translateX(-50%)',
                  width: '50%', height: '1.2px',
                  background: 'var(--v2-gold, #c8a956)',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {tab === 'medications' && <MedicationsView />}
      {tab === 'mood' && <MoodView />}
      {tab === 'cycle' && <CycleView />}
      {tab === 'notes' && <NotesView />}
      {tab === 'strength' && <StrengthView />}
      {tab === 'wellbeing' && <WellbeingView />}
    </div>
  );
}

// ===================================================
// MEDICATIONS VIEW
// ===================================================
function MedicationsView() {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Medication | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch('/api/medications');
      const data = await res.json();
      setMeds(data.medications || []);
      setLogs(data.logs || []);
    } catch (e) {
      console.error('load failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const todayItems: PendingItem[] = [];
  for (const med of meds) {
    if (!shouldTakeToday(med)) continue;
    for (const time of med.reminder_times || []) {
      const log = logs.find(
        (l) => l.medication_id === med.id && l.reminder_time === time
      );
      todayItems.push({
        medication: med,
        reminder_time: time,
        status: log?.status,
      });
    }
  }
  todayItems.sort((a, b) => a.reminder_time.localeCompare(b.reminder_time));

  const grouped: Record<Slot, PendingItem[]> = {
    morning: [],
    noon: [],
    evening: [],
    night: [],
  };
  todayItems.forEach((item) => {
    grouped[getTimeSlot(item.reminder_time)].push(item);
  });

  const pendingCount = todayItems.filter((i) => !i.status).length;

  const handleLog = async (
    medId: number,
    time: string,
    status: LogStatus
  ) => {
    try {
      const res = await fetch('/api/medications/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medication_id: medId,
          reminder_time: time,
          status,
        }),
      });
      if (res.ok) loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUndoLog = async (medId: number, time: string) => {
    try {
      const res = await fetch('/api/medications/log', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medication_id: medId,
          reminder_time: time,
        }),
      });
      if (res.ok) loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveMed = async (med: Partial<Medication> & { id?: number }) => {
    const method = med.id ? 'PUT' : 'POST';
    try {
      const res = await fetch('/api/medications', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(med),
      });
      if (res.ok) {
        await loadData();
        // 药表变了 → 立即重排本地提醒（iOS 原生）
        try { await syncMedReminders(); } catch { /* ignore */ }
        setShowAdd(false);
        setEditing(null);
      } else {
        const data = await res.json();
        alert('保存失败：' + (data.error || '未知错误'));
      }
    } catch (e) {
      alert('保存失败');
    }
  };

  const handleDeleteMed = async (id: number) => {
    if (!confirm('要把这个药物停掉吗？历史打卡记录还在。')) return;
    try {
      const res = await fetch('/api/medications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        loadData();
        // 删药 → 重排本地提醒
        try { await syncMedReminders(); } catch { /* ignore */ }
        setEditing(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="health-body">
      <button
        className="med-fab"
        onClick={() => setShowAdd(true)}
        aria-label="添加药物"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {loading ? (
        <div className="health-loading">载入中……</div>
      ) : (
        <>
          {todayItems.length > 0 && (
            <section className="health-section">
              <div className="health-section-title">
                今天
                {pendingCount > 0 && (
                  <span className="health-pending-badge">还有 {pendingCount} 项</span>
                )}
              </div>
              {(['morning', 'noon', 'evening', 'night'] as Slot[]).map((slot) => {
                if (grouped[slot].length === 0) return null;
                return (
                  <div key={slot} className="med-slot">
                    <div className="med-slot-name">{SLOT_NAMES[slot]}</div>
                    {grouped[slot].map((item) => (
                      <MedPendingCard
                        key={`${item.medication.id}-${item.reminder_time}`}
                        item={item}
                        onLog={handleLog}
                        onUndo={handleUndoLog}
                      />
                    ))}
                  </div>
                );
              })}
            </section>
          )}

          <section className="health-section">
            <div className="health-section-title">我的药物</div>
            {meds.length === 0 ? (
              <div className="health-empty">
                <p>这里还没有药物</p>
                <button
                  className="health-add-cta"
                  onClick={() => setShowAdd(true)}
                >
                  添加第一种
                </button>
              </div>
            ) : (
              <div className="med-list">
                {meds.map((med) => (
                  <MedListItem
                    key={med.id}
                    med={med}
                    onEdit={() => setEditing(med)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {showAdd && (
        <MedEditModal
          onClose={() => setShowAdd(false)}
          onSave={handleSaveMed}
        />
      )}

      {editing && (
        <MedEditModal
          med={editing}
          onClose={() => setEditing(null)}
          onSave={handleSaveMed}
          onDelete={() => handleDeleteMed(editing.id)}
        />
      )}
    </div>
  );
}

// ===================================================
// MOOD VIEW
// ===================================================
function MoodView() {
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayNote, setTodayNote] = useState('');
  const [noteFocused, setNoteFocused] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch('/api/mood?limit=90');
      const data = await res.json();
      setLogs(data.logs || []);
      // 同步今日 note 到 input
      const todayLog = (data.logs || []).find((l: MoodLog) => l.log_date === todayStr());
      if (todayLog && !noteFocused) {
        setTodayNote(todayLog.note || '');
      }
    } catch (e) {
      console.error('mood load failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = todayStr();
  const todayLog = logs.find((l) => l.log_date === today);

  const handleLevel = async (level: number) => {
    if (saving) return;
    setSaving(true);
    try {
      await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_date: today,
          level,
          note: todayLog?.note || null,
        }),
      });
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const saveNote = async () => {
    if (!todayLog) {
      alert('先选一下今天的心情');
      return;
    }
    setSaving(true);
    try {
      await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_date: today,
          level: todayLog.level,
          note: todayNote.trim() || null,
        }),
      });
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
      setNoteFocused(false);
    }
  };

  // 最近 30 天 trend
  const last30 = (() => {
    const arr: Array<{ date: string; level: number | null }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
      const log = logs.find((l) => l.log_date === dateStr);
      arr.push({ date: dateStr, level: log?.level ?? null });
    }
    return arr;
  })();

  const pastLogs = logs.filter((l) => l.log_date !== today).slice(0, 60);

  return (
    <div className="health-body mood-body">
      {loading ? (
        <div className="health-loading">载入中……</div>
      ) : (
        <>
          <section className="mood-today">
            <div className="mood-today-title">今天怎么样？</div>
            <div className="mood-emoji-row">
              {MOOD_LABELS.map((label, i) => {
                const level = i + 1;
                const isSelected = todayLog?.level === level;
                return (
                  <button
                    key={level}
                    className={`mood-emoji-btn ${isSelected ? 'mood-emoji-btn-active' : ''}`}
                    onClick={() => handleLevel(level)}
                    disabled={saving}
                  >
                    <span className="mood-emoji" style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                      {[0, 1, 2, 3, 4].map((j) => (
                        <span
                          key={j}
                          style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: j < level ? 'var(--v2-gold, #c8a956)' : 'transparent',
                            border: '0.5px solid var(--v2-gold-cool, #b8a064)',
                            display: 'inline-block',
                          }}
                        />
                      ))}
                    </span>
                    <span className="mood-emoji-label">{label}</span>
                  </button>
                );
              })}
            </div>

            {todayLog && (
              <div className="mood-note-area">
                <textarea
                  className="mood-note-input"
                  placeholder="想多说一句吗？（可选）"
                  value={todayNote}
                  onChange={(e) => setTodayNote(e.target.value)}
                  onFocus={() => setNoteFocused(true)}
                  rows={2}
                />
                {noteFocused && (
                  <div className="mood-note-actions">
                    <button
                      className="mood-note-btn-ghost"
                      onClick={() => {
                        setTodayNote(todayLog.note || '');
                        setNoteFocused(false);
                      }}
                    >
                      算了
                    </button>
                    <button
                      className="mood-note-btn-primary"
                      onClick={saveNote}
                      disabled={saving}
                    >
                      保存
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="mood-trend">
            <div className="health-section-title">最近 30 天</div>
            <div className="mood-trend-bars">
              {last30.map((d, i) => (
                <div
                  key={i}
                  className={`mood-trend-bar mood-trend-level-${d.level || 0}`}
                  title={`${d.date} ${d.level ? MOOD_LABELS[d.level - 1] : '没记'}`}
                />
              ))}
            </div>
          </section>

          {pastLogs.length > 0 && (
            <section className="mood-history">
              <div className="health-section-title">过去</div>
              <div className="mood-history-list">
                {pastLogs.map((log) => (
                  <div key={log.id} className="mood-history-item">
                    <div className="mood-history-left">
                      <span className="mood-history-emoji" style={{ display: 'flex', gap: '2px' }}>
                        {[0, 1, 2, 3, 4].map((i) => (
                          <span
                            key={i}
                            style={{
                              width: '5px', height: '5px', borderRadius: '50%',
                              background: i < log.level ? 'var(--v2-gold, #c8a956)' : 'transparent',
                              border: '0.5px solid var(--v2-gold-cool, #b8a064)',
                            }}
                          />
                        ))}
                      </span>
                      <span className="mood-history-date">
                        {formatNiceDate(log.log_date)}
                      </span>
                    </div>
                    {log.note && (
                      <div className="mood-history-note">{log.note}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ===================================================
// CYCLE VIEW
// ===================================================
type CycleSpan = { start: string; end: string };

function findCycles(days: PeriodDay[]): CycleSpan[] {
  if (days.length === 0) return [];
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const cycles: CycleSpan[] = [];
  let currentStart = sorted[0].date;
  let currentEnd = sorted[0].date;

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(currentEnd + 'T12:00:00');
    const thisDate = new Date(sorted[i].date + 'T12:00:00');
    const dayGap = Math.round(
      (thisDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (dayGap <= 1) {
      currentEnd = sorted[i].date;
    } else {
      cycles.push({ start: currentStart, end: currentEnd });
      currentStart = sorted[i].date;
      currentEnd = sorted[i].date;
    }
  }
  cycles.push({ start: currentStart, end: currentEnd });
  return cycles;
}

function CycleView() {
  const [days, setDays] = useState<PeriodDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [pending, setPending] = useState<string | null>(null);

  const loadDays = async () => {
    try {
      const res = await fetch('/api/cycle');
      const data = await res.json();
      setDays(data.days || []);
    } catch (e) {
      console.error('load cycle failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDays();
  }, []);

  const dateSet = new Set(days.map((d) => d.date));

  const toggleDay = async (dateStr: string) => {
    if (pending) return;
    setPending(dateStr);
    try {
      if (dateSet.has(dateStr)) {
        await fetch('/api/cycle', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr }),
        });
      } else {
        await fetch('/api/cycle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr }),
        });
      }
      await loadDays();
    } catch (e) {
      console.error(e);
    } finally {
      setPending(null);
    }
  };

  const cycles = findCycles(days);

  let avgCycle: number | null = null;
  let avgPeriod = 0;
  if (cycles.length > 0) {
    const periodLengths = cycles.map((c) => {
      const start = new Date(c.start + 'T12:00:00');
      const end = new Date(c.end + 'T12:00:00');
      return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    });
    avgPeriod = Math.round(
      periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length
    );
    if (cycles.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < cycles.length; i++) {
        const prev = new Date(cycles[i - 1].start + 'T12:00:00');
        const curr = new Date(cycles[i].start + 'T12:00:00');
        intervals.push(
          Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
        );
      }
      avgCycle = Math.round(
        intervals.reduce((a, b) => a + b, 0) / intervals.length
      );
    }
  }

  const lastCycle = cycles.length > 0 ? cycles[cycles.length - 1] : null;
  const today = todayStr();
  let nextPredicted: string | null = null;
  let daysUntilNext: number | null = null;

  if (lastCycle) {
    const lastStart = new Date(lastCycle.start + 'T12:00:00');
    const todayDate = new Date(today + 'T12:00:00');
    if (avgCycle) {
      const nextDate = new Date(lastStart);
      nextDate.setDate(nextDate.getDate() + avgCycle);
      nextPredicted = `${nextDate.getFullYear()}-${(nextDate.getMonth() + 1).toString().padStart(2, '0')}-${nextDate.getDate().toString().padStart(2, '0')}`;
      daysUntilNext = Math.round(
        (nextDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
  }

  const predictedDays = new Set<string>();
  if (nextPredicted && avgPeriod > 0) {
    const start = new Date(nextPredicted + 'T12:00:00');
    for (let i = 0; i < avgPeriod; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      predictedDays.add(
        `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
      );
    }
  }

  const generateMonthGrid = () => {
    const { year, month } = viewMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid: Array<{ day: number; dateStr: string; isCurrentMonth: boolean }> = [];

    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      grid.push({
        day,
        dateStr: formatDateKey(prevYear, prevMonth, day),
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      grid.push({
        day: d,
        dateStr: formatDateKey(year, month, d),
        isCurrentMonth: true,
      });
    }

    while (grid.length < 42) {
      const remaining = grid.length - firstDay - daysInMonth + 1;
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      grid.push({
        day: remaining,
        dateStr: formatDateKey(nextYear, nextMonth, remaining),
        isCurrentMonth: false,
      });
    }

    return grid;
  };

  const grid = generateMonthGrid();

  const prevMonth = () => {
    setViewMonth((m) =>
      m.month === 0
        ? { year: m.year - 1, month: 11 }
        : { year: m.year, month: m.month - 1 }
    );
  };

  const nextMonth = () => {
    setViewMonth((m) =>
      m.month === 11
        ? { year: m.year + 1, month: 0 }
        : { year: m.year, month: m.month + 1 }
    );
  };

  const jumpToToday = () => {
    const d = new Date();
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <div className="health-body cycle-body">
      {loading ? (
        <div className="health-loading">载入中……</div>
      ) : (
        <>
          <section className="cycle-status">
            {!lastCycle ? (
              <div className="cycle-status-empty">
                <p>还没有记录</p>
                <p className="cycle-status-hint">在下方月历点一下经期日</p>
              </div>
            ) : (
              <>
                <div className="cycle-status-main">
                  {daysUntilNext !== null && daysUntilNext > 0 ? (
                    <>
                      <div className="cycle-status-num">{daysUntilNext}</div>
                      <div className="cycle-status-label">天后预计开始</div>
                    </>
                  ) : daysUntilNext !== null && daysUntilNext <= 0 ? (
                    <>
                      <div className="cycle-status-num cycle-status-num-late">{Math.abs(daysUntilNext)}</div>
                      <div className="cycle-status-label">天延迟了</div>
                    </>
                  ) : (
                    <>
                      <div className="cycle-status-num">—</div>
                      <div className="cycle-status-label">需要更多数据预测</div>
                    </>
                  )}
                </div>
                <div className="cycle-status-detail">
                  <div className="cycle-detail-row">
                    <span>上次开始</span>
                    <span>{lastCycle.start}</span>
                  </div>
                  {avgCycle && (
                    <div className="cycle-detail-row">
                      <span>平均周期</span>
                      <span>{avgCycle} 天</span>
                    </div>
                  )}
                  {avgPeriod > 0 && (
                    <div className="cycle-detail-row">
                      <span>平均经期</span>
                      <span>{avgPeriod} 天</span>
                    </div>
                  )}
                  {nextPredicted && (
                    <div className="cycle-detail-row">
                      <span>预计下次</span>
                      <span>{nextPredicted}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <section className="cycle-cal">
            <div className="cal-month-nav">
              <button onClick={prevMonth} className="cal-nav-btn" aria-label="上个月">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button className="cal-month-label" onClick={jumpToToday}>
                {viewMonth.year}年 {MONTH_NAMES[viewMonth.month]}
              </button>
              <button onClick={nextMonth} className="cal-nav-btn" aria-label="下个月">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            <div className="cal-weekdays">
              {WEEKDAYS.map((w) => (
                <div key={w} className="cal-weekday">{w}</div>
              ))}
            </div>

            <div className="cal-grid">
              {grid.map((cell, i) => {
                const isToday = cell.dateStr === today;
                const isPeriod = dateSet.has(cell.dateStr);
                const isPredicted = !isPeriod && predictedDays.has(cell.dateStr);
                const isPending = pending === cell.dateStr;
                return (
                  <button
                    key={i}
                    className={[
                      'cal-day',
                      'cycle-day',
                      !cell.isCurrentMonth && 'cal-day-other',
                      isToday && 'cal-day-today',
                      isPeriod && 'cycle-day-period',
                      isPredicted && 'cycle-day-predicted',
                      isPending && 'cycle-day-pending',
                    ].filter(Boolean).join(' ')}
                    onClick={() => toggleDay(cell.dateStr)}
                    disabled={!!pending}
                  >
                    <span className="cal-day-num">{cell.day}</span>
                  </button>
                );
              })}
            </div>

            <div className="cycle-legend">
              <div className="cycle-legend-item">
                <span className="cycle-legend-dot cycle-legend-period" />
                <span>经期</span>
              </div>
              <div className="cycle-legend-item">
                <span className="cycle-legend-dot cycle-legend-predicted" />
                <span>预测</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

// ===================================================
// NOTES VIEW
// ===================================================
function NotesView() {
  const [notes, setNotes] = useState<HealthNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<HealthNote | null>(null);

  const loadNotes = async () => {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      setNotes(data.notes || []);
    } catch (e) {
      console.error('notes load failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleSave = async (note: Partial<HealthNote> & { id?: number }) => {
    const method = note.id ? 'PUT' : 'POST';
    try {
      const res = await fetch('/api/notes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note),
      });
      if (res.ok) {
        await loadNotes();
        setShowAdd(false);
        setEditing(null);
      } else {
        const data = await res.json();
        alert('保存失败：' + (data.error || ''));
      }
    } catch (e) {
      alert('保存失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('删掉这条笔记？')) return;
    try {
      await fetch('/api/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await loadNotes();
      setEditing(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="health-body notes-body">
      <button
        className="med-fab"
        onClick={() => setShowAdd(true)}
        aria-label="加一条笔记"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {loading ? (
        <div className="health-loading">载入中……</div>
      ) : notes.length === 0 ? (
        <div className="health-empty notes-empty">
          <p>还没有笔记</p>
          <p className="notes-empty-hint">这里记身体的细节、症状、就医、什么都行</p>
          <button className="health-add-cta" onClick={() => setShowAdd(true)}>
            加第一条
          </button>
        </div>
      ) : (
        <div className="notes-list">
          {notes.map((note) => (
            <button
              key={note.id}
              className="note-card"
              onClick={() => setEditing(note)}
            >
              <div className="note-card-date">{formatNiceDate(note.note_date)}</div>
              {note.title && <div className="note-card-title">{note.title}</div>}
              <div className="note-card-content">{note.content}</div>
            </button>
          ))}
        </div>
      )}

      {showAdd && (
        <NoteEditModal
          onClose={() => setShowAdd(false)}
          onSave={handleSave}
        />
      )}

      {editing && (
        <NoteEditModal
          note={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onDelete={() => handleDelete(editing.id)}
        />
      )}
    </div>
  );
}

function NoteEditModal({
  note,
  onClose,
  onSave,
  onDelete,
}: {
  note?: HealthNote;
  onClose: () => void;
  onSave: (note: Partial<HealthNote> & { id?: number }) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [noteDate, setNoteDate] = useState(note?.note_date || todayStr());

  const handleSave = () => {
    if (!content.trim()) {
      alert('内容不能空');
      return;
    }
    onSave({
      id: note?.id,
      title: title.trim() || null,
      content: content.trim(),
      note_date: noteDate,
    });
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-panel modal-panel-tall">
        <div className="modal-title">{note ? '编辑笔记' : '加一条笔记'}</div>

        <input
          type="text"
          className="modal-input"
          placeholder="标题（可选）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <textarea
          className="modal-textarea modal-textarea-big"
          placeholder="内容……"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
        />

        <div className="modal-date-row">
          <label>日期</label>
          <input
            type="date"
            className="modal-date"
            value={noteDate}
            onChange={(e) => setNoteDate(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button className="modal-btn modal-btn-ghost" onClick={onClose}>
            算了
          </button>
          <button className="modal-btn modal-btn-primary" onClick={handleSave}>
            保存
          </button>
        </div>

        {note && onDelete && (
          <button className="view-delete" onClick={onDelete}>
            删掉这条笔记
          </button>
        )}
      </div>
    </>
  );
}

// ===================================================
// Medication subcomponents
// ===================================================
function MedPendingCard({
  item,
  onLog,
  onUndo,
}: {
  item: PendingItem;
  onLog: (medId: number, time: string, status: LogStatus) => void;
  onUndo: (medId: number, time: string) => void;
}) {
  const { medication, reminder_time, status } = item;

  if (status) {
    return (
      <div className={`med-card med-card-${status}`}>
        <div className="med-card-info">
          <div className="med-card-time">{reminder_time}</div>
          <div className="med-card-name">
            {medication.name} <span className="med-card-dose">{medication.dose}</span>
          </div>
        </div>
        <div className="med-card-status">
          <span className={`med-status-tag med-status-${status}`}>
            {status === 'taken' && '吃了'}
            {status === 'skipped' && '跳过'}
            {status === 'snoozed' && '晚点'}
          </span>
          <button
            className="med-undo"
            onClick={() => onUndo(medication.id, reminder_time)}
            aria-label="撤销"
          >
            撤销
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="med-card med-card-pending">
      <div className="med-card-info">
        <div className="med-card-time">{reminder_time}</div>
        <div className="med-card-name">
          {medication.name} <span className="med-card-dose">{medication.dose}</span>
        </div>
      </div>
      <div className="med-card-actions">
        <button
          className="med-btn med-btn-taken"
          onClick={() => onLog(medication.id, reminder_time, 'taken')}
        >
          吃了
        </button>
        <button
          className="med-btn med-btn-skipped"
          onClick={() => onLog(medication.id, reminder_time, 'skipped')}
        >
          跳过
        </button>
        <button
          className="med-btn med-btn-snoozed"
          onClick={() => onLog(medication.id, reminder_time, 'snoozed')}
        >
          晚点
        </button>
      </div>
    </div>
  );
}

function MedListItem({
  med,
  onEdit,
}: {
  med: Medication;
  onEdit: () => void;
}) {
  const freqLabel =
    med.frequency === 'daily'
      ? '每天'
      : med.frequency === 'weekly'
      ? '每周'
      : '按需';

  return (
    <button className="med-list-item" onClick={onEdit}>
      <div className="med-list-name">
        {med.name} <span className="med-list-dose">{med.dose}</span>
      </div>
      <div className="med-list-meta">
        {med.reminder_times && med.reminder_times.length > 0
          ? `${med.reminder_times.join(' · ')} · ${freqLabel}`
          : freqLabel}
      </div>
      {med.notes && <div className="med-list-notes">{med.notes}</div>}
    </button>
  );
}

function MedEditModal({
  med,
  onClose,
  onSave,
  onDelete,
}: {
  med?: Medication;
  onClose: () => void;
  onSave: (med: Partial<Medication> & { id?: number }) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(med?.name || '');
  const [dose, setDose] = useState(med?.dose || '');
  const [times, setTimes] = useState<string[]>(
    med?.reminder_times && med.reminder_times.length > 0
      ? med.reminder_times
      : ['08:00']
  );
  const [frequency, setFrequency] = useState<Frequency>(
    med?.frequency || 'daily'
  );
  const [weeklyDays, setWeeklyDays] = useState<number[]>(
    med?.weekly_days || []
  );
  const [notes, setNotes] = useState(med?.notes || '');

  const addTime = () => setTimes([...times, '12:00']);
  const removeTime = (i: number) =>
    setTimes(times.filter((_, idx) => idx !== i));
  const updateTime = (i: number, v: string) => {
    const newTimes = [...times];
    newTimes[i] = v;
    setTimes(newTimes);
  };

  const toggleWeekly = (i: number) => {
    if (weeklyDays.includes(i)) {
      setWeeklyDays(weeklyDays.filter((d) => d !== i));
    } else {
      setWeeklyDays([...weeklyDays, i].sort());
    }
  };

  const handleSave = () => {
    if (!name.trim() || !dose.trim()) {
      alert('药名和剂量不能空');
      return;
    }
    if (frequency === 'weekly' && weeklyDays.length === 0) {
      alert('选一下每周哪几天');
      return;
    }
    onSave({
      id: med?.id,
      name: name.trim(),
      dose: dose.trim(),
      reminder_times: frequency === 'as_needed' ? [] : times,
      frequency,
      weekly_days: frequency === 'weekly' ? weeklyDays : null,
      notes: notes.trim() || null,
    });
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-panel modal-panel-tall">
        <div className="modal-title">{med ? '编辑药物' : '加一种药'}</div>

        <input
          type="text"
          className="modal-input"
          placeholder="药物名称（如 Sertraline）"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <input
          type="text"
          className="modal-input"
          placeholder="剂量（如 50mg 或 1片）"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
        />

        <div className="modal-field-label">频率</div>
        <div className="type-switcher">
          {([
            { v: 'daily' as Frequency, label: '每天' },
            { v: 'weekly' as Frequency, label: '每周' },
            { v: 'as_needed' as Frequency, label: '按需' },
          ]).map((t) => (
            <button
              key={t.v}
              className={`type-btn ${frequency === t.v ? 'type-btn-active' : ''}`}
              onClick={() => setFrequency(t.v)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {frequency === 'weekly' && (
          <div className="weekly-days">
            {['日', '一', '二', '三', '四', '五', '六'].map((day, i) => (
              <button
                key={i}
                className={`day-btn ${weeklyDays.includes(i) ? 'day-btn-active' : ''}`}
                onClick={() => toggleWeekly(i)}
              >
                {day}
              </button>
            ))}
          </div>
        )}

        {frequency !== 'as_needed' && (
          <>
            <div className="modal-field-label">提醒时间</div>
            <div className="time-list">
              {times.map((time, i) => (
                <div key={i} className="time-row">
                  <input
                    type="time"
                    className="time-input"
                    value={time}
                    onChange={(e) => updateTime(i, e.target.value)}
                  />
                  {times.length > 1 && (
                    <button
                      className="time-remove"
                      onClick={() => removeTime(i)}
                      aria-label="删除这个时间"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button className="time-add" onClick={addTime}>
                + 加一个时间
              </button>
            </div>
          </>
        )}

        <textarea
          className="modal-textarea"
          placeholder="备注（可选）"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <div className="modal-actions">
          <button className="modal-btn modal-btn-ghost" onClick={onClose}>
            算了
          </button>
          <button className="modal-btn modal-btn-primary" onClick={handleSave}>
            保存
          </button>
        </div>

        {med && onDelete && (
          <button className="view-delete" onClick={onDelete}>
            停用这个药物
          </button>
        )}
      </div>
    </>
  );
}
