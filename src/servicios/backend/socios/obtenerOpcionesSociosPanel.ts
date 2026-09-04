import {
  supabaseServidor,
} from "../../supabase/servidor";

import type {
  OpcionTipoSocio,
  OpcionesSociosPanel,
  TemporadaResumenSocio,
} from "@tipos/SocioPanel";

interface FilaTemporada {
  id: string;
  nombre: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activa: boolean | null;
}

const TIPOS_SOCIO:
  OpcionTipoSocio[] = [
    {
      valor: "General",
      nombre: "General",
    },
    {
      valor: "Familiar",
      nombre: "Familiar",
    },
    {
      valor: "Jugador/a",
      nombre: "Jugador/a",
    },
    {
      valor: "Entrenador/a",
      nombre: "Entrenador/a",
    },
    {
      valor: "Colaborador/a",
      nombre: "Colaborador/a",
    },
    {
      valor: "Directiva",
      nombre: "Directiva",
    },
    {
      valor: "Simpatizante",
      nombre: "Simpatizante",
    },
  ];

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

    fechaInicio:
      fila.fecha_inicio
        ?.trim() || "",

    fechaFin:
      fila.fecha_fin
        ?.trim() || "",

    activa:
      fila.activa === true,
  };
}

export async function obtenerOpcionesSociosPanel(): Promise<OpcionesSociosPanel> {
  const {
    data:
      temporadasEncontradas,
    error:
      errorTemporadas,
  } = await supabaseServidor
    .from("temporadas")
    .select(`
      id,
      nombre,
      fecha_inicio,
      fecha_fin,
      activa
    `)
    .order(
      "fecha_inicio",
      {
        ascending: false,
      },
    );

  if (errorTemporadas) {
    throw new ErrorObtenerOpcionesSociosPanel(
      `No se han podido obtener las temporadas: ${errorTemporadas.message}`,
      500,
    );
  }

  const temporadas =
    (
      temporadasEncontradas ??
      []
    )
      .flatMap(
        (fila) => {
          const temporada =
            convertirTemporada(
              fila as
                FilaTemporada,
            );

          return temporada
            ? [temporada]
            : [];
        },
      )
      .sort(
        (
          temporadaA,
          temporadaB,
        ) => {
          if (
            temporadaA.activa !==
            temporadaB.activa
          ) {
            return temporadaA.activa
              ? -1
              : 1;
          }

          return temporadaB
            .fechaInicio
            .localeCompare(
              temporadaA
                .fechaInicio,
            );
        },
      );

  const temporadaActiva =
    temporadas.find(
      (temporada) =>
        temporada.activa,
    ) ?? null;

  return {
    temporadaActiva,

    temporadas,

    tiposSocio:
      TIPOS_SOCIO.map(
        (tipo) => ({
          ...tipo,
        }),
      ),
  };
}