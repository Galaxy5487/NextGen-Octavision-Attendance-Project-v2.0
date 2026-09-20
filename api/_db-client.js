import { createClient } from '@supabase/supabase-js';
import { triggerRestore } from './_db-wake.js';
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

// Populate process.env if running in Node/Serverless environment
loadEnv();

const DEFAULT_SUPABASE_URL = 'https://kztsphgwobudettagemb.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_qyzo1R4zewhnNlZ2MrVb1w_F-KLiwR5';

let clientInstance = null;

function getClient() {
  if (!clientInstance) {
    loadEnv();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

    clientInstance = createClient(url, key, {
      global: {
        fetch: async (fetchUrl, options) => {
          const res = await fetch(fetchUrl, options);
          if (!res.ok && res.status >= 500) triggerRestore();
          return res;
        },
      },
    });
  }
  return clientInstance;
}

const supabase = new Proxy({}, {
  get(_target, prop) {
    const client = getClient();
    const val = client[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  },
});

export { supabase };
export default supabase;



