import { useEffect, useMemo, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { Screen } from '../components/Screen'
import { Bot, Mic, Send, Settings as Cog, Sparkles, Trash2 } from '../components/Icon'
import {
  addChat,
  clearChat,
  clearMealSwap,
  clearSwap,
  listChat,
  setMealSwap,
  setSwap,
} from '../db/repo'
import type { ChatMsg } from '../db/types'
import { callCoach, describeAction, parseActions, type CoachAction } from '../lib/coach'
import { PROGRAM } from '../data/program'
import { MEALS } from '../data/meals'

type SubTab = 'chat' | 'swaps'

const STARTERS = [
  'no hack squat at my gym tonight',
  "i hate cottage cheese",
  'shoulder hurt on incline today',
  'only 45 minutes today',
]

export function CoachScreen() {
  const [tab, setTab] = useState<SubTab>('chat')
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [configMissing, setConfigMissing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const m = await listChat()
      if (cancelled) return
      setMessages(m)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const send = async (text: string) => {
    const clean = text.trim()
    if (!clean || busy) return
    setDraft('')
    setBusy(true)
    // eslint-disable-next-line react-hooks/purity -- called from submit handler, not render
    const userMsg: ChatMsg = { role: 'user', content: clean, ts: Date.now() }
    await addChat(userMsg)
    const next = [...messages, userMsg]
    setMessages(next)

    const reply = await callCoach(next.map((m) => ({ role: m.role, content: m.content })))
    setConfigMissing(!!reply.configMissing)
    const replyMsg: ChatMsg = {
      role: 'assistant',
      content: reply.content || `(coach unavailable: ${reply.error ?? 'unknown error'})`,
      // eslint-disable-next-line react-hooks/purity -- called from submit handler, not render
      ts: Date.now(),
    }
    await addChat(replyMsg)
    setMessages((prev) => [...prev, replyMsg])
    setBusy(false)
  }

  const applyAction = async (a: CoachAction) => {
    if (a.action === 'swap_exercise') {
      await setSwap({ exId: a.exId, newName: a.newName })
    } else {
      await setMealSwap({
        mealId: a.mealId,
        name: a.name,
        items: a.items,
        kcal: a.kcal,
        protein: a.protein,
        fat: a.fat,
        carbs: a.carbs,
      })
    }
    const ok: ChatMsg = {
      role: 'assistant',
      content: `APPLIED. ${describeAction(a)}`,
      ts: Date.now(),
    }
    await addChat(ok)
    setMessages((prev) => [...prev, ok])
  }

  const wipe = async () => {
    if (!confirm('Clear the chat history?')) return
    await clearChat()
    setMessages([])
  }

  return (
    <Screen>
      <Header title="COACH" subtitle="Bark questions. Get joint-safe answers." />

      <div className="flex gap-2 border-b border-line">
        <SubTabBtn active={tab === 'chat'} onClick={() => setTab('chat')} icon={<Bot size={16} />}>
          CHAT
        </SubTabBtn>
        <SubTabBtn active={tab === 'swaps'} onClick={() => setTab('swaps')} icon={<Cog size={16} />}>
          MANUAL SWAPS
        </SubTabBtn>
      </div>

      {tab === 'chat' && (
        <>
          {configMissing && (
            <div className="panel-pad border-warn">
              <div className="shout text-warn text-sm">SET YOUR API KEY.</div>
              <p className="text-xs text-dim mt-1">
                Vercel → Project → Settings → Environment Variables → add{' '}
                <code className="text-text">ANTHROPIC_API_KEY</code>. Redeploy. Then I work.
              </p>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3">
            {messages.length === 0 && !busy && (
              <div className="panel-pad space-y-2">
                <div className="shout text-sm text-volt flex items-center gap-2">
                  <Sparkles size={16} /> TRY ONE
                </div>
                <div className="flex flex-wrap gap-2">
                  {STARTERS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="chip">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <Bubble
                key={i}
                msg={m}
                onApply={applyAction}
              />
            ))}
            {busy && (
              <div className="panel-tight text-dim text-xs">… coach is thinking …</div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(draft)
            }}
            className="sticky bottom-[80px] bg-bg pt-2 -mx-3 px-3 flex items-end gap-2 border-t border-line"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(draft)
                }
              }}
              placeholder="ask the coach…"
              rows={1}
              className="flex-1 bg-panel border border-line rounded-md px-3 py-2 text-sm focus:border-volt outline-none resize-none"
            />
            <button type="submit" disabled={busy || !draft.trim()} className="btn-volt px-3 py-2 disabled:opacity-40">
              <Send size={16} />
            </button>
            {messages.length > 0 && (
              <button type="button" onClick={wipe} className="btn px-3 py-2">
                <Trash2 size={14} />
              </button>
            )}
          </form>
          <div className="text-[10px] text-dim text-center shout tracking-widest pb-2">
            <Mic size={10} className="inline mb-0.5 mr-1" /> coach is haiku 4.5 · joint-safe rules baked in · {messages.length} msgs cached
          </div>
        </>
      )}

      {tab === 'swaps' && <ManualSwaps />}
    </Screen>
  )
}

function SubTabBtn({
  active, onClick, icon, children,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shout text-xs py-3 px-3 flex items-center gap-2 border-b-2 ${
        active ? 'border-volt text-volt' : 'border-transparent text-dim'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function Bubble({ msg, onApply }: { msg: ChatMsg; onApply: (a: CoachAction) => Promise<void> }) {
  const isUser = msg.role === 'user'
  const actions = useMemo(() => (isUser ? [] : parseActions(msg.content)), [msg.content, isUser])
  // strip JSON code blocks from display
  const display = isUser ? msg.content : msg.content.replace(/```json[\s\S]*?```/gi, '').trim()
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] panel-tight ${
          isUser ? 'bg-volt text-bg border-volt' : 'bg-panel'
        }`}
      >
        <div className="whitespace-pre-wrap text-sm leading-snug">{display}</div>
        {actions.length > 0 && (
          <div className="mt-2 space-y-1">
            {actions.map((a, i) => (
              <button
                key={i}
                onClick={() => onApply(a)}
                className="btn-volt w-full text-xs px-3 py-2"
              >
                APPLY · {describeAction(a)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Manual swaps fallback ----

function ManualSwaps() {
  const [refreshTick, setRefreshTick] = useState(0)
  const allExercises = useMemo(() => PROGRAM.flatMap((d) => d.exercises.map((e) => ({ ...e, dayLabel: d.label }))), [])

  return (
    <div className="space-y-3">
      <ExerciseSwapPanel allExercises={allExercises} onChange={() => setRefreshTick((t) => t + 1)} key={`ex-${refreshTick}`} />
      <MealSwapPanel onChange={() => setRefreshTick((t) => t + 1)} key={`meal-${refreshTick}`} />
    </div>
  )
}

function ExerciseSwapPanel({
  allExercises,
  onChange,
}: {
  allExercises: ({ exId: string; name: string; dayLabel: string })[]
  onChange: () => void
}) {
  const [exId, setExId] = useState(allExercises[0]?.exId ?? '')
  const [newName, setNewName] = useState('')

  const apply = async () => {
    if (!exId || !newName.trim()) return
    await setSwap({ exId, newName: newName.trim() })
    setNewName('')
    onChange()
  }
  const reset = async () => {
    if (!exId) return
    await clearSwap(exId)
    onChange()
  }

  return (
    <section className="panel-pad space-y-3">
      <h3 className="shout text-sm text-volt">EXERCISE SWAP</h3>
      <label className="block">
        <span className="text-xs text-dim shout">EXERCISE</span>
        <select
          value={exId}
          onChange={(e) => setExId(e.target.value)}
          className="w-full mt-1 bg-bg border border-line rounded-md px-3 py-2"
        >
          {allExercises.map((e) => (
            <option key={e.exId} value={e.exId}>
              {e.dayLabel} · {e.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs text-dim shout">REPLACE WITH</span>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Leg Press (high feet)"
          className="w-full mt-1 bg-bg border border-line rounded-md px-3 py-2 focus:border-volt outline-none"
        />
      </label>
      <div className="flex gap-2">
        <button onClick={apply} className="btn-volt flex-1">SAVE SWAP</button>
        <button onClick={reset} className="btn">RESET</button>
      </div>
    </section>
  )
}

function MealSwapPanel({ onChange }: { onChange: () => void }) {
  const [mealId, setMealId] = useState(MEALS[0]?.mealId ?? '')
  const [name, setName] = useState('')
  const [items, setItems] = useState('')
  const [kcal, setKcal] = useState(0)
  const [protein, setProtein] = useState(0)
  const [fat, setFat] = useState(0)
  const [carbs, setCarbs] = useState(0)

  const apply = async () => {
    if (!mealId || !name.trim()) return
    await setMealSwap({
      mealId,
      name: name.trim(),
      items: items.split(',').map((s) => s.trim()).filter(Boolean),
      kcal, protein, fat, carbs,
    })
    setName('')
    setItems('')
    setKcal(0); setProtein(0); setFat(0); setCarbs(0)
    onChange()
  }
  const reset = async () => {
    if (!mealId) return
    await clearMealSwap(mealId)
    onChange()
  }

  return (
    <section className="panel-pad space-y-3">
      <h3 className="shout text-sm text-volt">MEAL SWAP</h3>
      <label className="block">
        <span className="text-xs text-dim shout">MEAL SLOT</span>
        <select
          value={mealId}
          onChange={(e) => setMealId(e.target.value)}
          className="w-full mt-1 bg-bg border border-line rounded-md px-3 py-2"
        >
          {MEALS.map((m) => (
            <option key={m.mealId} value={m.mealId}>
              {m.slot} · {m.name}
            </option>
          ))}
        </select>
      </label>
      <Input label="NAME" value={name} onChange={setName} placeholder="Egg & Oats" />
      <Input label="ITEMS (comma-separated)" value={items} onChange={setItems} placeholder="4 eggs, 100 g oats" />
      <div className="grid grid-cols-4 gap-2">
        <Num label="KCAL" value={kcal} onChange={setKcal} />
        <Num label="P (g)" value={protein} onChange={setProtein} />
        <Num label="F (g)" value={fat} onChange={setFat} />
        <Num label="C (g)" value={carbs} onChange={setCarbs} />
      </div>
      <div className="flex gap-2">
        <button onClick={apply} className="btn-volt flex-1">SAVE MEAL SWAP</button>
        <button onClick={reset} className="btn">RESET</button>
      </div>
    </section>
  )
}

function Input({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-dim shout">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-1 bg-bg border border-line rounded-md px-3 py-2 focus:border-volt outline-none"
      />
    </label>
  )
}
function Num({
  label, value, onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-dim shout">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full mt-1 bg-bg border border-line rounded-md px-2 py-2 num text-right focus:border-volt outline-none"
      />
    </label>
  )
}
