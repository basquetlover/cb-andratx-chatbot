import { supabaseServidor } from "../../supabase/servidor";

import type {
  PatrocinadorEquipoDetalle,
  PatrocinadoresEquipoDetalle,
} from "@tipos/EquipoDetallePanel";

export interface ErrorCampoPatrocinadoresEquipo {
  campo: string;
  mensaje: string;
}

export class ErrorActualizarPatrocinadoresEquipo extends Error {
  status: number;
  errores: ErrorCampoPatrocinadoresEquipo[];

  constructor(
    mensaje: string,
    status = 400,
    errores: ErrorCampoPatrocinadoresEquipo[] = [],
  ) {
    super(mensaje);

    this.name = "ErrorActualizarPatrocinadoresEquipo";
    this.status = status;
    this.errores = errores;
  }
}

interface DatosPatrocinadoresValidados {
  mostrarSponsor: boolean;
  patrocinadoresIds: string[];
}

interface FilaPatrocinador {
  id: string;
  nombre: string | null;
  nombre_corto: string | null;
  logo: string | null;
}

function validarUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function convertirPatrocinador(
  fila: FilaPatrocinador,
): PatrocinadorEquipoDetalle {
  return {
    id: fila.id,
    nombre: fila.nombre?.trim() || "Sin nombre",
    nombreCorto: fila.nombre_corto?.trim() ?? "",
    logo: fila.logo,
  };
}

function validarDatos(
  datos: unknown,
): DatosPatrocinadoresValidados {
  if (!esObjeto(datos)) {
    throw new ErrorActualizarPatrocinadoresEquipo(
      "Los datos enviados no son válidos.",
      400,
    );
  }

  const errores: ErrorCampoPatrocinadoresEquipo[] =
    [];

  let mostrarSponsor = false;

  if (typeof datos.mostrarSponsor !== "boolean") {
    errores.push({
      campo: "mostrarSponsor",
      mensaje:
        "El estado de visibilidad no es válido.",
    });
  } else {
    mostrarSponsor = datos.mostrarSponsor;
  }

  const patrocinadoresIds: string[] = [];

  if (!Array.isArray(datos.patrocinadoresIds)) {
    errores.push({
      campo: "patrocinadoresIds",
      mensaje:
        "La selección de patrocinadores no es válida.",
    });
  } else {
    const identificadoresUnicos =
      new Set<string>();

    datos.patrocinadoresIds.forEach((valor) => {
      if (typeof valor !== "string") {
        errores.push({
          campo: "patrocinadoresIds",
          mensaje:
            "La selección contiene un patrocinador no válido.",
        });

        return;
      }

      const identificador = valor.trim();

      if (!validarUuid(identificador)) {
        errores.push({
          campo: "patrocinadoresIds",
          mensaje:
            "La selección contiene un patrocinador no válido.",
        });

        return;
      }

      if (
        !identificadoresUnicos.has(identificador)
      ) {
        identificadoresUnicos.add(identificador);
        patrocinadoresIds.push(identificador);
      }
    });

    if (patrocinadoresIds.length > 100) {
      errores.push({
        campo: "patrocinadoresIds",
        mensaje:
          "No se pueden seleccionar más de 100 patrocinadores.",
      });
    }
  }

  if (errores.length > 0) {
    throw new ErrorActualizarPatrocinadoresEquipo(
      "Revisa los campos indicados.",
      400,
      errores,
    );
  }

  return {
    mostrarSponsor,
    patrocinadoresIds,
  };
}

export async function obtenerPatrocinadoresDisponiblesEquipo(): Promise<
  PatrocinadorEquipoDetalle[]
> {
  const {
    data: patrocinadoresEncontrados,
    error: errorPatrocinadores,
  } = await supabaseServidor
    .from("patrocinadores")
    .select("id, nombre, nombre_corto, logo")
    .order("nombre", { ascending: true });

  if (errorPatrocinadores) {
    throw new ErrorActualizarPatrocinadoresEquipo(
      `No se han podido obtener los patrocinadores: ${errorPatrocinadores.message}`,
      500,
    );
  }

  return (
    (patrocinadoresEncontrados ??
      []) as FilaPatrocinador[]
  ).map(convertirPatrocinador);
}

export async function actualizarPatrocinadoresEquipo(
  equipoId: string,
  datos: unknown,
): Promise<PatrocinadoresEquipoDetalle> {
  const idNormalizado = equipoId.trim();

  if (!validarUuid(idNormalizado)) {
    throw new ErrorActualizarPatrocinadoresEquipo(
      "El identificador del equipo no es válido.",
      400,
      [
        {
          campo: "equipoId",
          mensaje:
            "El identificador del equipo no es válido.",
        },
      ],
    );
  }

  const datosValidados = validarDatos(datos);

  const {
    data: equipoExistente,
    error: errorComprobacion,
  } = await supabaseServidor
    .from("equipos")
    .select("id")
    .eq("id", idNormalizado)
    .maybeSingle();

  if (errorComprobacion) {
    throw new ErrorActualizarPatrocinadoresEquipo(
      `No se ha podido comprobar el equipo: ${errorComprobacion.message}`,
      500,
    );
  }

  if (!equipoExistente?.id) {
    throw new ErrorActualizarPatrocinadoresEquipo(
      "El equipo no existe.",
      404,
    );
  }

  let patrocinadoresSeleccionados:
    PatrocinadorEquipoDetalle[] = [];

  if (
    datosValidados.patrocinadoresIds.length > 0
  ) {
    const {
      data: patrocinadoresEncontrados,
      error: errorPatrocinadores,
    } = await supabaseServidor
      .from("patrocinadores")
      .select("id, nombre, nombre_corto, logo")
      .in(
        "id",
        datosValidados.patrocinadoresIds,
      );

    if (errorPatrocinadores) {
      throw new ErrorActualizarPatrocinadoresEquipo(
        `No se han podido comprobar los patrocinadores: ${errorPatrocinadores.message}`,
        500,
      );
    }

    const patrocinadores = (
      (patrocinadoresEncontrados ??
        []) as FilaPatrocinador[]
    ).map(convertirPatrocinador);

    const patrocinadoresPorId = new Map(
      patrocinadores.map((patrocinador) => [
        patrocinador.id,
        patrocinador,
      ]),
    );

    if (
      patrocinadoresPorId.size !==
      datosValidados.patrocinadoresIds.length
    ) {
      throw new ErrorActualizarPatrocinadoresEquipo(
        "Alguno de los patrocinadores seleccionados no existe.",
        400,
        [
          {
            campo: "patrocinadoresIds",
            mensaje:
              "Revisa la selección de patrocinadores.",
          },
        ],
      );
    }

    patrocinadoresSeleccionados =
      datosValidados.patrocinadoresIds.map(
        (patrocinadorId) =>
          patrocinadoresPorId.get(
            patrocinadorId,
          )!,
      );
  }

  const {
    data: equipoActualizado,
    error: errorActualizacion,
  } = await supabaseServidor
    .from("equipos")
    .update({
      patrocinadores:
        datosValidados.patrocinadoresIds,
      mostrar_sponsor:
        datosValidados.mostrarSponsor,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idNormalizado)
    .select("id")
    .maybeSingle();

  if (errorActualizacion) {
    throw new ErrorActualizarPatrocinadoresEquipo(
      `No se han podido actualizar los patrocinadores del equipo: ${errorActualizacion.message}`,
      500,
    );
  }

  if (!equipoActualizado?.id) {
    throw new ErrorActualizarPatrocinadoresEquipo(
      "El equipo ya no está disponible.",
      404,
    );
  }

  return {
    mostrarSponsor:
      datosValidados.mostrarSponsor,
    seleccionados:
      patrocinadoresSeleccionados,
  };
}