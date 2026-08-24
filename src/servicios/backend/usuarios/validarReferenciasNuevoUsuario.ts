import { supabaseServidor } from "../../supabase/servidor";

import type { ErrorValidacionUsuario, SolicitudCrearUsuario } from "./validarNuevoUsuario";

interface FilaIdentificador {
  id: string | null;
}

export async function validarReferenciasNuevoUsuario(solicitud: SolicitudCrearUsuario): Promise<ErrorValidacionUsuario[]> {
  const errores: ErrorValidacionUsuario[] = [];

  const idsPermisos = solicitud.configuracionPermisos.permisosSeleccionados;
  const idsEquipos = solicitud.equiposAsignados.map((equipo) => equipo.equipoId);

  if (idsPermisos.length > 0) {
    const { data: permisos, error: errorPermisos } = await supabaseServidor
      .from("permisos")
      .select("id")
      .in("id", idsPermisos)
      .eq("activo", true);

    if (errorPermisos) {
      throw new Error(`Error al validar los permisos: ${errorPermisos.message}`);
    }

    const permisosEncontrados = new Set(((permisos ?? []) as FilaIdentificador[]).map((permiso) => permiso.id).filter((id): id is string => typeof id === "string"));

    idsPermisos.forEach((permisoId, indice) => {
      if (!permisosEncontrados.has(permisoId)) {
        errores.push({
          campo: `configuracionPermisos.permisosSeleccionados.${indice}`,
          mensaje: "El permiso no existe o ya no está activo.",
        });
      }
    });
  }

  if (idsEquipos.length > 0) {
    const { data: temporada, error: errorTemporada } = await supabaseServidor
      .from("temporadas")
      .select("id")
      .eq("activa", true)
      .limit(1)
      .maybeSingle();

    if (errorTemporada) {
      throw new Error(`Error al validar la temporada activa: ${errorTemporada.message}`);
    }

    if (!temporada?.id) {
      errores.push({
        campo: "equiposAsignados",
        mensaje: "No existe ninguna temporada activa.",
      });

      return errores;
    }

    const { data: equipos, error: errorEquipos } = await supabaseServidor
      .from("equipos")
      .select("id")
      .in("id", idsEquipos)
      .eq("temporada_id", String(temporada.id))
      .eq("activo", true);

    if (errorEquipos) {
      throw new Error(`Error al validar los equipos: ${errorEquipos.message}`);
    }

    const equiposEncontrados = new Set(((equipos ?? []) as FilaIdentificador[]).map((equipo) => equipo.id).filter((id): id is string => typeof id === "string"));

    idsEquipos.forEach((equipoId, indice) => {
      if (!equiposEncontrados.has(equipoId)) {
        errores.push({
          campo: `equiposAsignados.${indice}.equipoId`,
          mensaje: "El equipo no existe, no está activo o no pertenece a la temporada actual.",
        });
      }
    });
  }

  return errores;
}