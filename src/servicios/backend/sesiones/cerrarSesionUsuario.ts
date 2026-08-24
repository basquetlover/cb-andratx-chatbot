import { supabaseServidor } from "../../supabase/servidor";
import { calcularHashToken } from "../usuarios/calcularHashToken";

export async function cerrarSesionUsuario(token: string): Promise<void> {
  const tokenNormalizado = token.trim();

  if (!tokenNormalizado || tokenNormalizado.length > 128) {
    return;
  }

  let tokenHash: string;

  try {
    tokenHash = await calcularHashToken(tokenNormalizado);
  } catch {
    return;
  }

  const { error } = await supabaseServidor
    .from("sesiones_usuario")
    .update({
      expires_at: new Date().toISOString(),
    })
    .eq("token_hash", tokenHash);

  if (error) {
    throw new Error(`No se ha podido cerrar la sesión: ${error.message}`);
  }
}