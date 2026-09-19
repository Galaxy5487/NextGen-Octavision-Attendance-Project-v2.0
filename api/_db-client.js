import { createClient } from '@supabase/supabase-js';
import { triggerRestore } from './_db-wake.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://kztsphgwobudettagemb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let clientInstance = null;

function getClient() {
  if (!clientInstance) {
    const key = SUPABASE_KEY;
    clientInstance = createClient(SUPABASE_URL, key, {
      global: {
        fetch: async (url, options) => {
          const res = await fetch(url, options);
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
