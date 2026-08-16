export interface ResultadoValidacionOrigen {
  autorizado: boolean;
  motivo?: string;
}

function normalizarOrigen(valor: string): string | null {
  try {
    return new URL(valor.trim()).origin;
  } catch {
    return null;
  }
}

function obtenerOrigenesAutorizados(): Set<string> {
  const variable: string | undefined =
    import.meta.env.WEB_ORIGINS;

  if (!variable) {
    return new Set<string>();
  }

  const origenes: string[] = variable
    .split(",")
    .map((origen: string) => normalizarOrigen(origen))
    .filter(
      (origen: string | null): origen is string =>
        origen !== null
    );

  return new Set<string>(origenes);
}

export function validarOrigen(
  request: Request
): ResultadoValidacionOrigen {
  const origenesAutorizados = obtenerOrigenesAutorizados();

  if (origenesAutorizados.size === 0) {
    console.error("No se ha configurado WEB_ORIGINS");

    return {
      autorizado: false,
      motivo: "No hay orígenes autorizados configurados",
    };
  }

  const origen = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const secFetchSite = request.headers.get("sec-fetch-site");

  /*
   * Las peticiones cross-site se rechazan directamente.
   */
  if (secFetchSite === "cross-site") {
    return {
      autorizado: false,
      motivo: "Petición procedente de otro sitio",
    };
  }

  /*
   * Cuando el navegador proporciona Origin, tiene prioridad.
   */
  if (origen) {
    const origenNormalizado = normalizarOrigen(origen);

    if (
      origenNormalizado &&
      origenesAutorizados.has(origenNormalizado)
    ) {
      return {
        autorizado: true,
      };
    }

    return {
      autorizado: false,
      motivo: "Origen no autorizado",
    };
  }

  /*
   * Algunas peticiones GET no incluyen Origin.
   * En ese caso comprobamos el origen de Referer.
   */
  if (referer) {
    const origenReferer = normalizarOrigen(referer);

    if (
      origenReferer &&
      origenesAutorizados.has(origenReferer)
    ) {
      return {
        autorizado: true,
      };
    }

    return {
      autorizado: false,
      motivo: "Referer no autorizado",
    };
  }

  /*
   * Una llamada fetch() desde la propia web puede indicar
   * same-origin aunque no incluya Origin o Referer.
   */
  if (secFetchSite === "same-origin") {
    const origenDestino = normalizarOrigen(request.url);

    if (
      origenDestino &&
      origenesAutorizados.has(origenDestino)
    ) {
      return {
        autorizado: true,
      };
    }
  }

  return {
    autorizado: false,
    motivo: "No se ha podido comprobar el origen",
  };
}