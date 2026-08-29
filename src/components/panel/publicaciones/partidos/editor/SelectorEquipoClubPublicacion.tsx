import {
  useEffect,
  useMemo,
  useState,
} from "react";

export interface EquipoClubPublicacion {
  id: string;
  nombre: string;
  nombreCorto: string | null;
  imagen: string | null;
  categoria: string | null;
  genero: string | null;
  nivel: string | null;
  idEquipoFbib: string | null;
  activo: boolean;
}

interface ResultadoEquiposPanel {
  equipos:
    EquipoClubPublicacion[];
}

interface RespuestaListadoEquipos {
  ok: boolean;
  data:
    ResultadoEquiposPanel | null;
  error: string | null;
}

interface Propiedades {
  equipoId: string | null;

  alCambiar: (
    equipo:
      EquipoClubPublicacion | null,
  ) => void;

  deshabilitado?: boolean;
  error?: string;
}

const ORDEN_CATEGORIAS = [
  [
    "escoleta",
    "escuela",
    "baby",
  ],

  [
    "iniciacion",
    "iniciacio",
  ],

  [
    "premini",
    "pre mini",
  ],

  [
    "mini",
  ],

  [
    "infantil",
  ],

  [
    "cadete",
  ],

  [
    "junior",
  ],

  [
    "sub 21",
    "sub21",
    "sub 22",
    "sub22",
  ],

  [
    "senior",
  ],

  [
    "veterano",
    "veteranos",
  ],
] as const;

const ORDEN_GENEROS = [
  [
    "femenino",
    "femeni",
    "fem",
  ],

  [
    "masculino",
    "masculi",
    "masc",
  ],

  [
    "mixto",
    "mixta",
    "mixte",
  ],
] as const;

let equiposGuardados:
  EquipoClubPublicacion[] | null =
  null;

let peticionEquipos:
  Promise<
    EquipoClubPublicacion[]
  > | null = null;

function normalizarTexto(
  valor: unknown,
): string {
  if (typeof valor !== "string") {
    return "";
  }

  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim();
}

function obtenerOrden(
  valor: string | null,
  orden:
    readonly (
      readonly string[]
    )[],
): number {
  const valorNormalizado =
    normalizarTexto(valor);

  if (!valorNormalizado) {
    return orden.length + 1;
  }

  const indice =
    orden.findIndex(
      (variantes) =>
        variantes.some(
          (variante) =>
            valorNormalizado ===
              variante ||
            valorNormalizado.includes(
              variante,
            ),
        ),
    );

  return indice >= 0
    ? indice
    : orden.length;
}

function compararEquipos(
  primero:
    EquipoClubPublicacion,
  segundo:
    EquipoClubPublicacion,
): number {
  const ordenCategoriaPrimero =
    obtenerOrden(
      primero.categoria,
      ORDEN_CATEGORIAS,
    );

  const ordenCategoriaSegundo =
    obtenerOrden(
      segundo.categoria,
      ORDEN_CATEGORIAS,
    );

  if (
    ordenCategoriaPrimero !==
    ordenCategoriaSegundo
  ) {
    return (
      ordenCategoriaPrimero -
      ordenCategoriaSegundo
    );
  }

  if (
    ordenCategoriaPrimero ===
    ORDEN_CATEGORIAS.length
  ) {
    const comparacionCategoria =
      normalizarTexto(
        primero.categoria,
      ).localeCompare(
        normalizarTexto(
          segundo.categoria,
        ),
        "es",
        {
          numeric: true,
          sensitivity: "base",
        },
      );

    if (
      comparacionCategoria !== 0
    ) {
      return comparacionCategoria;
    }
  }

  const ordenGeneroPrimero =
    obtenerOrden(
      primero.genero,
      ORDEN_GENEROS,
    );

  const ordenGeneroSegundo =
    obtenerOrden(
      segundo.genero,
      ORDEN_GENEROS,
    );

  if (
    ordenGeneroPrimero !==
    ordenGeneroSegundo
  ) {
    return (
      ordenGeneroPrimero -
      ordenGeneroSegundo
    );
  }

  const comparacionNivel =
    normalizarTexto(
      primero.nivel,
    ).localeCompare(
      normalizarTexto(
        segundo.nivel,
      ),
      "es",
      {
        numeric: true,
        sensitivity: "base",
      },
    );

  if (comparacionNivel !== 0) {
    return comparacionNivel;
  }

  return primero.nombre.localeCompare(
    segundo.nombre,
    "es",
    {
      numeric: true,
      sensitivity: "base",
    },
  );
}

function convertirEquipo(
  valor: unknown,
): EquipoClubPublicacion | null {
  if (
    typeof valor !== "object" ||
    valor === null
  ) {
    return null;
  }

  const datos =
    valor as Record<
      string,
      unknown
    >;

  if (
    typeof datos.id !== "string" ||
    !datos.id.trim()
  ) {
    return null;
  }

  const nombre =
    typeof datos.nombre === "string"
      ? datos.nombre.trim()
      : "";

  const nombreCorto =
    typeof datos.nombreCorto ===
      "string"
      ? datos.nombreCorto.trim() ||
        null
      : null;

  return {
    id:
      datos.id,

    nombre:
      nombre ||
      nombreCorto ||
      "Equipo sin nombre",

    nombreCorto,

    imagen:
      typeof datos.imagen ===
      "string"
        ? datos.imagen
        : null,

    categoria:
      typeof datos.categoria ===
      "string"
        ? datos.categoria
        : null,

    genero:
      typeof datos.genero ===
      "string"
        ? datos.genero
        : null,

    nivel:
      typeof datos.nivel ===
      "string"
        ? datos.nivel
        : null,

    idEquipoFbib:
      typeof datos.idEquipoFbib ===
      "string"
        ? datos.idEquipoFbib
        : null,

    activo:
      typeof datos.activo ===
      "boolean"
        ? datos.activo
        : false,
  };
}

export async function solicitarEquipos(): Promise<
  EquipoClubPublicacion[]
> {
  if (equiposGuardados) {
    return equiposGuardados;
  }

  if (peticionEquipos) {
    return peticionEquipos;
  }

  peticionEquipos = fetch(
    "/api/panel/equipos/listado",
    {
      method: "GET",
      credentials:
        "same-origin",

      headers: {
        Accept:
          "application/json",
      },
    },
  )
    .then(
      async (respuesta) => {
        const contenido =
          (await respuesta.json()) as
            RespuestaListadoEquipos;

        if (
          !respuesta.ok ||
          !contenido.ok ||
          !contenido.data
        ) {
          throw new Error(
            contenido.error ??
              "No se han podido obtener los equipos.",
          );
        }

        const equipos =
          contenido.data.equipos
            .map(
              convertirEquipo,
            )
            .filter(
              (
                equipo,
              ): equipo is EquipoClubPublicacion =>
                equipo !== null,
            )
            .sort(
              compararEquipos,
            );

        equiposGuardados =
          equipos;

        return equipos;
      },
    )
    .finally(() => {
      peticionEquipos =
        null;
    });

  return peticionEquipos;
}

function obtenerDescripcionEquipo(
  equipo:
    EquipoClubPublicacion,
): string {
  return [
    equipo.categoria,
    equipo.genero,
    equipo.nivel,
  ]
    .filter(
      (
        valor,
      ): valor is string =>
        typeof valor ===
          "string" &&
        valor.trim().length > 0,
    )
    .join(" · ");
}

export default function SelectorEquipoClubPublicacion({
  equipoId,
  alCambiar,
  deshabilitado = false,
  error,
}: Propiedades) {
  const [
    equipos,
    setEquipos,
  ] = useState<
    EquipoClubPublicacion[]
  >(
    equiposGuardados ?? [],
  );

  const [
    cargando,
    setCargando,
  ] = useState(
    !equiposGuardados,
  );

  const [
    errorCarga,
    setErrorCarga,
  ] = useState<
    string | null
  >(null);

  const [
    intento,
    setIntento,
  ] = useState(0);

  useEffect(() => {
    let activo = true;

    const cargarEquipos =
      async () => {
        try {
          setCargando(true);
          setErrorCarga(null);

          const resultado =
            await solicitarEquipos();

          if (!activo) {
            return;
          }

          setEquipos(
            resultado,
          );
        } catch (error) {
          if (!activo) {
            return;
          }

          console.error(
            "Error cargando los equipos del club:",
            error,
          );

          setErrorCarga(
            error instanceof Error
              ? error.message
              : "No se han podido cargar los equipos.",
          );
        } finally {
          if (activo) {
            setCargando(false);
          }
        }
      };

    cargarEquipos();

    return () => {
      activo = false;
    };
  }, [intento]);

  const equipoSeleccionado =
    useMemo(
      () =>
        equipos.find(
          (equipo) =>
            equipo.id ===
            equipoId,
        ) ?? null,
      [
        equipos,
        equipoId,
      ],
    );

  const cambiarEquipo = (
    siguienteId: string,
  ) => {
    if (!siguienteId) {
      alCambiar(null);

      return;
    }

    const siguienteEquipo =
      equipos.find(
        (equipo) =>
          equipo.id ===
          siguienteId,
      ) ?? null;

    alCambiar(
      siguienteEquipo,
    );
  };

  if (errorCarga) {
    return (
      <div className="rounded-xl border border-error/40 bg-error-container px-4 py-3 text-on-error-container">
        <p className="text-sm font-bold">
          No se han podido cargar los
          equipos
        </p>

        <p className="mt-1 text-xs">
          {errorCarga}
        </p>

        <button
          type="button"
          onClick={() =>
            setIntento(
              (valor) =>
                valor + 1,
            )
          }
          className="mt-3 rounded-lg border border-error px-3 py-2 text-xs font-bold transition-colors hover:bg-error hover:text-on-error"
        >
          Volver a intentarlo
        </button>
      </div>
    );
  }

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-on-surface">
        Equipo del C.B. Andratx
      </span>

      <div className="relative">
        <select
          value={equipoId ?? ""}
          onChange={(evento) =>
            cambiarEquipo(
              evento.target.value,
            )
          }
          disabled={
            deshabilitado ||
            cargando
          }
          className={`h-11 w-full appearance-none rounded-xl border bg-surface-container-lowest px-3 pr-10 text-sm text-on-surface outline-none transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            error
              ? "border-error focus:border-error focus:ring-error/20"
              : "border-outline-variant focus:border-primary focus:ring-primary/20"
          }`}
        >
          <option value="">
            {cargando
              ? "Cargando equipos..."
              : "Selecciona un equipo"}
          </option>

          {equipos.map(
            (equipo) => {
              const descripcion =
                obtenerDescripcionEquipo(
                  equipo,
                );

              return (
                <option
                  key={equipo.id}
                  value={equipo.id}
                >
                  {equipo.nombre}
                  {descripcion
                    ? ` — ${descripcion}`
                    : ""}
                </option>
              );
            },
          )}
        </select>

        <span
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-outline"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 fill-current"
          >
            <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41Z" />
          </svg>
        </span>
      </div>

      {equipoSeleccionado && (
        <span className="flex items-center gap-2 rounded-lg bg-surface-container px-2.5 py-2 text-xs text-on-surface-variant">
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container-high font-bold text-primary">
            {equipoSeleccionado.nombre
              .charAt(0)
              .toUpperCase()}

            {equipoSeleccionado.imagen && (
              <img
                src={
                  equipoSeleccionado.imagen
                }
                alt=""
                className="absolute inset-0 h-full w-full bg-white object-contain p-0.5"
              />
            )}
          </span>

          <span className="min-w-0">
            <span className="block truncate font-bold text-on-surface">
              {
                equipoSeleccionado.nombre
              }
            </span>

            <span className="block truncate">
              {obtenerDescripcionEquipo(
                equipoSeleccionado,
              ) ||
                "Sin categoría especificada"}
            </span>
          </span>
        </span>
      )}

      {error && (
        <span className="text-xs font-medium text-error">
          {error}
        </span>
      )}

      {!cargando &&
        equipos.length === 0 && (
          <span className="text-xs text-on-surface-variant">
            No hay equipos disponibles en
            la temporada activa.
          </span>
        )}
    </label>
  );
}