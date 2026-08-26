import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  Map as MapaLeaflet,
  Marker as MarcadorLeaflet,
} from "leaflet";

import "./MapaLocalizaciones.css";

export interface LocalizacionMapa {
  id: string;
  nombre: string | null;
  nombre_corto: string | null;
  slug?: string | null;
  direccion: string | null;
  localidad: string | null;
  codigo_postal: string | null;
  latitud: string | number | null;
  longitud: string | number | null;
  descripcion?: string | null;
}

interface LocalizacionValida
  extends LocalizacionMapa {
  latitudNumerica: number;
  longitudNumerica: number;
}

export type TemaMapa =
  | "claro"
  | "azul"
  | "oscuro";

interface Propiedades {
  localizaciones: LocalizacionMapa[];
  zoom?: number;
  mostrarControles?: boolean;
  abrirPopupInicial?: boolean;
  mostrarLeyenda?: boolean;
  temaMapa?: TemaMapa;
  className?: string;
}

interface ConfiguracionTema {
  url: string;
  clase: string;
}

const coloresMarcadores = [
  "#006688",
  "#e4b300",
  "#425f8d",
  "#16834b",
  "#ba1a1a",
  "#765b00",
  "#7b4db3",
  "#d25c17",
];

const urlMapaBase =
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const configuracionTemas: Record<
  TemaMapa,
  ConfiguracionTema
> = {
  claro: {
    url: urlMapaBase,
    clase: "mapa-tema-claro",
  },
  azul: {
    url: urlMapaBase,
    clase: "mapa-tema-azul",
  },
  oscuro: {
    url: urlMapaBase,
    clase: "mapa-tema-oscuro",
  },
};

function convertirCoordenada(
  valor: string | number | null,
): number | null {
  if (
    valor === null ||
    valor === ""
  ) {
    return null;
  }

  const numero =
    typeof valor === "number"
      ? valor
      : Number(
          valor.replace(",", "."),
        );

  return Number.isFinite(numero)
    ? numero
    : null;
}

function obtenerNombre(
  localizacion: LocalizacionMapa,
): string {
  return (
    localizacion.nombre?.trim() ||
    localizacion.nombre_corto?.trim() ||
    "Instalación"
  );
}

function obtenerDireccion(
  localizacion: LocalizacionMapa,
): string {
  return [
    localizacion.direccion,
    localizacion.codigo_postal,
    localizacion.localidad,
  ]
    .filter(Boolean)
    .join(", ");
}

function crearUrlGoogleMaps(
  localizacion: LocalizacionValida,
): string {
  const coordenadas =
    `${localizacion.latitudNumerica},${localizacion.longitudNumerica}`;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    coordenadas,
  )}`;
}

function crearContenidoPopup(
  localizacion: LocalizacionValida,
): HTMLElement {
  const contenido =
    document.createElement("div");

  contenido.className = "mapa-popup";

  const nombre =
    document.createElement("p");

  nombre.className =
    "mapa-popup__nombre";

  nombre.textContent =
    obtenerNombre(localizacion);

  contenido.appendChild(nombre);

  const direccionCompleta =
    obtenerDireccion(localizacion);

  if (direccionCompleta) {
    const direccion =
      document.createElement("p");

    direccion.className =
      "mapa-popup__direccion";

    direccion.textContent =
      direccionCompleta;

    contenido.appendChild(direccion);
  }

  if (
    localizacion.descripcion?.trim()
  ) {
    const descripcion =
      document.createElement("p");

    descripcion.className =
      "mapa-popup__descripcion";

    descripcion.textContent =
      localizacion.descripcion;

    contenido.appendChild(
      descripcion,
    );
  }

  const enlace =
    document.createElement("a");

  enlace.className =
    "mapa-popup__enlace";

  enlace.href =
    crearUrlGoogleMaps(localizacion);

  enlace.target = "_blank";
  enlace.rel = "noopener noreferrer";

  enlace.textContent =
    "Abrir en Google Maps";

  enlace.setAttribute(
    "aria-label",
    `Abrir ${obtenerNombre(
      localizacion,
    )} en Google Maps`,
  );

  contenido.appendChild(enlace);

  return contenido;
}

function crearMarcadorSvg(
  color: string,
  identificador: string,
): string {
  const idGradiente =
    `gradiente-${identificador}`;

  const idSombra =
    `sombra-${identificador}`;

  return `
    <div class="mapa-marcador__contenido">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 62"
        width="48"
        height="62"
        aria-hidden="true"
      >
        <defs>
          <filter
            id="${idSombra}"
            x="-40%"
            y="-20%"
            width="180%"
            height="170%"
          >
            <feDropShadow
              dx="0"
              dy="4"
              stdDeviation="3"
              flood-color="rgba(0,30,55,0.35)"
            />
          </filter>

          <linearGradient
            id="${idGradiente}"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop
              offset="0%"
              stop-color="${color}"
              stop-opacity="0.72"
            />

            <stop
              offset="100%"
              stop-color="${color}"
            />
          </linearGradient>
        </defs>

        <path
          d="M24 2C12.95 2 4 10.95 4 22c0 13.28 17.67 36.94 19.12 38.85a1.1 1.1 0 0 0 1.76 0C26.33 58.94 44 35.28 44 22 44 10.95 35.05 2 24 2Z"
          fill="url(#${idGradiente})"
          filter="url(#${idSombra})"
        />

        <path
          d="M24 3C13.5 3 5 11.5 5 22c0 12.34 16.36 34.79 19 38.15C26.64 56.79 43 34.34 43 22 43 11.5 34.5 3 24 3Z"
          fill="none"
          stroke="rgba(255,255,255,0.65)"
          stroke-width="1.5"
        />

        <circle
          cx="24"
          cy="22"
          r="10"
          fill="#ffffff"
          fill-opacity="0.95"
        />

        <path
          d="M15.5 22h17M24 13.5v17M17.4 16.7c4.6 2.2 8.6 6.2 13.2 10.6M30.6 16.7c-4.6 2.2-8.6 6.2-13.2 10.6"
          fill="none"
          stroke="${color}"
          stroke-width="1.6"
          stroke-linecap="round"
        />
      </svg>
    </div>
  `;
}

export default function MapaLocalizaciones({
  localizaciones,
  zoom = 15,
  mostrarControles = true,
  abrirPopupInicial = false,
  mostrarLeyenda = true,
  temaMapa = "azul",
  className = "",
}: Propiedades) {
  const identificadorReact = useId();

  const identificadorMapa =
    identificadorReact.replace(
      /[^a-zA-Z0-9_-]/g,
      "",
    );

  const contenedorRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const mapaRef =
    useRef<MapaLeaflet | null>(
      null,
    );

  const marcadoresRef = useRef<
    Map<string, MarcadorLeaflet>
  >(new Map());

  const [error, setError] =
    useState<string | null>(null);

  const localizacionesValidas =
    useMemo<LocalizacionValida[]>(
      () => {
        return localizaciones.flatMap(
          (localizacion) => {
            const latitudNumerica =
              convertirCoordenada(
                localizacion.latitud,
              );

            const longitudNumerica =
              convertirCoordenada(
                localizacion.longitud,
              );

            if (
              latitudNumerica === null ||
              longitudNumerica === null
            ) {
              return [];
            }

            const latitudValida =
              latitudNumerica >= -90 &&
              latitudNumerica <= 90;

            const longitudValida =
              longitudNumerica >= -180 &&
              longitudNumerica <= 180;

            if (
              !latitudValida ||
              !longitudValida
            ) {
              return [];
            }

            return [
              {
                ...localizacion,
                latitudNumerica,
                longitudNumerica,
              },
            ];
          },
        );
      },
      [localizaciones],
    );

  useEffect(() => {
    const contenedor =
      contenedorRef.current;

    if (
      !contenedor ||
      localizacionesValidas.length ===
        0
    ) {
      return;
    }

    let componenteDesmontado = false;

    let observadorTamaño:
      | ResizeObserver
      | null = null;

    let temporizadorAjuste:
      | number
      | null = null;

    let fotogramaPrimero:
      | number
      | null = null;

    let fotogramaSegundo:
      | number
      | null = null;

    const inicializarMapa =
      async () => {
        try {
          setError(null);

          const L =
            await import("leaflet");

          if (
            componenteDesmontado ||
            !contenedorRef.current
          ) {
            return;
          }

          mapaRef.current?.remove();
          mapaRef.current = null;

          marcadoresRef.current.clear();

          const primeraLocalizacion =
            localizacionesValidas[0];

          const configuracionMapa =
            configuracionTemas[
              temaMapa
            ];

          const mapa = L.map(
            contenedor,
            {
              center: [
                primeraLocalizacion
                  .latitudNumerica,
                primeraLocalizacion
                  .longitudNumerica,
              ],
              zoom: Math.min(
                zoom,
                19,
              ),
              zoomControl:
                mostrarControles,
              attributionControl: true,
              scrollWheelZoom: true,
              doubleClickZoom: true,
              dragging: true,
              touchZoom: true,
              boxZoom: true,
              keyboard: true,
            },
          );

          mapaRef.current = mapa;

          /*
           * Solo aislamos los eventos del
           * lienzo real del mapa. La leyenda
           * y el resto de la conversación
           * conservan su interacción normal.
           */
          L.DomEvent.disableClickPropagation(
            contenedor,
          );

          L.DomEvent.disableScrollPropagation(
            contenedor,
          );

          L.tileLayer(
            configuracionMapa.url,
            {
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
              maxZoom: 19,
              className:
                configuracionMapa.clase,
            },
          ).addTo(mapa);

          let primerMarcador:
            | MarcadorLeaflet
            | null = null;

          localizacionesValidas.forEach(
            (
              localizacion,
              indice,
            ) => {
              const color =
                coloresMarcadores[
                  indice %
                    coloresMarcadores.length
                ];

              const identificadorMarcador =
                `${identificadorMapa}-${indice}`;

              const icono =
                L.divIcon({
                  html: crearMarcadorSvg(
                    color,
                    identificadorMarcador,
                  ),
                  className:
                    "mapa-marcador",
                  iconSize: [48, 62],
                  iconAnchor: [24, 62],
                  popupAnchor: [0, -58],
                });

              const marcador =
                L.marker(
                  [
                    localizacion
                      .latitudNumerica,
                    localizacion
                      .longitudNumerica,
                  ],
                  {
                    icon: icono,
                    title:
                      obtenerNombre(
                        localizacion,
                      ),
                    keyboard: true,
                    riseOnHover: true,
                  },
                );

              marcador.bindPopup(
                crearContenidoPopup(
                  localizacion,
                ),
                {
                  closeButton: true,
                  autoPan: true,
                  autoPanPadding: [
                    32,
                    32,
                  ],
                  maxWidth: 300,
                  minWidth: 220,
                },
              );

              marcador.addTo(mapa);

              marcadoresRef.current.set(
                localizacion.id,
                marcador,
              );

              if (indice === 0) {
                primerMarcador =
                  marcador;
              }
            },
          );

          const ajustarVista = (
            abrirPopup = false,
          ) => {
            if (
              componenteDesmontado
            ) {
              return;
            }

            mapa.invalidateSize({
              animate: false,
            });

            if (
              localizacionesValidas
                .length === 1
            ) {
              mapa.setView(
                [
                  primeraLocalizacion
                    .latitudNumerica,
                  primeraLocalizacion
                    .longitudNumerica,
                ],
                Math.min(zoom, 19),
                {
                  animate: false,
                },
              );
            } else {
              const limites =
                L.latLngBounds(
                  localizacionesValidas.map(
                    (localizacion) =>
                      [
                        localizacion
                          .latitudNumerica,
                        localizacion
                          .longitudNumerica,
                      ] as [
                        number,
                        number,
                      ],
                  ),
                );

              mapa.fitBounds(
                limites,
                {
                  paddingTopLeft: [
                    55,
                    55,
                  ],
                  paddingBottomRight: [
                    55,
                    55,
                  ],
                  maxZoom: Math.min(
                    zoom,
                    14,
                  ),
                  animate: false,
                },
              );
            }

            if (
              abrirPopup &&
              primerMarcador
            ) {
              primerMarcador.openPopup();
            }
          };

          /*
           * Esperamos dos fotogramas para
           * que Leaflet conozca el tamaño
           * definitivo del contenedor.
           */
          fotogramaPrimero =
            window.requestAnimationFrame(
              () => {
                fotogramaSegundo =
                  window.requestAnimationFrame(
                    () => {
                      ajustarVista(
                        abrirPopupInicial,
                      );
                    },
                  );
              },
            );

          temporizadorAjuste =
            window.setTimeout(
              () => {
                ajustarVista(false);
              },
              180,
            );

          observadorTamaño =
            new ResizeObserver(() => {
              if (
                componenteDesmontado
              ) {
                return;
              }

              /*
               * Actualizamos el tamaño sin
               * deshacer el zoom o posición
               * elegidos por el usuario.
               */
              mapa.invalidateSize({
                animate: false,
              });
            });

          observadorTamaño.observe(
            contenedor,
          );
        } catch (errorMapa) {
          console.error(
            "No se ha podido inicializar el mapa:",
            errorMapa,
          );

          if (
            !componenteDesmontado
          ) {
            setError(
              "No se ha podido cargar el mapa.",
            );
          }
        }
      };

    void inicializarMapa();

    return () => {
      componenteDesmontado = true;

      observadorTamaño?.disconnect();

      if (
        temporizadorAjuste !== null
      ) {
        window.clearTimeout(
          temporizadorAjuste,
        );
      }

      if (
        fotogramaPrimero !== null
      ) {
        window.cancelAnimationFrame(
          fotogramaPrimero,
        );
      }

      if (
        fotogramaSegundo !== null
      ) {
        window.cancelAnimationFrame(
          fotogramaSegundo,
        );
      }

      marcadoresRef.current.clear();

      mapaRef.current?.remove();
      mapaRef.current = null;
    };
  }, [
    localizacionesValidas,
    zoom,
    mostrarControles,
    abrirPopupInicial,
    temaMapa,
    identificadorMapa,
  ]);

  const enfocarLocalizacion = (
    localizacion: LocalizacionValida,
  ) => {
    const mapa = mapaRef.current;

    const marcador =
      marcadoresRef.current.get(
        localizacion.id,
      );

    if (!mapa || !marcador) {
      return;
    }

    mapa.setView(
      [
        localizacion.latitudNumerica,
        localizacion.longitudNumerica,
      ],
      Math.min(
        Math.max(
          mapa.getZoom(),
          zoom,
        ),
        19,
      ),
      {
        animate: true,
      },
    );

    marcador.openPopup();
  };

  const clasesContenedor = [
    "mapa-localizaciones relative flex h-full min-h-0 w-full flex-col overflow-hidden",
    `mapa-localizaciones--${temaMapa}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (
    localizacionesValidas.length ===
    0
  ) {
    return (
      <div
        className={`${clasesContenedor} items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container p-6 text-center`}
      >
        <div>
          <p className="font-bold text-on-secondary-fixed">
            Ubicación no disponible
          </p>

          <p className="mt-1 text-sm text-on-surface-variant">
            No hay coordenadas válidas para
            mostrar esta ubicación.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={clasesContenedor}>
      <div className="mapa-localizaciones__superficie relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={contenedorRef}
          className="mapa-localizaciones__lienzo h-full w-full"
          role="region"
          aria-label={`Mapa con ${
            localizacionesValidas.length
          } ${
            localizacionesValidas.length ===
            1
              ? "ubicación"
              : "ubicaciones"
          }`}
        />

        {error && (
          <div
            className="absolute inset-0 z-1000 flex items-center justify-center bg-error-container p-6 text-center"
            role="alert"
          >
            <div>
              <p className="font-bold text-on-error-container">
                No se ha podido cargar el
                mapa
              </p>

              <p className="mt-1 text-sm text-on-error-container">
                {error}
              </p>
            </div>
          </div>
        )}
      </div>

      {mostrarLeyenda && (
        <div className="mapa-localizaciones__leyenda max-h-[45%] shrink-0 overflow-y-auto border-t border-outline-variant bg-surface-container-lowest p-4">
          <p className="mb-3 text-sm font-bold text-on-secondary-fixed">
            {localizacionesValidas.length ===
            1
              ? "Instalación"
              : "Instalaciones"}
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {localizacionesValidas.map(
              (
                localizacion,
                indice,
              ) => {
                const color =
                  coloresMarcadores[
                    indice %
                      coloresMarcadores.length
                  ];

                const nombre =
                  obtenerNombre(
                    localizacion,
                  );

                const direccion =
                  obtenerDireccion(
                    localizacion,
                  );

                return (
                  <button
                    key={
                      localizacion.id
                    }
                    type="button"
                    onClick={() =>
                      enfocarLocalizacion(
                        localizacion,
                      )
                    }
                    className="flex min-w-0 items-start gap-3 rounded-xl p-2 text-left transition-colors hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    aria-label={`Mostrar ${nombre} en el mapa`}
                  >
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-white shadow-sm"
                      style={{
                        backgroundColor:
                          color,
                      }}
                      aria-hidden="true"
                    />

                    <span className="min-w-0">
                      <span className="block text-sm font-bold leading-tight text-on-secondary-fixed">
                        {nombre}
                      </span>

                      {direccion && (
                        <span className="mt-1 block text-xs leading-snug text-on-surface-variant">
                          {direccion}
                        </span>
                      )}

                      {localizacion.descripcion && (
                        <span className="mt-1 block text-xs leading-snug text-on-surface-variant">
                          {
                            localizacion.descripcion
                          }
                        </span>
                      )}
                    </span>
                  </button>
                );
              },
            )}
          </div>
        </div>
      )}
    </div>
  );
}