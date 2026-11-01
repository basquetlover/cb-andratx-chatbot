
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

export function obtenerSupabasePrivilegiado(): SupabaseClient {
  if (cliente) {
    return cliente;
  }

  const url = import.meta.env.SUPABASE_URL;
  const clave = import.meta.env.SUPABASE_ANON_KEY;

  if (!url || !clave) {
    throw new Error(
      "Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  cliente = createClient(url, clave, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return cliente;
}
