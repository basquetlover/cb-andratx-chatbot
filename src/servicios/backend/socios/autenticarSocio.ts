import {
  supabaseServidor,
} from "../../supabase/servidor";

import {
  comprobarPasswordSocio,
} from "./passwordSocio";

import type {
  CarnetSocioPublico,
  DatosAccesoCarnetSocio,
  EstadoCarnetSocio,
  SesionCarnetSocio,
} from "@tipos/SocioPanel";

interface FilaTemporadaActiva {
  id: string;
  nombre: string | null;
  fecha_inicio: string;
  fecha_fin: string;
}

interface FilaSocioAcceso {
  id: string;
  nombre: string | null;
  apellidos: string | null;
  email: string;
  activo: boolean;
}

interface FilaCarnetAcceso {
  id: string;
  socio_id: string;
  temporada_id: string;

  numero_socio: number;
  numero_carnet: string;

  tipo_socio: string | null;
  estado: EstadoCarnetSocio;

  fecha_alta: string;
  fecha_caducidad: string;

  version_acceso: number;

  password_hash: string;
  password_updated_at: string;

  intentos_fallidos: number;
  bloqueado_hasta: string | null;
  ultimo_acceso_at: string | null;
}

export interface ResultadoAutenticarSocio {
  carnet: CarnetSocioPublico;
  sesion: SesionCarnetSocio;
}

const MAXIMOS_INTENTOS_FALLIDOS =
  5;

const MINUTOS_BLOQUEO =
  30;

export class ErrorAutenticarSocio
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name =
      "ErrorAutenticarSocio";

    this.status = status;
  }
}

function normalizarEmail(
  email: string,
): string {
  return email
    .trim()
    .toLowerCase();
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

function obtenerFechaMadrid():
  string {
  const partes =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(
      new Date(),
    );

  const anio =
    partes.find(
      (parte) =>
        parte.type === "year",
    )?.value;

  const mes =
    partes.find(
      (parte) =>
        parte.type === "month",
    )?.value;

  const dia =
    partes.find(
      (parte) =>
        parte.type === "day",
    )?.value;

  if (
    !anio ||
    !mes ||
    !dia
  ) {
    return new Date()
      .toISOString()
      .slice(0, 10);
  }

  return `${anio}-${mes}-${dia}`;
}

function obtenerExpiracionCarnet(
  fechaCaducidad: string,
): string {
  /*
   * La sesión expira al comenzar el día
   * posterior a la fecha de caducidad.
   *
   * Las comprobaciones posteriores también
   * validarán la fecha en Europe/Madrid.
   */
  const fecha =
    new Date(
      `${fechaCaducidad}T00:00:00.000Z`,
    );

  if (
    Number.isNaN(
      fecha.getTime(),
    )
  ) {
    return new Date()
      .toISOString();
  }

  fecha.setUTCDate(
    fecha.getUTCDate() + 1,
  );

  return fecha.toISOString();
}

function obtenerFechaBloqueo():
  string {
  const fecha =
    new Date();

  fecha.setMinutes(
    fecha.getMinutes() +
      MINUTOS_BLOQUEO,
  );

  return fecha.toISOString();
}

function estaBloqueadoHasta(
  bloqueadoHasta:
    string | null,
): boolean {
  if (!bloqueadoHasta) {
    return false;
  }

  const tiempo =
    new Date(
      bloqueadoHasta,
    ).getTime();

  return (
    Number.isFinite(tiempo) &&
    tiempo > Date.now()
  );
}

function validarDatosAcceso(
  datos:
    DatosAccesoCarnetSocio,
): void {
  if (
    !datos ||
    typeof datos.email !==
      "string" ||
    typeof datos.password !==
      "string"
  ) {
    throw new ErrorAutenticarSocio(
      "Debes indicar el correo electrónico y la contraseña.",
      400,
    );
  }

  if (
    !datos.email.trim() ||
    !datos.password
  ) {
    throw new ErrorAutenticarSocio(
      "Debes indicar el correo electrónico y la contraseña.",
      400,
    );
  }

  if (
    datos.email.length > 254 ||
    datos.password.length > 200
  ) {
    throw new ErrorAutenticarSocio(
      "Las credenciales no tienen un formato válido.",
      400,
    );
  }
}

async function obtenerTemporadaActiva():
  Promise<FilaTemporadaActiva> {
  const {
    data,
    error,
  } =
    await supabaseServidor
      .from("temporadas")
      .select(`
        id,
        nombre,
        fecha_inicio,
        fecha_fin
      `)
      .eq(
        "activa",
        true,
      )
      .order(
        "fecha_inicio",
        {
          ascending: false,
        },
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new ErrorAutenticarSocio(
      `No se ha podido comprobar la temporada activa: ${error.message}`,
      500,
    );
  }

  if (!data) {
    throw new ErrorAutenticarSocio(
      "No hay ninguna temporada activa.",
      503,
    );
  }

  return data as
    FilaTemporadaActiva;
}

async function registrarIntentoFallido(
  carnet:
    FilaCarnetAcceso,
): Promise<void> {
  const intentosFallidos =
    Math.max(
      0,
      carnet.intentos_fallidos,
    ) + 1;

  const bloqueadoHasta =
    intentosFallidos >=
    MAXIMOS_INTENTOS_FALLIDOS
      ? obtenerFechaBloqueo()
      : null;

  const {
    error,
  } =
    await supabaseServidor
      .from(
        "socios_temporadas",
      )
      .update({
        intentos_fallidos:
          intentosFallidos,

        bloqueado_hasta:
          bloqueadoHasta,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        carnet.id,
      );

  if (error) {
    console.error(
      "No se ha podido registrar el intento fallido del carnet:",
      {
        carnetId:
          carnet.id,
        error,
      },
    );
  }

  if (bloqueadoHasta) {
    throw new ErrorAutenticarSocio(
      `Se ha bloqueado temporalmente el acceso durante ${MINUTOS_BLOQUEO} minutos por demasiados intentos fallidos.`,
      429,
    );
  }

  const intentosRestantes =
    Math.max(
      0,
      MAXIMOS_INTENTOS_FALLIDOS -
        intentosFallidos,
    );

  throw new ErrorAutenticarSocio(
    intentosRestantes === 1
      ? "Las credenciales no son correctas. Queda un intento antes del bloqueo temporal."
      : `Las credenciales no son correctas. Quedan ${intentosRestantes} intentos antes del bloqueo temporal.`,
    401,
  );
}

async function registrarAccesoCorrecto(
  carnetId: string,
): Promise<string> {
  const ahora =
    new Date().toISOString();

  const {
    error,
  } =
    await supabaseServidor
      .from(
        "socios_temporadas",
      )
      .update({
        intentos_fallidos:
          0,

        bloqueado_hasta:
          null,

        ultimo_acceso_at:
          ahora,

        updated_at:
          ahora,
      })
      .eq(
        "id",
        carnetId,
      );

  if (error) {
    throw new ErrorAutenticarSocio(
      `Las credenciales son correctas, pero no se ha podido registrar el acceso: ${error.message}`,
      500,
    );
  }

  return ahora;
}

export async function autenticarSocio(
  datos:
    DatosAccesoCarnetSocio,
): Promise<ResultadoAutenticarSocio> {
  validarDatosAcceso(
    datos,
  );

  const email =
    normalizarEmail(
      datos.email,
    );

  const temporada =
    await obtenerTemporadaActiva();

  const {
    data:
      socioEncontrado,
    error:
      errorSocio,
  } =
    await supabaseServidor
      .from("socios")
      .select(`
        id,
        nombre,
        apellidos,
        email,
        activo
      `)
      .ilike(
        "email",
        email,
      )
      .limit(1)
      .maybeSingle();

  if (errorSocio) {
    throw new ErrorAutenticarSocio(
      `No se ha podido comprobar el socio: ${errorSocio.message}`,
      500,
    );
  }

  /*
   * Se utiliza el mismo mensaje cuando no
   * existe el correo para evitar confirmar
   * qué direcciones están registradas.
   */
  if (!socioEncontrado) {
    throw new ErrorAutenticarSocio(
      "Las credenciales no son correctas.",
      401,
    );
  }

  const socio =
    socioEncontrado as
      FilaSocioAcceso;

  if (!socio.activo) {
    throw new ErrorAutenticarSocio(
      "El acceso de este socio está desactivado.",
      403,
    );
  }

  const {
    data:
      carnetEncontrado,
    error:
      errorCarnet,
  } =
    await supabaseServidor
      .from(
        "socios_temporadas",
      )
      .select(`
        id,
        socio_id,
        temporada_id,

        numero_socio,
        numero_carnet,

        tipo_socio,
        estado,

        fecha_alta,
        fecha_caducidad,

        version_acceso,

        password_hash,
        password_updated_at,

        intentos_fallidos,
        bloqueado_hasta,
        ultimo_acceso_at
      `)
      .eq(
        "socio_id",
        socio.id,
      )
      .eq(
        "temporada_id",
        temporada.id,
      )
      .limit(1)
      .maybeSingle();

  if (errorCarnet) {
    throw new ErrorAutenticarSocio(
      `No se ha podido comprobar el carnet de la temporada activa: ${errorCarnet.message}`,
      500,
    );
  }

  if (!carnetEncontrado) {
    throw new ErrorAutenticarSocio(
      "Las credenciales no son correctas.",
      401,
    );
  }

  const carnet =
    carnetEncontrado as
      FilaCarnetAcceso;

  if (
    carnet.estado ===
    "pendiente"
  ) {
    throw new ErrorAutenticarSocio(
      "El carnet todavía está pendiente de activación.",
      403,
    );
  }

  if (
    carnet.estado ===
    "bloqueado"
  ) {
    throw new ErrorAutenticarSocio(
      "El carnet está bloqueado por el club.",
      403,
    );
  }

  if (
    carnet.estado ===
    "caducado"
  ) {
    throw new ErrorAutenticarSocio(
      "El carnet ha caducado.",
      403,
    );
  }

  const hoy =
    obtenerFechaMadrid();

  if (
    carnet.fecha_alta >
    hoy
  ) {
    throw new ErrorAutenticarSocio(
      "El periodo de acceso de este carnet todavía no ha comenzado.",
      403,
    );
  }

  if (
    carnet.fecha_caducidad <
    hoy
  ) {
    throw new ErrorAutenticarSocio(
      "El carnet ha caducado.",
      403,
    );
  }

  if (
    estaBloqueadoHasta(
      carnet.bloqueado_hasta,
    )
  ) {
    throw new ErrorAutenticarSocio(
      "El acceso está bloqueado temporalmente por varios intentos fallidos. Puedes esperar o solicitar el desbloqueo al club.",
      429,
    );
  }

  let passwordCorrecta =
    false;

  try {
    passwordCorrecta =
      await comprobarPasswordSocio(
        datos.password,
        carnet.password_hash,
      );
  } catch (error) {
    console.error(
      "Error comprobando la contraseña del carnet:",
      {
        socioId:
          socio.id,
        carnetId:
          carnet.id,
        error,
      },
    );

    throw new ErrorAutenticarSocio(
      "No se ha podido comprobar la contraseña.",
      500,
    );
  }

  if (!passwordCorrecta) {
    await registrarIntentoFallido(
      carnet,
    );

    throw new ErrorAutenticarSocio(
      "Las credenciales no son correctas.",
      401,
    );
  }

  await registrarAccesoCorrecto(
    carnet.id,
  );

  const nombre =
    convertirTexto(
      socio.nombre,
    ) || "Socio";

  const apellidos =
    convertirTexto(
      socio.apellidos,
    );

  const carnetPublico:
    CarnetSocioPublico = {
      socio: {
        id:
          socio.id,

        nombre,
        apellidos,

        nombreCompleto:
          [nombre, apellidos]
            .filter(Boolean)
            .join(" "),
      },

      carnet: {
        id:
          carnet.id,

        numeroSocio:
          carnet.numero_socio,

        numeroCarnet:
          carnet.numero_carnet,

        tipoSocio:
          carnet.tipo_socio,

        estado:
          carnet.estado,

        fechaAlta:
          carnet.fecha_alta,

        fechaCaducidad:
          carnet.fecha_caducidad,

        temporada: {
          id:
            temporada.id,

          nombre:
            convertirTexto(
              temporada.nombre,
            ) || "Temporada",
        },
      },
    };

  const sesion:
    SesionCarnetSocio = {
      socioId:
        socio.id,

      carnetId:
        carnet.id,

      temporadaId:
        temporada.id,

      versionAcceso:
        Math.max(
          1,
          carnet.version_acceso,
        ),

      expiraAt:
        obtenerExpiracionCarnet(
          carnet.fecha_caducidad,
        ),
    };

  return {
    carnet:
      carnetPublico,

    sesion,
  };
}