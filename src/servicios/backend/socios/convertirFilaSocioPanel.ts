import type {
  CarnetTemporadaSocio,
  EstadoCarnetSocio,
  ResumenSocioPanel,
  SocioPanel,
  TemporadaResumenSocio,
} from "@tipos/SocioPanel";

const estadosCarnet:
  EstadoCarnetSocio[] = [
    "pendiente",
    "activo",
    "bloqueado",
    "caducado",
  ];

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
    typeof valor === "string"
  ) {
    return valor.trim();
  }

  if (
    typeof valor === "number"
  ) {
    return String(
      valor,
    ).trim();
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

function convertirNumero(
  valor: unknown,
): number {
  if (
    typeof valor === "number" &&
    Number.isFinite(valor)
  ) {
    return valor;
  }

  if (
    typeof valor === "string" &&
    valor.trim()
  ) {
    const numero =
      Number(valor);

    if (
      Number.isFinite(numero)
    ) {
      return numero;
    }
  }

  return 0;
}

function convertirBooleano(
  valor: unknown,
): boolean {
  return valor === true;
}

function convertirEstadoCarnet(
  valor: unknown,
): EstadoCarnetSocio {
  const texto =
    convertirTexto(valor);

  return (
    estadosCarnet.find(
      (estado) =>
        estado === texto,
    ) ?? "pendiente"
  );
}

function obtenerRelacionUnica(
  valor: unknown,
): Record<string, unknown> | null {
  if (esObjeto(valor)) {
    return valor;
  }

  if (
    Array.isArray(valor)
  ) {
    const primerElemento =
      valor.find(
        esObjeto,
      );

    return primerElemento ?? null;
  }

  return null;
}

function obtenerColeccion(
  valor: unknown,
): Record<string, unknown>[] {
  if (
    !Array.isArray(valor)
  ) {
    return [];
  }

  return valor.filter(
    esObjeto,
  );
}

function convertirTemporada(
  valor: unknown,
): TemporadaResumenSocio | null {
  const fila =
    obtenerRelacionUnica(
      valor,
    );

  if (!fila) {
    return null;
  }

  const id =
    convertirTexto(
      fila.id,
    );

  if (!id) {
    return null;
  }

  return {
    id,

    nombre:
      convertirTexto(
        fila.nombre,
      ) ||
      "Temporada",

    activa:
      convertirBooleano(
        fila.activa,
      ),

    fechaInicio:
      convertirTextoNullable(
        fila.fecha_inicio,
      ),

    fechaFin:
      convertirTextoNullable(
        fila.fecha_fin,
      ),
  };
}

export function convertirFilaCarnetSocio(
  valor: unknown,
): CarnetTemporadaSocio | null {
  if (!esObjeto(valor)) {
    return null;
  }

  const id =
    convertirTexto(
      valor.id,
    );

  const socioId =
    convertirTexto(
      valor.socio_id,
    );

  const temporadaId =
    convertirTexto(
      valor.temporada_id,
    );

  const numeroCarnet =
    convertirTexto(
      valor.numero_carnet,
    );

  const temporada =
    convertirTemporada(
      valor.temporadas ??
        valor.temporada,
    );

  if (
    !id ||
    !socioId ||
    !temporadaId ||
    !numeroCarnet
  ) {
    return null;
  }

  return {
    id,
    socioId,
    temporadaId,
    numeroCarnet,

    tipoSocio:
      convertirTextoNullable(
        valor.tipo_socio,
      ),

    estado:
      convertirEstadoCarnet(
        valor.estado,
      ),

    fechaAlta:
      convertirTexto(
        valor.fecha_alta,
      ),

    fechaCaducidad:
      convertirTexto(
        valor.fecha_caducidad,
      ),

    activadoAt:
      convertirTextoNullable(
        valor.activado_at,
      ),

    bloqueadoAt:
      convertirTextoNullable(
        valor.bloqueado_at,
      ),

    motivoBloqueo:
      convertirTextoNullable(
        valor.motivo_bloqueo,
      ),

    bloqueadoHasta:
      convertirTextoNullable(
        valor.bloqueado_hasta,
      ),

    emailBienvenidaEnviadoAt:
      convertirTextoNullable(
        valor.email_bienvenida_enviado_at,
      ),

    ultimoAccesoAt:
      convertirTextoNullable(
        valor.ultimo_acceso_at,
      ),

    intentosFallidos:
      convertirNumero(
        valor.intentos_fallidos,
      ),

    versionAcceso:
      Math.max(
        1,
        convertirNumero(
          valor.version_acceso,
        ),
      ),

    createdAt:
      convertirTexto(
        valor.created_at,
      ),

    updatedAt:
      convertirTexto(
        valor.updated_at,
      ),

    temporada:
      temporada ?? {
        id:
          temporadaId,

        nombre:
          "Temporada",

        activa:
          false,

        fechaInicio:
          null,

        fechaFin:
          null,
      },
  };
}

function ordenarHistorial(
  carnets:
    CarnetTemporadaSocio[],
): CarnetTemporadaSocio[] {
  return [...carnets].sort(
    (primero, segundo) => {
      const comparacionFecha =
        segundo.fechaAlta.localeCompare(
          primero.fechaAlta,
        );

      if (
        comparacionFecha !== 0
      ) {
        return comparacionFecha;
      }

      return segundo.createdAt.localeCompare(
        primero.createdAt,
      );
    },
  );
}

function obtenerCarnetActual(
  historial:
    CarnetTemporadaSocio[],
  temporadaActivaId:
    string | null,
): CarnetTemporadaSocio | null {
  if (
    temporadaActivaId
  ) {
    const carnetTemporadaActiva =
      historial.find(
        (carnet) =>
          carnet.temporadaId ===
          temporadaActivaId,
      );

    if (
      carnetTemporadaActiva
    ) {
      return carnetTemporadaActiva;
    }
  }

  const carnetMarcadoActivo =
    historial.find(
      (carnet) =>
        carnet.temporada.activa,
    );

  return (
    carnetMarcadoActivo ??
    null
  );
}

function convertirDatosSocio(
  valor: unknown,
  temporadaActivaId:
    string | null,
): {
  resumen: ResumenSocioPanel;
  observaciones: string | null;
  historial: CarnetTemporadaSocio[];
} | null {
  if (!esObjeto(valor)) {
    return null;
  }

  const id =
    convertirTexto(
      valor.id,
    );

  const numeroSocio =
    convertirNumero(
      valor.numero_socio,
    );

  const nombre =
    convertirTexto(
      valor.nombre,
    );

  const apellidos =
    convertirTexto(
      valor.apellidos,
    );

  const email =
    convertirTexto(
      valor.email,
    ).toLowerCase();

  if (
    !id ||
    numeroSocio < 1 ||
    !nombre ||
    !apellidos ||
    !email
  ) {
    return null;
  }

  const filasCarnets =
    obtenerColeccion(
      valor.socios_temporadas ??
        valor.carnets,
    );

  const historial =
    ordenarHistorial(
      filasCarnets.flatMap(
        (fila) => {
          const carnet =
            convertirFilaCarnetSocio(
              fila,
            );

          return carnet
            ? [carnet]
            : [];
        },
      ),
    );

  const carnetActual =
    obtenerCarnetActual(
      historial,
      temporadaActivaId,
    );

  const createdAt =
    convertirTexto(
      valor.created_at,
    );

  const updatedAt =
    convertirTexto(
      valor.updated_at,
    );

  const resumen:
    ResumenSocioPanel = {
      id,
      numeroSocio,
      nombre,
      apellidos,

      nombreCompleto:
        `${nombre} ${apellidos}`.trim(),

      email,

      telefono:
        convertirTextoNullable(
          valor.telefono,
        ),

      activo:
        convertirBooleano(
          valor.activo,
        ),

      carnetActual,

      totalTemporadas:
        historial.length,

      createdAt,
      updatedAt,
  };

  return {
    resumen,

    observaciones:
      convertirTextoNullable(
        valor.observaciones,
      ),

    historial,
  };
}

export function convertirFilaResumenSocioPanel(
  valor: unknown,
  temporadaActivaId:
    | string
    | null = null,
): ResumenSocioPanel | null {
  return (
    convertirDatosSocio(
      valor,
      temporadaActivaId,
    )?.resumen ?? null
  );
}

export function convertirFilaSocioPanel(
  valor: unknown,
  temporadaActivaId:
    | string
    | null = null,
): SocioPanel | null {
  const datos =
    convertirDatosSocio(
      valor,
      temporadaActivaId,
    );

  if (!datos) {
    return null;
  }

  return {
    ...datos.resumen,

    observaciones:
      datos.observaciones,

    historial:
      datos.historial,
  };
}