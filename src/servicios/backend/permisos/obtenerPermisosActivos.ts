import { supabaseServidor } from "../../supabase/servidor";

export interface PermisoActivo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  modulo: string;
  accion: string;
  activo: boolean;
}

interface FilaPermisoSupabase {
  id: string | null;
  codigo: string | null;
  nombre: string | null;
  descripcion: string | null;
  modulo: string | null;
  accion: string | null;
  activo: boolean | null;
}

export async function obtenerPermisosActivos(): Promise<PermisoActivo[]> {
  const { data, error } = await supabaseServidor
    .from("permisos")
    .select("id, codigo, nombre, descripcion, modulo, accion, activo")
    .eq("activo", true)
    .order("modulo", {
      ascending: true,
    })
    .order("accion", {
      ascending: true,
    })
    .order("nombre", {
      ascending: true,
    });

  if (error) {
    throw new Error(`Error al obtener los permisos activos: ${error.message}`);
  }

  const filas = (data ?? []) as FilaPermisoSupabase[];

  return filas
    .filter((permiso) => typeof permiso.id === "string" && typeof permiso.codigo === "string" && typeof permiso.nombre === "string" && typeof permiso.modulo === "string" && typeof permiso.accion === "string")
    .map((permiso) => ({
      id: permiso.id!,
      codigo: permiso.codigo!,
      nombre: permiso.nombre!,
      descripcion: permiso.descripcion,
      modulo: permiso.modulo!,
      accion: permiso.accion!,
      activo: permiso.activo ?? true,
    }));
}