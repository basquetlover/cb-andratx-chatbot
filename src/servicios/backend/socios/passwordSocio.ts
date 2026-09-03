import {
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";

const ALGORITMO =
  "scrypt";

const COSTE_CPU =
  16384;

const COSTE_BLOQUE =
  8;

const PARALELIZACION =
  1;

const LONGITUD_SALT =
  16;

const LONGITUD_HASH =
  64;

const MAXIMO_MEMORIA =
  32 * 1024 * 1024;

interface DatosHashPassword {
  algoritmo: string;
  costeCpu: number;
  costeBloque: number;
  paralelizacion: number;
  salt: Buffer;
  hash: Buffer;
}

function ejecutarScrypt(
  password: string,
  salt: Buffer,
  longitud: number,
  costeCpu: number,
  costeBloque: number,
  paralelizacion: number,
): Promise<Buffer> {
  return new Promise(
    (
      resolver,
      rechazar,
    ) => {
      scrypt(
        password,
        salt,
        longitud,
        {
          N: costeCpu,
          r: costeBloque,
          p: paralelizacion,
          maxmem:
            MAXIMO_MEMORIA,
        },
        (
          error,
          claveDerivada,
        ) => {
          if (error) {
            rechazar(error);
            return;
          }

          resolver(
            Buffer.from(
              claveDerivada,
            ),
          );
        },
      );
    },
  );
}

function validarPassword(
  password: unknown,
): asserts password is string {
  if (
    typeof password !== "string"
  ) {
    throw new Error(
      "La contraseña debe ser un texto.",
    );
  }

  if (
    password.length < 8
  ) {
    throw new Error(
      "La contraseña debe contener al menos 8 caracteres.",
    );
  }

  if (
    password.length > 200
  ) {
    throw new Error(
      "La contraseña no puede superar los 200 caracteres.",
    );
  }
}

function convertirNumeroSeguro(
  valor: string,
): number | null {
  if (
    !/^\d+$/.test(valor)
  ) {
    return null;
  }

  const numero =
    Number(valor);

  if (
    !Number.isSafeInteger(
      numero,
    ) ||
    numero < 1
  ) {
    return null;
  }

  return numero;
}

function descomponerHash(
  passwordHash: unknown,
): DatosHashPassword | null {
  if (
    typeof passwordHash !==
      "string"
  ) {
    return null;
  }

  const partes =
    passwordHash.split("$");

  if (
    partes.length !== 6
  ) {
    return null;
  }

  const [
    algoritmo,
    costeCpuTexto,
    costeBloqueTexto,
    paralelizacionTexto,
    saltBase64,
    hashBase64,
  ] = partes;

  if (
    algoritmo !== ALGORITMO
  ) {
    return null;
  }

  const costeCpu =
    convertirNumeroSeguro(
      costeCpuTexto,
    );

  const costeBloque =
    convertirNumeroSeguro(
      costeBloqueTexto,
    );

  const paralelizacion =
    convertirNumeroSeguro(
      paralelizacionTexto,
    );

  if (
    costeCpu === null ||
    costeBloque === null ||
    paralelizacion === null
  ) {
    return null;
  }

  let salt: Buffer;
  let hash: Buffer;

  try {
    salt =
      Buffer.from(
        saltBase64,
        "base64",
      );

    hash =
      Buffer.from(
        hashBase64,
        "base64",
      );
  } catch {
    return null;
  }

  if (
    salt.length === 0 ||
    hash.length === 0
  ) {
    return null;
  }

  return {
    algoritmo,
    costeCpu,
    costeBloque,
    paralelizacion,
    salt,
    hash,
  };
}

export async function crearHashPasswordSocio(
  password: string,
): Promise<string> {
  validarPassword(
    password,
  );

  const salt =
    randomBytes(
      LONGITUD_SALT,
    );

  const hash =
    await ejecutarScrypt(
      password,
      salt,
      LONGITUD_HASH,
      COSTE_CPU,
      COSTE_BLOQUE,
      PARALELIZACION,
    );

  return [
    ALGORITMO,
    COSTE_CPU,
    COSTE_BLOQUE,
    PARALELIZACION,
    salt.toString(
      "base64",
    ),
    hash.toString(
      "base64",
    ),
  ].join("$");
}

export async function comprobarPasswordSocio(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (
    typeof password !== "string" ||
    password.length < 1 ||
    password.length > 200
  ) {
    return false;
  }

  const datos =
    descomponerHash(
      passwordHash,
    );

  if (!datos) {
    return false;
  }

  let hashCalculado: Buffer;

  try {
    hashCalculado =
      await ejecutarScrypt(
        password,
        datos.salt,
        datos.hash.length,
        datos.costeCpu,
        datos.costeBloque,
        datos.paralelizacion,
      );
  } catch (error) {
    console.error(
      "Error comprobando la contraseña del socio:",
      error,
    );

    return false;
  }

  if (
    hashCalculado.length !==
    datos.hash.length
  ) {
    return false;
  }

  return timingSafeEqual(
    hashCalculado,
    datos.hash,
  );
}

export function esHashPasswordSocioValido(
  passwordHash: unknown,
): boolean {
  return (
    descomponerHash(
      passwordHash,
    ) !== null
  );
}