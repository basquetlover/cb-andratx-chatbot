import type {
  ActualizarPublicacionPartidos,
  ErrorCampoPublicacion,
  EstadoPartidoPublicacion,
  EstadoPublicacionPartidos,
  IdiomaPublicacionPartidos,
  OrigenPartidoPublicacion,
  PartidoPublicacion,
  PlantillaPublicacionPartidos,
} from "@tipos/PublicacionPartidosPanel";

interface ResultadoValidacion {
  valido: boolean;

  datos:
    | ActualizarPublicacionPartidos
    | null;

  errores: ErrorCampoPublicacion[];
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

const MAXIMO_PARTIDOS = 100;

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
  return typeof valor === "string"
    ? valor.trim()
    : "";
}

function convertirTextoNullable(
  valor: unknown,
): string | null {
  const texto = convertirTexto(valor);

  return texto.length > 0
    ? texto
    : null;
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

function esFechaIsoValida(
  valor: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    return false;
  }

  const [
    anioTexto,
    mesTexto,
    diaTexto,
  ] = valor.split("-");

  const anio = Number(anioTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);

  const fecha = new Date(
    Date.UTC(anio, mes - 1, dia),
  );

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

function normalizarHora(
  valor: unknown,
): string | null {
  const hora = convertirTextoNullable(valor);

  if (!hora) {
    return null;
  }

  const coincidencia = hora.match(
    /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/,
  );

  if (!coincidencia) {
    return null;
  }

  return `${coincidencia[1]}:${coincidencia[2]}`;
}

function esUrlPermitida(
  valor: string,
): boolean {
  if (valor.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(valor);

    return (
      url.protocol === "https:" ||
      url.protocol === "http:"
    );
  } catch {
    return false;
  }
}

function agregarError(
  errores: ErrorCampoPublicacion[],
  campo: string,
  mensaje: string,
): void {
  errores.push({
    campo,
    mensaje,
  });
}

function validarPartido(
  valor: unknown,
  indice: number,
  errores: ErrorCampoPublicacion[],
): PartidoPublicacion | null {
  const ruta = `partidos.${indice}`;

  if (!esObjeto(valor)) {
    agregarError(
      errores,
      ruta,
      "El partido no tiene un formato válido.",
    );

    return null;
  }

  const id = convertirTexto(valor.id);

  const origen =
    convertirTexto(
      valor.origen,
    ) as OrigenPartidoPublicacion;

  const estado =
    convertirTexto(
      valor.estado,
    ) as EstadoPartidoPublicacion;

  const fecha =
    convertirTextoNullable(valor.fecha);

  const horaOriginal =
    convertirTextoNullable(valor.hora);

  const hora =
    normalizarHora(valor.hora);

  const nombreEquipo =
    convertirTexto(valor.nombreEquipo);

  const nombreRival =
    convertirTexto(valor.nombreRival);

  const logoRival =
    convertirTextoNullable(valor.logoRival);

  const campo =
    convertirTexto(valor.campo);

  const orden = convertirEntero(
    valor.orden,
    indice + 1,
  );

  if (!id) {
    agregarError(
      errores,
      `${ruta}.id`,
      "El partido necesita un identificador.",
    );
  } else if (id.length > 200) {
    agregarError(
      errores,
      `${ruta}.id`,
      "El identificador del partido es demasiado largo.",
    );
  }

  if (!ORIGENES_PARTIDO.has(origen)) {
    agregarError(
      errores,
      `${ruta}.origen`,
      "El origen del partido no es válido.",
    );
  }

  if (!ESTADOS_PARTIDO.has(estado)) {
    agregarError(
      errores,
      `${ruta}.estado`,
      "El estado del partido no es válido.",
    );
  }

  if (
    orden < 1 ||
    orden > MAXIMO_PARTIDOS
  ) {
    agregarError(
      errores,
      `${ruta}.orden`,
      "El orden del partido no es válido.",
    );
  }

  if (!nombreEquipo) {
    agregarError(
      errores,
      `${ruta}.nombreEquipo`,
      "Debes indicar el nombre del equipo.",
    );
  } else if (nombreEquipo.length > 200) {
    agregarError(
      errores,
      `${ruta}.nombreEquipo`,
      "El nombre del equipo no puede superar los 200 caracteres.",
    );
  }

  if (
    estado === "partido" &&
    !nombreRival
  ) {
    agregarError(
      errores,
      `${ruta}.nombreRival`,
      "Debes indicar el nombre del rival.",
    );
  } else if (nombreRival.length > 200) {
    agregarError(
      errores,
      `${ruta}.nombreRival`,
      "El nombre del rival no puede superar los 200 caracteres.",
    );
  }

  if (
    estado === "partido" &&
    !fecha
  ) {
    agregarError(
      errores,
      `${ruta}.fecha`,
      "Debes indicar la fecha del partido.",
    );
  }

  if (
    fecha &&
    !esFechaIsoValida(fecha)
  ) {
    agregarError(
      errores,
      `${ruta}.fecha`,
      "La fecha del partido no es válida.",
    );
  }

  if (
    horaOriginal &&
    !hora
  ) {
    agregarError(
      errores,
      `${ruta}.hora`,
      "La hora del partido no es válida.",
    );
  }

  if (campo.length > 200) {
    agregarError(
      errores,
      `${ruta}.campo`,
      "El campo no puede superar los 200 caracteres.",
    );
  }

  if (
    logoRival &&
    !esUrlPermitida(logoRival)
  ) {
    agregarError(
      errores,
      `${ruta}.logoRival`,
      "La dirección del escudo del rival no es válida.",
    );
  }

  const partidoFbibId =
    convertirTextoNullable(
      valor.partidoFbibId,
    );

  const equipoId =
    convertirTextoNullable(
      valor.equipoId,
    );

  const equipoFbibId =
    convertirTextoNullable(
      valor.equipoFbibId,
    );

  const rivalFbibId =
    convertirTextoNullable(
      valor.rivalFbibId,
    );

  if (
    partidoFbibId &&
    partidoFbibId.length > 200
  ) {
    agregarError(
      errores,
      `${ruta}.partidoFbibId`,
      "El identificador FBIB del partido es demasiado largo.",
    );
  }

  if (
    equipoId &&
    equipoId.length > 200
  ) {
    agregarError(
      errores,
      `${ruta}.equipoId`,
      "El identificador del equipo es demasiado largo.",
    );
  }

  if (
    equipoFbibId &&
    equipoFbibId.length > 200
  ) {
    agregarError(
      errores,
      `${ruta}.equipoFbibId`,
      "El identificador FBIB del equipo es demasiado largo.",
    );
  }

  if (
    rivalFbibId &&
    rivalFbibId.length > 200
  ) {
    agregarError(
      errores,
      `${ruta}.rivalFbibId`,
      "El identificador FBIB del rival es demasiado largo.",
    );
  }

  return {
    id,
    partidoFbibId,
    origen,
    orden,
    visible: convertirBooleano(
      valor.visible,
      true,
    ),
    equipoId,
    equipoFbibId,
    fecha,
    hora,
    nombreEquipo,
    rivalFbibId,
    nombreRival,
    logoRival,
    campo,
    local:
      convertirBooleanoNullable(
        valor.local,
      ),
    estado,
  };
}

export function validarPublicacionPartidos(
  valor: unknown,
): ResultadoValidacion {
  const errores: ErrorCampoPublicacion[] =
    [];

  if (!esObjeto(valor)) {
    return {
      valido: false,
      datos: null,
      errores: [
        {
          campo: "datos",
          mensaje:
            "Los datos de la publicación no tienen un formato válido.",
        },
      ],
    };
  }

  const nombre =
    convertirTexto(valor.nombre);

  const titulo =
    convertirTexto(valor.titulo);

  const idioma =
    convertirTexto(
      valor.idioma,
    ) as IdiomaPublicacionPartidos;

  const fechaInicio =
    convertirTexto(valor.fechaInicio);

  const fechaFin =
    convertirTexto(valor.fechaFin);

  const plantilla =
    convertirTexto(
      valor.plantilla,
    ) as PlantillaPublicacionPartidos;

  const fondo =
    convertirTextoNullable(valor.fondo);

  const estado =
    convertirTexto(
      valor.estado,
    ) as EstadoPublicacionPartidos;

  const partidosPorImagen =
    convertirEntero(
      valor.partidosPorImagen,
      9,
    );

  if (!nombre) {
    agregarError(
      errores,
      "nombre",
      "Debes indicar un nombre para identificar la publicación.",
    );
  } else if (nombre.length > 150) {
    agregarError(
      errores,
      "nombre",
      "El nombre no puede superar los 150 caracteres.",
    );
  }

  if (!titulo) {
    agregarError(
      errores,
      "titulo",
      "Debes indicar el título de la publicación.",
    );
  } else if (titulo.length > 150) {
    agregarError(
      errores,
      "titulo",
      "El título no puede superar los 150 caracteres.",
    );
  }

  if (!IDIOMAS_PERMITIDOS.has(idioma)) {
    agregarError(
      errores,
      "idioma",
      "El idioma seleccionado no es válido.",
    );
  }

  if (
    !esFechaIsoValida(fechaInicio)
  ) {
    agregarError(
      errores,
      "fechaInicio",
      "La fecha inicial no es válida.",
    );
  }

  if (!esFechaIsoValida(fechaFin)) {
    agregarError(
      errores,
      "fechaFin",
      "La fecha final no es válida.",
    );
  }

  if (
    esFechaIsoValida(fechaInicio) &&
    esFechaIsoValida(fechaFin) &&
    fechaFin < fechaInicio
  ) {
    agregarError(
      errores,
      "fechaFin",
      "La fecha final no puede ser anterior a la fecha inicial.",
    );
  }

  if (
    !PLANTILLAS_PERMITIDAS.has(
      plantilla,
    )
  ) {
    agregarError(
      errores,
      "plantilla",
      "La plantilla seleccionada no es válida.",
    );
  }

  if (
    !ESTADOS_PUBLICACION.has(estado)
  ) {
    agregarError(
      errores,
      "estado",
      "El estado de la publicación no es válido.",
    );
  }

  if (
    partidosPorImagen < 1 ||
    partidosPorImagen > 20
  ) {
    agregarError(
      errores,
      "partidosPorImagen",
      "La cantidad de partidos por imagen debe estar entre 1 y 20.",
    );
  }

  if (
    fondo &&
    !esUrlPermitida(fondo)
  ) {
    agregarError(
      errores,
      "fondo",
      "La dirección del fondo no es válida.",
    );
  }

  if (!Array.isArray(valor.partidos)) {
    agregarError(
      errores,
      "partidos",
      "La configuración de partidos debe ser un array.",
    );
  }

  const partidosEntrada =
    Array.isArray(valor.partidos)
      ? valor.partidos
      : [];

  if (
    partidosEntrada.length >
    MAXIMO_PARTIDOS
  ) {
    agregarError(
      errores,
      "partidos",
      `Una publicación no puede contener más de ${MAXIMO_PARTIDOS} partidos.`,
    );
  }

  const partidos =
    partidosEntrada.flatMap(
      (partido, indice) => {
        const partidoValidado =
          validarPartido(
            partido,
            indice,
            errores,
          );

        return partidoValidado
          ? [partidoValidado]
          : [];
      },
    );

  const ids = new Set<string>();

  partidos.forEach(
    (partido, indice) => {
      if (ids.has(partido.id)) {
        agregarError(
          errores,
          `partidos.${indice}.id`,
          "Hay más de un partido con el mismo identificador.",
        );

        return;
      }

      ids.add(partido.id);
    },
  );

  if (errores.length > 0) {
    return {
      valido: false,
      datos: null,
      errores,
    };
  }

  return {
    valido: true,
    datos: {
      nombre,
      titulo,
      idioma,
      fechaInicio,
      fechaFin,
      plantilla,
      fondo,
      partidos: partidos
        .sort(
          (partidoA, partidoB) =>
            partidoA.orden -
            partidoB.orden,
        )
        .map(
          (partido, indice) => ({
            ...partido,
            orden: indice + 1,
          }),
        ),
      partidosPorImagen,
      estado,
    },
    errores: [],
  };
}