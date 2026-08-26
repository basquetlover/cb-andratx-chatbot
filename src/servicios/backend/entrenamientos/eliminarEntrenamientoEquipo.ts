import { supabaseServidor } from "../../supabase/servidor";

export class ErrorEliminarEntrenamientoEquipo extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 400,
  ) {
    super(mensaje);

    this.name =
      "ErrorEliminarEntrenamientoEquipo";

    this.status = status;
  }
}

function validarUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

export async function eliminarEntrenamientoEquipo(
  equipoId: string,
  entrenamientoId: string,
): Promise<string> {
  const equipoIdNormalizado = equipoId.trim();

  const entrenamientoIdNormalizado =
    entrenamientoId.trim();

  if (!validarUuid(equipoIdNormalizado)) {
    throw new ErrorEliminarEntrenamientoEquipo(
      "El identificador del equipo no es válido.",
      400,
    );
  }

  if (
    !validarUuid(entrenamientoIdNormalizado)
  ) {
    throw new ErrorEliminarEntrenamientoEquipo(
      "El identificador del entrenamiento no es válido.",
      400,
    );
  }

  const {
    data: entrenamientoEliminado,
    error: errorEliminacion,
  } = await supabaseServidor
    .from("entrenamientos")
    .delete()
    .eq("id", entrenamientoIdNormalizado)
    .eq("equipo_id", equipoIdNormalizado)
    .select("id")
    .maybeSingle();

  if (errorEliminacion) {
    throw new ErrorEliminarEntrenamientoEquipo(
      `No se ha podido eliminar el entrenamiento: ${errorEliminacion.message}`,
      500,
    );
  }

  if (!entrenamientoEliminado?.id) {
    throw new ErrorEliminarEntrenamientoEquipo(
      "El entrenamiento no existe o no pertenece al equipo.",
      404,
    );
  }

  return entrenamientoEliminado.id;
}