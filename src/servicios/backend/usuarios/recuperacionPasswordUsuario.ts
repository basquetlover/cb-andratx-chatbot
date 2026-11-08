
import { supabaseServidor } from "../../supabase/servidor";
import {
  generarHashPassword,
  validarFormatoPassword,
} from "../../seguridad/password";
import { cerrarSesionAdmin } from "../sesiones/cerrarSesionAdmin";
import { calcularHashToken } from "./calcularHashToken";
import { generarTokenActivacion } from "./generarTokenActivacion";
import { enviarRecuperacionPasswordUsuario } from "../../emails/usuarios/enviarRecuperacionPasswordUsuario";

const TIPO_TOKEN = "recuperar-password";
const MINUTOS_ENTRE_ENVIOS = 5;
const MAXIMOS_ENVIOS_HORA = 3;

interface UsuarioRecuperacion {
  id: string;
  nombre: string;
  email: string;
  estado: string;
  password_hash: string | null;
  password_changed_at: string | null;
}

interface TokenRecuperacion {
  id: string;
  usuario_id: string;
  destino: string | null;
  expires_at: string;
  usado_at: string | null;
  cancelado_at: string | null;
  created_at: string;
}

interface RecuperacionValida {
  token: TokenRecuperacion;
  usuario: UsuarioRecuperacion;
}

export class ErrorRecuperacionPassword extends Error {
  status: number;

  constructor(mensaje: string, status = 400) {
    super(mensaje);
    this.name = "ErrorRecuperacionPassword";
    this.status = status;
  }
}

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

function construirEnlace(token: string): string {
  const webUrl = import.meta.env.WEB_URL?.trim();

  if (!webUrl) {
    throw new Error("WEB_URL no está configurada.");
  }

  const url = new URL(webUrl);

  if (
    url.protocol !== "https:" &&
    url.hostname !== "localhost"
  ) {
    throw new Error("WEB_URL debe utilizar HTTPS.");
  }

  const enlace = new URL(
    "/panel/restablecer-password",
    url,
  );

  enlace.searchParams.set("token", token);

  return enlace.toString();
}

async function obtenerUsuarioPorEmail(
  email: string,
): Promise<UsuarioRecuperacion | null> {
  const { data, error } = await supabaseServidor
    .from("usuarios")
    .select(
      "id, nombre, email, estado, password_hash, password_changed_at",
    )
    .eq("email_normalizado", normalizarEmail(email))
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error consultando usuario: ${error.message}`,
    );
  }

  if (!data) return null;

  const usuario = data as UsuarioRecuperacion;

  if (
    usuario.estado !== "activo" ||
    !usuario.password_hash
  ) {
    return null;
  }

  const { data: permisos, error: errorPermisos } =
    await supabaseServidor
      .from("usuarios_permisos")
      .select("acceso_panel, acceso_total")
      .eq("usuario_id", usuario.id)
      .maybeSingle();

  if (errorPermisos) {
    throw new Error(
      `Error consultando permisos: ${errorPermisos.message}`,
    );
  }

  if (
    permisos?.acceso_panel !== true &&
    permisos?.acceso_total !== true
  ) {
    return null;
  }

  return usuario;
}

async function puedeEnviarRecuperacion(
  usuarioId: string,
): Promise<boolean> {
  const ahora = Date.now();

  const desde = new Date(
    ahora - 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabaseServidor
    .from("tokens_usuario")
    .select("created_at")
    .eq("usuario_id", usuarioId)
    .eq("tipo", TIPO_TOKEN)
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(MAXIMOS_ENVIOS_HORA);

  if (error) {
    throw new Error(
      `Error comprobando solicitudes: ${error.message}`,
    );
  }

  const solicitudes = data ?? [];

  if (solicitudes.length >= MAXIMOS_ENVIOS_HORA) {
    return false;
  }

  if (solicitudes.length > 0) {
    const ultima = new Date(
      solicitudes[0].created_at,
    ).getTime();

    if (
      Number.isFinite(ultima) &&
      ahora - ultima < MINUTOS_ENTRE_ENVIOS * 60000
    ) {
      return false;
    }
  }

  return true;
}

export async function solicitarRecuperacionPassword(
  email: string,
): Promise<void> {
  const usuario = await obtenerUsuarioPorEmail(email);

  if (!usuario) return;

  if (!(await puedeEnviarRecuperacion(usuario.id))) {
    return;
  }

  const generado = await generarTokenActivacion(0.5);

  const { data: tokenGuardado, error } =
    await supabaseServidor
      .from("tokens_usuario")
      .insert({
        usuario_id: usuario.id,
        tipo: TIPO_TOKEN,
        token_hash: generado.tokenHash,
        destino: usuario.email,
        expires_at:
          generado.fechaCaducidad.toISOString(),
        creado_por: null,
      })
      .select("id")
      .single();

  if (error || !tokenGuardado) {
    throw new Error(
      `No se ha podido guardar el token: ${error?.message ?? "Sin resultado"}`,
    );
  }

  try {
    await enviarRecuperacionPasswordUsuario({
      nombre: usuario.nombre,
      email: usuario.email,
      enlace: construirEnlace(generado.token),
    });
  } catch (errorEnvio) {
    await supabaseServidor
      .from("tokens_usuario")
      .update({
        cancelado_at: new Date().toISOString(),
      })
      .eq("id", tokenGuardado.id)
      .is("usado_at", null);

    throw errorEnvio;
  }
}

async function obtenerRecuperacionValida(
  token: string,
): Promise<RecuperacionValida | null> {
  let hash: string;

  try {
    hash = await calcularHashToken(token);
  } catch {
    return null;
  }

  const { data, error } = await supabaseServidor
    .from("tokens_usuario")
    .select(
      "id, usuario_id, destino, expires_at, usado_at, cancelado_at, created_at",
    )
    .eq("token_hash", hash)
    .eq("tipo", TIPO_TOKEN)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error comprobando el token: ${error.message}`,
    );
  }

  if (!data) return null;

  const registro = data as TokenRecuperacion;

  if (
    registro.usado_at ||
    registro.cancelado_at ||
    new Date(registro.expires_at).getTime() <= Date.now()
  ) {
    return null;
  }

  const { data: usuarioData, error: errorUsuario } =
    await supabaseServidor
      .from("usuarios")
      .select(
        "id, nombre, email, estado, password_hash, password_changed_at",
      )
      .eq("id", registro.usuario_id)
      .maybeSingle();

  if (errorUsuario) {
    throw new Error(
      `Error consultando usuario: ${errorUsuario.message}`,
    );
  }

  if (!usuarioData) return null;

  const usuario = usuarioData as UsuarioRecuperacion;

  if (
    usuario.estado !== "activo" ||
    !usuario.password_hash ||
    normalizarEmail(usuario.email) !==
      normalizarEmail(registro.destino ?? "")
  ) {
    return null;
  }

  if (
    usuario.password_changed_at &&
    new Date(usuario.password_changed_at).getTime() >
      new Date(registro.created_at).getTime()
  ) {
    return null;
  }

  return { token: registro, usuario };
}

export async function comprobarRecuperacionPassword(
  token: string,
): Promise<{ expiresAt: string } | null> {
  const recuperacion =
    await obtenerRecuperacionValida(token);

  if (!recuperacion) return null;

  return {
    expiresAt: recuperacion.token.expires_at,
  };
}

export async function restablecerPasswordUsuario(
  token: string,
  password: string,
  confirmarPassword: string,
): Promise<{ sesionesCerradas: number }> {
  const errorPassword = validarFormatoPassword(password);

  if (errorPassword) {
    throw new ErrorRecuperacionPassword(errorPassword);
  }

  if (password !== confirmarPassword) {
    throw new ErrorRecuperacionPassword(
      "Las contraseñas no coinciden.",
    );
  }

  const recuperacion =
    await obtenerRecuperacionValida(token);

  if (!recuperacion) {
    throw new ErrorRecuperacionPassword(
      "El enlace no es válido, ha caducado o ya se ha utilizado.",
    );
  }

  const { usuario, token: registro } = recuperacion;
  const nuevoHash = await generarHashPassword(password);
  const ahora = new Date().toISOString();

  const { data: reclamado, error: errorReclamacion } =
    await supabaseServidor
      .from("tokens_usuario")
      .update({ usado_at: ahora })
      .eq("id", registro.id)
      .eq("tipo", TIPO_TOKEN)
      .is("usado_at", null)
      .is("cancelado_at", null)
      .gt("expires_at", ahora)
      .select("id")
      .maybeSingle();

  if (errorReclamacion) {
    throw new Error(
      `Error utilizando token: ${errorReclamacion.message}`,
    );
  }

  if (!reclamado) {
    throw new ErrorRecuperacionPassword(
      "El enlace ya no está disponible.",
      409,
    );
  }

  let passwordActualizada = false;

  try {
    // Cerrar las sesiones previas antes del cambio.
    const cierreInicial = await cerrarSesionAdmin(
      usuario.id,
    );

    const { data: actualizado, error: errorActualizar } =
      await supabaseServidor
        .from("usuarios")
        .update({
          password_hash: nuevoHash,
          password_changed_at: ahora,
          updated_at: ahora,
        })
        .eq("id", usuario.id)
        .eq("estado", "activo")
        .eq("password_hash", usuario.password_hash)
        .select("id")
        .maybeSingle();

    if (errorActualizar) {
      throw new Error(
        `Error actualizando contraseña: ${errorActualizar.message}`,
      );
    }

    if (!actualizado) {
      throw new ErrorRecuperacionPassword(
        "La cuenta ha cambiado. Solicita otro enlace.",
        409,
      );
    }

    passwordActualizada = true;

    // Cubrir también las sesiones iniciadas durante el cambio.
    const cierreFinal = await cerrarSesionAdmin(
      usuario.id,
    );

    // Los demás enlaces anteriores dejan de ser válidos.
    const { error: errorCancelar } = await supabaseServidor
      .from("tokens_usuario")
      .update({ cancelado_at: ahora })
      .eq("usuario_id", usuario.id)
      .eq("tipo", TIPO_TOKEN)
      .neq("id", registro.id)
      .is("usado_at", null)
      .is("cancelado_at", null);

    if (errorCancelar) {
      console.error(
        "No se pudieron cancelar los otros tokens:",
        errorCancelar,
      );
    }

    return {
      sesionesCerradas:
        cierreInicial.sesionesCerradas +
        cierreFinal.sesionesCerradas,
    };
  } catch (error) {
    if (!passwordActualizada) {
      const { error: errorLiberacion } =
        await supabaseServidor
          .from("tokens_usuario")
          .update({ usado_at: null })
          .eq("id", registro.id)
          .eq("usado_at", ahora);

      if (errorLiberacion) {
        console.error(
          "No se pudo liberar el token:",
          errorLiberacion,
        );
      }
    }

    throw error;
  }
}
