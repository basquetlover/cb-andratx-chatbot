import type {
  ActualizarCarnetTemporadaSocio,
  ActualizarSocioPanel,
  CrearCarnetTemporadaSocio,
  CrearSocioPanel,
  ErrorCampoSocio,
  EstadoCarnetSocio,
} from "@tipos/SocioPanel";

const EXPRESION_EMAIL =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EXPRESION_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EXPRESION_FECHA =
  /^\d{4}-\d{2}-\d{2}$/;

function crearNombreCampo(
  prefijo: string,
  campo: string,
): string {
  return prefijo
    ? `${prefijo}.${campo}`
    : campo;
}

function esTexto(
  valor: unknown,
): valor is string {
  return typeof valor ===
    "string";
}

function textoLimpio(
  valor: unknown,
): string {
  return esTexto(valor)
    ? valor.trim()
    : "";
}

function esFechaValida(
  valor: string,
): boolean {
  if (
    !EXPRESION_FECHA.test(
      valor,
    )
  ) {
    return false;
  }

  const [
    anio,
    mes,
    dia,
  ] = valor
    .split("-")
    .map(Number);

  const fecha =
    new Date(
      Date.UTC(
        anio,
        mes - 1,
        dia,
      ),
    );

  return (
    fecha.getUTCFullYear() ===
      anio &&
    fecha.getUTCMonth() ===
      mes - 1 &&
    fecha.getUTCDate() ===
      dia
  );
}

function validarTextoObligatorio(
  valor: unknown,
  campo: string,
  etiqueta: string,
  maximo: number,
): ErrorCampoSocio[] {
  const texto =
    textoLimpio(valor);

  if (!texto) {
    return [
      {
        campo,
        mensaje:
          `${etiqueta} es obligatorio.`,
      },
    ];
  }

  if (
    texto.length > maximo
  ) {
    return [
      {
        campo,
        mensaje:
          `${etiqueta} no puede superar los ${maximo} caracteres.`,
      },
    ];
  }

  return [];
}

function validarTextoOpcional(
  valor: unknown,
  campo: string,
  etiqueta: string,
  maximo: number,
): ErrorCampoSocio[] {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return [];
  }

  if (!esTexto(valor)) {
    return [
      {
        campo,
        mensaje:
          `${etiqueta} no tiene un formato válido.`,
      },
    ];
  }

  if (
    valor.trim().length >
    maximo
  ) {
    return [
      {
        campo,
        mensaje:
          `${etiqueta} no puede superar los ${maximo} caracteres.`,
      },
    ];
  }

  return [];
}

function validarEmail(
  valor: unknown,
  campo: string,
): ErrorCampoSocio[] {
  const email =
    textoLimpio(valor)
      .toLowerCase();

  if (!email) {
    return [
      {
        campo,
        mensaje:
          "El correo electrónico es obligatorio.",
      },
    ];
  }

  if (
    email.length > 254
  ) {
    return [
      {
        campo,
        mensaje:
          "El correo electrónico no puede superar los 254 caracteres.",
      },
    ];
  }

  if (
    !EXPRESION_EMAIL.test(
      email,
    )
  ) {
    return [
      {
        campo,
        mensaje:
          "El correo electrónico no tiene un formato válido.",
      },
    ];
  }

  return [];
}

function validarBooleano(
  valor: unknown,
  campo: string,
  etiqueta: string,
): ErrorCampoSocio[] {
  if (
    typeof valor !==
    "boolean"
  ) {
    return [
      {
        campo,
        mensaje:
          `${etiqueta} debe ser verdadero o falso.`,
      },
    ];
  }

  return [];
}

function validarTemporadaId(
  valor: unknown,
  campo: string,
): ErrorCampoSocio[] {
  const temporadaId =
    textoLimpio(valor);

  if (!temporadaId) {
    return [
      {
        campo,
        mensaje:
          "Debes seleccionar una temporada.",
      },
    ];
  }

  if (
    !EXPRESION_UUID.test(
      temporadaId,
    )
  ) {
    return [
      {
        campo,
        mensaje:
          "La temporada seleccionada no es válida.",
      },
    ];
  }

  return [];
}

function validarEstadoCreacion(
  valor: unknown,
  campo: string,
): ErrorCampoSocio[] {
  if (
    valor !== "activo" &&
    valor !== "pendiente"
  ) {
    return [
      {
        campo,
        mensaje:
          "El estado inicial debe ser activo o pendiente.",
      },
    ];
  }

  return [];
}

function validarEstadoActualizacion(
  valor: unknown,
  campo: string,
): ErrorCampoSocio[] {
  const estados:
    EstadoCarnetSocio[] = [
      "pendiente",
      "activo",
      "bloqueado",
      "caducado",
    ];

  if (
    !estados.includes(
      valor as
        EstadoCarnetSocio,
    )
  ) {
    return [
      {
        campo,
        mensaje:
          "El estado del carnet no es válido.",
      },
    ];
  }

  return [];
}

function validarPeriodo(
  fechaAltaDesconocida:
    unknown,
  fechaCaducidadDesconocida:
    unknown,
  prefijo: string,
): ErrorCampoSocio[] {
  const errores:
    ErrorCampoSocio[] = [];

  const campoFechaAlta =
    crearNombreCampo(
      prefijo,
      "fechaAlta",
    );

  const campoFechaCaducidad =
    crearNombreCampo(
      prefijo,
      "fechaCaducidad",
    );

  const fechaAlta =
    textoLimpio(
      fechaAltaDesconocida,
    );

  const fechaCaducidad =
    textoLimpio(
      fechaCaducidadDesconocida,
    );

  if (!fechaAlta) {
    errores.push({
      campo:
        campoFechaAlta,
      mensaje:
        "La fecha de alta es obligatoria.",
    });
  } else if (
    !esFechaValida(
      fechaAlta,
    )
  ) {
    errores.push({
      campo:
        campoFechaAlta,
      mensaje:
        "La fecha de alta no es válida.",
    });
  }

  if (!fechaCaducidad) {
    errores.push({
      campo:
        campoFechaCaducidad,
      mensaje:
        "La fecha de caducidad es obligatoria.",
    });
  } else if (
    !esFechaValida(
      fechaCaducidad,
    )
  ) {
    errores.push({
      campo:
        campoFechaCaducidad,
      mensaje:
        "La fecha de caducidad no es válida.",
    });
  }

  if (
    esFechaValida(
      fechaAlta,
    ) &&
    esFechaValida(
      fechaCaducidad,
    ) &&
    fechaCaducidad <
      fechaAlta
  ) {
    errores.push({
      campo:
        campoFechaCaducidad,
      mensaje:
        "La fecha de caducidad no puede ser anterior a la fecha de alta.",
    });
  }

  return errores;
}

export function validarCreacionCarnetSocio(
  datos:
    CrearCarnetTemporadaSocio,
  prefijo = "",
): ErrorCampoSocio[] {
  const errores:
    ErrorCampoSocio[] = [];

  errores.push(
    ...validarTemporadaId(
      datos?.temporadaId,
      crearNombreCampo(
        prefijo,
        "temporadaId",
      ),
    ),
  );

  errores.push(
    ...validarTextoObligatorio(
      datos?.tipoSocio,
      crearNombreCampo(
        prefijo,
        "tipoSocio",
      ),
      "El tipo de socio",
      100,
    ),
  );

  errores.push(
    ...validarEstadoCreacion(
      datos?.estado,
      crearNombreCampo(
        prefijo,
        "estado",
      ),
    ),
  );

  errores.push(
    ...validarPeriodo(
      datos?.fechaAlta,
      datos?.fechaCaducidad,
      prefijo,
    ),
  );

  return errores;
}

export function validarActualizacionCarnetSocio(
  datos:
    ActualizarCarnetTemporadaSocio,
  prefijo = "",
): ErrorCampoSocio[] {
  const errores:
    ErrorCampoSocio[] = [];

  errores.push(
    ...validarTextoObligatorio(
      datos?.tipoSocio,
      crearNombreCampo(
        prefijo,
        "tipoSocio",
      ),
      "El tipo de socio",
      100,
    ),
  );

  errores.push(
    ...validarEstadoActualizacion(
      datos?.estado,
      crearNombreCampo(
        prefijo,
        "estado",
      ),
    ),
  );

  errores.push(
    ...validarPeriodo(
      datos?.fechaAlta,
      datos?.fechaCaducidad,
      prefijo,
    ),
  );

  errores.push(
    ...validarTextoOpcional(
      datos?.motivoBloqueo,
      crearNombreCampo(
        prefijo,
        "motivoBloqueo",
      ),
      "El motivo del bloqueo",
      500,
    ),
  );

  if (
    datos?.estado ===
      "bloqueado" &&
    !textoLimpio(
      datos?.motivoBloqueo,
    )
  ) {
    errores.push({
      campo:
        crearNombreCampo(
          prefijo,
          "motivoBloqueo",
        ),
      mensaje:
        "Debes indicar el motivo del bloqueo.",
    });
  }

  return errores;
}

export function validarCreacionSocio(
  datos:
    CrearSocioPanel,
): ErrorCampoSocio[] {
  const errores:
    ErrorCampoSocio[] = [];

  errores.push(
    ...validarTextoObligatorio(
      datos?.nombre,
      "nombre",
      "El nombre",
      100,
    ),
  );

  errores.push(
    ...validarTextoObligatorio(
      datos?.apellidos,
      "apellidos",
      "Los apellidos",
      150,
    ),
  );

  errores.push(
    ...validarEmail(
      datos?.email,
      "email",
    ),
  );

  errores.push(
    ...validarTextoOpcional(
      datos?.telefono,
      "telefono",
      "El teléfono",
      30,
    ),
  );

  errores.push(
    ...validarTextoOpcional(
      datos?.observaciones,
      "observaciones",
      "Las observaciones",
      2000,
    ),
  );

  errores.push(
    ...validarBooleano(
      datos?.activo,
      "activo",
      "El estado del socio",
    ),
  );

  if (
    !datos?.carnet ||
    typeof datos.carnet !==
      "object"
  ) {
    errores.push({
      campo: "carnet",
      mensaje:
        "Debes indicar los datos del primer carnet.",
    });
  } else {
    errores.push(
      ...validarCreacionCarnetSocio(
        datos.carnet,
        "carnet",
      ),
    );
  }

  return errores;
}

export function validarActualizacionSocio(
  datos:
    ActualizarSocioPanel,
): ErrorCampoSocio[] {
  const errores:
    ErrorCampoSocio[] = [];

  errores.push(
    ...validarTextoObligatorio(
      datos?.nombre,
      "nombre",
      "El nombre",
      100,
    ),
  );

  errores.push(
    ...validarTextoObligatorio(
      datos?.apellidos,
      "apellidos",
      "Los apellidos",
      150,
    ),
  );

  errores.push(
    ...validarEmail(
      datos?.email,
      "email",
    ),
  );

  errores.push(
    ...validarTextoOpcional(
      datos?.telefono,
      "telefono",
      "El teléfono",
      30,
    ),
  );

  errores.push(
    ...validarTextoOpcional(
      datos?.observaciones,
      "observaciones",
      "Las observaciones",
      2000,
    ),
  );

  errores.push(
    ...validarBooleano(
      datos?.activo,
      "activo",
      "El estado del socio",
    ),
  );

  return errores;
}