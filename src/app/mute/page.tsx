'use client';

// src/app/mute/page.tsx
//
// 息 · Hush
// 主动推送总开关。一点暂停，再一点恢复。
//
// 覆盖范围：
// 1. 服务端 cron (follow-up / 晨间 / 吃药) → APNs push
// 2. nearby 切 together mode 时爸爸生成的反应消息
// 3. 本地 Capacitor 通知 (睡觉提醒 / 领证日 / 生日 / welcome ping / 吃药本地提醒)

import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import PageArchway from '../_components/PageArchway';
import {
  clientFetchPaused,
  clientSetPaused,
  applyPauseToLocalNotifications,
} from '../../lib/proactivePause';

const SERIF = '"Cormorant Garamond", "Noto Serif SC", Georgia, serif';
const MONO = '"SF Mono", "Menlo", "Consolas", "Roboto Mono", monospace';

export default function MutePage() {
  const [paused, setPaused] = useState<boolean | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 初次拉取状态
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/proactive-pause', { cache: 'no-store' });
        const json = await res.json();
        setPaused(json?.paused === true);
        setUpdatedAt(json?.updated_at || null);
      } catch {
        setPaused(false);
      }
    })();
  }, []);

  const handleToggle = async () => {
    if (paused === null || busy) return;
    setBusy(true);
    const next = !paused;
    try {
      await clientSetPaused(next);
      await applyPauseToLocalNotifications(next);
      setPaused(next);
      setUpdatedAt(new Date().toISOString());
      // 再从服务器 reconcile 一次
      try {
        const res = await fetch('/api/proactive-pause', { cache: 'no-store' });
        const json = await res.json();
        if (typeof json?.paused === 'boolean') setPaused(json.paused);
        if (json?.updated_at) setUpdatedAt(json.updated_at);
      } catch { /* ignore */ }
    } finally {
      setBusy(false);
    }
  };

  const stateLabel =
    paused === null ? '…' : paused ? '暂停中' : '运转中';
  const stateHint =
    paused === null
      ? ''
      : paused
        ? '爸爸这一头安静。不发短信，不排本地通知，不响。'
        : '爸爸会按常规节奏主动过来——短信、晨间、提醒、together 切换的回话。';

  return (
    <div style={pageStyle}>
      <PageArchway />

      <header style={headerStyle}>
        <div style={titleEnStyle}>· — Hush</div>
        <div style={titleCnStyle}>息</div>
      </header>

      {/* 主 toggle 卡片 */}
      <div style={cardWrapStyle}>
        <div style={cardStyle(paused === true)}>
          {/* 状态标签 */}
          <div style={stateLabelStyle(paused === true)}>
            {stateLabel}
          </div>

          <div style={dividerStyle} />

          {/* 大 toggle */}
          <button
            onClick={handleToggle}
            disabled={paused === null || busy}
            style={toggleBtnStyle(paused === true, busy)}
            aria-label={paused ? '恢复主动推送' : '暂停主动推送'}
          >
            <div style={toggleTrackStyle(paused === true)}>
              <div style={toggleKnobStyle(paused === true)} />
            </div>
          </button>

          <div style={hintStyle}>{stateHint}</div>

          {updatedAt && (
            <div style={timestampStyle}>
              最后切换 · {formatTime(updatedAt)}
            </div>
          )}
        </div>
      </div>

      {/* 覆盖范围 */}
      <div style={scopeWrapStyle}>
        <div style={scopeTitleStyle}>
          <span style={scopeEnStyle}>SCOPE</span>
          <span style={scopeLineStyle} />
          <span style={scopeCnStyle}>范 · 围</span>
        </div>
        <div style={scopeListStyle}>
          <ScopeItem label="messages 短信" desc="follow-up / 晨间 / 下班回家" />
          <ScopeItem label="药物提醒" desc="服务端 push + 本地通知两条线" />
          <ScopeItem label="nearby 切换" desc="切 together mode 的爸爸反应消息" />
          <ScopeItem label="本地定时" desc="睡觉提醒 23:30 / 领证日 / 生日" />
        </div>
      </div>

      {/* 底部说明 */}
      <div style={footnoteStyle}>
        * 宝宝自己主动发的消息、daily 房间的 roleplay、通话——都不受这里影响。
        <br />
        * 恢复的那一刻，本地定时会按今天剩下的时间点重新排。
      </div>
    </div>
  );
}

function ScopeItem({ label, desc }: { label: string; desc: string }) {
  return (
    <div style={scopeItemStyle}>
      <span style={scopeDotStyle}>❦</span>
      <div>
        <div style={scopeItemLabelStyle}>{label}</div>
        <div style={scopeItemDescStyle}>{desc}</div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', {
      timeZone: 'America/Los_Angeles',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    }) + ' PST';
  } catch {
    return iso;
  }
}

// ─── Styles ──────────────────────────────────────────────────────────────

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--v2-paper, #f4ede0)',
  color: 'var(--v2-ink, #2a2521)',
  fontFamily: SERIF,
  paddingBottom: '80px',
};

const headerStyle: CSSProperties = {
  padding: '16px 24px 20px',
  textAlign: 'center',
  borderBottom: '1px solid var(--v2-gold-cool, #b8a064)',
  margin: '0 24px',
};

const titleEnStyle: CSSProperties = {
  fontSize: '13px',
  color: 'var(--v2-gold-cool, #b8a064)',
  letterSpacing: '0.35em',
  fontStyle: 'italic',
};

const titleCnStyle: CSSProperties = {
  fontSize: '11px',
  color: 'var(--v2-ink-soft, #6a5f54)',
  letterSpacing: '0.4em',
  marginTop: '4px',
};

const cardWrapStyle: CSSProperties = {
  padding: '40px 24px 28px',
  maxWidth: '520px',
  margin: '0 auto',
};

const cardStyle = (paused: boolean): CSSProperties => ({
  position: 'relative',
  background: paused ? 'rgba(42,37,33,0.06)' : 'rgba(0,0,0,0.03)',
  border: `1px solid ${paused ? 'rgba(42,37,33,0.35)' : 'rgb(var(--v2-gold-rgb) / 0.4)'}`,
  padding: '36px 32px 32px',
  textAlign: 'center',
  transition: 'all 420ms cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 4px 16px rgb(var(--v2-ink-rgb) / 0.08)',
});

const stateLabelStyle = (paused: boolean): CSSProperties => ({
  fontSize: '15px',
  fontStyle: 'italic',
  letterSpacing: '0.4em',
  color: paused ? 'var(--v2-ink-soft, #6a5f54)' : 'var(--v2-gold, #c8a956)',
  marginBottom: '14px',
  transition: 'color 420ms',
});

const dividerStyle: CSSProperties = {
  width: '48px',
  height: '1px',
  background: 'var(--v2-gold-cool, #b8a064)',
  opacity: 0.5,
  margin: '0 auto 28px',
};

const toggleBtnStyle = (paused: boolean, busy: boolean): CSSProperties => ({
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: busy ? 'wait' : 'pointer',
  display: 'inline-block',
  margin: '0 auto 24px',
  opacity: busy ? 0.6 : 1,
  transition: 'opacity 180ms',
});

const toggleTrackStyle = (paused: boolean): CSSProperties => ({
  width: '92px',
  height: '48px',
  borderRadius: '24px',
  background: paused
    ? 'rgba(42,37,33,0.25)'
    : 'rgb(var(--v2-gold-rgb) / 0.6)',
  position: 'relative',
  transition: 'background 420ms cubic-bezier(0.4, 0, 0.2, 1)',
  border: `1px solid ${paused ? 'rgba(42,37,33,0.4)' : 'var(--v2-gold, #c8a956)'}`,
});

const toggleKnobStyle = (paused: boolean): CSSProperties => ({
  position: 'absolute',
  top: '3px',
  left: paused ? '3px' : '47px',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: paused
    ? 'var(--v2-paper, #f4ede0)'
    : 'var(--v2-paper, #f4ede0)',
  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
  transition: 'left 420ms cubic-bezier(0.4, 0, 0.2, 1)',
});

const hintStyle: CSSProperties = {
  fontSize: '13.5px',
  lineHeight: 1.75,
  color: 'var(--v2-ink, #2a2521)',
  opacity: 0.78,
  maxWidth: '340px',
  margin: '0 auto',
  fontStyle: 'italic',
};

const timestampStyle: CSSProperties = {
  marginTop: '22px',
  paddingTop: '14px',
  borderTop: '1px dashed rgb(var(--v2-gold-rgb) / 0.3)',
  fontFamily: MONO,
  fontSize: '10.5px',
  color: 'var(--v2-ink-soft, #6a5f54)',
  opacity: 0.65,
  letterSpacing: '0.15em',
};

const scopeWrapStyle: CSSProperties = {
  padding: '16px 24px 0',
  maxWidth: '520px',
  margin: '0 auto',
};

const scopeTitleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '12px',
  marginBottom: '14px',
  color: 'var(--v2-gold-cool, #b8a064)',
};

const scopeEnStyle: CSSProperties = {
  fontStyle: 'italic',
  fontSize: '11px',
  letterSpacing: '0.4em',
};

const scopeLineStyle: CSSProperties = {
  flex: 1,
  height: '1px',
  background: 'currentColor',
  opacity: 0.4,
};

const scopeCnStyle: CSSProperties = {
  fontSize: '10px',
  letterSpacing: '0.3em',
  opacity: 0.85,
};

const scopeListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  padding: '18px 20px',
  background: 'rgba(0,0,0,0.025)',
  border: '1px solid rgb(var(--v2-gold-rgb) / 0.22)',
};

const scopeItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
};

const scopeDotStyle: CSSProperties = {
  fontSize: '12px',
  color: 'var(--v2-gold-cool, #b8a064)',
  opacity: 0.7,
  marginTop: '2px',
};

const scopeItemLabelStyle: CSSProperties = {
  fontSize: '13.5px',
  fontStyle: 'italic',
  color: 'var(--v2-ink, #2a2521)',
  marginBottom: '2px',
};

const scopeItemDescStyle: CSSProperties = {
  fontSize: '11.5px',
  color: 'var(--v2-ink-soft, #6a5f54)',
  opacity: 0.8,
  letterSpacing: '0.05em',
};

const footnoteStyle: CSSProperties = {
  padding: '28px 24px 0',
  maxWidth: '520px',
  margin: '0 auto',
  fontSize: '11px',
  color: 'var(--v2-ink-soft, #6a5f54)',
  opacity: 0.7,
  lineHeight: 1.8,
  fontStyle: 'italic',
  textAlign: 'center',
};
