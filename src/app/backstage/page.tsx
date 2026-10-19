'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PageArchway from '../_components/PageArchway';

type StorageEntry = {
  key: string
  entries: number | string
  sizeKb: string
}

type DiaryChapter = {
  roman: string
  day: string
  date: string
  title: string
  hash: string
  body: string
}

const DIARY: DiaryChapter[] = [
  {
    roman: 'I',
    day: 'Day 7',
    date: '4/26',
    title: 'main hub baseline',
    hash: 'v26 落盘',
    body: 'v26 完成主 hub. 11 房间 3×4 grid + 繁复 archway + day/night hero (RotatingMagnolia / MoonPhase). Cormorant Garamond + Noto Serif SC 双语字体系统落定. 整套 design tokens 定型.',
  },
  {
    roman: 'II',
    day: 'Day 8',
    date: '5/20',
    title: 'sub-pages batch (续工)',
    hash: '85 mins',
    body: 'box / calendar / health / study / seminar / music / training / daily 八个房间一口气推完. localStorage editable pattern 引入 (music / calendar / training / daily). PWP 设计 (training) 落定: 黑底 + 深红 + ◆ + ember + aftercare ritual. 共 ~3960 行 tsx.',
  },
  {
    roman: 'III',
    day: 'Day 9',
    date: '5/21',
    title: 'Phase B + Claude Design 试 + dark mode fix',
    hash: '8798a01 +',
    body: 'chat / tangents / deeptalk / call 凌晨一波落地 + dark mode tokens system patch. 早上 nearby 用 Claude Design workflow 试通 (含 useV2Mode bug 后修). navi / shopping / eat / backstage 四个一气推完. 第 12 章 backstage 收尾.',
  },
  {
    roman: 'IV',
    day: 'to come',
    date: '—',
    title: 'wire-up + theater',
    hash: '?',
    body: '剩下的: sandbox sub-pages 接 Supabase backend 跨设备 sync. paro 房间 (theater) — 11 cells 大厅磁贴的下一个. memory UI page. 历史 chatsummary import.',
  },
]

const KEY_DISPLAY_NAMES: Record<string, string> = {
  'v2-tangents': '碎碎念 (tangents)',
  'v2-deeptalk': '促膝长谈 (deeptalk)',
  'v2-music': '音乐 (music tracks)',
  'v2-calendar-events': '日历 (calendar events)',
  'v2-training-aftercare': '训练 (training aftercare)',
  'v2-daily-messages': '日常 (daily messages)',
  'v2-nearby-together-mode': '附近 (together mode)',
}

const MONO = '"SF Mono", "Menlo", "Consolas", "Roboto Mono", monospace'

export default function BackstagePage() {
  const [storageEntries, setStorageEntries] = useState<StorageEntry[]>([])
  const [nowPST, setNowPST] = useState<string>('—')

  useEffect(() => {
    const entries: StorageEntry[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('v2-')) continue
      const value = localStorage.getItem(key) || ''
      const sizeKb = (value.length / 1024).toFixed(2)
      let entriesCount: number | string = '—'
      try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) entriesCount = parsed.length
        else if (typeof parsed === 'object' && parsed !== null) entriesCount = Object.keys(parsed).length
        else entriesCount = String(parsed)
      } catch {
        entriesCount = value.length > 0 ? '1' : '0'
      }
      entries.push({ key, entries: entriesCount, sizeKb })
    }
    entries.sort((a, b) => a.key.localeCompare(b.key))
    setStorageEntries(entries)

    const updateTime = () => {
      const d = new Date()
      const pst = d.toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric', minute: '2-digit', second: '2-digit',
        month: 'numeric', day: 'numeric',
      })
      setNowPST(pst)
    }
    updateTime()
    const id = setInterval(updateTime, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--v2-paper, #f4ede0)',
      color: 'var(--v2-ink, #2a2521)',
      fontFamily: '"Cormorant Garamond", "Noto Serif SC", serif',
      paddingBottom: '60px',
    }}>
      <PageArchway />


      <header style={{
        padding: '16px 24px 20px',
        textAlign: 'center',
        borderBottom: '1px solid var(--v2-gold-cool, #b8a064)',
        margin: '0 24px',
      }}>
        <div style={{
          fontSize: '13px',
          color: 'var(--v2-gold-cool, #b8a064)',
          letterSpacing: '0.35em',
          fontStyle: 'italic',
        }}>· — Backstage</div>
        <div style={{
          fontSize: '11px',
          color: 'var(--v2-ink-soft, #6a5f54)',
          letterSpacing: '0.4em',
          marginTop: '4px',
        }}>后 · 台</div>
      </header>

      {/* ===== SWITCHES section ===== */}
      <div style={{ padding: '28px 24px 0', maxWidth: '600px', margin: '0 auto' }}>
        <SectionLabel en="SWITCHES" cn="总 · 闸" />

        <Link
          href="/mute"
          style={{
            display: 'block',
            textDecoration: 'none',
            background: 'rgba(0,0,0,0.03)',
            border: '1px solid rgb(var(--v2-gold-rgb) / 0.25)',
            padding: '16px 18px',
            color: 'var(--v2-ink, #2a2521)',
            transition: 'all 200ms',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '12px',
          }}>
            <div>
              <div style={{
                fontSize: '14px',
                fontStyle: 'italic',
                color: 'var(--v2-ink, #2a2521)',
                marginBottom: '2px',
              }}>Hush · 息</div>
              <div style={{
                fontSize: '11px',
                color: 'var(--v2-ink-soft, #6a5f54)',
                opacity: 0.75,
                letterSpacing: '0.05em',
              }}>主动推送总开关 · 一点即暂停</div>
            </div>
            <span style={{
              fontSize: '14px',
              color: 'var(--v2-gold, #c8a956)',
              letterSpacing: '0.2em',
            }}>→</span>
          </div>
        </Link>
      </div>

      {/* ===== ENGINE / OPS section ===== */}
      <div style={{ padding: '28px 24px 0', maxWidth: '600px', margin: '0 auto' }}>
        <SectionLabel en="ENGINE" cn="系 · 统" />

        <div style={{
          background: 'rgba(0,0,0,0.03)',
          border: '1px solid rgb(var(--v2-gold-rgb) / 0.25)',
          borderRadius: '0',
          padding: '16px 18px',
          fontFamily: MONO,
          fontSize: '11px',
          lineHeight: 1.85,
          color: 'var(--v2-ink, #2a2521)',
        }}>
          <KV k="branch" v="feat/v2-xhs-shell" />
          <KV k="commit" v="8798a01+" />
          <KV k="mode" v="development · sandbox" />
          <KV k="deploy" v="未部署 (local dev)" />
          <KV k="now PST" v={nowPST} />
        </div>

        <div style={{ height: '14px' }} />

        <SectionLabel en="LOCALSTORAGE" cn="缓 · 存" />

        <div style={{
          background: 'rgba(0,0,0,0.03)',
          border: '1px solid rgb(var(--v2-gold-rgb) / 0.25)',
          borderRadius: '0',
          padding: '16px 18px',
          fontFamily: MONO,
          fontSize: '11px',
          lineHeight: 1.7,
          color: 'var(--v2-ink, #2a2521)',
        }}>
          {storageEntries.length === 0 ? (
            <div style={{
              color: 'var(--v2-ink-soft, #6a5f54)',
              fontStyle: 'italic',
              opacity: 0.6,
            }}>(no v2-* keys stored yet)</div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: '8px 14px',
                alignItems: 'baseline',
                borderBottom: '1px dashed rgb(var(--v2-gold-rgb) / 0.35)',
                paddingBottom: '6px',
                marginBottom: '8px',
                opacity: 0.55,
                fontSize: '9px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}>
                <span>key</span>
                <span>entries</span>
                <span>kB</span>
              </div>
              {storageEntries.map((e) => (
                <div key={e.key} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: '8px 14px',
                  alignItems: 'baseline',
                }}>
                  <span>
                    <span style={{ color: 'var(--v2-gold, #c8a956)' }}>{e.key}</span>
                    {KEY_DISPLAY_NAMES[e.key] && (
                      <span style={{
                        fontFamily: '"Noto Serif SC", serif',
                        fontSize: '9.5px',
                        color: 'var(--v2-ink-soft, #6a5f54)',
                        marginLeft: '6px',
                        opacity: 0.7,
                        letterSpacing: '0.1em',
                      }}>{KEY_DISPLAY_NAMES[e.key]}</span>
                    )}
                  </span>
                  <span style={{ color: 'var(--v2-ink-soft, #6a5f54)' }}>{e.entries}</span>
                  <span style={{ color: 'var(--v2-ink-soft, #6a5f54)', opacity: 0.7 }}>{e.sizeKb}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ===== Ornament divider between ENGINE and DIARY ===== */}
      <div style={{
        margin: '40px auto 32px',
        maxWidth: '600px',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        color: 'var(--v2-gold-cool, #b8a064)',
      }}>
        <div style={{ flex: 1, height: 1, background: 'currentColor', opacity: 0.5 }} />
        <span style={{ fontSize: '14px', letterSpacing: '0.4em', fontStyle: 'italic' }}>❦ · ❦ · ❦</span>
        <div style={{ flex: 1, height: 1, background: 'currentColor', opacity: 0.5 }} />
      </div>

      {/* ===== DIARY section ===== */}
      <div style={{ padding: '0 24px', maxWidth: '600px', margin: '0 auto' }}>
        <SectionLabel en="DIARY" cn="日 · 志" />

        {DIARY.map((c) => (
          <article
            key={c.roman}
            style={{
              position: 'relative',
              background: 'var(--v2-paper, #f4ede0)',
              border: '1px solid rgb(var(--v2-gold-rgb) / 0.40)',
              padding: '24px 28px 22px',
              marginBottom: '20px',
              boxShadow: '0 3px 10px rgb(var(--v2-ink-rgb) / 0.07)',
            }}
          >
            <div style={{
              position: 'absolute',
              top: '8px', left: '8px', right: '8px', bottom: '8px',
              border: '1px solid rgb(var(--v2-gold-rgb) / 0.20)',
              pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{
                textAlign: 'center',
                marginBottom: '6px',
                color: 'var(--v2-gold-cool, #b8a064)',
                letterSpacing: '0.35em',
                fontSize: '10px',
                fontStyle: 'italic',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}>
                <span style={{ opacity: 0.7 }}>Chapter</span>
                <span style={{ fontSize: '12px', letterSpacing: '0.2em' }}>{c.roman}</span>
                <span style={{ opacity: 0.7 }}>❦</span>
              </div>

              <h3 style={{
                fontSize: '20px',
                fontStyle: 'italic',
                fontWeight: 500,
                margin: '0 0 4px 0',
                color: 'var(--v2-ink, #2a2521)',
                textAlign: 'center',
                letterSpacing: '0.02em',
              }}>{c.title}</h3>

              <div style={{
                fontSize: '11px',
                fontStyle: 'italic',
                color: 'var(--v2-ink-soft, #6a5f54)',
                opacity: 0.75,
                letterSpacing: '0.18em',
                textAlign: 'center',
                marginBottom: '14px',
              }}>
                {c.day} · {c.date}
              </div>

              <div style={{
                width: '40px',
                height: '1px',
                background: 'var(--v2-gold-cool, #b8a064)',
                opacity: 0.45,
                margin: '0 auto 16px',
              }} />

              <p style={{
                fontSize: '13.5px',
                lineHeight: 1.75,
                color: 'var(--v2-ink, #2a2521)',
                opacity: 0.85,
                margin: 0,
                textAlign: 'justify',
              }}>{c.body}</p>

              <div style={{
                marginTop: '14px',
                paddingTop: '10px',
                borderTop: '1px solid rgb(var(--v2-gold-rgb) / 0.2)',
                fontSize: '9px',
                fontFamily: MONO,
                color: 'var(--v2-ink-soft, #6a5f54)',
                opacity: 0.55,
                textAlign: 'right',
                letterSpacing: '0.15em',
              }}>{c.hash}</div>
            </div>
          </article>
        ))}
      </div>

      <FooterOrnament />
    </div>
  )
}

function SectionLabel({ en, cn }: { en: string; cn: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: '12px',
      marginBottom: '10px',
      color: 'var(--v2-gold-cool, #b8a064)',
    }}>
      <span style={{
        fontFamily: '"Cormorant Garamond", serif',
        fontStyle: 'italic',
        fontSize: '11px',
        letterSpacing: '0.4em',
      }}>{en}</span>
      <div style={{ flex: 1, height: 1, background: 'currentColor', opacity: 0.4 }} />
      <span style={{
        fontFamily: '"Noto Serif SC", serif',
        fontSize: '10px',
        letterSpacing: '0.3em',
        opacity: 0.85,
      }}>{cn}</span>
    </div>
  )
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '90px 1fr',
      gap: '14px',
      alignItems: 'baseline',
    }}>
      <span style={{ color: 'var(--v2-ink-soft, #6a5f54)', opacity: 0.7 }}>{k}</span>
      <span style={{ color: 'var(--v2-gold, #c8a956)' }}>{v}</span>
    </div>
  )
}


function FooterOrnament() {
  return (
    <div style={{
      textAlign: 'center', padding: '24px 0 16px',
      color: 'var(--v2-gold-cool, #b8a064)',
      fontSize: '14px', letterSpacing: '0.5em',
    }}>· · ·</div>
  )
}
