import { supabaseServidor } from "../../supabase/servidor";

export interface ResultadoDisponibilidadEmail {
  disponible: boolean;
  usuarioIdExistente: string | null;
}

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function comprobarEmailDisponible(email: string): Promise<ResultadoDisponibilidadEmail> {
  const emailNormalizado = normalizarEmail(email);

  if (!emailNormalizado) {
    throw new Error("El correo electrónico no es válido");
  }

  const { data: usuario, error } = await supabaseServidor
    .from("usuarios")
    .select("id")
    .eq("email_normalizado", emailNormalizado)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Error al comprobar el correo electrónico: ${error.message}`);
  }

  return {
    disponible: !usuario?.id,
    usuarioIdExistente: usuario?.id ?? null,
  };
}