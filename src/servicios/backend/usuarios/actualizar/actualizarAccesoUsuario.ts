import { supabaseServidor } from "../../../supabase/servidor";

import type { NivelAccesoUsuarioPanel } from "../../../../types/UsuarioDetallePanel";

interface DatosAccesoUsuario {
  nivelAcceso: NivelAccesoUsuarioPanel;
  permisosSeleccionados: string[];
}

interface FilaPermisosActuales {
  id: string;
  acceso_total: boolean;
  version: number;
}

interface FilaPermisoDisponible {
  id: string;
}

export interface AccesoUsuarioActualizado {
  nivelAcceso: NivelAccesoUsuarioPanel;
  accesoPanel: boolean;
  accesoTotal: boolean;
  accesoTodosEquipos: boolean;
  permisosSeleccionados: string[];
  version: number;
}

export class ErrorActualizarAccesoUsuario extends Error {
  status: number;

  constructor(mensaje: string, status = 400) {
    super(mensaje);

    this.name = "ErrorActualizarAccesoUsuario";
    this.status = status;
  }
}

function esUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}

function validarDatos(datos: unknown): DatosAccesoUsuario {
  if (typeof datos !== "object" || datos === null) {
    throw new ErrorActualizarAccesoUsuario("Los datos de acceso no son válidos.");
  }

  const contenido = datos as Record<string, unknown>;
  const nivelAcceso = contenido.nivelAcceso;

  if (nivelAcceso !== "panel" && nivelAcceso !== "todos-equipos" && nivelAcceso !== "acceso-total") {
    throw new ErrorActualizarAccesoUsuario("El nivel de acceso seleccionado no es válido.");
  }

  if (!Array.isArray(contenido.permisosSeleccionados)) {
    throw new ErrorActualizarAccesoUsuario("La selección de permisos no es válida.");
  }

  const permisosSeleccionados = Array.from(
    new Set(
      contenido.permisosSeleccionados.filter((permiso): permiso is string => typeof permiso === "string" && esUuid(permiso)),
    ),
  );

  if (permisosSeleccionados.length !== contenido.permisosSeleccionados.length) {
    throw new ErrorActualizarAccesoUsuario("Uno o varios permisos seleccionados no son válidos.");
  }

  return {
    nivelAcceso,
    permisosSeleccionados,
  };
}

export async function actualizarAccesoUsuario(usuarioId: string, actualizadoPor: string, datos: unknown): Promise<AccesoUsuarioActualizado> {
  const datosValidados = validarDatos(datos);

  const { data: usuarioEncontrado, error: errorUsuario } = await supabaseServidor
    .from("usuarios")
    .select("id")
    .eq("id", usuarioId)
    .maybeSingle();

  if (errorUsuario) {
    throw new ErrorActualizarAccesoUsuario(`No se ha podido obtener el usuario: ${errorUsuario.message}`, 500);
  }

  if (!usuarioEncontrado?.id) {
    throw new ErrorActualizarAccesoUsuario("El usuario no existe.", 404);
  }

  const { data: permisosActualesEncontrados, error: errorPermisosActuales } = await supabaseServidor
    .from("usuarios_permisos")
    .select("id, acceso_total, version")
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (errorPermisosActuales) {
    throw new ErrorActualizarAccesoUsuario(`No se ha podido obtener la configuración actual: ${errorPermisosActuales.message}`, 500);
  }

  const permisosActuales = permisosActualesEncontrados as FilaPermisosActuales | null;

  if (usuarioId === actualizadoPor && permisosActuales?.acceso_total === true && datosValidados.nivelAcceso !== "acceso-total") {
    throw new ErrorActualizarAccesoUsuario("No puedes retirarte a ti mismo el acceso total.", 409);
  }

  if (datosValidados.permisosSeleccionados.length > 0 && datosValidados.nivelAcceso !== "acceso-total") {
    const { data: permisosDisponibles, error: errorPermisosDisponibles } = await supabaseServidor
      .from("permisos")
      .select("id")
      .in("id", datosValidados.permisosSeleccionados)
      .eq("activo", true);

    if (errorPermisosDisponibles) {
      throw new ErrorActualizarAccesoUsuario(`No se han podido comprobar los permisos seleccionados: ${errorPermisosDisponibles.message}`, 500);
    }

    const permisosValidos = (permisosDisponibles ?? []) as FilaPermisoDisponible[];
    const idsValidos = new Set(permisosValidos.map((permiso) => permiso.id));

    const hayPermisoInvalido = datosValidados.permisosSeleccionados.some((permisoId) => !idsValidos.has(permisoId));

    if (hayPermisoInvalido) {
      throw new ErrorActualizarAccesoUsuario("Uno o varios permisos ya no están disponibles.", 400);
    }
  }

  const accesoTotal = datosValidados.nivelAcceso === "acceso-total";
  const accesoTodosEquipos = datosValidados.nivelAcceso === "todos-equipos" || accesoTotal;
  const fechaActual = new Date().toISOString();
  const version = (permisosActuales?.version ?? 0) + 1;

  const idsPermisosGuardados = accesoTotal ? [] : datosValidados.permisosSeleccionados;

  const permisosJson = idsPermisosGuardados.map((permisoId) => ({
    permiso_id: permisoId,
    activo: true,
    concedido_por: actualizadoPor,
    concedido_at: fechaActual,
  }));

  const cambios = {
    acceso_panel: true,
    acceso_total: accesoTotal,
    acceso_todos_equipos: accesoTodosEquipos,
    permisos: permisosJson,
    version,
    actualizado_por: actualizadoPor,
    updated_at: fechaActual,
  };

  if (permisosActuales?.id) {
    const { error: errorActualizacion } = await supabaseServidor
      .from("usuarios_permisos")
      .update(cambios)
      .eq("id", permisosActuales.id);

    if (errorActualizacion) {
      throw new ErrorActualizarAccesoUsuario(`No se han podido actualizar los permisos: ${errorActualizacion.message}`, 500);
    }
  } else {
    const { error: errorCreacion } = await supabaseServidor
      .from("usuarios_permisos")
      .insert({
        usuario_id: usuarioId,
        ...cambios,
      });

    if (errorCreacion) {
      throw new ErrorActualizarAccesoUsuario(`No se ha podido crear la configuración de permisos: ${errorCreacion.message}`, 500);
    }
  }

  return {
    nivelAcceso: datosValidados.nivelAcceso,
    accesoPanel: true,
    accesoTotal,
    accesoTodosEquipos,
    permisosSeleccionados: idsPermisosGuardados,
    version,
  };
}