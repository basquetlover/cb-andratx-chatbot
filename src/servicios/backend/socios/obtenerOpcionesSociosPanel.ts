import {
  supabaseServidor,
} from "../../supabase/servidor";

import type {
  OpcionesSociosPanel,
  TemporadaResumenSocio,
} from "@tipos/SocioPanel";

interface FilaTemporada {
  id: string;
  nombre: string | null;
  activa: boolean | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

export class ErrorObtenerOpcionesSociosPanel
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name =
      "ErrorObtenerOpcionesSociosPanel";

    this.status = status;
  }
}

const tiposSocio = [
  "General",
  "Familiar",
  "Jugador/a",
  "Entrenador/a",
  "Colaborador/a",
  "Directiva",
  "Simpatizante",
];

function convertirTemporada(
  fila: FilaTemporada,
): TemporadaResumenSocio | null {
  const id =
    fila.id?.trim();

  if (!id) {
    return null;
  }

  return {
    id,

    nombre:
      fila.nombre?.trim() ||
      "Temporada",

    activa:
      Boolean(
        fila.activa,
      ),

    fechaInicio:
      fila.fecha_inicio,

    fechaFin:
      fila.fecha_fin,
  };
}

export async function obtenerOpcionesSociosPanel(): Promise<
  OpcionesSociosPanel
> {
  const {
    data,
    error,
  } =
    await supabaseServidor
      .from("temporadas")
      .select(`
        id,
        nombre,
        activa,
        fecha_inicio,
        fecha_fin
      `)
      .order(
        "fecha_inicio",
        {
          ascending: false,
          nullsFirst: false,
        },
      );

  if (error) {
    throw new ErrorObtenerOpcionesSociosPanel(
      `No se han podido obtener las temporadas: ${error.message}`,
      500,
    );
  }

  const temporadas =
    (
      (data ?? []) as
        FilaTemporada[]
    ).flatMap(
      (fila) => {
        const temporada =
          convertirTemporada(
            fila,
          );

        return temporada
          ? [temporada]
          : [];
      },
    );

  const temporadaActual =
    temporadas.find(
      (temporada) =>
        temporada.activa,
    ) ?? null;

  return {
    temporadaActual,
    temporadas,
    tiposSocio: [
      ...tiposSocio,
    ],
  };
}