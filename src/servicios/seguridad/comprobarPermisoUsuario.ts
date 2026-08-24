import { supabaseServidor } from "../supabase/servidor";

interface AccesoUsuario {
  total: boolean;
  permisos: unknown;
}

interface PermisoAsignado {
  permiso_id?: unknown;
  codigo?: unknown;
  permiso?: unknown;
  activo?: unknown;
}

function obtenerPermisosAsignados(permisos: unknown): PermisoAsignado[] {
  if (!Array.isArray(permisos)) {
    return [];
  }

  return permisos.filter((permiso): permiso is PermisoAsignado => typeof permiso === "object" && permiso !== null);
}

export async function comprobarPermisoUsuario(acceso: AccesoUsuario, permisoRequerido: string): Promise<boolean> {
  if (acceso.total) {
    return true;
  }

  const codigoRequerido = permisoRequerido.trim();

  if (!codigoRequerido) {
    return true;
  }

  if (Array.isArray(acceso.permisos) && acceso.permisos.some((permiso) => typeof permiso === "string" && permiso === codigoRequerido)) {
    return true;
  }

  const permisosAsignados = obtenerPermisosAsignados(acceso.permisos).filter((permiso) => permiso.activo !== false);

  const permisoPorCodigo = permisosAsignados.some((permiso) => permiso.codigo === codigoRequerido || permiso.permiso === codigoRequerido);

  if (permisoPorCodigo) {
    return true;
  }

  const idsPermisos = permisosAsignados
    .map((permiso) => permiso.permiso_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (idsPermisos.length === 0) {
    return false;
  }

  const { data: permisoEncontrado, error } = await supabaseServidor
    .from("permisos")
    .select("id")
    .in("id", idsPermisos)
    .eq("codigo", codigoRequerido)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`No se ha podido comprobar el permiso ${codigoRequerido}: ${error.message}`);
  }

  return permisoEncontrado?.id !== undefined;
}