import { supabaseServidor } from "../../supabase/servidor";

import { calcularHashToken } from "./calcularHashToken";

export interface InvitacionActivacionValida {
  tokenId: string;
  usuarioId: string;
  nombre: string;
  apellidos: string | null;
  email: string;
  cargo: string | null;
  expiresAt: string;
}

export type ResultadoInvitacionActivacion =
  | {
      valida: true;
      data: InvitacionActivacionValida;
      error: null;
    }
  | {
      valida: false;
      data: null;
      error: string;
    };

interface FilaTokenActivacion {
  id: string;
  usuario_id: string;
  destino: string | null;
  expires_at: string;
  usado_at: string | null;
  cancelado_at: string | null;
}

interface FilaUsuarioActivacion {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string;
  cargo: string | null;
  estado: string;
  password_hash: string | null;
}

export async function obtenerInvitacionActivacion(token: string): Promise<ResultadoInvitacionActivacion> {
  let tokenHash: string;

  try {
    tokenHash = await calcularHashToken(token);
  } catch {
    return {
      valida: false,
      data: null,
      error: "El enlace de activación no tiene un formato válido.",
    };
  }

  const { data: tokenEncontrado, error: errorToken } = await supabaseServidor
    .from("tokens_usuario")
    .select("id, usuario_id, destino, expires_at, usado_at, cancelado_at")
    .eq("token_hash", tokenHash)
    .eq("tipo", "activar-cuenta")
    .limit(1)
    .maybeSingle();

  if (errorToken) {
    throw new Error(`Error al comprobar el token de activación: ${errorToken.message}`);
  }

  if (!tokenEncontrado) {
    return {
      valida: false,
      data: null,
      error: "La invitación no existe o ya no es válida.",
    };
  }

  const tokenActivacion = tokenEncontrado as FilaTokenActivacion;

  if (tokenActivacion.cancelado_at) {
    return {
      valida: false,
      data: null,
      error: "Esta invitación ha sido cancelada.",
    };
  }

  if (tokenActivacion.usado_at) {
    return {
      valida: false,
      data: null,
      error: "Esta invitación ya ha sido utilizada.",
    };
  }

  const fechaCaducidad = new Date(tokenActivacion.expires_at);

  if (Number.isNaN(fechaCaducidad.getTime()) || fechaCaducidad.getTime() <= Date.now()) {
    return {
      valida: false,
      data: null,
      error: "Esta invitación ha caducado. Solicita una nueva invitación.",
    };
  }

  const { data: usuarioEncontrado, error: errorUsuario } = await supabaseServidor
    .from("usuarios")
    .select("id, nombre, apellidos, email, cargo, estado, password_hash")
    .eq("id", tokenActivacion.usuario_id)
    .limit(1)
    .maybeSingle();

  if (errorUsuario) {
    throw new Error(`Error al obtener el usuario de la invitación: ${errorUsuario.message}`);
  }

  if (!usuarioEncontrado) {
    return {
      valida: false,
      data: null,
      error: "El usuario asociado a la invitación ya no existe.",
    };
  }

  const usuario = usuarioEncontrado as FilaUsuarioActivacion;

  if (usuario.estado !== "pendiente") {
    return {
      valida: false,
      data: null,
      error: usuario.estado === "activo" ? "Esta cuenta ya está activa." : "Esta cuenta no puede activarse en este momento.",
    };
  }

  if (usuario.password_hash) {
    return {
      valida: false,
      data: null,
      error: "Esta cuenta ya tiene una contraseña configurada.",
    };
  }

  if (tokenActivacion.destino && tokenActivacion.destino.trim().toLowerCase() !== usuario.email.trim().toLowerCase()) {
    return {
      valida: false,
      data: null,
      error: "La invitación no corresponde con el usuario indicado.",
    };
  }

  return {
    valida: true,
    data: {
      tokenId: tokenActivacion.id,
      usuarioId: usuario.id,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      email: usuario.email,
      cargo: usuario.cargo,
      expiresAt: tokenActivacion.expires_at,
    },
    error: null,
  };
}