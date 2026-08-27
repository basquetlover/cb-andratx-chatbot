import { obtenerDatosEsbFbib } from "../cliente/obtenerDatosEsbFbib";

import type {
  FichaEquipoFbib,
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

  return Object.values(registro);
}

function convertirGrupo(
  valor: unknown,
): GrupoEquipoFbib | null {
  const grupo = obtenerRegistro(valor);

  if (!grupo) {
    return null;
  }

  const id =
    convertirTexto(grupo.idGroup) ??
    convertirTexto(grupo.id);

  if (!id) {
    return null;
  }

  const competicion =
    convertirTexto(
      grupo.competitionName,
    ) ?? "Competición";

  const nombre =
    convertirTexto(grupo.nameGroup) ??
    convertirTexto(grupo.grupName) ??
    convertirTexto(grupo.groupName) ??
    "Grupo";

  return {
    id,
    nombre,
    competicion,

    categoria:
      convertirTexto(
        grupo.categoryName,
      ) ??
      convertirTexto(
        grupo.nameCategorySigned,
      ),

    temporada:
      convertirTexto(grupo.season),

    enlaceFbib:
      `https://www.fbib.es/competicion/${encodeURIComponent(id)}`,
  };
}

function obtenerEquipoRespuesta(
  resultado: unknown,
): Record<string, unknown> | null {
  const respuesta =
    obtenerRegistro(resultado);

  if (respuesta) {
    const equipo =
      obtenerRegistro(respuesta.team);

    if (equipo) {
      return equipo;
    }
  }

  if (Array.isArray(resultado)) {
    for (const elemento of resultado) {
      const registro =
        obtenerRegistro(elemento);

      if (!registro) {
        continue;
      }

      const equipo =
        obtenerRegistro(registro.team);

      if (equipo) {
        return equipo;
      }
    }
  }

  return null;
}

export async function obtenerFichaEquipoFbib(
  idEquipoFbib: string,
): Promise<FichaEquipoFbib | null> {
  const id = idEquipoFbib.trim();

  if (!id) {
    return null;
  }

  const resultado =
    await obtenerDatosEsbFbib(
      `/FCBQWeb/fitxaEquip/0/${encodeURIComponent(id)}`,
    );

  const equipo =
    obtenerEquipoRespuesta(resultado);

  if (!equipo) {
    return null;
  }

  const grupos =
    convertirColeccion(
      equipo.groups,
    ).flatMap<GrupoEquipoFbib>(
      (grupo) => {
        const grupoConvertido =
          convertirGrupo(grupo);

        return grupoConvertido
          ? [grupoConvertido]
          : [];
      },
    );

  return {
    id,

    nombre:
      convertirTexto(equipo.name) ??
      "Equipo",

    clubId:
      convertirTexto(equipo.idClub),

    clubNombre:
      convertirTexto(
        equipo.entityName,
      ),

    categoria:
      convertirTexto(
        equipo.categoriesRegistredName,
      ),

    temporada:
      convertirTexto(equipo.season),

    campo: {
      nombre:
        convertirTexto(
          equipo.fieldName,
        ),

      direccion:
        convertirTexto(
          equipo.fieldAddress,
        ),

      codigoPostal:
        convertirTexto(
          equipo.fieldPostalCode,
        ),
    },

    diaPartido:
      convertirNumero(
        equipo.matchDay,
      ),

    horaPartido:
      convertirTexto(
        equipo.matchTime,
      )?.slice(0, 5) ?? null,

    grupos,

    enlaceFbib:
      `https://www.fbib.es/equipo/${encodeURIComponent(id)}`,
  };
}