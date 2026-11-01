import { createClient } from "@supabase/supabase-js";

function obtenerVariableServidor(nombre: string): string {
  const variables = import.meta.env as Record<
    string,
    string | undefined
  >;

  return (
    variables[nombre]?.trim() ||
    process.env[nombre]?.trim() ||
    ""
  );
}

function crearClienteAdministrador() {
  if (!import.meta.env.SSR) {
    throw new Error(
      "El cliente administrador de Supabase solo puede utilizarse en el servidor.",
    );
  }

  const url = obtenerVariableServidor("SUPABASE_URL");

  const clave = obtenerVariableServidor(
    "SUPABASE_ANON_KEY",
  );

  if (!url) {
    throw new Error(
      "No se ha configurado SUPABASE_URL.",
    );
  }

  if (!clave) {
    throw new Error(
      "No se ha configurado SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, clave, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

let clienteAdministrador:
  | ReturnType<typeof crearClienteAdministrador>
  | undefined;

export function obtenerSupabaseAdministrador() {
  if (!clienteAdministrador) {
    clienteAdministrador = crearClienteAdministrador();
  }

  return clienteAdministrador;
}