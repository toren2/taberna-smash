import { createClient } from "@supabase/supabase-js";

// Claves públicas (anon/publishable) — seguras para exponer en el cliente.
// El acceso real está controlado por las políticas RLS en Supabase.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gzfxfstfrtmtdyktnzcy.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_SqIOfA2oDijdZ_2ToWYTDw_U30XG63-";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
