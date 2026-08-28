import {
  obtenerDatosEsbFbib,
} from "@servicios/fbib/cliente/obtenerDatosEsbFbib";

import type {
  RivalFbibPublicacion,
} from "@tipos/PublicacionPartidosPanel";

interface ClubFbib {
  id: string;
  nombre: string;
  localidad: string | null;
}

interface EquipoClubFbib {
  id: string;
  nombre: string;
  categoria: string | null;
}

export class ErrorBuscarRivalesPublicacion
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name =
      "ErrorBuscarRivalesPublicacion";

    this.status = status;
  }
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

function convertirTexto(
  valor: unknown,
): string {
  if (
    typeof valor === "string" ||
    typeof valor === "number"
  ) {
    return String(valor).trim();
  }

  return "";
}

function convertirTextoNullable(
  valor: unknown,
): string | null {
  const texto =
    convertirTexto(valor);

  return texto || null;
}

function normalizarBusqueda(
  valor: string,
): string {
  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim();
}

function extraerColeccion(
  valor: unknown,
): Record<string, unknown>[] {
  if (Array.isArray(valor)) {
    return valor.filter(
      esObjeto,
    );
  }

  if (esObjeto(valor)) {
    return Object.values(
      valor,
    ).filter(
      esObjeto,
    );
  }

  return [];
}

function convertirClub(
  valor: unknown,
): ClubFbib | null {
  if (!esObjeto(valor)) {
    return null;
  }

  const id =
    convertirTexto(valor.id);

  const nombre =
    convertirTexto(valor.name);

  if (!id || !nombre) {
    return null;
  }

  return {
    id,
    nombre,
    localidad:
      convertirTextoNullable(
        valor.town,
      ),
  };
}

function extraerClubes(
  valor: unknown,
): ClubFbib[] {
  return extraerColeccion(valor)
    .flatMap((elemento) => {
      const club =
        convertirClub(elemento);

      return club
        ? [club]
        : [];
    });
}

function extraerEquiposClub(
  valor: unknown,
): EquipoClubFbib[] {
  if (!esObjeto(valor)) {
    return [];
  }

  const categorias =
    extraerColeccion(
      valor.categories,
    );

  const equipos =
    categorias.flatMap(
      (categoria) => {
        const nombreCategoria =
          convertirTextoNullable(
            categoria.name,
          );

        return extraerColeccion(
          categoria.teams,
        ).flatMap((equipo) => {
          const id =
            convertirTexto(
              equipo.idSignedTeam,
            );

          const nombre =
            convertirTexto(
              equipo.name,
            );

          if (!id || !nombre) {
            return [];
          }

          return [
            {
              id,
              nombre,
              categoria:
                nombreCategoria,
            },
          ];
        });
      },
    );

  const ids =
    new Set<string>();

  return equipos.filter(
    (equipo) => {
      if (ids.has(equipo.id)) {
        return false;
      }

      ids.add(equipo.id);

      return true;
    },
  );
}

function crearUrlEscudo(
  equipoFbibId: string,
): string {
  const parametros =
    new URLSearchParams({
      equipoFbibId,
    });

  return (
    "/api/panel/publicaciones/" +
    "partidos/escudo-fbib?" +
    parametros.toString()
  );
}

async function obtenerEquiposClub(
  club: ClubFbib,
): Promise<RivalFbibPublicacion[]> {
  const resultado =
    await obtenerDatosEsbFbib(
      `/FCBQWeb/fitxaClub/${encodeURIComponent(
        club.id,
      )}`,
    );

  const equipos =
    extraerEquiposClub(
      resultado,
    );

  return equipos.map(
    (equipo) => ({
      id: equipo.id,

      nombre:
        equipo.nombre,

      nombreCorto:
        equipo.categoria,

      clubId:
        club.id,

      clubNombre:
        club.nombre,

      escudo:
        crearUrlEscudo(
          equipo.id,
        ),
    }),
  );
}

export async function buscarRivalesPublicacion(
  consulta: string,
): Promise<RivalFbibPublicacion[]> {
  const consultaLimpia =
    consulta.trim();

  if (consultaLimpia.length < 2) {
    throw new ErrorBuscarRivalesPublicacion(
      "Debes escribir al menos dos caracteres.",
      400,
    );
  }

  if (consultaLimpia.length > 100) {
    throw new ErrorBuscarRivalesPublicacion(
      "La búsqueda no puede superar los 100 caracteres.",
      400,
    );
  }

  let resultadoClubes: unknown;

  try {
    resultadoClubes =
      await obtenerDatosEsbFbib(
        "/Clubs/getActiveWeb",
      );
  } catch (error) {
    console.error(
      "Error obteniendo los clubes activos de la FBIB:",
      error,
    );

    throw new ErrorBuscarRivalesPublicacion(
      "No se han podido consultar los clubes de la FBIB.",
      502,
    );
  }

  const busquedaNormalizada =
    normalizarBusqueda(
      consultaLimpia,
    );

  const clubes =
    extraerClubes(
      resultadoClubes,
    )
      .filter((club) => {
        const contenido =
          normalizarBusqueda(
            [
              club.nombre,
              club.localidad,
            ]
              .filter(Boolean)
              .join(" "),
          );

        return contenido.includes(
          busquedaNormalizada,
        );
      })
      .slice(0, 10);

  if (clubes.length === 0) {
    return [];
  }

  const consultas =
    await Promise.allSettled(
      clubes.map(
        obtenerEquiposClub,
      ),
    );

  const resultados:
    RivalFbibPublicacion[] = [];

  let consultasCorrectas = 0;

  consultas.forEach(
    (resultado, indice) => {
      if (
        resultado.status ===
        "fulfilled"
      ) {
        consultasCorrectas += 1;

        resultados.push(
          ...resultado.value,
        );

        return;
      }

      console.error(
        `Error obteniendo los equipos del club FBIB ${clubes[indice].id}:`,
        resultado.reason,
      );
    },
  );

  if (consultasCorrectas === 0) {
    throw new ErrorBuscarRivalesPublicacion(
      "No se han podido obtener los equipos de los clubes encontrados.",
      502,
    );
  }

  const idsEncontrados =
    new Set<string>();

  return resultados
    .filter((resultado) => {
      if (
        idsEncontrados.has(
          resultado.id,
        )
      ) {
        return false;
      }

      idsEncontrados.add(
        resultado.id,
      );

      return true;
    })
    .sort((resultadoA, resultadoB) => {
      const clubA =
        resultadoA.clubNombre ?? "";

      const clubB =
        resultadoB.clubNombre ?? "";

      return (
        clubA.localeCompare(
          clubB,
          "es",
        ) ||
        resultadoA.nombre.localeCompare(
          resultadoB.nombre,
          "es",
        )
      );
    })
    .slice(0, 50);
}