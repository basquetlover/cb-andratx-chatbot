import {
  supabaseServidor,
} from "../../supabase/servidor";

import type {
  EquipoEventoPanel,
  InstalacionEventoPanel,
  TemporadaEventoPanel,
} from "../../../types/EventoPanel";

interface FilaTemporada {
  id: string;
  nombre: string | null;
}

interface FilaEquipo {
  id: string;
  nombre: string | null;
  nombre_corto: string | null;
  categoria: string | null;
  genero: string | null;
  imagen: string | null;
}

interface FilaInstalacion {
  id: string;
  nombre: string | null;
  nombre_corto: string | null;
  direccion: string | null;
  localidad: string | null;
  codigo_postal: string | null;
}

export interface OpcionesEventoPanel {
  temporada:
    TemporadaEventoPanel | null;

  equipos:
    EquipoEventoPanel[];

  instalaciones:
    InstalacionEventoPanel[];
}

export class ErrorObtenerOpcionesEventoPanel
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 500,
  ) {
    super(mensaje);

    this.name =
      "ErrorObtenerOpcionesEventoPanel";

    this.status = status;
  }
}

function convertirTexto(
  valor: unknown,
): string | null {
  if (typeof valor !== "string") {
    return null;
  }

  const texto = valor.trim();

  return texto || null;
}

function ordenarTexto(
  valorA: string | null,
  valorB: string | null,
): number {
  return (
    valorA ?? ""
  ).localeCompare(
    valorB ?? "",
    "es",
    {
      sensitivity: "base",
      numeric: true,
    },
  );
}

export async function obtenerOpcionesEventoPanel():
  Promise<OpcionesEventoPanel> {
  const {
    data: temporadaEncontrada,
    error: errorTemporada,
  } = await supabaseServidor
    .from("temporadas")
    .select(
      `
        id,
        nombre
      `,
    )
    .eq("activa", true)
    .limit(1)
    .maybeSingle();

  if (errorTemporada) {
    throw new ErrorObtenerOpcionesEventoPanel(
      `No se ha podido obtener la temporada activa: ${errorTemporada.message}`,
    );
  }

  if (!temporadaEncontrada?.id) {
    return {
      temporada: null,
      equipos: [],
      instalaciones: [],
    };
  }

  const temporada =
    temporadaEncontrada as FilaTemporada;

  const [
    resultadoEquipos,
    resultadoInstalaciones,
  ] = await Promise.all([
    supabaseServidor
      .from("equipos")
      .select(
        `
          id,
          nombre,
          nombre_corto,
          categoria,
          genero,
          imagen
        `,
      )
      .eq(
        "temporada_id",
        temporada.id,
      )
      .eq("activo", true)
      .order(
        "categoria",
        {
          ascending: true,
        },
      )
      .order(
        "nombre",
        {
          ascending: true,
        },
      ),

    supabaseServidor
      .from("instalaciones")
      .select(
        `
          id,
          nombre,
          nombre_corto,
          direccion,
          localidad,
          codigo_postal
        `,
      )
      .eq("activa", true)
      .order(
        "nombre",
        {
          ascending: true,
        },
      ),
  ]);

  if (resultadoEquipos.error) {
    throw new ErrorObtenerOpcionesEventoPanel(
      `No se han podido obtener los equipos: ${resultadoEquipos.error.message}`,
    );
  }

  if (
    resultadoInstalaciones.error
  ) {
    throw new ErrorObtenerOpcionesEventoPanel(
      `No se han podido obtener las instalaciones: ${resultadoInstalaciones.error.message}`,
    );
  }

  const filasEquipos =
    (
      resultadoEquipos.data ??
      []
    ) as FilaEquipo[];

  const filasInstalaciones =
    (
      resultadoInstalaciones.data ??
      []
    ) as FilaInstalacion[];

  const equipos:
    EquipoEventoPanel[] =
    filasEquipos
      .map((equipo) => ({
        id: equipo.id,

        nombre:
          convertirTexto(
            equipo.nombre,
          ) ??
          convertirTexto(
            equipo.nombre_corto,
          ) ??
          "Equipo sin nombre",

        nombreCorto:
          convertirTexto(
            equipo.nombre_corto,
          ),

        categoria:
          convertirTexto(
            equipo.categoria,
          ),

        genero:
          convertirTexto(
            equipo.genero,
          ),

        imagen:
          convertirTexto(
            equipo.imagen,
          ),
      }))
      .sort(
        (
          equipoA,
          equipoB,
        ) =>
          ordenarTexto(
            equipoA.categoria,
            equipoB.categoria,
          ) ||
          ordenarTexto(
            equipoA.nombre,
            equipoB.nombre,
          ),
      );

  const instalaciones:
    InstalacionEventoPanel[] =
    filasInstalaciones
      .map(
        (instalacion) => ({
          id: instalacion.id,

          nombre:
            convertirTexto(
              instalacion.nombre,
            ) ??
            convertirTexto(
              instalacion.nombre_corto,
            ) ??
            "Instalación sin nombre",

          nombreCorto:
            convertirTexto(
              instalacion.nombre_corto,
            ),

          direccion:
            convertirTexto(
              instalacion.direccion,
            ),

          localidad:
            convertirTexto(
              instalacion.localidad,
            ),

          codigoPostal:
            convertirTexto(
              instalacion.codigo_postal,
            ),
        }),
      )
      .sort(
        (
          instalacionA,
          instalacionB,
        ) =>
          ordenarTexto(
            instalacionA.nombre,
            instalacionB.nombre,
          ),
      );

  return {
    temporada: {
      id: temporada.id,

      nombre:
        convertirTexto(
          temporada.nombre,
        ),
    },

    equipos,
    instalaciones,
  };
}