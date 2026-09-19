import { useEffect, useState } from 'react';
import { Users, Plus, X, Pencil, UserX, UserCheck } from 'lucide-react';
import { api } from '../lib/api';
import type { Profile } from '../lib/types';
import UserAvatar from '../components/UserAvatar';

export default function Team() {
  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState({ full_name: '', email: '', password: 'Team@26', designation: 'Team Member', phone: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try { setPeople(await api<Profile[]>('/api/employees')); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ full_name: '', email: '', password: 'Team@26', designation: 'Team Member', phone: '' });
    setErr(null); setShow(true);
  };
  const openEdit = (p: Profile) => {
    setEditing(p);
    setForm({ full_name: p.full_name, email: p.email, password: '', designation: p.designation, phone: p.phone || '' });
    setErr(null); setShow(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      if (editing) {
        await api('/api/employees', { method: 'PUT', body: { id: editing.id, full_name: form.full_name.trim(), designation: form.designation.trim(), phone: form.phone.trim(), password: form.password || undefined } });
      } else {
        await api('/api/employees', { method: 'POST', body: { full_name: form.full_name.trim(), email: 'octavisionteam@gmail.com', password: form.password || 'Team@26', designation: form.designation.trim(), phone: form.phone.trim(), role: 'employee' } });
      }
      setShow(false); load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const toggleActive = async (p: Profile) => {
    if (p.role === 'head') return;
    await api('/api/employees', { method: p.active ? 'DELETE' : 'PUT', body: p.active ? { id: p.id } : { id: p.id, active: true } });
    load();
  };

  const emps = people.filter((p) => p.role === 'employee');
  const head = people.find((p) => p.role === 'head');

  if (loading) return <div className="flex justify-center py-24"><div className="animate-spin h-10 w-10 rounded-full border-4 border-zinc-200 border-t-zinc-900" /></div>;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2"><Users size={22} /> Team Management</h1>
          <p className="text-xs sm:text-sm text-zinc-500">{emps.filter((e) => e.active).length} active employees · all share octavisionteam@gmail.com · Full Name separates accounts</p>
        </div>
        <button onClick={openAdd} className="ml-auto flex items-center justify-center gap-2 rounded-xl bg-zinc-900 text-white text-sm font-bold px-3 sm:px-4 py-2.5 hover:bg-zinc-700 shrink-0 min-h-[44px]"><Plus size={16} /> <span className="hidden sm:inline">Add Employee</span><span className="sm:hidden">Add</span></button>
      </div>

      {head && (
        <div className="rounded-2xl bg-zinc-950 text-white p-5 flex items-center gap-4">
          <UserAvatar p={head} size="h-12 w-12 text-sm" />
          <div>
            <p className="font-bold">{head.full_name} <span className="text-[10px] font-bold bg-white text-zinc-900 px-2 py-0.5 rounded-full ml-1">👑 TEAM HEAD</span></p>
            <p className="text-xs text-zinc-400">{head.email} · {head.designation}</p>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {emps.map((p) => (
          <div key={p.id} className={`bg-white rounded-2xl border p-5 shadow-sm ${!p.active ? 'opacity-60 border-dashed' : 'border-zinc-200'}`}>
            <div className="flex items-start gap-3">
              <UserAvatar p={p} size="h-12 w-12 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="font-bold truncate">{p.full_name}</p>
                <p className="text-xs text-zinc-500">{p.designation}</p>
                {!p.active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-600">DEACTIVATED</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(p)} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"><Pencil size={15} /></button>
                <button onClick={() => toggleActive(p)} title={p.active ? 'Deactivate' : 'Reactivate'} className={`p-2 rounded-lg ${p.active ? 'text-zinc-400 hover:text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                  {p.active ? <UserX size={15} /> : <UserCheck size={15} />}
                </button>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-zinc-50 border border-zinc-100 p-3 text-xs space-y-1">
              <p className="truncate"><span className="font-bold text-zinc-500">✉️ </span><span className="font-semibold">octavisionteam@gmail.com</span> <span className="text-zinc-400">(shared)</span></p>
              {p.phone && <p><span className="font-bold text-zinc-500">📞 </span><span className="font-semibold">{p.phone}</span></p>}
              <p><span className="font-bold text-zinc-500">🔑 Password: </span><span className="font-mono font-semibold">Team@26</span> <span className="text-zinc-400">(default)</span></p>
            </div>
          </div>
        ))}
      </div>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShow(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-extrabold text-lg">{editing ? 'Edit Employee' : 'Add Employee'}</h3>
              <button type="button" onClick={() => setShow(false)}><X size={20} /></button>
            </div>
            {err && <p className="mt-3 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{err}</p>}
            <div className="space-y-3 mt-4">
              <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Full name * (must be unique — used at login)" className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
              {!editing && <input value="octavisionteam@gmail.com" disabled className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-500" />}
              <div className="grid grid-cols-2 gap-2">
                <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? 'New password (blank = keep)' : 'Password'} className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
              <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Designation (e.g. UI Designer)" className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>
            <button disabled={busy} className="mt-4 w-full rounded-xl bg-zinc-900 text-white font-bold py-3 text-sm hover:bg-zinc-700 disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Save Changes' : 'Add Employee'}</button>
          </form>
        </div>
      )}
    </div>
  );
}
