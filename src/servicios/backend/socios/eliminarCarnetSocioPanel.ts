import {
  obtenerSupabaseAdministrador,
} from "../../supabase/administrador";

export interface ResultadoEliminarCarnetSocio {
  eliminado: true;
  socioId: string;
  carnetId: string;
}

const EXPRESION_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ErrorEliminarCarnetSocioPanel extends Error {
  status: number;

  constructor(mensaje: string, status: number) {
    super(mensaje);

    this.name = "ErrorEliminarCarnetSocioPanel";
    this.status = status;
  }
}

/*
 * Servicio exclusivo del servidor.
 * La ruta que lo invoca debe comprobar previamente
 * la sesión, el permiso socios.editar y la confirmación.
 */
export async function eliminarCarnetSocioPanel(
  socioId: string,
  carnetId: string,
): Promise<ResultadoEliminarCarnetSocio> {
  const socioIdLimpio =
    typeof socioId === "string" ? socioId.trim() : "";

  const carnetIdLimpio =
    typeof carnetId === "string" ? carnetId.trim() : "";

  if (!EXPRESION_UUID.test(socioIdLimpio)) {
    throw new ErrorEliminarCarnetSocioPanel(
      "El identificador del socio no es válido.",
      400,
    );
  }

  if (!EXPRESION_UUID.test(carnetIdLimpio)) {
    throw new ErrorEliminarCarnetSocioPanel(
      "El identificador del carnet no es válido.",
      400,
    );
  }

  let cliente: ReturnType<
    typeof obtenerSupabaseAdministrador
  >;

  try {
    cliente = obtenerSupabaseAdministrador();
  } catch {
    throw new ErrorEliminarCarnetSocioPanel(
      "No se ha podido preparar la eliminación. Revisa la configuración privada de Supabase en el servidor.",
      500,
    );
  }

  /*
   * La pertenencia al socio se comprueba en la misma
   * operación que elimina el carnet.
   *
   * No se realizan eliminaciones sobre la tabla socios.
   */
  const { data, error } = await cliente
    .from("socios_temporadas")
    .delete()
    .eq("id", carnetIdLimpio)
    .eq("socio_id", socioIdLimpio)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(
      "Error eliminando un carnet de socio:",
      {
        socioId: socioIdLimpio,
        carnetId: carnetIdLimpio,
        codigo: error.code,
        mensaje: error.message,
      },
    );

    if (error.code === "23503") {
      throw new ErrorEliminarCarnetSocioPanel(
        "No se puede eliminar este carnet porque tiene otros registros vinculados.",
        409,
      );
    }

    throw new ErrorEliminarCarnetSocioPanel(
      "No se ha podido eliminar el carnet.",
      500,
    );
  }

  if (!data) {
    throw new ErrorEliminarCarnetSocioPanel(
      "El carnet no existe, ya fue eliminado o no pertenece a este socio.",
      404,
    );
  }

  return {
    eliminado: true,
    socioId: socioIdLimpio,
    carnetId: carnetIdLimpio,
  };
}