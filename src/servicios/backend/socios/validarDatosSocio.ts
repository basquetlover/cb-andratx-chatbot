import type {
  ActualizarCarnetTemporadaSocio,
  ActualizarSocioPanel,
  CrearCarnetTemporadaSocio,
  CrearSocioPanel,
  ErrorCampoSocio,
  EstadoCarnetSocio,
} from "@tipos/SocioPanel";

export interface ResultadoValidacionSocio<
  T,
> {
  valido: boolean;
  datos: T | null;
  errores: ErrorCampoSocio[];
}

const estadosCarnetPermitidos:
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
    typeof valor !== "string"
  ) {
    return "";
  }

  return valor.trim();
}

function convertirTextoNullable(
  valor: unknown,
): string | null {
  const texto =
    convertirTexto(valor);

  return texto || null;
}

function convertirBooleano(
  valor: unknown,
  valorPredeterminado = false,
): boolean {
  if (
    typeof valor === "boolean"
  ) {
    return valor;
  }

  return valorPredeterminado;
}

function normalizarEmail(
  valor: unknown,
): string {
  return convertirTexto(
    valor,
  ).toLowerCase();
}

function esEmailValido(
  email: string,
): boolean {
  if (
    email.length < 3 ||
    email.length > 254
  ) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}

function esUuidValido(
  valor: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function esFechaIsoValida(
  valor: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
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

function validarDatosBasicosSocio(
  datos: Record<string, unknown>,
): {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string | null;
  observaciones: string | null;
  errores: ErrorCampoSocio[];
} {
  const errores:
    ErrorCampoSocio[] = [];

  const nombre =
    convertirTexto(
      datos.nombre,
    );

  const apellidos =
    convertirTexto(
      datos.apellidos,
    );

  const email =
    normalizarEmail(
      datos.email,
    );

  const telefono =
    convertirTextoNullable(
      datos.telefono,
    );

  const observaciones =
    convertirTextoNullable(
      datos.observaciones,
    );

  if (!nombre) {
    errores.push({
      campo: "nombre",
      mensaje:
        "Debes indicar el nombre del socio.",
    });
  } else if (
    nombre.length > 100
  ) {
    errores.push({
      campo: "nombre",
      mensaje:
        "El nombre no puede superar los 100 caracteres.",
    });
  }

  if (!apellidos) {
    errores.push({
      campo: "apellidos",
      mensaje:
        "Debes indicar los apellidos del socio.",
    });
  } else if (
    apellidos.length > 150
  ) {
    errores.push({
      campo: "apellidos",
      mensaje:
        "Los apellidos no pueden superar los 150 caracteres.",
    });
  }

  if (!email) {
    errores.push({
      campo: "email",
      mensaje:
        "Debes indicar el correo electrónico del socio.",
    });
  } else if (
    !esEmailValido(email)
  ) {
    errores.push({
      campo: "email",
      mensaje:
        "El correo electrónico no tiene un formato válido.",
    });
  }

  if (
    telefono &&
    telefono.length > 30
  ) {
    errores.push({
      campo: "telefono",
      mensaje:
        "El teléfono no puede superar los 30 caracteres.",
    });
  }

  if (
    observaciones &&
    observaciones.length > 2000
  ) {
    errores.push({
      campo: "observaciones",
      mensaje:
        "Las observaciones no pueden superar los 2000 caracteres.",
    });
  }

  return {
    nombre,
    apellidos,
    email,
    telefono,
    observaciones,
    errores,
  };
}

function validarDatosCarnet(
  datos: Record<string, unknown>,
): {
  temporadaId: string;
  tipoSocio: string | null;
  fechaAlta: string;
  fechaCaducidad: string;
  errores: ErrorCampoSocio[];
} {
  const errores:
    ErrorCampoSocio[] = [];

  const temporadaId =
    convertirTexto(
      datos.temporadaId,
    );

  const tipoSocio =
    convertirTextoNullable(
      datos.tipoSocio,
    );

  const fechaAlta =
    convertirTexto(
      datos.fechaAlta,
    );

  const fechaCaducidad =
    convertirTexto(
      datos.fechaCaducidad,
    );

  if (
    !temporadaId
  ) {
    errores.push({
      campo: "temporadaId",
      mensaje:
        "Debes seleccionar una temporada.",
    });
  } else if (
    !esUuidValido(
      temporadaId,
    )
  ) {
    errores.push({
      campo: "temporadaId",
      mensaje:
        "La temporada seleccionada no es válida.",
    });
  }

  if (
    tipoSocio &&
    tipoSocio.length > 100
  ) {
    errores.push({
      campo: "tipoSocio",
      mensaje:
        "El tipo de socio no puede superar los 100 caracteres.",
    });
  }

  if (
    !fechaAlta
  ) {
    errores.push({
      campo: "fechaAlta",
      mensaje:
        "Debes indicar la fecha de alta.",
    });
  } else if (
    !esFechaIsoValida(
      fechaAlta,
    )
  ) {
    errores.push({
      campo: "fechaAlta",
      mensaje:
        "La fecha de alta no es válida.",
    });
  }

  if (
    !fechaCaducidad
  ) {
    errores.push({
      campo: "fechaCaducidad",
      mensaje:
        "Debes indicar la fecha de caducidad.",
    });
  } else if (
    !esFechaIsoValida(
      fechaCaducidad,
    )
  ) {
    errores.push({
      campo: "fechaCaducidad",
      mensaje:
        "La fecha de caducidad no es válida.",
    });
  }

  if (
    esFechaIsoValida(
      fechaAlta,
    ) &&
    esFechaIsoValida(
      fechaCaducidad,
    ) &&
    fechaCaducidad <
      fechaAlta
  ) {
    errores.push({
      campo: "fechaCaducidad",
      mensaje:
        "La fecha de caducidad no puede ser anterior a la fecha de alta.",
    });
  }

  return {
    temporadaId,
    tipoSocio,
    fechaAlta,
    fechaCaducidad,
    errores,
  };
}

export function validarCreacionSocio(
  valor: unknown,
): ResultadoValidacionSocio<
  CrearSocioPanel
> {
  if (!esObjeto(valor)) {
    return {
      valido: false,
      datos: null,
      errores: [
        {
          campo: "general",
          mensaje:
            "Los datos enviados no son válidos.",
        },
      ],
    };
  }

  const datosSocio =
    validarDatosBasicosSocio(
      valor,
    );

  const datosCarnet =
    validarDatosCarnet(
      valor,
    );

  const activar =
    convertirBooleano(
      valor.activar,
      false,
    );

  const enviarBienvenida =
    convertirBooleano(
      valor.enviarBienvenida,
      false,
    );

  const errores = [
    ...datosSocio.errores,
    ...datosCarnet.errores,
  ];

  if (
    enviarBienvenida &&
    !activar
  ) {
    errores.push({
      campo:
        "enviarBienvenida",

      mensaje:
        "Para enviar la bienvenida debes activar primero el carnet.",
    });
  }

  const datos:
    CrearSocioPanel = {
      nombre:
        datosSocio.nombre,

      apellidos:
        datosSocio.apellidos,

      email:
        datosSocio.email,

      telefono:
        datosSocio.telefono,

      observaciones:
        datosSocio.observaciones,

      temporadaId:
        datosCarnet.temporadaId,

      tipoSocio:
        datosCarnet.tipoSocio,

      fechaAlta:
        datosCarnet.fechaAlta,

      fechaCaducidad:
        datosCarnet.fechaCaducidad,

      activar,
      enviarBienvenida,
    };

  return {
    valido:
      errores.length === 0,

    datos:
      errores.length === 0
        ? datos
        : null,

    errores,
  };
}

export function validarActualizacionSocio(
  valor: unknown,
): ResultadoValidacionSocio<
  ActualizarSocioPanel
> {
  if (!esObjeto(valor)) {
    return {
      valido: false,
      datos: null,
      errores: [
        {
          campo: "general",
          mensaje:
            "Los datos enviados no son válidos.",
        },
      ],
    };
  }

  const datosSocio =
    validarDatosBasicosSocio(
      valor,
    );

  const activo =
    convertirBooleano(
      valor.activo,
      false,
    );

  const datos:
    ActualizarSocioPanel = {
      nombre:
        datosSocio.nombre,

      apellidos:
        datosSocio.apellidos,

      email:
        datosSocio.email,

      telefono:
        datosSocio.telefono,

      observaciones:
        datosSocio.observaciones,

      activo,
  };

  return {
    valido:
      datosSocio.errores.length ===
      0,

    datos:
      datosSocio.errores.length ===
      0
        ? datos
        : null,

    errores:
      datosSocio.errores,
  };
}

export function validarCreacionCarnetSocio(
  valor: unknown,
): ResultadoValidacionSocio<
  CrearCarnetTemporadaSocio
> {
  if (!esObjeto(valor)) {
    return {
      valido: false,
      datos: null,
      errores: [
        {
          campo: "general",
          mensaje:
            "Los datos enviados no son válidos.",
        },
      ],
    };
  }

  const datosCarnet =
    validarDatosCarnet(
      valor,
    );

  const activar =
    convertirBooleano(
      valor.activar,
      false,
    );

  const enviarBienvenida =
    convertirBooleano(
      valor.enviarBienvenida,
      false,
    );

  const errores = [
    ...datosCarnet.errores,
  ];

  if (
    enviarBienvenida &&
    !activar
  ) {
    errores.push({
      campo:
        "enviarBienvenida",

      mensaje:
        "Para enviar la bienvenida debes activar primero el carnet.",
    });
  }

  const datos:
    CrearCarnetTemporadaSocio = {
      temporadaId:
        datosCarnet.temporadaId,

      tipoSocio:
        datosCarnet.tipoSocio,

      fechaAlta:
        datosCarnet.fechaAlta,

      fechaCaducidad:
        datosCarnet.fechaCaducidad,

      activar,
      enviarBienvenida,
    };

  return {
    valido:
      errores.length === 0,

    datos:
      errores.length === 0
        ? datos
        : null,

    errores,
  };
}

export function validarActualizacionCarnetSocio(
  valor: unknown,
): ResultadoValidacionSocio<
  ActualizarCarnetTemporadaSocio
> {
  if (!esObjeto(valor)) {
    return {
      valido: false,
      datos: null,
      errores: [
        {
          campo: "general",
          mensaje:
            "Los datos enviados no son válidos.",
        },
      ],
    };
  }

  const datosCarnet =
    validarDatosCarnet(
      valor,
    );

  const estadoTexto =
    convertirTexto(
      valor.estado,
    );

  const motivoBloqueo =
    convertirTextoNullable(
      valor.motivoBloqueo,
    );

  const errores = [
    ...datosCarnet.errores.filter(
      (error) =>
        error.campo !==
        "temporadaId",
    ),
  ];

  const estado =
    estadosCarnetPermitidos.find(
      (estadoPermitido) =>
        estadoPermitido ===
        estadoTexto,
    );

  if (!estado) {
    errores.push({
      campo: "estado",
      mensaje:
        "El estado del carnet no es válido.",
    });
  }

  if (
    motivoBloqueo &&
    motivoBloqueo.length > 500
  ) {
    errores.push({
      campo:
        "motivoBloqueo",

      mensaje:
        "El motivo del bloqueo no puede superar los 500 caracteres.",
    });
  }

  if (
    estado === "bloqueado" &&
    !motivoBloqueo
  ) {
    errores.push({
      campo:
        "motivoBloqueo",

      mensaje:
        "Debes indicar el motivo del bloqueo.",
    });
  }

  if (
    !estado ||
    errores.length > 0
  ) {
    return {
      valido: false,
      datos: null,
      errores,
    };
  }

  return {
    valido: true,

    datos: {
      tipoSocio:
        datosCarnet.tipoSocio,

      fechaAlta:
        datosCarnet.fechaAlta,

      fechaCaducidad:
        datosCarnet.fechaCaducidad,

      estado,

      motivoBloqueo:
        estado === "bloqueado"
          ? motivoBloqueo
          : null,
    },

    errores: [],
  };
}