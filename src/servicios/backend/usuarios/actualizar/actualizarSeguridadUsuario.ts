import { cerrarSesionAdmin } from "../../sesiones/cerrarSesionAdmin";
import { supabaseServidor } from "../../../supabase/servidor";

export type EstadoCuentaUsuario = "pendiente" | "activo" | "bloqueado" | "desactivado";
export type AccionSeguridadUsuario = "cambiar-estado" | "cerrar-sesiones";

interface DatosActualizarSeguridad {
  accion?: unknown;
  estado?: unknown;
}

interface FilaUsuario {
  id: string;
  estado: EstadoCuentaUsuario;
}

export interface ResultadoActualizarSeguridad {
  estado: EstadoCuentaUsuario;
  sesionesCerradas: number;
}

export class ErrorActualizarSeguridadUsuario extends Error {
  status: number;

  constructor(mensaje: string, status = 400) {
    super(mensaje);
    this.name = "ErrorActualizarSeguridadUsuario";
    this.status = status;
  }
}

const estadosPermitidos: EstadoCuentaUsuario[] = [
  "pendiente",
  "activo",
  "bloqueado",
  "desactivado",
];

function esAccionSeguridad(valor: unknown): valor is AccionSeguridadUsuario {
  return valor === "cambiar-estado" || valor === "cerrar-sesiones";
}

function esEstadoUsuario(valor: unknown): valor is EstadoCuentaUsuario {
  return typeof valor === "string" && estadosPermitidos.includes(valor as EstadoCuentaUsuario);
}

async function obtenerUsuario(usuarioId: string): Promise<FilaUsuario> {
  const { data, error } = await supabaseServidor
    .from("usuarios")
    .select("id, estado")
    .eq("id", usuarioId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se ha podido obtener el usuario: ${error.message}`);
  }

  if (!data?.id) {
    throw new ErrorActualizarSeguridadUsuario("El usuario no existe.", 404);
  }

  return data as FilaUsuario;
}

export async function actualizarSeguridadUsuario(usuarioId: string, administradorId: string, contenido: unknown): Promise<ResultadoActualizarSeguridad> {
  const idUsuario = usuarioId.trim();
  const idAdministrador = administradorId.trim();

  if (!idUsuario || !idAdministrador) {
    throw new ErrorActualizarSeguridadUsuario("El identificador del usuario no es válido.");
  }

  if (typeof contenido !== "object" || contenido === null) {
    throw new ErrorActualizarSeguridadUsuario("Los datos de seguridad no son válidos.");
  }

  const datos = contenido as DatosActualizarSeguridad;

  if (!esAccionSeguridad(datos.accion)) {
    throw new ErrorActualizarSeguridadUsuario("La acción de seguridad no es válida.");
  }

  const usuario = await obtenerUsuario(idUsuario);

  if (datos.accion === "cerrar-sesiones") {
    const resultado = await cerrarSesionAdmin(idUsuario);

    return {
      estado: usuario.estado,
      sesionesCerradas: resultado.sesionesCerradas,
    };
  }

  if (!esEstadoUsuario(datos.estado)) {
    throw new ErrorActualizarSeguridadUsuario("El estado seleccionado no es válido.");
  }

  if (idUsuario === idAdministrador && datos.estado !== "activo") {
    throw new ErrorActualizarSeguridadUsuario("No puedes bloquear o desactivar tu propia cuenta.", 409);
  }

  if (usuario.estado === datos.estado) {
    return {
      estado: usuario.estado,
      sesionesCerradas: 0,
    };
  }

  const { data: usuarioActualizado, error } = await supabaseServidor
    .from("usuarios")
    .update({
      estado: datos.estado,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idUsuario)
    .select("estado")
    .maybeSingle();

  if (error) {
    throw new Error(`No se ha podido cambiar el estado del usuario: ${error.message}`);
  }

  if (!usuarioActualizado) {
    throw new ErrorActualizarSeguridadUsuario("El usuario no existe.", 404);
  }

  let sesionesCerradas = 0;

  if (datos.estado === "bloqueado" || datos.estado === "desactivado") {
    const resultado = await cerrarSesionAdmin(idUsuario);
    sesionesCerradas = resultado.sesionesCerradas;
  }

  return {
    estado: usuarioActualizado.estado as EstadoCuentaUsuario,
    sesionesCerradas,
  };
}