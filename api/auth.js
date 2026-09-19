import supabase from './_db-client.js';
import { netlifyAdapter } from './_adapter.js';

async function withAvatar(user) {
  const { password: _pw, ...safe } = user;
  try {
    const { data } = await supabase.from('profile_photos').select('url').eq('user_id', user.id).limit(1);
    safe.avatar_url = (data && data[0] && data[0].url) || null;
  } catch { safe.avatar_url = null; }
  return safe;
}

export async function mainHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'POST') {
      const { email, password, full_name } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
      const em = String(email).trim().toLowerCase();
      const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const { data, error } = await supabase.from('profiles').select('*').ilike('email', em);
      if (error) throw error;
      const rows = data || [];
      let user = null;
      if (em === 'octavisionteam@gmail.com') {
        // Shared employee email — separate users by Full Name
        if (!norm(full_name)) return res.status(400).json({ error: 'Full name is required' });
        user = rows.filter((r) => r.role === 'employee').find((r) => norm(r.full_name) === norm(full_name)) || null;
        if (!user) return res.status(401).json({ error: 'Invalid full name or password' });
      } else {
        user = rows[0] || null;
        if (user && full_name && norm(user.full_name) !== norm(full_name)) {
          return res.status(401).json({ error: 'Full name does not match this account' });
        }
      }
      if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid email or password' });
      if (user.active === false) return res.status(403).json({ error: 'Account deactivated. Please contact your team head.' });
      return res.status(200).json(await withAvatar(user));
    }
    if (req.method === 'GET') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (error) throw error;
      return res.status(200).json(await withAvatar(data));
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('auth error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export default mainHandler;
export const handler = netlifyAdapter(mainHandler);

