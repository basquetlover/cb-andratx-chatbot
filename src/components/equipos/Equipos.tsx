import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useToast,
} from "@components/notificaciones/SistemaNotificaciones";

import {
  alternarEquipoFavorito,
  depurarEquiposFavoritos,
  escucharCambiosFavoritos,
  obtenerEquiposFavoritos,
} from "@servicios/favoritos/equiposFavoritos";

import type {
  EquipoPagina,
  RespuestaEquiposPagina,
} from "@tipos/EquiposPagina";


// ============================================================
// TIPOS
// ============================================================

interface GrupoCategoria {
  categoria: string;
  equipos: EquipoPagina[];
}

interface PropiedadesTarjeta {
  equipo: EquipoPagina;
  esFavorito: boolean;
  compacta?: boolean;
  alCambiarFavorito: (
    equipo: EquipoPagina,
  ) => void;
}

type OrdenCategorias =
  | "ascendente"
  | "descendente";

type DatosInicialesEquipos =
  NonNullable<
    RespuestaEquiposPagina["data"]
  >;

interface PropiedadesEquipos {
  datosIniciales?:
    | DatosInicialesEquipos
    | null;
}


// ============================================================
// CONFIGURACIÓN
// ============================================================

const ordenCategorias = [
  "iniciacion",
  "premini",
  "mini",
  "infantil",
  "cadete",
  "junior",
  "senior",
];


// ============================================================
// HELPERS
// ============================================================

function normalizarTexto(
  texto: string,
): string {
  return texto
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim();
}


function primeraLetraMayuscula(
  texto: string,
): string {
  const textoLimpio =
    texto.trim();

  if (!textoLimpio) {
    return textoLimpio;
  }

  return (
    textoLimpio
      .charAt(0)
      .toLocaleUpperCase(
        "es-ES",
      ) +
    textoLimpio.slice(1)
  );
}


function obtenerPosicionCategoria(
  categoria: string,
): number {
  const categoriaNormalizada =
    normalizarTexto(
      categoria,
    );

  const posicion =
    ordenCategorias.findIndex(
      categoriaOrden =>
        categoriaNormalizada.includes(
          categoriaOrden,
        ),
    );

  return posicion === -1
    ? ordenCategorias.length
    : posicion;
}


function obtenerNombreEquipo(
  equipo: EquipoPagina,
): string {
  return (
    equipo.nombre ??
    equipo.nombreCorto ??
    "Equipo"
  );
}


// ============================================================
// ICONOS
// ============================================================

function IconoEstrella({
  rellena,
}: {
  rellena: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill={
        rellena
          ? "currentColor"
          : "none"
      }
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="m12 3.4 2.52 5.1 5.63.82-4.07 3.97.96 5.61L12 16.25 6.96 18.9l.96-5.61-4.07-3.97 5.63-.82L12 3.4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


function IconoBaloncesto({
  className = "h-6 w-6",
}: {
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -960 960 960"
      className={className}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="M162-520h114q-6-38-23-71t-43-59q-18 29-30.5 61.5T162-520m522 0h114q-5-36-17.5-68.5T750-650q-26 26-43 59t-23 71M210-310q26-26 43-59t23-71H162q5 36 17.5 68.5T210-310m540 0q18-29 30.5-61.5T798-440H684q6 38 23 71t43 59M358-520h82v-278q-53 8-98.5 29.5T260-712q39 38 64.5 86.5T358-520m162 0h82q8-57 33.5-105.5T700-712q-36-35-81.5-56.5T520-798zm-80 358v-278h-82q-8 57-33.5 105.5T260-248q36 35 81.5 56.5T440-162m80 0q53-8 98.5-29.5T700-248q-39-38-64.5-86.5T602-440h-82zm-40 82q-83 0-156-31.5T197-197t-85.5-127T80-480t31.5-156T197-763t127-85.5T480-880t156 31.5T763-763t85.5 127T880-480t-31.5 156T763-197t-127 85.5T480-80" />
    </svg>
  );
}


// ============================================================
// SEPARADOR DE CATEGORÍA
// ============================================================

function SeparadorCategoria({
  categoria,
}: {
  categoria: string;
}) {
  return (
    <div className="mb-4 grid w-full grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-3">
      <span
        className="h-px bg-outline-variant"
        aria-hidden="true"
      />

      <span className="text-tertiary">
        <IconoBaloncesto className="h-5 w-5" />
      </span>

      <h2 className="text-center text-lg font-bold uppercase tracking-wide text-on-secondary-fixed">
        {categoria}
      </h2>

      <span className="text-tertiary">
        <IconoBaloncesto className="h-5 w-5" />
      </span>

      <span
        className="h-px bg-outline-variant"
        aria-hidden="true"
      />
    </div>
  );
}


// ============================================================
// TARJETA DE EQUIPO
// ============================================================

function TarjetaEquipo({
  equipo,
  esFavorito,
  compacta = false,
  alCambiarFavorito,
}: PropiedadesTarjeta) {
  const nombre =
    obtenerNombreEquipo(
      equipo,
    );

  const informacion = [
    equipo.genero,
    equipo.nivel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className={`
        relative flex h-full flex-col rounded-xl border p-4
        transition-all duration-300

        ${
          esFavorito
            ? "border-primary bg-primary-fixed shadow-[0_10px_28px_-18px_rgba(0,102,136,0.7)]"
            : "border-outline-variant/70 bg-surface-container-lowest hover:-translate-y-1 hover:border-primary hover:shadow-[0_12px_30px_-20px_rgba(0,102,136,0.55)]"
        }

        ${
          compacta
            ? "min-w-65"
            : ""
        }
      `}
    >
      <div className="flex items-start gap-3">
        <span
          className={`
            flex h-11 w-11 shrink-0
            items-center justify-center
            rounded-full

            ${
              esFavorito
                ? "bg-primary-container text-on-primary-container"
                : "bg-surface-container text-primary"
            }
          `}
        >
          <IconoBaloncesto />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug text-on-secondary-fixed">
            {nombre}
          </p>

          {equipo.categoria && (
            <p className="mt-1 text-sm font-semibold text-primary">
              {primeraLetraMayuscula(
                equipo.categoria,
              )}
            </p>
          )}

          {informacion && (
            <p className="mt-1 text-xs text-on-surface-variant first-letter:uppercase">
              {informacion}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            alCambiarFavorito(
              equipo,
            )
          }
          className={`
            flex h-11 w-11
            shrink-0 cursor-pointer
            items-center justify-center
            rounded-full
            transition-all
            focus-visible:outline-2
            focus-visible:outline-offset-2
            focus-visible:outline-primary

            ${
              esFavorito
                ? "bg-tertiary-fixed text-tertiary hover:bg-tertiary-fixed-dim"
                : "bg-surface-container text-outline hover:bg-primary-fixed hover:text-primary"
            }
          `}
          aria-label={
            esFavorito
              ? `Eliminar ${nombre} de favoritos`
              : `Añadir ${nombre} a favoritos`
          }
          aria-pressed={
            esFavorito
          }
        >
          <IconoEstrella
            rellena={
              esFavorito
            }
          />
        </button>
      </div>

      {esFavorito && (
        <span className="mt-4 inline-flex w-fit items-center gap-1 rounded-full bg-primary-container px-3 py-1 text-xs font-bold text-on-primary-container">
          <IconoEstrella
            rellena
          />

          Favorito
        </span>
      )}

      {equipo.descripcion &&
        !compacta && (
          <p className="mt-4 line-clamp-2 text-sm text-on-surface-variant">
            {
              equipo.descripcion
            }
          </p>
        )}

      {equipo.slug?.trim() && (
        <a
          href={`/equipos/${encodeURIComponent(
            equipo.slug.trim(),
          )}`}
          className="mt-4 inline-flex w-fit items-center gap-2 text-sm font-bold text-secondary transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          Ver equipo

          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              d="M5 12h14M13 6l6 6-6 6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      )}
    </article>
  );
}


// ============================================================
// ESTADO DE CARGA
// ============================================================

function EstadoCargando() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Cargando equipos"
    >
      {Array.from(
        {
          length: 6,
        },
        (
          _,
          indice,
        ) => (
          <div
            key={
              indice
            }
            className="animate-pulse rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4"
          >
            <div className="flex gap-3">
              <span className="h-11 w-11 rounded-full bg-surface-container-highest" />

              <div className="flex-1">
                <div className="h-4 w-2/3 rounded-full bg-surface-container-highest" />

                <div className="mt-3 h-3 w-1/3 rounded-full bg-surface-container-high" />
              </div>
            </div>
          </div>
        ),
      )}
    </div>
  );
}


// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function Equipos({
  datosIniciales = null,
}: PropiedadesEquipos) {
  const {
    addToast,
  } = useToast();


  // ============================================================
  // ESTADO
  // ============================================================

  const [
    equipos,
    setEquipos,
  ] = useState<
    EquipoPagina[]
  >(
    datosIniciales
      ?.equipos ??
      [],
  );

  const [
    temporadaId,
    setTemporadaId,
  ] = useState<
    string | null
  >(
    datosIniciales
      ?.temporadaId ??
      null,
  );

  const [
    favoritosIds,
    setFavoritosIds,
  ] = useState<
    string[]
  >([]);

  const [
    busqueda,
    setBusqueda,
  ] = useState("");

  const [
    categoriaSeleccionada,
    setCategoriaSeleccionada,
  ] = useState(
    "todas",
  );

  const [
    generoSeleccionado,
    setGeneroSeleccionado,
  ] = useState(
    "todos",
  );

  const [
    cargando,
    setCargando,
  ] = useState(
    datosIniciales ===
      null,
  );

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    intento,
    setIntento,
  ] = useState(0);

  const [
    ordenCategoriasSeleccionado,
    setOrdenCategoriasSeleccionado,
  ] =
    useState<OrdenCategorias>(
      "ascendente",
    );


  // ============================================================
  // CARGA DE EQUIPOS
  // ============================================================

  useEffect(() => {
    /*
     * Si Astro ya ha cargado
     * los equipos en el servidor,
     * no repetimos la petición
     * al montar React.
     */
    if (
      datosIniciales &&
      intento === 0
    ) {
      return;
    }

    const controlador =
      new AbortController();

    const cargarEquipos =
      async () => {
        try {
          setCargando(
            true,
          );

          setError(
            null,
          );

          const respuesta =
            await fetch(
              "/api/equipos/temporada-activa",
              {
                method:
                  "GET",

                credentials:
                  "same-origin",

                headers:
                  {
                    Accept:
                      "application/json",
                  },

                signal:
                  controlador
                    .signal,
              },
            );

          const contenido =
            (await respuesta.json()) as RespuestaEquiposPagina;

          if (
            !respuesta.ok ||
            !contenido.ok ||
            !contenido.data
          ) {
            throw new Error(
              contenido.error ??
                "No se han podido obtener los equipos",
            );
          }

          setEquipos(
            contenido
              .data
              .equipos,
          );

          setTemporadaId(
            contenido
              .data
              .temporadaId,
          );
        } catch (
          error
        ) {
          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          console.error(
            "Error al cargar los equipos:",
            error,
          );

          setError(
            "No hemos podido cargar los equipos del club.",
          );
        } finally {
          if (
            !controlador
              .signal
              .aborted
          ) {
            setCargando(
              false,
            );
          }
        }
      };

    cargarEquipos();

    return () => {
      controlador.abort();
    };
  }, [
    intento,
    datosIniciales,
  ]);


  // ============================================================
  // FAVORITOS
  // ============================================================

  useEffect(() => {
    if (
      !temporadaId
    ) {
      setFavoritosIds(
        [],
      );

      return;
    }

    const favoritosValidos =
      depurarEquiposFavoritos(
        temporadaId,
        equipos.map(
          equipo =>
            equipo.id,
        ),
      );

    setFavoritosIds(
      favoritosValidos,
    );

    return escucharCambiosFavoritos(
      temporadaId,
      setFavoritosIds,
    );
  }, [
    temporadaId,
    equipos,
  ]);


  // ============================================================
  // CATEGORÍAS
  // ============================================================

  const categorias =
    useMemo(
      () => {
        return Array.from(
          new Set(
            equipos
              .map(
                equipo =>
                  equipo.categoria?.trim(),
              )
              .filter(
                (
                  categoria,
                ): categoria is string =>
                  Boolean(
                    categoria,
                  ),
              ),
          ),
        ).sort(
          (
            primera,
            segunda,
          ) => {
            const primeraPosicion =
              obtenerPosicionCategoria(
                primera,
              );

            const segundaPosicion =
              obtenerPosicionCategoria(
                segunda,
              );

            if (
              primeraPosicion !==
              segundaPosicion
            ) {
              return (
                primeraPosicion -
                segundaPosicion
              );
            }

            return primera.localeCompare(
              segunda,
              "es",
            );
          },
        );
      },
      [
        equipos,
      ],
    );


  // ============================================================
  // GÉNEROS
  // ============================================================

  const generos =
    useMemo(
      () => {
        return Array.from(
          new Set(
            equipos
              .map(
                equipo =>
                  equipo.genero?.trim(),
              )
              .filter(
                (
                  genero,
                ): genero is string =>
                  Boolean(
                    genero,
                  ),
              ),
          ),
        ).sort(
          (
            primero,
            segundo,
          ) =>
            primero.localeCompare(
              segundo,
              "es",
            ),
        );
      },
      [
        equipos,
      ],
    );


  // ============================================================
  // FAVORITOS
  // ============================================================

  const equiposFavoritos =
    useMemo(
      () => {
        return equipos.filter(
          equipo =>
            favoritosIds.includes(
              equipo.id,
            ),
        );
      },
      [
        equipos,
        favoritosIds,
      ],
    );


  // ============================================================
  // FILTROS
  // ============================================================

  const equiposFiltrados =
    useMemo(
      () => {
        const busquedaNormalizada =
          normalizarTexto(
            busqueda,
          );

        return equipos.filter(
          equipo => {
            const coincideBusqueda =
              busquedaNormalizada.length ===
                0 ||
              normalizarTexto(
                [
                  equipo.nombre,
                  equipo.nombreCorto,
                  equipo.categoria,
                  equipo.genero,
                  equipo.nivel,
                ]
                  .filter(
                    Boolean,
                  )
                  .join(
                    " ",
                  ),
              ).includes(
                busquedaNormalizada,
              );

            const coincideCategoria =
              categoriaSeleccionada ===
                "todas" ||
              equipo.categoria ===
                categoriaSeleccionada;

            const coincideGenero =
              generoSeleccionado ===
                "todos" ||
              equipo.genero ===
                generoSeleccionado;

            return (
              coincideBusqueda &&
              coincideCategoria &&
              coincideGenero
            );
          },
        );
      },
      [
        equipos,
        busqueda,
        categoriaSeleccionada,
        generoSeleccionado,
      ],
    );


  // ============================================================
  // AGRUPACIÓN POR CATEGORÍAS
  // ============================================================

  const gruposCategorias =
    useMemo<
      GrupoCategoria[]
    >(
      () => {
        const grupos =
          new Map<
            string,
            EquipoPagina[]
          >();

        equiposFiltrados.forEach(
          equipo => {
            const categoria =
              equipo.categoria?.trim() ||
              "Sin categoría";

            const equiposCategoria =
              grupos.get(
                categoria,
              ) ??
              [];

            equiposCategoria.push(
              equipo,
            );

            grupos.set(
              categoria,
              equiposCategoria,
            );
          },
        );

        const gruposOrdenados =
          Array.from(
            grupos.entries(),
          )
            .map(
              ([
                categoria,
                equiposCategoria,
              ]) => ({
                categoria,

                equipos:
                  [
                    ...equiposCategoria,
                  ].sort(
                    (
                      primerEquipo,
                      segundoEquipo,
                    ) =>
                      obtenerNombreEquipo(
                        primerEquipo,
                      ).localeCompare(
                        obtenerNombreEquipo(
                          segundoEquipo,
                        ),
                        "es",
                      ),
                  ),
              }),
            )
            .sort(
              (
                primerGrupo,
                segundoGrupo,
              ) => {
                const primeraPosicion =
                  obtenerPosicionCategoria(
                    primerGrupo
                      .categoria,
                  );

                const segundaPosicion =
                  obtenerPosicionCategoria(
                    segundoGrupo
                      .categoria,
                  );

                if (
                  primeraPosicion !==
                  segundaPosicion
                ) {
                  return (
                    primeraPosicion -
                    segundaPosicion
                  );
                }

                return primerGrupo
                  .categoria
                  .localeCompare(
                    segundoGrupo
                      .categoria,
                    "es",
                  );
              },
            );

        return ordenCategoriasSeleccionado ===
          "descendente"
          ? [
              ...gruposOrdenados,
            ].reverse()
          : gruposOrdenados;
      },
      [
        equiposFiltrados,
        ordenCategoriasSeleccionado,
      ],
    );


  // ============================================================
  // ACCIONES
  // ============================================================

  const cambiarFavorito = (
    equipo: EquipoPagina,
  ) => {
    if (
      !temporadaId
    ) {
      return;
    }

    const resultado =
      alternarEquipoFavorito(
        temporadaId,
        equipo.id,
      );

    const nombre =
      obtenerNombreEquipo(
        equipo,
      );

    setFavoritosIds(
      resultado.equiposIds,
    );

    addToast({
      type:
        resultado.esFavorito
          ? "favoriteAdded"
          : "favoriteRemoved",

      message:
        resultado.esFavorito
          ? `${nombre} ya está entre tus equipos favoritos.`
          : `${nombre} ya no está entre tus equipos favoritos.`,

      duration:
        4500,
    });
  };


  const limpiarFiltros =
    () => {
      setBusqueda(
        "",
      );

      setCategoriaSeleccionada(
        "todas",
      );

      setGeneroSeleccionado(
        "todos",
      );
    };


  const hayFiltros =
    busqueda.length >
      0 ||
    categoriaSeleccionada !==
      "todas" ||
    generoSeleccionado !==
      "todos";


  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="mx-auto w-full max-w-300 px-4 py-8 pb-28 sm:px-6 md:py-12 md:pb-16">

      {/* ========================================================
          CABECERA
      ========================================================= */}

      <section className="relative overflow-hidden rounded-2xl border border-primary/25 bg-primary-container/25 p-6 sm:p-8">
        <span
          className="absolute -right-10 -top-10 text-primary/10"
          aria-hidden="true"
        >
          <IconoBaloncesto className="h-40 w-40" />
        </span>

        <div className="relative max-w-180">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
            C.B. Andratx
          </p>

          <h1 className="mt-2 text-3xl font-bold text-on-secondary-fixed sm:text-4xl">
            Equipos del Club Bàsquet Andratx
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-on-surface-variant">
            Consulta los equipos de baloncesto que forman el C.B. Andratx durante la temporada 2026/27. Descubre sus categorías, niveles y guarda tus equipos favoritos para acceder rápidamente a su información y calendario.
          </p>

          {!cargando &&
            !error && (
              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-full bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-on-secondary-fixed shadow-sm">
                  {
                    equipos.length
                  }{" "}
                  equipos
                </span>

                <span className="rounded-full bg-tertiary-fixed px-4 py-2 text-sm font-semibold text-on-tertiary-fixed">
                  {
                    equiposFavoritos.length
                  }{" "}
                  favoritos
                </span>
              </div>
            )}
        </div>
      </section>


      {/* ========================================================
          CONTENIDO
      ========================================================= */}

      {!cargando &&
        !error && (
          <>

            {/* ==================================================
                FAVORITOS
            =================================================== */}

            <section
              className="mt-10"
              aria-labelledby="titulo-favoritos"
            >
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
                    Accesos rápidos
                  </p>

                  <h2
                    id="titulo-favoritos"
                    className="mt-1 text-2xl font-bold text-on-secondary-fixed"
                  >
                    Tus equipos favoritos
                  </h2>
                </div>

                {equiposFavoritos.length >
                  0 && (
                    <span className="text-sm text-on-surface-variant">
                      {
                        equiposFavoritos.length
                      }{" "}
                      seleccionados
                    </span>
                  )}
              </div>

              {equiposFavoritos.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-primary/50 bg-primary-fixed/50 px-6 py-8 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                    <IconoEstrella
                      rellena={
                        false
                      }
                    />
                  </span>

                  <p className="mt-4 font-bold text-on-secondary-fixed">
                    Todavía no tienes equipos favoritos
                  </p>

                  <p className="mx-auto mt-2 max-w-140 text-sm text-on-surface-variant">
                    Marca la estrella de un equipo para tenerlo siempre a mano y personalizar posteriormente tu calendario.
                  </p>
                </div>
              ) : (
                <div className="grid auto-cols-[minmax(260px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-3">
                  {equiposFavoritos.map(
                    equipo => (
                      <TarjetaEquipo
                        key={
                          equipo.id
                        }
                        equipo={
                          equipo
                        }
                        esFavorito
                        compacta
                        alCambiarFavorito={
                          cambiarFavorito
                        }
                      />
                    ),
                  )}
                </div>
              )}
            </section>


            {/* ==================================================
                TODOS LOS EQUIPOS
            =================================================== */}

            <section
              className="mt-12"
              aria-labelledby="titulo-todos-equipos"
            >
              <div className="mb-6">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
                  El club
                </p>

                <h2
                  id="titulo-todos-equipos"
                  className="mt-1 text-2xl font-bold text-on-secondary-fixed"
                >
                  Todos los equipos
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
                  Explora los equipos del Club Bàsquet Andratx por categoría y género. Puedes utilizar los filtros para encontrar rápidamente el equipo que buscas.
                </p>
              </div>


              {/* ================================================
                  FILTROS
              ================================================= */}

              <div className="grid gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_220px_160px_160px_auto]">

                <label className="relative block sm:col-span-2 lg:col-span-1">
                  <span className="sr-only">
                    Buscar un equipo
                  </span>

                  <svg
                    viewBox="0 0 24 24"
                    className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-outline"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <circle
                      cx="11"
                      cy="11"
                      r="7"
                    />

                    <path
                      d="m16 16 4 4"
                      strokeLinecap="round"
                    />
                  </svg>

                  <input
                    type="search"
                    value={
                      busqueda
                    }
                    onChange={
                      evento =>
                        setBusqueda(
                          evento
                            .target
                            .value,
                        )
                    }
                    placeholder="Buscar un equipo"
                    className="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-10 pr-4 text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>


                <select
                  value={
                    categoriaSeleccionada
                  }
                  onChange={
                    evento =>
                      setCategoriaSeleccionada(
                        evento
                          .target
                          .value,
                      )
                  }
                  className="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  aria-label="Filtrar por categoría"
                >
                  <option value="todas">
                    Todas las categorías
                  </option>

                  {categorias.map(
                    categoria => (
                      <option
                        key={
                          categoria
                        }
                        value={
                          categoria
                        }
                      >
                        {primeraLetraMayuscula(
                          categoria,
                        )}
                      </option>
                    ),
                  )}
                </select>


                <select
                  value={
                    generoSeleccionado
                  }
                  onChange={
                    evento =>
                      setGeneroSeleccionado(
                        evento
                          .target
                          .value,
                      )
                  }
                  className="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  aria-label="Filtrar por género"
                >
                  <option value="todos">
                    Todos
                  </option>

                  {generos.map(
                    genero => (
                      <option
                        key={
                          genero
                        }
                        value={
                          genero
                        }
                      >
                        {primeraLetraMayuscula(
                          genero,
                        )}
                      </option>
                    ),
                  )}
                </select>


                <select
                  value={
                    ordenCategoriasSeleccionado
                  }
                  onChange={
                    evento =>
                      setOrdenCategoriasSeleccionado(
                        evento
                          .target
                          .value as OrdenCategorias,
                      )
                  }
                  className="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  aria-label="Ordenar categorías"
                >
                  <option value="ascendente">
                    Ascendente
                  </option>

                  <option value="descendente">
                    Descendente
                  </option>
                </select>


                <button
                  type="button"
                  onClick={
                    limpiarFiltros
                  }
                  disabled={
                    !hayFiltros
                  }
                  className="h-11 rounded-lg border border-primary px-4 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-2 lg:col-span-1"
                >
                  Limpiar
                </button>
              </div>


              {/* ================================================
                  RESULTADOS
              ================================================= */}

              {gruposCategorias.length ===
              0 ? (
                <div className="mt-8 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest px-6 py-10 text-center">
                  <p className="font-bold text-on-secondary-fixed">
                    No hemos encontrado ningún equipo
                  </p>

                  <p className="mt-2 text-sm text-on-surface-variant">
                    Prueba a cambiar los filtros o el texto de búsqueda.
                  </p>
                </div>
              ) : (
                <div className="mt-10 flex flex-col gap-12">
                  {gruposCategorias.map(
                    grupo => (
                      <section
                        key={
                          grupo.categoria
                        }
                      >
                        <SeparadorCategoria
                          categoria={
                            grupo.categoria
                          }
                        />

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {grupo.equipos.map(
                            equipo => (
                              <TarjetaEquipo
                                key={
                                  equipo.id
                                }
                                equipo={
                                  equipo
                                }
                                esFavorito={
                                  favoritosIds.includes(
                                    equipo.id,
                                  )
                                }
                                alCambiarFavorito={
                                  cambiarFavorito
                                }
                              />
                            ),
                          )}
                        </div>
                      </section>
                    ),
                  )}
                </div>
              )}
            </section>
          </>
        )}


      {/* ========================================================
          CARGANDO
      ========================================================= */}

      {cargando && (
        <section className="mt-10">
          <EstadoCargando />
        </section>
      )}


      {/* ========================================================
          ERROR
      ========================================================= */}

      {!cargando &&
        error && (
          <section
            className="mt-10 rounded-2xl border border-error/40 bg-error-container p-6 text-center"
            role="alert"
          >
            <p className="font-bold text-on-error-container">
              No se han podido cargar los equipos
            </p>

            <p className="mt-2 text-sm text-on-error-container">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                setIntento(
                  valor =>
                    valor +
                    1,
                )
              }
              className="mt-5 rounded-lg bg-error px-5 py-2.5 text-sm font-bold text-on-error transition-colors hover:opacity-90"
            >
              Volver a intentarlo
            </button>
          </section>
        )}
    </div>
  );
}