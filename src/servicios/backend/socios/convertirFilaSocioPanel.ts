import type {
  CarnetTemporadaSocio,
  EstadoCarnetSocio,
  ResumenSocioPanel,
  SocioPanel,
  TemporadaResumenSocio,
} from "@tipos/SocioPanel";

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

function convertirNumero(
  valor: unknown,
  predeterminado = 0,
): number {
  if (
    typeof valor === "number" &&
    Number.isFinite(valor)
  ) {
    return valor;
  }

  if (
    typeof valor === "string"
  ) {
    const numero =
      Number(valor);

    if (
      Number.isFinite(numero)
    ) {
      return numero;
    }
  }

  return predeterminado;
}

function convertirBooleano(
  valor: unknown,
): boolean {
  return valor === true;
}

function convertirEstadoCarnet(
  valor: unknown,
): EstadoCarnetSocio {
  switch (valor) {
    case "activo":
    case "pendiente":
    case "bloqueado":
    case "caducado":
      return valor;

    default:
      return "pendiente";
  }
}

function obtenerRelacionUnica(
  valor: unknown,
): Record<string, unknown> | null {
  if (Array.isArray(valor)) {
    const primeraRelacion =
      valor.find(
        esObjeto,
      );

    return primeraRelacion ??
      null;
  }

  return esObjeto(valor)
    ? valor
    : null;
}

function obtenerColeccion(
  valor: unknown,
): unknown[] {
  return Array.isArray(valor)
    ? valor
    : [];
}

function comprobarAccesoBloqueado(
  bloqueadoHasta: string | null,
): boolean {
  if (!bloqueadoHasta) {
    return false;
  }

  const fechaBloqueo =
    new Date(
      bloqueadoHasta,
    ).getTime();

  if (
    !Number.isFinite(
      fechaBloqueo,
    )
  ) {
    return false;
  }

  return fechaBloqueo >
    Date.now();
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
      ) || "Temporada",

    fechaInicio:
      convertirTexto(
        fila.fecha_inicio ??
          fila.fechaInicio,
      ),

    fechaFin:
      convertirTexto(
        fila.fecha_fin ??
          fila.fechaFin,
      ),

    activa:
      convertirBooleano(
        fila.activa,
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
      valor.socio_id ??
        valor.socioId,
    );

  const temporadaId =
    convertirTexto(
      valor.temporada_id ??
        valor.temporadaId,
    );

  const numeroSocio =
    convertirNumero(
      valor.numero_socio ??
        valor.numeroSocio,
    );

  const numeroCarnet =
    convertirTexto(
      valor.numero_carnet ??
        valor.numeroCarnet,
    );

  const temporada =
    convertirTemporada(
      valor.temporada,
    );

  if (
    !id ||
    !socioId ||
    !temporadaId ||
    numeroSocio < 1 ||
    !numeroCarnet ||
    !temporada
  ) {
    return null;
  }

  const createdAt =
    convertirTexto(
      valor.created_at ??
        valor.createdAt,
    );

  const updatedAt =
    convertirTexto(
      valor.updated_at ??
        valor.updatedAt,
    ) ||
    createdAt;

  const passwordUpdatedAt =
    convertirTexto(
      valor.password_updated_at ??
        valor.passwordUpdatedAt,
    ) ||
    updatedAt ||
    createdAt;

  const bloqueadoHasta =
    convertirTextoNullable(
      valor.bloqueado_hasta ??
        valor.bloqueadoHasta,
    );

  return {
    id,
    socioId,
    temporadaId,

    numeroSocio,
    numeroCarnet,

    tipoSocio:
      convertirTextoNullable(
        valor.tipo_socio ??
          valor.tipoSocio,
      ),

    estado:
      convertirEstadoCarnet(
        valor.estado,
      ),

    fechaAlta:
      convertirTexto(
        valor.fecha_alta ??
          valor.fechaAlta,
      ),

    fechaCaducidad:
      convertirTexto(
        valor.fecha_caducidad ??
          valor.fechaCaducidad,
      ),

    motivoBloqueo:
      convertirTextoNullable(
        valor.motivo_bloqueo ??
          valor.motivoBloqueo,
      ),

    activadoAt:
      convertirTextoNullable(
        valor.activado_at ??
          valor.activadoAt,
      ),

    activadoPor:
      convertirTextoNullable(
        valor.activado_por ??
          valor.activadoPor,
      ),

    bloqueadoAt:
      convertirTextoNullable(
        valor.bloqueado_at ??
          valor.bloqueadoAt,
      ),

    bloqueadoPor:
      convertirTextoNullable(
        valor.bloqueado_por ??
          valor.bloqueadoPor,
      ),

    versionAcceso:
      Math.max(
        1,
        Math.trunc(
          convertirNumero(
            valor.version_acceso ??
              valor.versionAcceso,
            1,
          ),
        ),
      ),

    passwordUpdatedAt,

    intentosFallidos:
      Math.max(
        0,
        Math.trunc(
          convertirNumero(
            valor.intentos_fallidos ??
              valor.intentosFallidos,
            0,
          ),
        ),
      ),

    bloqueadoHasta,

    ultimoAccesoAt:
      convertirTextoNullable(
        valor.ultimo_acceso_at ??
          valor.ultimoAccesoAt,
      ),

    emailBienvenidaEnviadoAt:
      convertirTextoNullable(
        valor.email_bienvenida_enviado_at ??
          valor.emailBienvenidaEnviadoAt,
      ),

    accesoBloqueado:
      comprobarAccesoBloqueado(
        bloqueadoHasta,
      ),

    createdAt,
    updatedAt,

    temporada,
  };
}

function obtenerCarnets(
  valor:
    Record<string, unknown>,
): CarnetTemporadaSocio[] {
  const coleccion =
    obtenerColeccion(
      valor.carnets ??
        valor.socios_temporadas,
    );

  return coleccion
    .flatMap(
      (elemento) => {
        const carnet =
          convertirFilaCarnetSocio(
            elemento,
          );

        return carnet
          ? [carnet]
          : [];
      },
    )
    .sort(
      (
        carnetA,
        carnetB,
      ) => {
        const fechaA =
          carnetA.temporada
            .fechaInicio ||
          carnetA.fechaAlta ||
          carnetA.createdAt;

        const fechaB =
          carnetB.temporada
            .fechaInicio ||
          carnetB.fechaAlta ||
          carnetB.createdAt;

        return fechaB.localeCompare(
          fechaA,
        );
      },
    );
}

function obtenerCarnetActual(
  carnets:
    CarnetTemporadaSocio[],
  temporadaActivaId:
    string | null,
): CarnetTemporadaSocio | null {
  if (temporadaActivaId) {
    const carnetTemporadaActiva =
      carnets.find(
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

  return (
    carnets.find(
      (carnet) =>
        carnet.temporada
          .activa,
    ) ?? null
  );
}

function convertirDatosComunesSocio(
  valor: unknown,
  temporadaActivaId:
    string | null = null,
): {
  resumen: ResumenSocioPanel;
  fila:
    Record<string, unknown>;
  carnets:
    CarnetTemporadaSocio[];
} | null {
  if (!esObjeto(valor)) {
    return null;
  }

  const id =
    convertirTexto(
      valor.id,
    );

  if (!id) {
    return null;
  }

  const nombre =
    convertirTexto(
      valor.nombre,
    ) || "Socio";

  const apellidos =
    convertirTexto(
      valor.apellidos,
    );

  const nombreCompleto =
    [nombre, apellidos]
      .filter(Boolean)
      .join(" ");

  const carnets =
    obtenerCarnets(
      valor,
    );

  const createdAt =
    convertirTexto(
      valor.created_at ??
        valor.createdAt,
    );

  const updatedAt =
    convertirTexto(
      valor.updated_at ??
        valor.updatedAt,
    ) ||
    createdAt;

  const resumen:
    ResumenSocioPanel = {
      id,

      nombre,
      apellidos,
      nombreCompleto,

      email:
        convertirTexto(
          valor.email,
        ),

      telefono:
        convertirTextoNullable(
          valor.telefono,
        ),

      activo:
        convertirBooleano(
          valor.activo,
        ),

      carnetActual:
        obtenerCarnetActual(
          carnets,
          temporadaActivaId,
        ),

      totalCarnets:
        carnets.length,

      createdAt,
      updatedAt,
    };

  return {
    resumen,
    fila: valor,
    carnets,
  };
}

export function convertirFilaResumenSocioPanel(
  valor: unknown,
  temporadaActivaId:
    string | null = null,
): ResumenSocioPanel | null {
  return (
    convertirDatosComunesSocio(
      valor,
      temporadaActivaId,
    )?.resumen ?? null
  );
}

export function convertirFilaSocioPanel(
  valor: unknown,
  temporadaActivaId:
    string | null = null,
): SocioPanel | null {
  const datos =
    convertirDatosComunesSocio(
      valor,
      temporadaActivaId,
    );

  if (!datos) {
    return null;
  }

  return {
    ...datos.resumen,

    observaciones:
      convertirTextoNullable(
        datos.fila
          .observaciones,
      ),

    carnets:
      datos.carnets,
  };
}