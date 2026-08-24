import { supabaseServidor } from "../../supabase/servidor";

import type { EquipoAsignadoListado, UsuarioListadoPanel } from "../../../types/UsuarioPanel";

interface FilaUsuario {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string;
  telefono: string | null;
  tipo_usuario: string;
  cargo: string | null;
  imagen: string | null;
  estado: "pendiente" | "activo" | "bloqueado" | "desactivado";
  ultimo_acceso_at: string | null;
  created_at: string;
}

interface FilaUsuarioEquipo {
  usuario_id: string;
  equipo_id: string;
  expires_at: string | null;
}

interface FilaPermisosUsuario {
  usuario_id: string;
  acceso_total: boolean;
  acceso_todos_equipos: boolean;
}

interface FilaEquipo {
  id: string;
  nombre: string | null;
  nombre_corto: string | null;
}

export async function obtenerUsuariosPanel(): Promise<UsuarioListadoPanel[]> {
  const { data: usuariosEncontrados, error: errorUsuarios } = await supabaseServidor
    .from("usuarios")
    .select("id, nombre, apellidos, email, telefono, tipo_usuario, cargo, imagen, estado, ultimo_acceso_at, created_at")
    .order("nombre", {
      ascending: true,
    })
    .order("apellidos", {
      ascending: true,
    });

  if (errorUsuarios) {
    throw new Error(`No se han podido obtener los usuarios: ${errorUsuarios.message}`);
  }

  const usuarios = (usuariosEncontrados ?? []) as FilaUsuario[];

  if (usuarios.length === 0) {
    return [];
  }

  const idsUsuarios = usuarios.map((usuario) => usuario.id);

  const { data: permisosEncontrados, error: errorPermisos } = await supabaseServidor
    .from("usuarios_permisos")
    .select("usuario_id, acceso_total, acceso_todos_equipos")
    .in("usuario_id", idsUsuarios);

  if (errorPermisos) {
    throw new Error(`No se han podido obtener los accesos de los usuarios: ${errorPermisos.message}`);
  }

  const permisosUsuarios = (permisosEncontrados ?? []) as FilaPermisosUsuario[];

  const permisosPorUsuario = new Map(permisosUsuarios.map((permisos) => [permisos.usuario_id, permisos]));

  const { data: asignacionesEncontradas, error: errorAsignaciones } = await supabaseServidor
    .from("usuarios_equipos")
    .select("usuario_id, equipo_id, expires_at")
    .in("usuario_id", idsUsuarios);

  if (errorAsignaciones) {
    throw new Error(`No se han podido obtener los equipos asignados: ${errorAsignaciones.message}`);
  }

  const fechaActual = Date.now();

  const asignaciones = ((asignacionesEncontradas ?? []) as FilaUsuarioEquipo[]).filter((asignacion) => {
    if (!asignacion.expires_at) {
      return true;
    }

    const fechaCaducidad = new Date(asignacion.expires_at).getTime();

    return !Number.isNaN(fechaCaducidad) && fechaCaducidad > fechaActual;
  });

  const idsEquipos = Array.from(new Set(asignaciones.map((asignacion) => asignacion.equipo_id)));

  let equipos: FilaEquipo[] = [];

  if (idsEquipos.length > 0) {
    const { data: equiposEncontrados, error: errorEquipos } = await supabaseServidor
      .from("equipos")
      .select("id, nombre, nombre_corto")
      .in("id", idsEquipos);

    if (errorEquipos) {
      throw new Error(`No se han podido obtener los datos de los equipos: ${errorEquipos.message}`);
    }

    equipos = (equiposEncontrados ?? []) as FilaEquipo[];
  }

  const equiposPorId = new Map(equipos.map((equipo) => [equipo.id, equipo]));

  const asignacionesPorUsuario = new Map<string, EquipoAsignadoListado[]>();

  asignaciones.forEach((asignacion) => {
    const equipo = equiposPorId.get(asignacion.equipo_id);

    if (!equipo) {
      return;
    }

    const equiposUsuario = asignacionesPorUsuario.get(asignacion.usuario_id) ?? [];

    equiposUsuario.push({
      id: equipo.id,
      nombre: equipo.nombre?.trim() || equipo.nombre_corto?.trim() || "Equipo",
      expiresAt: asignacion.expires_at,
    });

    asignacionesPorUsuario.set(asignacion.usuario_id, equiposUsuario);
  });

  return usuarios.map((usuario) => {
    const nombreCompleto = [usuario.nombre, usuario.apellidos].filter(Boolean).join(" ").trim();
    const equiposUsuario = asignacionesPorUsuario.get(usuario.id) ?? [];
    const permisosUsuario = permisosPorUsuario.get(usuario.id);

    const accesoTodosEquipos = permisosUsuario?.acceso_total === true || permisosUsuario?.acceso_todos_equipos === true;

    equiposUsuario.sort((primerEquipo, segundoEquipo) => primerEquipo.nombre.localeCompare(segundoEquipo.nombre, "es"));

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      nombreCompleto: nombreCompleto || usuario.email,
      email: usuario.email,
      telefono: usuario.telefono,
      tipoUsuario: usuario.tipo_usuario,
      cargo: usuario.cargo,
      imagen: usuario.imagen,
      estado: usuario.estado,
      accesoTodosEquipos,
      ultimoAccesoAt: usuario.ultimo_acceso_at,
      createdAt: usuario.created_at,
      equipos: equiposUsuario,
    };
  });
}