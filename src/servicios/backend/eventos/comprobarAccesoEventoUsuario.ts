import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

import type {
  EventoPanel,
  ResumenEventoPanel,
} from "@tipos/EventoPanel";

interface FilaPermisosUsuario {
  acceso_total: boolean | null;
  acceso_todos_equipos:
    boolean | null;
}

interface FilaEquipoUsuario {
  equipo_id: string;
}

export interface AlcanceEventosUsuario {
  accesoTodosEquipos: boolean;
  equiposIds: Set<string>;
}

export class ErrorComprobarAccesoEventoUsuario
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 500,
  ) {
    super(mensaje);

    this.name =
      "ErrorComprobarAccesoEventoUsuario";

    this.status =
      status;
  }
}

function esUuid(
  valor: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

export async function obtenerAlcanceEventosUsuario(
  usuarioId: string,
): Promise<AlcanceEventosUsuario> {
  const usuarioIdLimpio =
    usuarioId.trim();

  if (
    !esUuid(
      usuarioIdLimpio,
    )
  ) {
    throw new ErrorComprobarAccesoEventoUsuario(
      "El usuario no es válido.",
      401,
    );
  }

  const {
    data:
      permisosEncontrados,

    error:
      errorPermisos,
  } =
    await supabaseServidor
      .from(
        "usuarios_permisos",
      )
      .select(`
        acceso_total,
        acceso_todos_equipos
      `)
      .eq(
        "usuario_id",
        usuarioIdLimpio,
      )
      .maybeSingle();

  if (errorPermisos) {
    throw new ErrorComprobarAccesoEventoUsuario(
      `No se han podido comprobar los permisos del usuario: ${errorPermisos.message}`,
      500,
    );
  }

  const permisos =
    permisosEncontrados as
      | FilaPermisosUsuario
      | null;

  if (
    permisos?.acceso_total ===
      true ||
    permisos
      ?.acceso_todos_equipos ===
      true
  ) {
    return {
      accesoTodosEquipos:
        true,

      equiposIds:
        new Set(),
    };
  }

  const ahora =
    new Date().toISOString();

  const {
    data:
      equiposEncontrados,

    error:
      errorEquipos,
  } =
    await supabaseServidor
      .from(
        "usuarios_equipos",
      )
      .select(
        "equipo_id",
      )
      .eq(
        "usuario_id",
        usuarioIdLimpio,
      )
      .or(
        `expires_at.is.null,expires_at.gt.${ahora}`,
      );

  if (errorEquipos) {
    throw new ErrorComprobarAccesoEventoUsuario(
      `No se han podido obtener los equipos autorizados: ${errorEquipos.message}`,
      500,
    );
  }

  const equipos =
    (
      equiposEncontrados ??
      []
    ) as FilaEquipoUsuario[];

  return {
    accesoTodosEquipos:
      false,

    equiposIds:
      new Set(
        equipos.map(
          (equipo) =>
            equipo.equipo_id,
        ),
      ),
  };
}

export function puedeConsultarEvento(
  evento:
    | EventoPanel
    | ResumenEventoPanel,

  alcance:
    AlcanceEventosUsuario,
): boolean {
  if (
    evento.alcance ===
    "todo-club"
  ) {
    return true;
  }

  if (
    alcance.accesoTodosEquipos
  ) {
    return true;
  }

  /*
   * Para consultar un evento basta
   * con tener acceso al menos a uno
   * de los equipos relacionados.
   */
  return evento.equipos.some(
    (equipo) =>
      alcance.equiposIds.has(
        equipo.id,
      ),
  );
}

export function puedeGestionarEvento(
  evento:
    | EventoPanel
    | ResumenEventoPanel,

  alcance:
    AlcanceEventosUsuario,
): boolean {
  if (
    evento.alcance ===
    "todo-club"
  ) {
    /*
     * El permiso para gestionar
     * eventos generales se comprueba
     * mediante:
     *
     * eventos.generales.gestionar
     */
    return true;
  }

  if (
    alcance.accesoTodosEquipos
  ) {
    return true;
  }

  if (
    evento.equipos.length === 0
  ) {
    return false;
  }

  /*
   * Para editar o eliminar debe
   * tener acceso a todos los equipos
   * relacionados con el evento.
   */
  return evento.equipos.every(
    (equipo) =>
      alcance.equiposIds.has(
        equipo.id,
      ),
  );
}

export function puedeGestionarEquiposEvento(
  equiposIds: string[],
  alcance:
    AlcanceEventosUsuario,
): boolean {
  if (
    alcance.accesoTodosEquipos
  ) {
    return true;
  }

  if (
    equiposIds.length === 0
  ) {
    return false;
  }

  return equiposIds.every(
    (equipoId) =>
      alcance.equiposIds.has(
        equipoId,
      ),
  );
}

export function filtrarEventosPorAccesoUsuario<
  Evento extends
    ResumenEventoPanel,
>(
  eventos: Evento[],
  alcance:
    AlcanceEventosUsuario,
): Evento[] {
  if (
    alcance.accesoTodosEquipos
  ) {
    return eventos;
  }

  return eventos.filter(
    (evento) =>
      puedeConsultarEvento(
        evento,
        alcance,
      ),
  );
}