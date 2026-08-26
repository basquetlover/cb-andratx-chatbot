import { supabaseServidor } from "../../../supabase/servidor";

export class ErrorEliminarExcepcionEntrenamiento extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 400,
  ) {
    super(mensaje);

    this.name =
      "ErrorEliminarExcepcionEntrenamiento";

    this.status = status;
  }
}

export async function eliminarExcepcionEntrenamiento(
  equipoId: string,
  excepcionId: string,
): Promise<string> {
  const equipoIdLimpio =
    equipoId.trim();

  const excepcionIdLimpio =
    excepcionId.trim();

  if (!equipoIdLimpio) {
    throw new ErrorEliminarExcepcionEntrenamiento(
      "No se ha proporcionado el equipo.",
      400,
    );
  }

  if (!excepcionIdLimpio) {
    throw new ErrorEliminarExcepcionEntrenamiento(
      "No se ha proporcionado la excepción.",
      400,
    );
  }

  const {
    data: excepcionEliminada,
    error,
  } = await supabaseServidor
    .from("excepciones_entrenamientos")
    .delete()
    .eq("id", excepcionIdLimpio)
    .eq("equipo_id", equipoIdLimpio)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se ha podido eliminar la excepción: ${error.message}`,
    );
  }

  if (!excepcionEliminada) {
    throw new ErrorEliminarExcepcionEntrenamiento(
      "La excepción no existe o no pertenece a este equipo.",
      404,
    );
  }

  return excepcionEliminada.id;
}