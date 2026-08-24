import { supabaseServidor } from "../../supabase/servidor";

interface ResultadoCerrarSesionAdmin {
  sesionesCerradas: number;
  fechaCierre: string;
}

export async function cerrarSesionAdmin(usuarioId: string): Promise<ResultadoCerrarSesionAdmin> {
  const idNormalizado = usuarioId.trim();

  if (!idNormalizado) {
    throw new Error("El identificador del usuario no es válido");
  }

  const fechaCierre = new Date().toISOString();

  const { data: sesiones, error } = await supabaseServidor
    .from("sesiones_usuario")
    .update({
      expires_at: fechaCierre,
    })
    .eq("usuario_id", idNormalizado)
    .gt("expires_at", fechaCierre)
    .select("id");

  if (error) {
    throw new Error(`No se han podido cerrar las sesiones del usuario: ${error.message}`);
  }

  return {
    sesionesCerradas: sesiones?.length ?? 0,
    fechaCierre,
  };
}