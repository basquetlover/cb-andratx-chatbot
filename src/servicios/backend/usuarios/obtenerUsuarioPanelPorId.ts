import { supabaseServidor } from "../../supabase/servidor";

import type {
  CreadorUsuarioDetalle,
  EquipoUsuarioDetalle,
  EstadoUsuarioPanel,
  NivelAccesoUsuarioPanel,
  TipoUsuarioPanel,
  UsuarioDetallePanel,
} from "../../../types/UsuarioDetallePanel";

interface FilaUsuario {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string;
  telefono: string | null;
  tipo_usuario: TipoUsuarioPanel;
  cargo: string | null;
  imagen: string | null;
  password_hash: string | null;
  estado: EstadoUsuarioPanel;
  email_verificado_at: string | null;
  password_changed_at: string | null;
  ultimo_acceso_at: string | null;
  acepta_comunicaciones: boolean;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
}

interface FilaPermisosUsuario {
  acceso_panel: boolean;
  acceso_total: boolean;
  acceso_todos_equipos: boolean;
  permisos: unknown;
  version: number;
}

interface FilaUsuarioEquipo {
  equipo_id: string;
  expires_at: string | null;
}

interface FilaEquipo {
  id: string;
  nombre: string | null;
  nombre_corto: string | null;
  categoria: string | null;
  genero: string | null;
  nivel: string | null;
}

interface FilaSesion {
  id: string;
  expires_at: string;
}

interface FilaTokenActivacion {
  expires_at: string;
  usado_at: string | null;
  cancelado_at: string | null;
}

interface FilaCreador {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string;
}

function esUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}

function obtenerIdsPermisos(permisos: unknown): string[] {
  if (!Array.isArray(permisos)) {
    return [];
  }

  const ids = permisos
    .map((permiso) => {
      if (typeof permiso === "string") {
        return permiso;
      }

      if (typeof permiso !== "object" || permiso === null) {
        return null;
      }

      const datosPermiso = permiso as Record<string, unknown>;

      if (datosPermiso.activo === false) {
        return null;
      }

      return typeof datosPermiso.permiso_id === "string" ? datosPermiso.permiso_id : null;
    })
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  return Array.from(new Set(ids));
}

function obtenerNivelAcceso(permisos: FilaPermisosUsuario | null): NivelAccesoUsuarioPanel {
  if (permisos?.acceso_total === true) {
    return "acceso-total";
  }

  if (permisos?.acceso_todos_equipos === true) {
    return "todos-equipos";
  }

  return "panel";
}

export async function obtenerUsuarioPanelPorId(usuarioId: string): Promise<UsuarioDetallePanel | null> {
  const idNormalizado = usuarioId.trim();

  if (!esUuid(idNormalizado)) {
    return null;
  }

  const { data: usuarioEncontrado, error: errorUsuario } = await supabaseServidor
    .from("usuarios")
    .select("id, nombre, apellidos, email, telefono, tipo_usuario, cargo, imagen, password_hash, estado, email_verificado_at, password_changed_at, ultimo_acceso_at, acepta_comunicaciones, creado_por, created_at, updated_at")
    .eq("id", idNormalizado)
    .maybeSingle();

  if (errorUsuario) {
    throw new Error(`No se ha podido obtener el usuario: ${errorUsuario.message}`);
  }

  const usuario = usuarioEncontrado as FilaUsuario | null;

  if (!usuario?.id) {
    return null;
  }

  const [respuestaPermisos, respuestaAsignaciones, respuestaSesiones, respuestaInvitacion] = await Promise.all([
    supabaseServidor
      .from("usuarios_permisos")
      .select("acceso_panel, acceso_total, acceso_todos_equipos, permisos, version")
      .eq("usuario_id", usuario.id)
      .maybeSingle(),

    supabaseServidor
      .from("usuarios_equipos")
      .select("equipo_id, expires_at")
      .eq("usuario_id", usuario.id),

    supabaseServidor
      .from("sesiones_usuario")
      .select("id, expires_at")
      .eq("usuario_id", usuario.id),

    supabaseServidor
      .from("tokens_usuario")
      .select("expires_at, usado_at, cancelado_at")
      .eq("usuario_id", usuario.id)
      .eq("tipo", "activar-cuenta")
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle(),
  ]);

  if (respuestaPermisos.error) {
    throw new Error(`No se han podido obtener los permisos del usuario: ${respuestaPermisos.error.message}`);
  }

  if (respuestaAsignaciones.error) {
    throw new Error(`No se han podido obtener los equipos del usuario: ${respuestaAsignaciones.error.message}`);
  }

  if (respuestaSesiones.error) {
    throw new Error(`No se han podido obtener las sesiones del usuario: ${respuestaSesiones.error.message}`);
  }

  if (respuestaInvitacion.error) {
    throw new Error(`No se ha podido obtener la invitación del usuario: ${respuestaInvitacion.error.message}`);
  }

  const permisos = respuestaPermisos.data as FilaPermisosUsuario | null;
  const asignaciones = (respuestaAsignaciones.data ?? []) as FilaUsuarioEquipo[];
  const sesiones = (respuestaSesiones.data ?? []) as FilaSesion[];
  const invitacion = respuestaInvitacion.data as FilaTokenActivacion | null;

  const idsEquipos = Array.from(new Set(asignaciones.map((asignacion) => asignacion.equipo_id)));

  let equiposEncontrados: FilaEquipo[] = [];

  if (idsEquipos.length > 0) {
    const { data, error } = await supabaseServidor
      .from("equipos")
      .select("id, nombre, nombre_corto, categoria, genero, nivel")
      .in("id", idsEquipos);

    if (error) {
      throw new Error(`No se han podido obtener los datos de los equipos: ${error.message}`);
    }

    equiposEncontrados = (data ?? []) as FilaEquipo[];
  }

  const equiposPorId = new Map(equiposEncontrados.map((equipo) => [equipo.id, equipo]));

  const equiposAsignados: EquipoUsuarioDetalle[] = asignaciones
    .map((asignacion) => {
      const equipo = equiposPorId.get(asignacion.equipo_id);

      if (!equipo) {
        return null;
      }

      return {
        equipoId: equipo.id,
        nombre: equipo.nombre?.trim() || equipo.nombre_corto?.trim() || "Equipo",
        nombreCorto: equipo.nombre_corto,
        categoria: equipo.categoria,
        genero: equipo.genero,
        nivel: equipo.nivel,
        fechaCaducidad: asignacion.expires_at,
      };
    })
    .filter((equipo): equipo is EquipoUsuarioDetalle => equipo !== null)
    .sort((primerEquipo, segundoEquipo) => primerEquipo.nombre.localeCompare(segundoEquipo.nombre, "es"));

  let creadoPor: CreadorUsuarioDetalle | null = null;

  if (usuario.creado_por) {
    const { data: creadorEncontrado, error: errorCreador } = await supabaseServidor
      .from("usuarios")
      .select("id, nombre, apellidos, email")
      .eq("id", usuario.creado_por)
      .maybeSingle();

    if (errorCreador) {
      throw new Error(`No se ha podido obtener el creador del usuario: ${errorCreador.message}`);
    }

    const creador = creadorEncontrado as FilaCreador | null;

    if (creador?.id) {
      creadoPor = {
        id: creador.id,
        nombreCompleto: [creador.nombre, creador.apellidos].filter(Boolean).join(" ").trim() || creador.email,
        email: creador.email,
      };
    }
  }

  const fechaActual = Date.now();

  const sesionesActivas = sesiones.filter((sesion) => {
    const fechaCaducidad = new Date(sesion.expires_at).getTime();

    return !Number.isNaN(fechaCaducidad) && fechaCaducidad > fechaActual;
  }).length;

  const fechaCaducidadInvitacion = invitacion ? new Date(invitacion.expires_at).getTime() : Number.NaN;

  const invitacionPendiente = Boolean(
    invitacion &&
      !invitacion.usado_at &&
      !invitacion.cancelado_at &&
      !Number.isNaN(fechaCaducidadInvitacion) &&
      fechaCaducidadInvitacion > fechaActual,
  );

  return {
    id: usuario.id,

    datosPersonales: {
      nombre: usuario.nombre,
      apellidos: usuario.apellidos ?? "",
      email: usuario.email,
      telefono: usuario.telefono ?? "",
      tipoUsuario: usuario.tipo_usuario,
      cargo: usuario.cargo ?? "",
      imagen: usuario.imagen,
      estado: usuario.estado,
      aceptaComunicaciones: usuario.acepta_comunicaciones,
    },

    acceso: {
      nivelAcceso: obtenerNivelAcceso(permisos),
      accesoPanel: permisos?.acceso_panel === true,
      accesoTotal: permisos?.acceso_total === true,
      accesoTodosEquipos: permisos?.acceso_todos_equipos === true || permisos?.acceso_total === true,
      permisosSeleccionados: obtenerIdsPermisos(permisos?.permisos),
      version: permisos?.version ?? 1,
    },

    equiposAsignados,

    seguridad: {
      emailVerificadoAt: usuario.email_verificado_at,
      passwordChangedAt: usuario.password_changed_at,
      tienePassword: Boolean(usuario.password_hash),
      sesionesActivas,
      invitacionPendiente,
      invitacionCaducaAt: invitacionPendiente ? invitacion?.expires_at ?? null : null,
    },

    administracion: {
      creadoPor,
      createdAt: usuario.created_at,
      updatedAt: usuario.updated_at,
      ultimoAccesoAt: usuario.ultimo_acceso_at,
    },
  };
}