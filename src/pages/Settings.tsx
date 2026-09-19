import { useEffect, useRef, useState } from 'react';
import { Settings as SettingsIcon, Camera, Trash2, CheckCircle2, Save, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import UserAvatar from '../components/UserAvatar';

export default function Settings() {
  const { user, refresh } = useAuth();
  const isHead = user?.role === 'head';
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [cf, setCf] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) { setName(user.full_name || ''); setDesignation(user.designation || ''); setPhone(user.phone || ''); }
  }, [user?.id]);

  if (!user) return null;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setMsg({ ok: false, text: 'Name cannot be empty.' }); return; }
    setBusy(true); setMsg(null);
    try {
      await api('/api/employees', { method: 'PUT', body: { id: user.id, full_name: name.trim(), designation: designation.trim(), phone: phone.trim() } });
      await refresh();
      setMsg({ ok: true, text: 'Profile updated — your new name shows everywhere in the app.' });
    } catch (e: any) { setMsg({ ok: false, text: e.message }); }
    finally { setBusy(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (!cur || !nw || !cf) { setPwMsg({ ok: false, text: 'Fill all three password fields.' }); return; }
    if (nw.length < 6) { setPwMsg({ ok: false, text: 'New password must be at least 6 characters.' }); return; }
    if (nw !== cf) { setPwMsg({ ok: false, text: 'New password and confirmation do not match.' }); return; }
    setPwBusy(true);
    try {
      await api('/api/auth', { method: 'POST', body: { email: user.email, password: cur, full_name: user.full_name } });
      await api('/api/employees', { method: 'PUT', body: { id: user.id, password: nw } });
      setCur(''); setNw(''); setCf('');
      setPwMsg({ ok: true, text: 'Password changed successfully. Use it on your next sign-in.' });
    } catch (e: any) { setPwMsg({ ok: false, text: e.message === 'Invalid email or password' ? 'Current password is incorrect.' : e.message }); }
    finally { setPwBusy(false); }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) { setMsg({ ok: false, text: 'Only PNG, JPG or WEBP images allowed.' }); return; }
    if (f.size > 2 * 1024 * 1024) { setMsg({ ok: false, text: 'Image too large (max 2MB).' }); return; }
    setPhotoBusy(true); setMsg(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(',')[1]);
        r.onerror = reject;
        r.readAsDataURL(f);
      });
      await api('/api/avatar', { method: 'POST', body: { user_id: user.id, fileName: f.name, fileBase64: base64, contentType: f.type } });
      await refresh();
      setMsg({ ok: true, text: 'Profile picture updated.' });
    } catch (e: any) { setMsg({ ok: false, text: e.message }); }
    finally { setPhotoBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const removePhoto = async () => {
    if (!confirm('Remove your profile picture?')) return;
    setPhotoBusy(true);
    try {
      await api('/api/avatar', { method: 'DELETE', body: { user_id: user.id } });
      await refresh();
      setMsg({ ok: true, text: 'Profile picture removed.' });
    } catch (e: any) { setMsg({ ok: false, text: e.message }); }
    finally { setPhotoBusy(false); }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight flex items-center gap-2"><SettingsIcon size={24} /> Profile Settings</h1>
        <p className="text-sm text-zinc-500">Manage your name, password and profile picture.</p>
      </div>

      {/* Photo card */}
      <div className="bg-zinc-950 text-white rounded-3xl p-5 sm:p-7 relative overflow-hidden">
        <div className="absolute inset-0 login-grid-bg opacity-50" />
        <div className="relative flex flex-col sm:flex-row items-center gap-5">
          <div className="relative">
            <UserAvatar p={user} size="h-24 w-24 text-2xl" />
            {photoBusy && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <Loader2 size={22} className="animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="text-center sm:text-left flex-1">
            <p className="font-display font-extrabold text-xl">{user.full_name}</p>
            <p className="text-sm text-zinc-400">{user.email}</p>
            <p className="text-xs text-zinc-500 mt-1">{isHead ? '👑 Team Head' : `👤 ${user.designation || 'Employee'}`} · PNG / JPG / WEBP · max 2MB</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <button onClick={() => fileRef.current?.click()} disabled={photoBusy} className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-white text-zinc-900 text-sm font-bold px-4 py-2.5 hover:bg-zinc-200 disabled:opacity-60 min-h-[44px]">
              <Camera size={16} /> {user.avatar_url ? 'Change' : 'Upload'}
            </button>
            {user.avatar_url && (
              <button onClick={removePhoto} disabled={photoBusy} className="flex items-center gap-2 rounded-xl border border-white/20 text-sm font-bold px-4 py-2.5 hover:bg-white/10 disabled:opacity-60">
                <Trash2 size={16} /> Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Name / details */}
      <form onSubmit={saveProfile} className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-sm space-y-4">
        <h2 className="font-display font-extrabold text-lg flex items-center gap-2"><UserIcon size={19} /> Personal Details</h2>
        {msg && (
          <p className={`text-sm font-semibold rounded-xl px-4 py-3 border flex items-center gap-2 ${msg.ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
            {msg.ok && <CheckCircle2 size={16} />}{msg.text}
          </p>
        )}
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Full Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className="mt-1.5 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Designation</label>
            <input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. UI Designer" disabled={isHead} className="mt-1.5 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +92 300 0000000" className="mt-1.5 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Login Email (cannot be changed)</label>
          <input value={user.email} disabled className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500" />
        </div>
        <button disabled={busy} className="rounded-xl bg-zinc-900 text-white font-bold px-5 py-3 text-sm hover:bg-zinc-700 disabled:opacity-60 flex items-center gap-2">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {busy ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      {/* Password */}
      <form onSubmit={changePassword} className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-sm space-y-4">
        <h2 className="font-display font-extrabold text-lg flex items-center gap-2"><Lock size={19} /> Change Password</h2>
        {pwMsg && (
          <p className={`text-sm font-semibold rounded-xl px-4 py-3 border flex items-center gap-2 ${pwMsg.ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
            {pwMsg.ok && <CheckCircle2 size={16} />}{pwMsg.text}
          </p>
        )}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Current *</label>
            <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder="••••••" className="mt-1.5 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">New *</label>
            <input type="password" value={nw} onChange={(e) => setNw(e.target.value)} placeholder="Min 6 chars" className="mt-1.5 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Confirm *</label>
            <input type="password" value={cf} onChange={(e) => setCf(e.target.value)} placeholder="Repeat new" className="mt-1.5 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
          </div>
        </div>
        <button disabled={pwBusy} className="rounded-xl bg-zinc-900 text-white font-bold px-5 py-3 text-sm hover:bg-zinc-700 disabled:opacity-60 flex items-center gap-2">
          {pwBusy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />} {pwBusy ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
