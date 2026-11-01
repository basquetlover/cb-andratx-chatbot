
import {
  supabaseServidor,
} from "../../supabase/servidor";

export interface ResultadoEliminarSocio {
  eliminado: true;
  socioId: string;
  carnetsEliminados: number;
}

export class ErrorEliminarSocioPanel extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name = "ErrorEliminarSocioPanel";
    this.status = status;
  }
}

const EXPRESION_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function eliminarSocioPanel(
  socioId: string,
): Promise<ResultadoEliminarSocio> {
  const id =
    typeof socioId === "string"
      ? socioId.trim()
      : "";

  if (!EXPRESION_UUID.test(id)) {
    throw new ErrorEliminarSocioPanel(
      "El identificador del socio no es válido.",
      400,
    );
  }

  // Comprobar que existe el socio.
  const {
    data: socio,
    error: errorConsulta,
  } = await supabaseServidor
    .from("socios")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (errorConsulta) {
    console.error(
      "Error comprobando la existencia del socio:",
      errorConsulta,
    );

    throw new ErrorEliminarSocioPanel(
      "No se ha podido comprobar la existencia del socio.",
      500,
    );
  }

  if (!socio) {
    throw new ErrorEliminarSocioPanel(
      "El socio no existe o ya ha sido eliminado.",
      404,
    );
  }

  // Consultar los carnets vinculados.
  const {
    data: carnets,
    error: errorConsultarCarnets,
  } = await supabaseServidor
    .from("socios_temporadas")
    .select("id")
    .eq("socio_id", id);

  if (errorConsultarCarnets) {
    console.error(
      "Error consultando los carnets del socio:",
      errorConsultarCarnets,
    );

    throw new ErrorEliminarSocioPanel(
      "No se han podido comprobar los carnets del socio.",
      500,
    );
  }

  const totalCarnetsExistentes =
    carnets?.length ?? 0;

  // Eliminar todos los carnets del socio.
  const {
    data: carnetsEliminados,
    error: errorEliminarCarnets,
  } = await supabaseServidor
    .from("socios_temporadas")
    .delete()
    .eq("socio_id", id)
    .select("id");

  if (errorEliminarCarnets) {
    console.error(
      "Error eliminando los carnets del socio:",
      {
        socioId: id,
        codigo: errorEliminarCarnets.code,
        mensaje: errorEliminarCarnets.message,
      },
    );

    throw new ErrorEliminarSocioPanel(
      "No se han podido eliminar los carnets del socio.",
      errorEliminarCarnets.code === "23503"
        ? 409
        : 500,
    );
  }

  const totalCarnetsEliminados =
    carnetsEliminados?.length ?? 0;

  if (
    totalCarnetsEliminados !== totalCarnetsExistentes
  ) {
    console.error(
      "El número de carnets eliminados no coincide:",
      {
        socioId: id,
        esperados: totalCarnetsExistentes,
        eliminados: totalCarnetsEliminados,
      },
    );

    throw new ErrorEliminarSocioPanel(
      "No se ha podido confirmar la eliminación de todos los carnets. Revisa el estado del socio antes de repetir la operación.",
      409,
    );
  }

  // Eliminar definitivamente la ficha del socio.
  const {
    data: socioEliminado,
    error: errorEliminarSocio,
  } = await supabaseServidor
    .from("socios")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (errorEliminarSocio) {
    console.error(
      "Error eliminando la ficha del socio:",
      {
        socioId: id,
        carnetsEliminados: totalCarnetsEliminados,
        codigo: errorEliminarSocio.code,
        mensaje: errorEliminarSocio.message,
      },
    );

    throw new ErrorEliminarSocioPanel(
      `No se ha podido eliminar la ficha del socio. Se han eliminado ${totalCarnetsEliminados} carnets. Revisa la ficha antes de repetir la operación.`,
      errorEliminarSocio.code === "23503"
        ? 409
        : 500,
    );
  }

  if (!socioEliminado) {
    throw new ErrorEliminarSocioPanel(
      "No se ha podido confirmar la eliminación del socio. Comprueba su estado antes de repetir la operación.",
      409,
    );
  }

  return {
    eliminado: true,
    socioId: id,
    carnetsEliminados: totalCarnetsEliminados,
  };
}
