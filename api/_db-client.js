import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  try {
    const envFiles = ['.env.local', '.env'];
    for (const file of envFiles) {
      const envPath = path.resolve(process.cwd(), file);
      if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const idx = trimmed.indexOf('=');
          if (idx > 0) {
            const k = trimmed.slice(0, idx).trim();
            const v = trimmed.slice(idx + 1).trim();
            if (!process.env[k]) process.env[k] = v;
          }
        }
      }
    }
  } catch {}
}

loadEnv();

const DEFAULT_SUPABASE_URL = 'https://kztsphgwobudettagemb.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_qyzo1R4zewhnNlZ2MrVb1w_F-KLiwR5';

const DEFAULT_DB = {
  profiles: [
    {
      id: 1,
      full_name: 'Team Head',
      email: 'nextgenoctavision@gmail.com',
      password: 'Head@26',
      role: 'head',
      designation: 'Team Head',
      phone: '',
      avatar_color: '#18181b',
      active: true
    },
    {
      id: 2,
      full_name: 'Ayesha Khan',
      email: process.env.BREVO_SENDER_EMAIL || 'employee@octavision.com',
      password: 'Team@26',
      role: 'employee',
      designation: 'UI/UX Designer',
      phone: '',
      avatar_color: '#3f3f46',
      active: true
    },
    {
      id: 3,
      full_name: 'Mohammed Irbaz S',
      email: process.env.BREVO_SENDER_EMAIL || 'employee@octavision.com',
      password: 'Team@26',
      role: 'employee',
      designation: 'Software Engineer',
      phone: '',
      avatar_color: '#1e3a8a',
      active: true
    }
  ],
  attendance: [],
  tasks: [],
  leaves: [],
  calendar_overrides: [],
  announcements: [],
  warning_logs: [],
  threads: [],
  messages: [],
  notifications: [],
  profile_photos: []
};

function getPossibleDbPaths() {
  const paths = [
    path.resolve(process.cwd(), 'api', '_local_db.json'),
    path.resolve(process.cwd(), '_local_db.json'),
    path.resolve('/tmp', '_local_db.json')
  ];
  try {
    if (typeof __dirname !== 'undefined') {
      paths.push(path.resolve(__dirname, '_local_db.json'));
      paths.push(path.resolve(__dirname, '..', 'api', '_local_db.json'));
    }
  } catch {}
  return paths;
}

function readDb() {
  try {
    for (const p of getPossibleDbPaths()) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed && Array.isArray(parsed.profiles)) {
            if (parsed.profiles.length === 0) {
              parsed.profiles = JSON.parse(JSON.stringify(DEFAULT_DB.profiles));
            }
            return parsed;
          }
        }
      }
    }
  } catch {}
  return JSON.parse(JSON.stringify(DEFAULT_DB));
}

function writeDb(db) {
  try {
    for (const p of getPossibleDbPaths()) {
      try {
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(p, JSON.stringify(db, null, 2), 'utf-8');
        return;
      } catch {}
    }
  } catch (err) {
    console.error('Failed to save local db:', err);
  }
}

class LocalQuery {
  constructor(table) {
    this.tableName = table;
    this.op = 'select';
    this.insertPayload = null;
    this.updatePayload = null;
    this.filters = [];
    this.orderOpts = null;
    this.limitVal = null;
    this.isSingle = false;
  }

  select(fields) {
    if (this.op !== 'insert' && this.op !== 'update') {
      this.op = 'select';
    }
    return this;
  }

  insert(data) {
    this.op = 'insert';
    this.insertPayload = data;
    return this;
  }

  update(patch) {
    this.op = 'update';
    this.updatePayload = patch;
    return this;
  }

  delete() {
    this.op = 'delete';
    return this;
  }

  eq(col, val) {
    this.filters.push((row) => row && row[col] == val);
    return this;
  }

  neq(col, val) {
    this.filters.push((row) => row && row[col] != val);
    return this;
  }

  gte(col, val) {
    this.filters.push((row) => row && row[col] >= val);
    return this;
  }

  lte(col, val) {
    this.filters.push((row) => row && row[col] <= val);
    return this;
  }

  gt(col, val) {
    this.filters.push((row) => row && row[col] > val);
    return this;
  }

  lt(col, val) {
    this.filters.push((row) => row && row[col] < val);
    return this;
  }

  in(col, vals) {
    const set = new Set((vals || []).map(String));
    this.filters.push((row) => row && set.has(String(row[col])));
    return this;
  }

  ilike(col, pattern) {
    const pat = String(pattern || '').replace(/%/g, '').toLowerCase();
    this.filters.push((row) => row && String(row[col] || '').toLowerCase().includes(pat));
    return this;
  }

  contains(col, vals) {
    const arr = Array.isArray(vals) ? vals : [vals];
    this.filters.push((row) => {
      if (!row || !row[col]) return false;
      const rowArr = (Array.isArray(row[col]) ? row[col] : [row[col]]).map(Number);
      return arr.every((v) => rowArr.includes(Number(v)));
    });
    return this;
  }

  order(col, opts = {}) {
    this.orderOpts = { col, ascending: opts.ascending !== false };
    return this;
  }

  limit(n) {
    this.limitVal = n;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  async execute() {
    const db = readDb();
    if (!db[this.tableName]) db[this.tableName] = [];
    let rows = db[this.tableName];

    if (this.op === 'insert') {
      const payloads = Array.isArray(this.insertPayload) ? this.insertPayload : [this.insertPayload];
      const inserted = [];
      for (const p of payloads) {
        const nextId = rows.length ? Math.max(...rows.map((r) => Number(r.id) || 0)) + 1 : 1;
        const record = { id: nextId, created_at: new Date().toISOString(), ...p };
        rows.push(record);
        inserted.push(record);
      }
      writeDb(db);
      const res = Array.isArray(this.insertPayload) ? inserted : inserted[0];
      return { data: this.isSingle ? (inserted[0] || null) : res, error: null };
    }

    if (this.op === 'update') {
      let matches = rows;
      for (const f of this.filters) {
        matches = matches.filter(f);
      }
      const updated = [];
      for (const r of matches) {
        Object.assign(r, this.updatePayload);
        updated.push(r);
      }
      writeDb(db);
      return { data: this.isSingle ? (updated[0] || null) : updated, error: null };
    }

    if (this.op === 'delete') {
      let remaining = [];
      let deleted = [];
      for (const r of rows) {
        let match = true;
        for (const f of this.filters) {
          if (!f(r)) { match = false; break; }
        }
        if (match) deleted.push(r);
        else remaining.push(r);
      }
      db[this.tableName] = remaining;
      writeDb(db);
      return { data: deleted, error: null };
    }

    // select
    let res = [...rows];
    for (const f of this.filters) {
      res = res.filter(f);
    }
    if (this.orderOpts) {
      const { col, ascending } = this.orderOpts;
      res.sort((a, b) => {
        if (a[col] < b[col]) return ascending ? -1 : 1;
        if (a[col] > b[col]) return ascending ? 1 : -1;
        return 0;
      });
    }
    if (this.limitVal != null) {
      res = res.slice(0, this.limitVal);
    }
    if (this.isSingle) {
      return { data: res[0] || null, error: res[0] ? null : { message: 'Row not found', code: 'PGRST116' } };
    }
    return { data: res, error: null };
  }
}

function createProxyChain(table, realBuilder) {
  const local = new LocalQuery(table);

  const proxy = new Proxy({}, {
    get(_target, prop) {
      if (prop === 'then') {
        return (onfulfilled, onrejected) => {
          (async () => {
            if (realBuilder && typeof realBuilder.then === 'function') {
              try {
                const result = await realBuilder;
                if (!result.error) {
                  return result;
                }
              } catch (e) {}
            }
            return await local.execute();
          })().then(onfulfilled, onrejected);
        };
      }

      if (prop === 'catch') {
        return (onrejected) => {
          (async () => {
            if (realBuilder && typeof realBuilder.catch === 'function') {
              try {
                const result = await realBuilder;
                if (!result.error) return result;
              } catch (e) {}
            }
            return await local.execute();
          })().catch(onrejected);
        };
      }

      return (...args) => {
        if (typeof local[prop] === 'function') {
          local[prop](...args);
        }
        let nextReal = null;
        if (realBuilder && typeof realBuilder[prop] === 'function') {
          try {
            nextReal = realBuilder[prop](...args);
          } catch {}
        }
        return createProxyChain(table, nextReal);
      };
    },
  });

  return proxy;
}

let clientInstance = null;

function getClient() {
  if (!clientInstance) {
    loadEnv();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

    try {
      clientInstance = createClient(url, key);
    } catch {}
  }
  return clientInstance;
}

const supabase = {
  from(table) {
    let realBuilder = null;
    try {
      const client = getClient();
      if (client) realBuilder = client.from(table);
    } catch {}
    return createProxyChain(table, realBuilder);
  },
};

export { supabase };
export default supabase;
