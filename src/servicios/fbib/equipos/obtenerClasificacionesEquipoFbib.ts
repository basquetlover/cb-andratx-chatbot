import { obtenerDatosEsbFbib } from "../cliente/obtenerDatosEsbFbib";

import type {
  ClasificacionEquipoFbib,
  FilaClasificacionFbib,
  GrupoEquipoFbib,
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
  valorPredeterminado = 0,
): number {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return valorPredeterminado;
  }

  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : valorPredeterminado;
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

  return Object.values(registro);
}

function extraerClasificacion(
  resultado: unknown,
): unknown[] {
  const respuesta =
    obtenerRegistro(resultado);

  if (!respuesta) {
    return [];
  }

  return convertirColeccion(
    respuesta.standing,
  );
}

function convertirFila(
  valor: unknown,
  idEquipoFbib: string,
): FilaClasificacionFbib | null {
  const fila =
    obtenerRegistro(valor);

  if (!fila) {
    return null;
  }

  const equipoNombre =
    convertirTexto(
      fila.teamName,
    );

  if (!equipoNombre) {
    return null;
  }

  const equipoId =
    convertirTexto(fila.idTeam);

  return {
    posicion:
      convertirNumero(
        fila.position,
        999,
      ),

    equipoId,
    equipoNombre,

    jugados:
      convertirNumero(
        fila.matchPlayed,
      ),

    ganados:
      convertirNumero(
        fila.matchWin,
      ),

    perdidos:
      convertirNumero(
        fila.matchLost,
      ),

    noPresentados:
      convertirNumero(
        fila.matchNotPresent,
      ),

    empatados:
      convertirNumero(
        fila.matchTie,
      ),

    puntosFavor:
      convertirNumero(
        fila.matchScoreFavour,
      ),

    puntosContra:
      convertirNumero(
        fila.matchScoreAgainst,
      ),

    puntosClasificacion:
      convertirNumero(
        fila.standingScore,
      ),

    esEquipoActual:
      equipoId === idEquipoFbib,
  };
}

async function obtenerClasificacionGrupo(
  grupo: GrupoEquipoFbib,
  idEquipoFbib: string,
): Promise<ClasificacionEquipoFbib | null> {
  try {
    const resultado =
      await obtenerDatosEsbFbib(
        `/FCBQWeb/resultats/${encodeURIComponent(grupo.id)}`,
      );

    const filas =
      extraerClasificacion(
        resultado,
      )
        .flatMap<FilaClasificacionFbib>(
          (fila) => {
            const filaConvertida =
              convertirFila(
                fila,
                idEquipoFbib,
              );

            return filaConvertida
              ? [filaConvertida]
              : [];
          },
        )
        .sort(
          (filaA, filaB) =>
            filaA.posicion -
            filaB.posicion,
        );

    if (filas.length === 0) {
      return null;
    }

    return {
      grupo,
      filas,

      enlaceFbib:
        `https://www.fbib.es/competicion/${encodeURIComponent(grupo.id)}`,
    };
  } catch (error) {
    console.error(
      `Error obteniendo la clasificación FBIB del grupo ${grupo.id}:`,
      error,
    );

    return null;
  }
}

export async function obtenerClasificacionesEquipoFbib(
  idEquipoFbib: string,
  grupos: GrupoEquipoFbib[],
): Promise<ClasificacionEquipoFbib[]> {
  const id = idEquipoFbib.trim();

  if (
    !id ||
    grupos.length === 0
  ) {
    return [];
  }

  const gruposUnicos =
    Array.from(
      new Map(
        grupos.map((grupo) => [
          grupo.id,
          grupo,
        ]),
      ).values(),
    );

  const clasificaciones =
    await Promise.all(
      gruposUnicos.map((grupo) =>
        obtenerClasificacionGrupo(
          grupo,
          id,
        ),
      ),
    );

  return clasificaciones.flatMap<
    ClasificacionEquipoFbib
  >((clasificacion) =>
    clasificacion
      ? [clasificacion]
      : [],
  );
}