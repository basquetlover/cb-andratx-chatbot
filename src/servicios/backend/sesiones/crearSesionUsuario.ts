import { supabaseServidor } from "../../supabase/servidor";
import { generarTokenSesion } from "../../seguridad/generarTokenSesion";

const DURACION_SESION_NORMAL_DIAS = 7;
const DURACION_SESION_EXTENDIDA_DIAS = 30;
const MILISEGUNDOS_DIA = 24 * 60 * 60 * 1000;

interface DatosCrearSesion {
  usuarioId: string;
  mantenerSesion: boolean;
  userAgent: string | null;
}

export interface SesionUsuarioCreada {
  id: string;
  token: string;
  fechaCaducidad: Date;
  duracionSegundos: number;
}

export async function crearSesionUsuario({ usuarioId, mantenerSesion, userAgent }: DatosCrearSesion): Promise<SesionUsuarioCreada> {
  const duracionDias = mantenerSesion ? DURACION_SESION_EXTENDIDA_DIAS : DURACION_SESION_NORMAL_DIAS;
  const duracionMilisegundos = duracionDias * MILISEGUNDOS_DIA;
  const duracionSegundos = Math.floor(duracionMilisegundos / 1000);
  const fechaCaducidad = new Date(Date.now() + duracionMilisegundos);
  const { token, tokenHash } = await generarTokenSesion();

  const { data: sesion, error } = await supabaseServidor
    .from("sesiones_usuario")
    .insert({
      usuario_id: usuarioId,
      token_hash: tokenHash,
      expires_at: fechaCaducidad.toISOString(),
      user_agent: userAgent?.slice(0, 500) ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`No se ha podido crear la sesión: ${error.message}`);
  }

  if (!sesion?.id) {
    throw new Error("No se ha podido obtener la sesión creada");
  }

  return {
    id: sesion.id,
    token,
    fechaCaducidad,
    duracionSegundos,
  };
}