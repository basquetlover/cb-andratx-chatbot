import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import PaginaPublicacionPartidos from "./PaginaPublicacionPartidos";

import type {
  IdiomaPublicacionPartidos,
  PartidoPublicacion,
} from "@tipos/PublicacionPartidosPanel";

interface Propiedades {
  nombre: string;
  titulo: string;

  idioma:
    IdiomaPublicacionPartidos;

  partidos:
    PartidoPublicacion[];

  partidosPorImagen: number;

  fondo: string | null;

  deshabilitado?: boolean;
}

function dividirPartidos(
  partidos:
    PartidoPublicacion[],
  cantidadPorPagina: number,
): PartidoPublicacion[][] {
  if (partidos.length === 0) {
    return [[]];
  }

  const paginas:
    PartidoPublicacion[][] = [];

  for (
    let indice = 0;
    indice < partidos.length;
    indice += cantidadPorPagina
  ) {
    paginas.push(
      partidos.slice(
        indice,
        indice +
          cantidadPorPagina,
      ),
    );
  }

  return paginas;
}

function normalizarNombreArchivo(
  valor: string,
): string {
  const nombre = valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );

  return (
    nombre ||
    "partidos-cb-andratx"
  );
}

function descargarDataUrl(
  dataUrl: string,
  nombreArchivo: string,
): void {
  const enlace =
    document.createElement("a");

  enlace.href = dataUrl;
  enlace.download =
    nombreArchivo;

  document.body.appendChild(
    enlace,
  );

  enlace.click();
  enlace.remove();
}

async function esperarImagenes(
  elemento: HTMLElement,
): Promise<void> {
  const imagenes =
    Array.from(
      elemento.querySelectorAll(
        "img",
      ),
    );

  await Promise.all(
    imagenes.map((imagen) => {
      if (
        imagen.complete &&
        imagen.naturalWidth > 0
      ) {
        return Promise.resolve();
      }

      return new Promise<void>(
        (resolver) => {
          const finalizar = () => {
            imagen.removeEventListener(
              "load",
              finalizar,
            );

            imagen.removeEventListener(
              "error",
              finalizar,
            );

            resolver();
          };

          imagen.addEventListener(
            "load",
            finalizar,
            {
              once: true,
            },
          );

          imagen.addEventListener(
            "error",
            finalizar,
            {
              once: true,
            },
          );
        },
      );
    }),
  );
}

export default function PrevisualizacionPublicacionPartidos({
  nombre,
  titulo,
  idioma,
  partidos,
  partidosPorImagen,
  fondo,
  deshabilitado = false,
}: Propiedades) {
  const contenedorRef =
    useRef<HTMLDivElement>(
      null,
    );

  const referenciasPaginas =
    useRef<
      Map<number, HTMLDivElement>
    >(new Map());

  const [
    paginaActual,
    setPaginaActual,
  ] = useState(0);

  const [
    escala,
    setEscala,
  ] = useState(0.5);

  const [
    exportando,
    setExportando,
  ] = useState(false);

  const [
    progresoExportacion,
    setProgresoExportacion,
  ] = useState<
    string | null
  >(null);

  const [
    errorExportacion,
    setErrorExportacion,
  ] = useState<
    string | null
  >(null);

  const partidosVisibles =
    useMemo(
      () =>
        [...partidos]
          .filter(
            (partido) =>
              partido.visible,
          )
          .sort(
            (
              partidoA,
              partidoB,
            ) =>
              partidoA.orden -
              partidoB.orden,
          ),
      [partidos],
    );

  const paginas = useMemo(
    () =>
      dividirPartidos(
        partidosVisibles,
        Math.max(
          1,
          partidosPorImagen,
        ),
      ),
    [
      partidosVisibles,
      partidosPorImagen,
    ],
  );

  const totalPaginas =
    paginas.length;

  useEffect(() => {
    if (
      paginaActual >=
      totalPaginas
    ) {
      setPaginaActual(
        Math.max(
          0,
          totalPaginas - 1,
        ),
      );
    }
  }, [
    paginaActual,
    totalPaginas,
  ]);

  useEffect(() => {
    const contenedor =
      contenedorRef.current;

    if (!contenedor) {
      return;
    }

    const actualizarEscala =
      () => {
        const anchoDisponible =
          contenedor.clientWidth;

        const nuevaEscala =
          Math.min(
            0.7,
            Math.max(
              0.2,
              anchoDisponible /
                1080,
            ),
          );

        setEscala(
          nuevaEscala,
        );
      };

    actualizarEscala();

    const observador =
      new ResizeObserver(
        actualizarEscala,
      );

    observador.observe(
      contenedor,
    );

    return () => {
      observador.disconnect();
    };
  }, []);

  const generarPng = async (
    indicePagina: number,
  ): Promise<string> => {
    const elemento =
      referenciasPaginas.current.get(
        indicePagina,
      );

    if (!elemento) {
      throw new Error(
        "No se ha encontrado la página que se debe exportar.",
      );
    }

    await esperarImagenes(
      elemento,
    );

    if (
      "fonts" in document
    ) {
      await document.fonts.ready;
    }

    const {
      toPng,
    } = await import(
      "html-to-image"
    );

    return toPng(
      elemento,
      {
        width: 1080,
        height: 1350,
        pixelRatio: 1,
        cacheBust: true,

        canvasWidth: 1080,
        canvasHeight: 1350,

        style: {
          transform: "none",
          transformOrigin:
            "top left",
        },
      },
    );
  };

  const descargarPaginaActual =
    async () => {
      if (
        exportando ||
        partidosVisibles.length ===
          0
      ) {
        return;
      }

      try {
        setExportando(true);
        setErrorExportacion(null);

        setProgresoExportacion(
          `Generando imagen ${paginaActual + 1} de ${totalPaginas}...`,
        );

        const dataUrl =
          await generarPng(
            paginaActual,
          );

        const nombreBase =
          normalizarNombreArchivo(
            nombre,
          );

        const sufijo =
          totalPaginas > 1
            ? `-${paginaActual + 1}`
            : "";

        descargarDataUrl(
          dataUrl,
          `${nombreBase}${sufijo}.png`,
        );
      } catch (error) {
        console.error(
          "Error exportando la publicación:",
          error,
        );

        setErrorExportacion(
          "No se ha podido generar la imagen. Comprueba que todos los escudos se muestran correctamente.",
        );
      } finally {
        setExportando(false);
        setProgresoExportacion(
          null,
        );
      }
    };

  const descargarTodas =
    async () => {
      if (
        exportando ||
        partidosVisibles.length ===
          0
      ) {
        return;
      }

      try {
        setExportando(true);
        setErrorExportacion(null);

        const nombreBase =
          normalizarNombreArchivo(
            nombre,
          );

        for (
          let indice = 0;
          indice <
          totalPaginas;
          indice += 1
        ) {
          setProgresoExportacion(
            `Generando imagen ${indice + 1} de ${totalPaginas}...`,
          );

          const dataUrl =
            await generarPng(
              indice,
            );

          const sufijo =
            totalPaginas > 1
              ? `-${indice + 1}`
              : "";

          descargarDataUrl(
            dataUrl,
            `${nombreBase}${sufijo}.png`,
          );
        }
      } catch (error) {
        console.error(
          "Error exportando todas las publicaciones:",
          error,
        );

        setErrorExportacion(
          "No se han podido generar todas las imágenes.",
        );
      } finally {
        setExportando(false);
        setProgresoExportacion(
          null,
        );
      }
    };

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="flex flex-col gap-4 border-b border-outline-variant/60 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <h2 className="text-xl font-bold text-on-surface">
            Previsualización
          </h2>

          <p className="mt-1 text-sm text-on-surface-variant">
            La imagen se exportará en
            formato 1080 × 1350 píxeles.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={
              descargarPaginaActual
            }
            disabled={
              deshabilitado ||
              exportando ||
              partidosVisibles.length ===
                0
            }
            className="min-h-11 rounded-xl border border-primary px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary-fixed disabled:cursor-not-allowed disabled:opacity-40"
          >
            Descargar esta imagen
          </button>

          {totalPaginas > 1 && (
            <button
              type="button"
              onClick={
                descargarTodas
              }
              disabled={
                deshabilitado ||
                exportando ||
                partidosVisibles.length ===
                  0
              }
              className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-40"
            >
              Descargar todas
            </button>
          )}
        </div>
      </div>

      {progresoExportacion && (
        <div
          className="flex items-center gap-3 border-b border-outline-variant/60 bg-primary-fixed/40 px-5 py-3 text-sm font-semibold text-on-primary-fixed sm:px-6"
          role="status"
        >
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary-fixed/30 border-t-on-primary-fixed"
            aria-hidden="true"
          />

          {progresoExportacion}
        </div>
      )}

      {errorExportacion && (
        <div
          className="border-b border-error/30 bg-error-container px-5 py-3 text-sm text-on-error-container sm:px-6"
          role="alert"
        >
          {errorExportacion}
        </div>
      )}

      <div className="bg-surface-container-low p-3 sm:p-5">
        {totalPaginas > 1 && (
          <nav
            className="mb-4 flex flex-wrap justify-center gap-2"
            aria-label="Páginas de la publicación"
          >
            {paginas.map(
              (_, indice) => (
                <button
                  key={indice}
                  type="button"
                  onClick={() =>
                    setPaginaActual(
                      indice,
                    )
                  }
                  className={`flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-bold transition-colors ${
                    paginaActual ===
                    indice
                      ? "bg-primary text-on-primary shadow-sm"
                      : "border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary"
                  }`}
                  aria-current={
                    paginaActual ===
                    indice
                      ? "page"
                      : undefined
                  }
                >
                  {indice + 1}/
                  {totalPaginas}
                </button>
              ),
            )}
          </nav>
        )}

        <div
          ref={contenedorRef}
          className="relative mx-auto w-full overflow-hidden rounded-xl bg-surface-container-high shadow-lg"
          style={{
            height:
              `${1350 * escala}px`,
            maxWidth:
              `${1080 * escala}px`,
          }}
        >
          <div
            style={{
              width: "1080px",
              height: "1350px",
              transform:
                `scale(${escala})`,
              transformOrigin:
                "top left",
            }}
          >
            <PaginaPublicacionPartidos
              titulo={titulo}
              idioma={idioma}
              partidos={
                paginas[
                  paginaActual
                ] ?? []
              }
              partidosPorImagen={
                partidosPorImagen
              }
              paginaActual={
                paginaActual + 1
              }
              totalPaginas={
                totalPaginas
              }
              fondo={fondo}
            />
          </div>
        </div>

        {partidosVisibles.length ===
          0 && (
          <p className="mt-4 text-center text-sm text-on-surface-variant">
            Añade al menos un partido
            visible antes de descargar la
            publicación.
          </p>
        )}
      </div>

      <div
        className="pointer-events-none fixed left-[-20000px] top-0"
        aria-hidden="true"
      >
        {paginas.map(
          (
            partidosPagina,
            indice,
          ) => (
            <PaginaPublicacionPartidos
              key={indice}
              ref={(elemento) => {
                if (elemento) {
                  referenciasPaginas.current.set(
                    indice,
                    elemento,
                  );
                } else {
                  referenciasPaginas.current.delete(
                    indice,
                  );
                }
              }}
              titulo={titulo}
              idioma={idioma}
              partidos={
                partidosPagina
              }
              partidosPorImagen={
                partidosPorImagen
              }
              paginaActual={
                indice + 1
              }
              totalPaginas={
                totalPaginas
              }
              fondo={fondo}
            />
          ),
        )}
      </div>
    </section>
  );
}