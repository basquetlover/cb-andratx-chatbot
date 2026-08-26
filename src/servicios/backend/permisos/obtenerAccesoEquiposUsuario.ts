import { supabaseServidor } from "../../supabase/servidor";

export interface AlcanceEquiposUsuario {
  accesoTodosEquipos: boolean;
  equiposIds: string[];
}

interface FilaPermisosUsuario {
  acceso_total: boolean | null;
  acceso_todos_equipos: boolean | null;
}

interface FilaEquipoUsuario {
  equipo_id: string;
  expires_at: string | null;
}

export class ErrorObtenerAccesoEquiposUsuario extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 500,
  ) {
    super(mensaje);

    this.name =
      "ErrorObtenerAccesoEquiposUsuario";

    this.status = status;
  }
}

export class ErrorAccesoDenegadoEquipo extends Error {
  status: number;
  equipoId: string;

  constructor(equipoId: string) {
    super(
      "Acceso denegado. No estás autorizado a editar este equipo.",
    );

    this.name = "ErrorAccesoDenegadoEquipo";
    this.status = 403;
    this.equipoId = equipoId;
  }
}

function validarUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function asignacionVigente(
  expiresAt: string | null,
  ahora: number,
): boolean {
  if (!expiresAt) {
    return true;
  }

  const fechaExpiracion =
    new Date(expiresAt).getTime();

  return (
    !Number.isNaN(fechaExpiracion) &&
    fechaExpiracion > ahora
  );
}

export async function obtenerAccesoEquiposUsuario(
  usuarioId: string,
): Promise<AlcanceEquiposUsuario> {
  const usuarioIdNormalizado =
    usuarioId.trim();

  if (!validarUuid(usuarioIdNormalizado)) {
    throw new ErrorObtenerAccesoEquiposUsuario(
      "El identificador del usuario no es válido.",
      400,
    );
  }

  const {
    data: permisosEncontrados,
    error: errorPermisos,
  } = await supabaseServidor
    .from("usuarios_permisos")
    .select(
      `
        acceso_total,
        acceso_todos_equipos
      `,
    )
    .eq("usuario_id", usuarioIdNormalizado)
    .maybeSingle();

  if (errorPermisos) {
    throw new ErrorObtenerAccesoEquiposUsuario(
      `No se han podido comprobar los permisos del usuario: ${errorPermisos.message}`,
      500,
    );
  }

  const permisos =
    permisosEncontrados as
      | FilaPermisosUsuario
      | null;

  const accesoTodosEquipos = Boolean(
    permisos?.acceso_total ||
      permisos?.acceso_todos_equipos,
  );

  if (accesoTodosEquipos) {
    return {
      accesoTodosEquipos: true,
      equiposIds: [],
    };
  }

  const {
    data: asignacionesEncontradas,
    error: errorAsignaciones,
  } = await supabaseServidor
    .from("usuarios_equipos")
    .select("equipo_id, expires_at")
    .eq("usuario_id", usuarioIdNormalizado);

  if (errorAsignaciones) {
    throw new ErrorObtenerAccesoEquiposUsuario(
      `No se han podido obtener los equipos asignados al usuario: ${errorAsignaciones.message}`,
      500,
    );
  }

  const ahora = Date.now();

  const equiposIds = Array.from(
    new Set(
      (
        (asignacionesEncontradas ??
          []) as FilaEquipoUsuario[]
      )
        .filter((asignacion) =>
          asignacionVigente(
            asignacion.expires_at,
            ahora,
          ),
        )
        .map((asignacion) =>
          asignacion.equipo_id.trim(),
        )
        .filter(validarUuid),
    ),
  );

  return {
    accesoTodosEquipos: false,
    equiposIds,
  };
}

export function usuarioPuedeAccederEquipo(
  alcance: AlcanceEquiposUsuario,
  equipoId: string,
): boolean {
  const equipoIdNormalizado =
    equipoId.trim();

  if (!validarUuid(equipoIdNormalizado)) {
    return false;
  }

  return (
    alcance.accesoTodosEquipos ||
    alcance.equiposIds.includes(
      equipoIdNormalizado,
    )
  );
}

export async function comprobarAccesoEquipoUsuario(
  usuarioId: string,
  equipoId: string,
): Promise<void> {
  const equipoIdNormalizado =
    equipoId.trim();

  const alcance =
    await obtenerAccesoEquiposUsuario(
      usuarioId,
    );

  if (
    !usuarioPuedeAccederEquipo(
      alcance,
      equipoIdNormalizado,
    )
  ) {
    throw new ErrorAccesoDenegadoEquipo(
      equipoIdNormalizado,
    );
  }
}