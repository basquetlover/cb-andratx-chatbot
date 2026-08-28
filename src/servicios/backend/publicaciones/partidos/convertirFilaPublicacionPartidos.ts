import type {
  EstadoPartidoPublicacion,
  EstadoPublicacionPartidos,
  IdiomaPublicacionPartidos,
  OrigenPartidoPublicacion,
  PartidoPublicacion,
  PlantillaPublicacionPartidos,
  PublicacionPartidosPanel,
  ResumenPublicacionPartidos,
} from "@tipos/PublicacionPartidosPanel";

export interface FilaPublicacionPartidos {
  id: string;

  temporada_id: string | null;

  nombre: string | null;
  titulo: string | null;

  idioma: string | null;

  fecha_inicio: string;
  fecha_fin: string;

  plantilla: string | null;
  fondo: string | null;

  partidos: unknown;
  partidos_por_imagen: number | null;

  estado: string | null;

  creado_por: string | null;
  actualizado_por: string | null;

  created_at: string;
  updated_at: string;
}

const IDIOMAS_PERMITIDOS =
  new Set<IdiomaPublicacionPartidos>([
    "es",
    "ca",
  ]);

const ESTADOS_PUBLICACION =
  new Set<EstadoPublicacionPartidos>([
    "borrador",
    "finalizada",
    "archivada",
  ]);

const PLANTILLAS_PERMITIDAS =
  new Set<PlantillaPublicacionPartidos>([
    "partidos-semana",
  ]);

const ORIGENES_PARTIDO =
  new Set<OrigenPartidoPublicacion>([
    "fbib",
    "manual",
  ]);

const ESTADOS_PARTIDO =
  new Set<EstadoPartidoPublicacion>([
    "partido",
    "descansa",
    "aplazado",
  ]);

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
  predeterminado = "",
): string {
  if (typeof valor !== "string") {
    return predeterminado;
  }

  const texto = valor.trim();

  return texto || predeterminado;
}

function convertirTextoNullable(
  valor: unknown,
): string | null {
  const texto = convertirTexto(valor);

  return texto || null;
}

function convertirBooleano(
  valor: unknown,
  predeterminado = false,
): boolean {
  return typeof valor === "boolean"
    ? valor
    : predeterminado;
}

function convertirBooleanoNullable(
  valor: unknown,
): boolean | null {
  return typeof valor === "boolean"
    ? valor
    : null;
}

function convertirEntero(
  valor: unknown,
  predeterminado: number,
): number {
  if (
    typeof valor !== "number" ||
    !Number.isInteger(valor)
  ) {
    return predeterminado;
  }

  return valor;
}

function convertirIdioma(
  valor: unknown,
): IdiomaPublicacionPartidos {
  const idioma =
    convertirTexto(
      valor,
    ) as IdiomaPublicacionPartidos;

  return IDIOMAS_PERMITIDOS.has(idioma)
    ? idioma
    : "es";
}

function convertirEstadoPublicacion(
  valor: unknown,
): EstadoPublicacionPartidos {
  const estado =
    convertirTexto(
      valor,
    ) as EstadoPublicacionPartidos;

  return ESTADOS_PUBLICACION.has(
    estado,
  )
    ? estado
    : "borrador";
}

function convertirPlantilla(
  valor: unknown,
): PlantillaPublicacionPartidos {
  const plantilla =
    convertirTexto(
      valor,
    ) as PlantillaPublicacionPartidos;

  return PLANTILLAS_PERMITIDAS.has(
    plantilla,
  )
    ? plantilla
    : "partidos-semana";
}

function convertirOrigenPartido(
  valor: unknown,
): OrigenPartidoPublicacion {
  const origen =
    convertirTexto(
      valor,
    ) as OrigenPartidoPublicacion;

  return ORIGENES_PARTIDO.has(origen)
    ? origen
    : "manual";
}

function convertirEstadoPartido(
  valor: unknown,
): EstadoPartidoPublicacion {
  const estado =
    convertirTexto(
      valor,
    ) as EstadoPartidoPublicacion;

  return ESTADOS_PARTIDO.has(estado)
    ? estado
    : "partido";
}

function convertirHora(
  valor: unknown,
): string | null {
  const hora =
    convertirTextoNullable(valor);

  if (!hora) {
    return null;
  }

  return hora.length >= 5
    ? hora.slice(0, 5)
    : hora;
}

function convertirPartido(
  valor: unknown,
  indice: number,
): PartidoPublicacion | null {
  if (!esObjeto(valor)) {
    return null;
  }

  const id =
    convertirTexto(valor.id);

  if (!id) {
    return null;
  }

  return {
    id,

    partidoFbibId:
      convertirTextoNullable(
        valor.partidoFbibId,
      ),

    origen: convertirOrigenPartido(
      valor.origen,
    ),

    orden: convertirEntero(
      valor.orden,
      indice + 1,
    ),

    visible: convertirBooleano(
      valor.visible,
      true,
    ),

    equipoId:
      convertirTextoNullable(
        valor.equipoId,
      ),

    equipoFbibId:
      convertirTextoNullable(
        valor.equipoFbibId,
      ),

    fecha:
      convertirTextoNullable(
        valor.fecha,
      ),

    hora: convertirHora(valor.hora),

    nombreEquipo:
      convertirTexto(
        valor.nombreEquipo,
        "Equipo",
      ),

    rivalFbibId:
      convertirTextoNullable(
        valor.rivalFbibId,
      ),

    nombreRival:
      convertirTexto(
        valor.nombreRival,
      ),

    logoRival:
      convertirTextoNullable(
        valor.logoRival,
      ),

    campo:
      convertirTexto(valor.campo),

    local:
      convertirBooleanoNullable(
        valor.local,
      ),

    estado:
      convertirEstadoPartido(
        valor.estado,
      ),
  };
}

export function convertirPartidosPublicacion(
  valor: unknown,
): PartidoPublicacion[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  const idsEncontrados =
    new Set<string>();

  return valor
    .flatMap((elemento, indice) => {
      const partido =
        convertirPartido(
          elemento,
          indice,
        );

      if (
        !partido ||
        idsEncontrados.has(partido.id)
      ) {
        return [];
      }

      idsEncontrados.add(partido.id);

      return [partido];
    })
    .sort(
      (partidoA, partidoB) =>
        partidoA.orden -
        partidoB.orden,
    )
    .map((partido, indice) => ({
      ...partido,
      orden: indice + 1,
    }));
}

export function convertirFilaPublicacionPartidos(
  fila: FilaPublicacionPartidos,
): PublicacionPartidosPanel {
  const partidos =
    convertirPartidosPublicacion(
      fila.partidos,
    );

  const partidosPorImagen =
    Math.min(
      20,
      Math.max(
        1,
        convertirEntero(
          fila.partidos_por_imagen,
          9,
        ),
      ),
    );

  return {
    id: fila.id,

    temporadaId:
      fila.temporada_id,

    nombre:
      convertirTexto(
        fila.nombre,
        "Publicación de partidos",
      ),

    titulo:
      convertirTexto(
        fila.titulo,
        "PARTIDOS DE LA SEMANA",
      ),

    idioma:
      convertirIdioma(fila.idioma),

    fechaInicio:
      fila.fecha_inicio,

    fechaFin:
      fila.fecha_fin,

    plantilla:
      convertirPlantilla(
        fila.plantilla,
      ),

    fondo:
      convertirTextoNullable(
        fila.fondo,
      ),

    partidos,

    partidosPorImagen,

    estado:
      convertirEstadoPublicacion(
        fila.estado,
      ),

    creadoPor:
      fila.creado_por,

    actualizadoPor:
      fila.actualizado_por,

    createdAt:
      fila.created_at,

    updatedAt:
      fila.updated_at,
  };
}

export function convertirResumenPublicacionPartidos(
  fila: FilaPublicacionPartidos,
): ResumenPublicacionPartidos {
  const publicacion =
    convertirFilaPublicacionPartidos(
      fila,
    );

  const totalPartidos =
    publicacion.partidos.filter(
      (partido) => partido.visible,
    ).length;

  const totalPaginas =
    totalPartidos === 0
      ? 0
      : Math.ceil(
          totalPartidos /
            publicacion.partidosPorImagen,
        );

  return {
    id: publicacion.id,

    nombre: publicacion.nombre,
    titulo: publicacion.titulo,

    idioma: publicacion.idioma,

    fechaInicio:
      publicacion.fechaInicio,

    fechaFin:
      publicacion.fechaFin,

    estado: publicacion.estado,

    totalPartidos,
    totalPaginas,

    creadoPor:
      publicacion.creadoPor,

    actualizadoPor:
      publicacion.actualizadoPor,

    createdAt:
      publicacion.createdAt,

    updatedAt:
      publicacion.updatedAt,
  };
}