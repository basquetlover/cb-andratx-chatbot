
import {
  useState,
} from "react";

import type {
  FamiliarCarnetSocio,
  RespuestaFamiliaresCarnetSocio,
} from "@tipos/FamiliaresCarnetSocio";

interface Propiedades {
  nombres: string[];
  onChange: (nombres: string[]) => void;
  disabled?: boolean;
  titular?: string;
}

interface VincularFamiliares {
  socioId: string;
  carnetId: string;
  nombres: string[];
  carnetOrigenId?: string | null;
}

const MAX_FAMILIARES = 30;
const MAX_NOMBRE = 120;

function normalizarNombre(nombre: string): string {
  return nombre
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function compararNombre(nombre: string): string {
  return normalizarNombre(nombre)
    .normalize("NFKC")
    .toLocaleLowerCase("es-ES");
}

export function obtenerNombresFamiliares(
  nombres: string[],
): string[] {
  return nombres
    .map(normalizarNombre)
    .filter(Boolean);
}

export function validarNombresFamiliares(
  nombres: string[],
  nombreTitular = "",
): string | null {
  if (nombres.length > MAX_FAMILIARES) {
    return `Solo puedes añadir ${MAX_FAMILIARES} familiares adicionales.`;
  }

  const utilizados = new Set<string>();
  const titular = compararNombre(nombreTitular);

  for (const nombreOriginal of nombres) {
    const nombre = normalizarNombre(nombreOriginal);

    // Las filas vacías no se guardan.
    if (!nombre) {
      continue;
    }

    if (
      nombre.length < 2 ||
      nombre.length > MAX_NOMBRE ||
      /[\u0000-\u001f\u007f]/.test(nombre)
    ) {
      return "Cada nombre debe tener entre 2 y 120 caracteres.";
    }

    const clave = compararNombre(nombre);

    if (titular && clave === titular) {
      return "El titular ya está incluido automáticamente. No debes añadirlo otra vez.";
    }

    if (utilizados.has(clave)) {
      return `El familiar ${nombre} aparece repetido.`;
    }

    utilizados.add(clave);
  }

  return null;
}

function obtenerRuta(
  socioId: string,
  carnetId: string,
): string {
  return `/api/panel/socios/${encodeURIComponent(
    socioId,
  )}/carnets/${encodeURIComponent(
    carnetId,
  )}/familiares`;
}

async function peticionFamiliares(
  ruta: string,
  metodo: "GET" | "POST",
  cuerpo?: Record<string, unknown>,
): Promise<FamiliarCarnetSocio[]> {
  const respuesta = await fetch(ruta, {
    method: metodo,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(cuerpo
        ? { "Content-Type": "application/json" }
        : {}),
    },
    ...(cuerpo
      ? { body: JSON.stringify(cuerpo) }
      : {}),
  });

  let contenido:
    RespuestaFamiliaresCarnetSocio | null = null;

  try {
    contenido =
      (await respuesta.json()) as
        RespuestaFamiliaresCarnetSocio;
  } catch {
    throw new Error(
      "La API de familiares no ha devuelto una respuesta válida.",
    );
  }

  if (
    !respuesta.ok ||
    contenido?.ok !== true ||
    !Array.isArray(contenido.data?.familiares)
  ) {
    throw new Error(
      contenido?.error ||
        "No se han podido vincular los familiares.",
    );
  }

  return contenido.data.familiares;
}

export async function vincularFamiliaresAlNuevoCarnet({
  socioId,
  carnetId,
  nombres,
  carnetOrigenId = null,
}: VincularFamiliares): Promise<number> {
  const errorNombres = validarNombresFamiliares(nombres);

  if (errorNombres) {
    throw new Error(errorNombres);
  }

  const ruta = obtenerRuta(socioId, carnetId);

  const lista = obtenerNombresFamiliares(nombres);

  let familiares: FamiliarCarnetSocio[] = [];

  // Primero copiamos los familiares de otra temporada.
  if (carnetOrigenId) {
    familiares = await peticionFamiliares(
      ruta,
      "POST",
      {
        accion: "copiar",
        origenCarnetId: carnetOrigenId,
      },
    );
  } else {
    familiares = await peticionFamiliares(
      ruta,
      "GET",
    );
  }

  let nuevos = 0;

  const existentes = new Set(
    familiares.map(
      (familiar) =>
        compararNombre(familiar.nombreCompleto),
    ),
  );

  // Añadir únicamente nombres todavía no registrados.
  for (const nombre of lista) {
    const clave = compararNombre(nombre);

    if (existentes.has(clave)) {
      continue;
    }

    familiares = await peticionFamiliares(
      ruta,
      "POST",
      {
        accion: "anadir",
        nombreCompleto: nombre,
      },
    );

    existentes.clear();

    familiares.forEach((familiar) => {
      existentes.add(
        compararNombre(familiar.nombreCompleto),
      );
    });

    nuevos += 1;
  }

  return nuevos;
}

export default function FamiliaresFormularioAlta({
  nombres,
  onChange,
  disabled = false,
  titular = "",
}: Propiedades) {
  const [mostrarAyuda, setMostrarAyuda] =
    useState(false);

  const error = validarNombresFamiliares(
    nombres,
    titular,
  );

  function cambiarNombre(
    indice: number,
    valor: string,
  ) {
    onChange(
      nombres.map((nombre, posicion) =>
        posicion === indice ? valor : nombre,
      ),
    );
  }

  function eliminarFila(indice: number) {
    onChange(
      nombres.filter(
        (_, posicion) => posicion !== indice,
      ),
    );
  }

  return (
    <section className="grid gap-4 rounded-xl border border-primary/25 bg-primary-fixed/35 p-4 sm:p-5">
      <div>
        <h3 className="text-base font-bold text-on-surface">
          Familiares incluidos
        </h3>

        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
          El titular del carnet se incluye automáticamente.
          Introduce aquí los familiares adicionales.
        </p>

        {titular.trim() && (
          <p className="mt-2 rounded-lg border border-primary/20 bg-primary-container px-3 py-2 text-sm font-bold text-on-primary-container">
            Titular: {titular.trim()}
          </p>
        )}
      </div>

      <div className="grid gap-3">
        {nombres.map((nombre, indice) => (
          <div
            key={indice}
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <label className="min-w-0 flex-1">
              <span className="sr-only">
                Nombre y apellidos del familiar {indice + 1}
              </span>

              <input
                type="text"
                value={nombre}
                onChange={(evento) =>
                  cambiarNombre(
                    indice,
                    evento.target.value,
                  )
                }
                placeholder={`Familiar ${indice + 1}: nombre y apellidos`}
                maxLength={MAX_NOMBRE}
                disabled={disabled}
                className="min-h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-sm text-on-surface outline-none focus:border-primary disabled:opacity-60"
              />
            </label>

            <button
              type="button"
              onClick={() => eliminarFila(indice)}
              disabled={disabled}
              className="min-h-11 rounded-xl border border-error/40 px-4 text-sm font-bold text-error transition-colors hover:bg-error-container disabled:opacity-50"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange([...nombres, ""])}
        disabled={
          disabled ||
          nombres.length >= MAX_FAMILIARES
        }
        className="inline-flex min-h-11 w-fit items-center justify-center rounded-xl border border-primary px-4 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary disabled:opacity-50"
      >
        + Añadir familiar
      </button>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() =>
          setMostrarAyuda(!mostrarAyuda)
        }
        className="w-fit text-left text-xs font-bold text-primary underline"
      >
        {mostrarAyuda
          ? "Ocultar información"
          : "¿Cómo se guardarán los familiares?"}
      </button>

      {mostrarAyuda && (
        <p className="text-xs leading-5 text-on-surface-variant">
          Los nombres se asociarán al carnet cuando
          termine su creación. Si el guardado falla,
          podrás reintentarlo sin volver a generar
          el carnet. Las filas vacías se omiten.
        </p>
      )}
    </section>
  );
}
