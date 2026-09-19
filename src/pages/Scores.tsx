import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, Flame, Send, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { monthStrOf, shiftMonth, monthLabel, gradeColor, todayStr, type MonthStats } from '../lib/types';

export default function Scores() {
  const { user } = useAuth();
  const [month, setMonth] = useState(monthStrOf());
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignFor, setAssignFor] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', description: '', due_date: '', priority: 'high' });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { setStats(await api<MonthStats>(`/api/stats?month=${month}`)); } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [month]);

  const submitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignFor || !form.title.trim()) return;
    setBusy(true); setMsg(null);
    try {
      await api('/api/tasks', {
        method: 'POST',
        body: { title: form.title.trim(), description: form.description.trim(), due_date: form.due_date || null, priority: form.priority, assignee_id: assignFor, assigned_by: user!.id },
      });
      setMsg('Task assigned — the employee has been notified.');
      setAssignFor(null);
      setForm({ title: '', description: '', due_date: '', priority: 'high' });
    } catch (e: any) { setMsg('Failed: ' + e.message); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="flex justify-center py-24"><div className="animate-spin h-10 w-10 rounded-full border-4 border-zinc-200 border-t-zinc-900" /></div>;
  if (!stats) return <p className="text-center py-20 text-zinc-500">Failed to load scores.</p>;

  const sorted = [...stats.stats].sort((a, b) => (a.score ?? 101) - (b.score ?? 101));
  const name = (id: number) => stats.employees.find((e) => e.id === id);
  const scored = stats.stats.filter((x) => x.score != null);
  const avg = scored.length ? (scored.reduce((s, x) => s + (x.score ?? 0), 0) / scored.length).toFixed(1) : '—';

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2"><TrendingUp size={22} /> Scores & Improvement Tasks</h1>
          <p className="text-sm text-zinc-500">Team average {avg}% · {stats.workingDays} working days · low-score line: below {stats.low_threshold}%</p>
        </div>
        <div className="sm:ml-auto flex items-center rounded-xl border border-zinc-200 bg-white overflow-hidden w-full sm:w-auto">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="p-2.5 hover:bg-zinc-100 min-w-[44px] min-h-[44px] flex items-center justify-center"><ChevronLeft size={18} /></button>
          <span className="px-2 text-sm font-bold flex-1 sm:flex-none sm:min-w-[150px] text-center">{monthLabel(month)}</span>
          <button onClick={() => setMonth(shiftMonth(month, 1))} className="p-2.5 hover:bg-zinc-100 min-w-[44px] min-h-[44px] flex items-center justify-center"><ChevronRight size={18} /></button>
        </div>
      </div>

      {msg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-semibold px-4 py-3 flex items-center gap-2"><CheckCircle2 size={16} />{msg}</div>}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {sorted.map((s) => {
          const e = name(s.employee_id);
          return (
            <div key={s.employee_id} className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm ${s.low ? 'border-red-300 ring-1 ring-red-200' : 'border-zinc-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{e?.full_name}</p>
                  <p className="text-xs text-zinc-500">{e?.designation}</p>
                </div>
                <span className={`text-xs font-extrabold border px-2.5 py-1 rounded-full ${gradeColor(s.grade)}`}>{s.grade || '—'}</span>
              </div>
              <div className="mt-3 flex items-end gap-2">
                <p className="font-display text-4xl font-extrabold">{s.score != null ? (<>{s.score}<span className="text-lg text-zinc-400">%</span></>) : '—'}</p>
                {s.low && <span className="mb-1.5 text-[11px] font-bold text-red-600 flex items-center gap-1"><Flame size={12} /> LOW</span>}
              </div>
              <div className="h-2 rounded-full bg-zinc-100 mt-3 overflow-hidden">
                <div className={`h-full rounded-full ${s.low ? 'bg-red-500' : (s.score ?? 0) >= 90 ? 'bg-emerald-500' : 'bg-zinc-900'}`} style={{ width: `${s.score ?? 0}%` }} />
              </div>
              <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                {[['P', s.present, 'text-emerald-700 bg-emerald-50'], ['A', s.absent, 'text-red-700 bg-red-50'], ['H', s.half, 'text-amber-700 bg-amber-50'], ['PL', s.permitted, 'text-sky-700 bg-sky-50']].map(([l, v, c]) => (
                  <div key={l as string} className={`rounded-xl py-2 ${c}`}>
                    <p className="text-[10px] font-bold opacity-70">{l}</p>
                    <p className="font-extrabold">{v}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500 mt-3">⚠️ {s.warnings} warning(s) · {s.unmarked} unmarked day(s) · earned {s.earned}/{s.workingDays} pts</p>
              {assignFor === s.employee_id ? (
                <form onSubmit={submitTask} className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-2">
                  <p className="text-xs font-bold">Assign improvement task to {e?.full_name?.split(' ')[0]}</p>
                  <input required value={form.title} onChange={(ev) => setForm({ ...form, title: ev.target.value })} placeholder="Task title *" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                  <textarea value={form.description} onChange={(ev) => setForm({ ...form, description: ev.target.value })} placeholder="What should they do to improve?" rows={2} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={form.due_date} min={todayStr()} onChange={(ev) => setForm({ ...form, due_date: ev.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
                    <select value={form.priority} onChange={(ev) => setForm({ ...form, priority: ev.target.value })} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                      <option value="low">Low priority</option>
                      <option value="medium">Medium priority</option>
                      <option value="high">High priority</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={busy} className="flex-1 rounded-lg bg-zinc-900 text-white text-sm font-bold py-2 hover:bg-zinc-700 disabled:opacity-60 flex items-center justify-center gap-1.5"><Send size={14} /> {busy ? 'Assigning…' : 'Assign'}</button>
                    <button type="button" onClick={() => setAssignFor(null)} className="rounded-lg border border-zinc-300 text-sm font-bold px-3 py-2 hover:bg-white">Cancel</button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setAssignFor(s.employee_id)} className={`mt-4 w-full rounded-xl text-sm font-bold py-2.5 transition ${s.low ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'}`}>
                  {s.low ? '⚡ Assign Improvement Task' : 'Assign Task'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
