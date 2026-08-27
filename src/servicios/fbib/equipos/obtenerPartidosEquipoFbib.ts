import { obtenerDatosEsbFbib } from "../cliente/obtenerDatosEsbFbib";
import { obtenerEscudosEquiposFbib } from "./obtenerEscudosEquiposFbib";

import type {
  EstadoPartidoFbib,
  PartidoEquipoFbib,
} from "@tipos/FbibEquipoPublico";

function obtenerRegistro(
  valor: unknown,
): Record<string, unknown> | null {
  if (
    typeof valor !== "object" ||
    valor === null ||
    Array.isArray(valor)
  ) {
    return null;
  }

  return valor as Record<string, unknown>;
}

function convertirTexto(
  valor: unknown,
): string | null {
  if (
    typeof valor !== "string" &&
    typeof valor !== "number"
  ) {
    return null;
  }

  const texto = String(valor).trim();

  return texto.length > 0
    ? texto
    : null;
}

function convertirNumero(
  valor: unknown,
): number | null {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : null;
}

function convertirColeccion(
  valor: unknown,
): unknown[] {
  if (Array.isArray(valor)) {
    return valor;
  }

  const registro =
    obtenerRegistro(valor);

  if (!registro) {
    return [];
  }

  const posiblesColecciones = [
    registro.matches,
    registro.data,
    registro.results,
  ];

  for (
    const posibleColeccion
    of posiblesColecciones
  ) {
    if (Array.isArray(posibleColeccion)) {
      return posibleColeccion;
    }

    const coleccionComoRegistro =
      obtenerRegistro(
        posibleColeccion,
      );

    if (coleccionComoRegistro) {
      return Object.values(
        coleccionComoRegistro,
      );
    }
  }

  return [];
}

function obtenerFechaPartido(
  valor: unknown,
): {
  fecha: string | null;
  hora: string | null;
  fechaHora: string | null;
} {
  const texto =
    convertirTexto(valor);

  if (!texto) {
    return {
      fecha: null,
      hora: null,
      fechaHora: null,
    };
  }

  const coincidencia = texto.match(
    /^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2})(?::\d{2})?)?/,
  );

  if (!coincidencia) {
    return {
      fecha: null,
      hora: null,
      fechaHora: texto,
    };
  }

  const fecha = coincidencia[1];
  const hora = coincidencia[2] ?? null;

  return {
    fecha,
    hora,
    fechaHora: hora
      ? `${fecha}T${hora}:00`
      : fecha,
  };
}

function obtenerEstadoPartido(
  partido: Record<string, unknown>,
  marcadorLocal: number | null,
  marcadorVisitante: number | null,
): EstadoPartidoFbib {
  const estado =
    convertirTexto(partido.state);

  if (estado === "1") {
    return "finalizado";
  }

  if (estado === "0") {
    return "pendiente";
  }

  return marcadorLocal !== null &&
    marcadorVisitante !== null
    ? "finalizado"
    : "pendiente";
}

function crearIdPartido(
  partido: Record<string, unknown>,
  idLocal: string | null,
  idVisitante: string | null,
  fechaHora: string | null,
): string {
  return (
    convertirTexto(
      partido.idMatch,
    ) ??
    convertirTexto(
      partido.idMatchCall,
    ) ??
    convertirTexto(
      partido.universallyid,
    ) ??
    [
      idLocal ?? "local",
      idVisitante ?? "visitante",
      fechaHora ?? "sin-fecha",
    ].join("-")
  );
}

async function convertirPartido(
  valor: unknown,
  idEquipoFbib: string,
): Promise<PartidoEquipoFbib | null> {
  const partido =
    obtenerRegistro(valor);

  if (!partido) {
    return null;
  }

  const idEquipoLocal =
    convertirTexto(
      partido.idLocalTeam,
    );

  const idEquipoVisitante =
    convertirTexto(
      partido.idVisitorTeam,
    );

  const nombreLocal =
    convertirTexto(
      partido.nameLocalTeam,
    ) ?? "Equipo local";

  const nombreVisitante =
    convertirTexto(
      partido.nameVisitorTeam,
    ) ?? "Equipo visitante";

  const {
    fecha,
    hora,
    fechaHora,
  } = obtenerFechaPartido(
    partido.matchDay,
  );

  const marcadorLocal =
    convertirNumero(
      partido.localScore,
    );

  const marcadorVisitante =
    convertirNumero(
      partido.visitorScore,
    );

  const estado =
    obtenerEstadoPartido(
      partido,
      marcadorLocal,
      marcadorVisitante,
    );

  const idPartidoFbib =
    convertirTexto(
      partido.idMatch,
    );

  let escudoLocal: string | null =
    null;

  let escudoVisitante: string | null =
    null;

  if (
    idEquipoLocal &&
    idEquipoVisitante
  ) {
    const escudos =
      await obtenerEscudosEquiposFbib(
        idEquipoLocal,
        idEquipoVisitante,
      );

    escudoLocal = escudos.local;
    escudoVisitante =
      escudos.visitante;
  }

  let posicionEquipo:
    PartidoEquipoFbib["posicionEquipo"] =
      null;

  if (
    idEquipoLocal === idEquipoFbib
  ) {
    posicionEquipo = "local";
  } else if (
    idEquipoVisitante ===
    idEquipoFbib
  ) {
    posicionEquipo = "visitante";
  }

  return {
    id: crearIdPartido(
      partido,
      idEquipoLocal,
      idEquipoVisitante,
      fechaHora,
    ),

    idPartidoFbib,

    fecha,
    hora,
    fechaHora,

    local: {
      id: idEquipoLocal,
      nombre: nombreLocal,
      escudo: escudoLocal,
    },

    visitante: {
      id: idEquipoVisitante,
      nombre: nombreVisitante,
      escudo: escudoVisitante,
    },

    resultado:
      estado === "finalizado" &&
      marcadorLocal !== null &&
      marcadorVisitante !== null
        ? {
            local: marcadorLocal,
            visitante:
              marcadorVisitante,
          }
        : null,

    estado,
    posicionEquipo,

    campo:
      convertirTexto(
        partido.nameField,
      ),

    categoria:
      convertirTexto(
        partido.nameCategorySigned,
      ),

    competicion:
      convertirTexto(
        partido.nameCompetition,
      ),

    grupo:
      convertirTexto(
        partido.nameGroup,
      ),

    jornada:
      convertirNumero(
        partido.numMatchDay,
      ),

    enlaceFbib:
      idPartidoFbib
        ? `https://www.fbib.es/partido/${encodeURIComponent(idPartidoFbib)}`
        : null,
  };
}

async function convertirPartidos(
  resultado: unknown,
  idEquipoFbib: string,
): Promise<PartidoEquipoFbib[]> {
  const filas =
    convertirColeccion(resultado);

  const partidos =
    await Promise.all(
      filas.map((fila) =>
        convertirPartido(
          fila,
          idEquipoFbib,
        ),
      ),
    );

  return partidos
    .flatMap<PartidoEquipoFbib>(
      (partido) =>
        partido ? [partido] : [],
    )
    .sort((partidoA, partidoB) => {
      const fechaA =
        partidoA.fechaHora ?? "";

      const fechaB =
        partidoB.fechaHora ?? "";

      return fechaA.localeCompare(
        fechaB,
      );
    });
}

function normalizarIdEquipo(
  idEquipoFbib: string,
): string {
  const id = idEquipoFbib.trim();

  if (!id) {
    throw new Error(
      "El identificador FBIB del equipo es obligatorio.",
    );
  }

  return id;
}

export async function obtenerPartidosMesEquipoFbib(
  idEquipoFbib: string,
  mes: number,
): Promise<PartidoEquipoFbib[]> {
  const id =
    normalizarIdEquipo(
      idEquipoFbib,
    );

  if (
    !Number.isInteger(mes) ||
    mes < 1 ||
    mes > 12
  ) {
    throw new Error(
      "El mes debe estar comprendido entre 1 y 12.",
    );
  }

  const resultado =
    await obtenerDatosEsbFbib(
      `/Match/getByTeamAndMonth/${encodeURIComponent(id)}/${mes}`,
    );

  return convertirPartidos(
    resultado,
    id,
  );
}

export async function obtenerTodosPartidosTemporadaEquipoFbib(
  idEquipoFbib: string,
): Promise<PartidoEquipoFbib[]> {
  const id =
    normalizarIdEquipo(
      idEquipoFbib,
    );

  const resultado =
    await obtenerDatosEsbFbib(
      `/Match/getByTeamAllSeason/${encodeURIComponent(id)}`,
    );

  return convertirPartidos(
    resultado,
    id,
  );
}

export async function obtenerProximosPartidosEquipoFbib(
  idEquipoFbib: string,
  cantidad = 4,
): Promise<PartidoEquipoFbib[]> {
  const id =
    normalizarIdEquipo(
      idEquipoFbib,
    );

  const limite = Math.min(
    Math.max(
      Math.trunc(cantidad),
      1,
    ),
    10,
  );

  const resultado =
    await obtenerDatosEsbFbib(
      `/Match/getByStateAndTeamId/0/${encodeURIComponent(id)}/${limite}`,
    );

  const partidos =
    await convertirPartidos(
      resultado,
      id,
    );

  return partidos.slice(0, limite);
}

export async function obtenerUltimosPartidosEquipoFbib(
  idEquipoFbib: string,
  cantidad = 4,
): Promise<PartidoEquipoFbib[]> {
  const id =
    normalizarIdEquipo(
      idEquipoFbib,
    );

  const limite = Math.min(
    Math.max(
      Math.trunc(cantidad),
      1,
    ),
    10,
  );

  const resultado =
    await obtenerDatosEsbFbib(
      `/Match/getByStateAndTeamId/1/${encodeURIComponent(id)}/${limite}`,
    );

  const partidos =
    await convertirPartidos(
      resultado,
      id,
    );

  return partidos
    .sort((partidoA, partidoB) => {
      const fechaA =
        partidoA.fechaHora ?? "";

      const fechaB =
        partidoB.fechaHora ?? "";

      return fechaB.localeCompare(
        fechaA,
      );
    })
    .slice(0, limite);
}