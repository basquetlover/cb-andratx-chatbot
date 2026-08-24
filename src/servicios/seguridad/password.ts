import * as argon2 from "argon2";

const LONGITUD_MINIMA_PASSWORD = 8;
const LONGITUD_MAXIMA_PASSWORD = 128;

const opcionesArgon2 = {
  type: argon2.argon2id as 0 | 1 | 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
};

export function validarFormatoPassword(password: string): string | null {
  if (typeof password !== "string") {
    return "La contraseña no es válida";
  }

  if (password.length <= LONGITUD_MINIMA_PASSWORD) {
    return `La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres`;
  }

  if (password.length > LONGITUD_MAXIMA_PASSWORD) {
    return `La contraseña no puede superar los ${LONGITUD_MAXIMA_PASSWORD} caracteres`;
  }

  return null;
}

export async function generarHashPassword(password: string): Promise<string> {
  const errorPassword = validarFormatoPassword(password);

  if (errorPassword) {
    throw new Error(errorPassword);
  }

  return argon2.hash(password, opcionesArgon2);
}

export async function verificarPassword(passwordHash: string, password: string): Promise<boolean> {
  if (!passwordHash || !password) {
    return false;
  }

  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

export function necesitaActualizarHash(passwordHash: string): boolean {
  if (!passwordHash) {
    return true;
  }

  try {
    return argon2.needsRehash(passwordHash, opcionesArgon2);
  } catch {
    return true;
  }
}