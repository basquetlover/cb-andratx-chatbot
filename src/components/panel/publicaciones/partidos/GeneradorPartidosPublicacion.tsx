import {
  useMemo,
  useState,
} from "react";

import ConfiguracionPublicacionPartidos from "./ConfiguracionPublicacionPartidos";
import EditorPartidosPublicacion from "./editor/EditorPartidosPublicacion";
import PrevisualizacionPublicacionPartidos from "./preview/PrevisualizacionPublicacionPartidos";

import type {
  DatosPublicacionPartidos,
  EstadoPublicacionPartidos,
  IdiomaPublicacionPartidos,
  PublicacionPartidosPanel,
  RespuestaPublicacionPartidos,
} from "@tipos/PublicacionPartidosPanel";

interface Propiedades {
  publicacionInicial?:
    | PublicacionPartidosPanel
    | null;
}

function obtenerFechaMadrid():
  Date {
  const partes =
    new Intl.DateTimeFormat(
      "es-ES",
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

  const obtenerParte = (
    tipo:
      Intl.DateTimeFormatPartTypes,
  ): number =>
    Number(
      partes.find(
        (parte) =>
          parte.type === tipo,
      )?.value ?? 0,
    );

  return new Date(
    Date.UTC(
      obtenerParte("year"),
      obtenerParte("month") - 1,
      obtenerParte("day"),
    ),
  );
}

function sumarDias(
  fecha: Date,
  dias: number,
): Date {
  const resultado =
    new Date(fecha);

  resultado.setUTCDate(
    resultado.getUTCDate() +
      dias,
  );

  return resultado;
}

function convertirFechaIso(
  fecha: Date,
): string {
  const anio =
    fecha.getUTCFullYear();

  const mes = String(
    fecha.getUTCMonth() + 1,
  ).padStart(2, "0");

  const dia = String(
    fecha.getUTCDate(),
  ).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function obtenerSemanaActual(): {
  inicio: string;
  fin: string;
} {
  const hoy =
    obtenerFechaMadrid();

  const diaSemana =
    hoy.getUTCDay();

  const diasDesdeLunes =
    diaSemana === 0
      ? 6
      : diaSemana - 1;

  const lunes =
    sumarDias(
      hoy,
      -diasDesdeLunes,
    );

  const domingo =
    sumarDias(lunes, 6);

  return {
    inicio:
      convertirFechaIso(
        lunes,
      ),

    fin:
      convertirFechaIso(
        domingo,
      ),
  };
}

function formatearFechaNombre(
  fecha: string,
): string {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day: "numeric",
      month: "short",
      timeZone:
        "Europe/Madrid",
    },
  ).format(
    new Date(
      `${fecha}T12:00:00`,
    ),
  );
}

function crearDatosIniciales():
  DatosPublicacionPartidos {
  const semana =
    obtenerSemanaActual();

  return {
    temporadaId: null,

    nombre:
      `Partidos del ${formatearFechaNombre(
        semana.inicio,
      )} al ${formatearFechaNombre(
        semana.fin,
      )}`,

    titulo:
      "PARTIDOS DE LA SEMANA",

    idioma: "es",

    fechaInicio:
      semana.inicio,

    fechaFin:
      semana.fin,

    plantilla:
      "partidos-semana",

    fondo: null,

    partidos: [],

    partidosPorImagen: 7,

    estado: "borrador",
  };
}

function extraerDatosPublicacion(
  publicacion:
    PublicacionPartidosPanel,
): DatosPublicacionPartidos {
  return {
    temporadaId:
      publicacion.temporadaId,

    nombre:
      publicacion.nombre,

    titulo:
      publicacion.titulo,

    idioma:
      publicacion.idioma,

    fechaInicio:
      publicacion.fechaInicio,

    fechaFin:
      publicacion.fechaFin,

    plantilla:
      publicacion.plantilla,

    fondo:
      publicacion.fondo,

    partidos:
      publicacion.partidos.map(
        (partido) => ({
          ...partido,

          partidoFbibId:
            partido.partidoFbibId ??
            null,

          equipoId:
            partido.equipoId ??
            null,

          equipoFbibId:
            partido.equipoFbibId ??
            null,

          imagenEquipo:
            partido.imagenEquipo ??
            null,

          municipio:
            partido.municipio ??
            (
              partido.local === false
                ? partido.campo ||
                  null
                : null
            ),

          pabellon:
            partido.pabellon ??
            (
              partido.local === true
                ? partido.campo ||
                  null
                : null
            ),
        }),
      ),

    partidosPorImagen:
      publicacion.partidosPorImagen,

    estado:
      publicacion.estado,
  };
}

function normalizarParaComparar(
  datos:
    DatosPublicacionPartidos,
): string {
  return JSON.stringify({
    ...datos,

    nombre:
      datos.nombre.trim(),

    titulo:
      datos.titulo.trim(),

    partidos:
      [...datos.partidos]
        .sort(
          (
            partidoA,
            partidoB,
          ) =>
            partidoA.orden -
            partidoB.orden,
        )
        .map(
          (partido) => ({
            ...partido,

            partidoFbibId:
              partido.partidoFbibId ??
              null,

            equipoId:
              partido.equipoId ??
              null,

            equipoFbibId:
              partido.equipoFbibId ??
              null,

            imagenEquipo:
              partido.imagenEquipo ??
              null,

            nombreEquipo:
              partido.nombreEquipo.trim(),

            nombreRival:
              partido.nombreRival.trim(),

            campo:
              partido.campo.trim(),

            municipio:
              partido.municipio?.trim() ||
              null,

            pabellon:
              partido.pabellon?.trim() ||
              null,
          }),
        ),
  });
}

export default function GeneradorPartidosPublicacion({
  publicacionInicial = null,
}: Propiedades) {
  const [
    publicacionId,
    setPublicacionId,
  ] = useState<
    string | null
  >(
    publicacionInicial?.id ??
      null,
  );

  const [
    formulario,
    setFormulario,
  ] = useState<
    DatosPublicacionPartidos
  >(() =>
    publicacionInicial
      ? extraerDatosPublicacion(
          publicacionInicial,
        )
      : crearDatosIniciales(),
  );

  const [
    ultimaVersionGuardada,
    setUltimaVersionGuardada,
  ] = useState<
    DatosPublicacionPartidos | null
  >(() =>
    publicacionInicial
      ? extraerDatosPublicacion(
          publicacionInicial,
        )
      : null,
  );

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    archivando,
    setArchivando,
  ] = useState(false);

  const [
    errorGeneral,
    setErrorGeneral,
  ] = useState<
    string | null
  >(null);

  const [
    erroresCampos,
    setErroresCampos,
  ] = useState<
    Record<string, string>
  >({});

  const [
    guardadoCorrectamente,
    setGuardadoCorrectamente,
  ] = useState(false);

  const datosModificados =
    useMemo(() => {
      if (
        !ultimaVersionGuardada
      ) {
        return true;
      }

      return (
        normalizarParaComparar(
          formulario,
        ) !==
        normalizarParaComparar(
          ultimaVersionGuardada,
        )
      );
    }, [
      formulario,
      ultimaVersionGuardada,
    ]);

  const actualizarFormulario = <
    Campo extends keyof DatosPublicacionPartidos,
  >(
    campo: Campo,
    valor:
      DatosPublicacionPartidos[Campo],
  ) => {
    setFormulario(
      (formularioActual) => ({
        ...formularioActual,
        [campo]: valor,
      }),
    );

    setErrorGeneral(null);
    setGuardadoCorrectamente(
      false,
    );

    setErroresCampos(
      (erroresActuales) => {
        if (
          !erroresActuales[campo]
        ) {
          return erroresActuales;
        }

        const siguientesErrores = {
          ...erroresActuales,
        };

        delete siguientesErrores[
          campo
        ];

        return siguientesErrores;
      },
    );
  };

  const cambiarIdioma = (
    nuevoIdioma:
      IdiomaPublicacionPartidos,
  ) => {
    setFormulario(
      (formularioActual) => {
        const tituloActual =
          formularioActual.titulo
            .trim()
            .toUpperCase();

        const esTituloPredeterminado =
          tituloActual ===
            "PARTIDOS DE LA SEMANA" ||
          tituloActual ===
            "PARTITS DE LA SETMANA";

        return {
          ...formularioActual,

          idioma:
            nuevoIdioma,

          titulo:
            esTituloPredeterminado
              ? nuevoIdioma ===
                  "ca"
                ? "PARTITS DE LA SETMANA"
                : "PARTIDOS DE LA SEMANA"
              : formularioActual.titulo,
        };
      },
    );

    setErrorGeneral(null);
    setGuardadoCorrectamente(
      false,
    );
  };

  const validarFormulario = (
    estadoDestino:
      EstadoPublicacionPartidos,
  ): boolean => {
    const nuevosErrores:
      Record<string, string> = {};

    if (
      !formulario.nombre.trim()
    ) {
      nuevosErrores.nombre =
        "Debes indicar un nombre interno.";
    }

    if (
      !formulario.titulo.trim()
    ) {
      nuevosErrores.titulo =
        "Debes indicar el título de la imagen.";
    }

    if (
      !formulario.fechaInicio
    ) {
      nuevosErrores.fechaInicio =
        "Debes indicar la fecha inicial.";
    }

    if (
      !formulario.fechaFin
    ) {
      nuevosErrores.fechaFin =
        "Debes indicar la fecha final.";
    }

    if (
      formulario.fechaInicio &&
      formulario.fechaFin &&
      formulario.fechaFin <
        formulario.fechaInicio
    ) {
      nuevosErrores.fechaFin =
        "La fecha final no puede ser anterior a la inicial.";
    }

    if (
      estadoDestino ===
        "finalizada" &&
      formulario.partidos.filter(
        (partido) =>
          partido.visible,
      ).length === 0
    ) {
      nuevosErrores.partidos =
        "Debes añadir al menos un partido visible antes de finalizar.";
    }

    formulario.partidos.forEach(
      (partido, indice) => {
        if (!partido.equipoId) {
        nuevosErrores[
            `partidos.${indice}.equipoId`
        ] =
            "Debes seleccionar un equipo del club en todas las filas.";
        }

        if (
        !partido.nombreEquipo.trim()
        ) {
        nuevosErrores[
            `partidos.${indice}.nombreEquipo`
        ] =
            "El equipo seleccionado no tiene un nombre válido.";
        }

        if (
          partido.estado ===
            "partido" &&
          !partido.fecha
        ) {
          nuevosErrores[
            `partidos.${indice}.fecha`
          ] =
            "Los partidos normales necesitan una fecha.";
        }

        if (
          partido.estado ===
            "partido" &&
          !partido.nombreRival.trim()
        ) {
          nuevosErrores[
            `partidos.${indice}.nombreRival`
          ] =
            "Los partidos normales necesitan un rival.";
        }
      },
    );

    setErroresCampos(
      nuevosErrores,
    );

    if (
      Object.keys(
        nuevosErrores,
      ).length > 0
    ) {
      setErrorGeneral(
        "Revisa los campos indicados antes de guardar.",
      );

      return false;
    }

    return true;
  };

  const guardar = async (
    estadoDestino:
      EstadoPublicacionPartidos,
  ) => {
    if (
      guardando ||
      archivando ||
      !validarFormulario(
        estadoDestino,
      )
    ) {
      return;
    }

    const datosGuardar:
      DatosPublicacionPartidos = {
        ...formulario,

        nombre:
          formulario.nombre.trim(),

        titulo:
          formulario.titulo.trim(),

        estado:
          estadoDestino,

        partidos:
  formulario.partidos.map(
    (partido, indice) => ({
      ...partido,

      orden: indice + 1,

      partidoFbibId:
        partido.partidoFbibId ??
        null,

      equipoId:
        partido.equipoId ??
        null,

      equipoFbibId:
        partido.equipoFbibId ??
        null,

      imagenEquipo:
        partido.imagenEquipo ??
        null,

      nombreEquipo:
        partido.nombreEquipo.trim(),

      nombreRival:
        partido.nombreRival.trim(),

      campo:
        partido.campo.trim(),

      municipio:
        partido.municipio?.trim() ||
        null,

      pabellon:
        partido.pabellon?.trim() ||
        null,
    }),
  ),
      };

    try {
      setGuardando(true);
      setErrorGeneral(null);
      setGuardadoCorrectamente(
        false,
      );

      const esNueva =
        !publicacionId;

      const respuesta =
        await fetch(
          esNueva
            ? "/api/panel/publicaciones/partidos"
            : `/api/panel/publicaciones/partidos/${encodeURIComponent(
                publicacionId,
              )}`,
          {
            method:
              esNueva
                ? "POST"
                : "PATCH",

            credentials:
              "same-origin",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                datosGuardar,
              ),
          },
        );

      const contenido =
        (await respuesta.json()) as
          RespuestaPublicacionPartidos;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data
          ?.publicacion
      ) {
        const erroresServidor:
          Record<string, string> =
            {};

        contenido.errores?.forEach(
          (error) => {
            erroresServidor[
              error.campo
            ] = error.mensaje;
          },
        );

        setErroresCampos(
          erroresServidor,
        );

        throw new Error(
          contenido.error ??
            "No se ha podido guardar la publicación.",
        );
      }

      const publicacionGuardada =
        contenido.data.publicacion;

      const datosGuardados =
        extraerDatosPublicacion(
          publicacionGuardada,
        );

      setFormulario(
        datosGuardados,
      );

      setUltimaVersionGuardada(
        datosGuardados,
      );

      setPublicacionId(
        publicacionGuardada.id,
      );

      setErroresCampos({});
      setGuardadoCorrectamente(
        true,
      );

      if (esNueva) {
        window.history.replaceState(
          {},
          "",
          `/panel/publicaciones/partidos/${publicacionGuardada.id}`,
        );
      }
    } catch (error) {
      console.error(
        "Error guardando la publicación:",
        error,
      );

      setErrorGeneral(
        error instanceof Error
          ? error.message
          : "No se ha podido guardar la publicación.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const archivar = async () => {
    if (
      !publicacionId ||
      archivando ||
      guardando
    ) {
      return;
    }

    const confirmado =
      window.confirm(
        "¿Quieres archivar esta publicación? Podrás seguir consultándola desde el historial de archivadas.",
      );

    if (!confirmado) {
      return;
    }

    try {
      setArchivando(true);
      setErrorGeneral(null);

      const respuesta =
        await fetch(
          `/api/panel/publicaciones/partidos/${encodeURIComponent(
            publicacionId,
          )}`,
          {
            method: "DELETE",

            credentials:
              "same-origin",

            headers: {
              Accept:
                "application/json",
            },
          },
        );

      const contenido =
        (await respuesta.json()) as
          RespuestaPublicacionPartidos;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data
          ?.publicacion
      ) {
        throw new Error(
          contenido.error ??
            "No se ha podido archivar la publicación.",
        );
      }

      window.location.href =
        "/panel/publicaciones/partidos";
    } catch (error) {
      console.error(
        "Error archivando la publicación:",
        error,
      );

      setErrorGeneral(
        error instanceof Error
          ? error.message
          : "No se ha podido archivar la publicación.",
      );
    } finally {
      setArchivando(false);
    }
  };

  const ocupado =
    guardando || archivando;

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-on-surface sm:text-2xl">
                {publicacionId
                  ? "Editar publicación"
                  : "Nueva publicación"}
              </h1>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  formulario.estado ===
                  "finalizada"
                    ? "bg-success-container text-on-success-container"
                    : formulario.estado ===
                        "archivada"
                      ? "bg-surface-container-high text-on-surface-variant"
                      : "bg-primary-fixed text-on-primary-fixed"
                }`}
              >
                {formulario.estado ===
                "finalizada"
                  ? "Finalizada"
                  : formulario.estado ===
                      "archivada"
                    ? "Archivada"
                    : "Borrador"}
              </span>

              {datosModificados && (
                <span className="rounded-full bg-secondary-fixed px-3 py-1 text-xs font-bold text-on-secondary-fixed">
                  Cambios sin guardar
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-on-surface-variant">
              Configura, revisa y descarga
              las imágenes de partidos para
              Instagram.
            </p>
          </div>

          <a
            href="/panel/publicaciones/partidos"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          >
            Volver al historial
          </a>
        </div>

        {errorGeneral && (
          <div
            className="border-t border-error/30 bg-error-container px-5 py-3 text-sm text-on-error-container sm:px-6"
            role="alert"
          >
            <p className="font-bold">
              No se han podido guardar los
              cambios
            </p>

            <p className="mt-1">
              {errorGeneral}
            </p>
          </div>
        )}

        {guardadoCorrectamente && (
          <div
            className="border-t border-success/30 bg-success-container px-5 py-3 text-sm font-semibold text-on-success-container sm:px-6"
            role="status"
          >
            La publicación se ha guardado
            correctamente.
          </div>
        )}

        {Object.keys(
          erroresCampos,
        ).length > 0 && (
          <div className="border-t border-outline-variant/60 bg-surface-container-low px-5 py-3 text-xs text-error sm:px-6">
            <ul className="list-disc space-y-1 pl-5">
              {Object.entries(
                erroresCampos,
              ).map(
                ([
                  campo,
                  mensaje,
                ]) => (
                  <li key={campo}>
                    {mensaje}
                  </li>
                ),
              )}
            </ul>
          </div>
        )}
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(440px,0.85fr)]">
        <div className="grid min-w-0 gap-6">
          <ConfiguracionPublicacionPartidos
            nombre={
              formulario.nombre
            }
            titulo={
              formulario.titulo
            }
            idioma={
              formulario.idioma
            }
            fechaInicio={
              formulario.fechaInicio
            }
            fechaFin={
              formulario.fechaFin
            }
            partidosPorImagen={
              formulario.partidosPorImagen
            }
            alCambiarNombre={(
              nombre,
            ) =>
              actualizarFormulario(
                "nombre",
                nombre,
              )
            }
            alCambiarTitulo={(
              titulo,
            ) =>
              actualizarFormulario(
                "titulo",
                titulo,
              )
            }
            alCambiarIdioma={
              cambiarIdioma
            }
            alCambiarPeriodo={(
            fechaInicio,
            fechaFin,
            ) => {
            setFormulario(
                (
                formularioActual,
                ) => ({
                ...formularioActual,
                fechaInicio,
                fechaFin,
                }),
            );

            setErrorGeneral(null);
            setGuardadoCorrectamente(false);

            setErroresCampos(
                (erroresActuales) => {
                const siguientesErrores = {
                    ...erroresActuales,
                };

                delete siguientesErrores
                    .fechaInicio;

                delete siguientesErrores
                    .fechaFin;

                return siguientesErrores;
                },
            );
            }}
            alCambiarPartidosPorImagen={(
              cantidad,
            ) =>
              actualizarFormulario(
                "partidosPorImagen",
                cantidad,
              )
            }
            deshabilitado={
              ocupado
            }
          />

          <EditorPartidosPublicacion
            fechaInicio={
              formulario.fechaInicio
            }
            fechaFin={
              formulario.fechaFin
            }
            partidos={
              formulario.partidos
            }
            partidosPorImagen={
              formulario.partidosPorImagen
            }
            alCambiar={(
              partidos,
            ) =>
              actualizarFormulario(
                "partidos",
                partidos,
              )
            }
            deshabilitado={
              ocupado
            }
          />
        </div>

        <div className="min-w-0 xl:sticky xl:top-5">
          <PrevisualizacionPublicacionPartidos
            nombre={
              formulario.nombre
            }
            titulo={
              formulario.titulo
            }
            idioma={
              formulario.idioma
            }
            partidos={
              formulario.partidos
            }
            partidosPorImagen={
              formulario.partidosPorImagen
            }
            fondo={
              formulario.fondo
            }
            deshabilitado={
              ocupado
            }
          />
        </div>
      </div>

      <section className="sticky bottom-3 z-20 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest/95 p-4 shadow-xl backdrop-blur sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {publicacionId && (
            <button
              type="button"
              onClick={archivar}
              disabled={
                ocupado
              }
              className="min-h-11 rounded-xl border border-error/40 px-5 py-3 text-sm font-bold text-error transition-colors hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-40"
            >
              {archivando
                ? "Archivando..."
                : "Archivar"}
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              guardar(
                "borrador",
              )
            }
            disabled={
              ocupado ||
              (!datosModificados &&
                formulario.estado ===
                  "borrador")
            }
            className="min-h-11 rounded-xl border border-primary px-5 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary-fixed disabled:cursor-not-allowed disabled:opacity-40"
          >
            {guardando
              ? "Guardando..."
              : "Guardar borrador"}
          </button>

          <button
            type="button"
            onClick={() =>
              guardar(
                "finalizada",
              )
            }
            disabled={
              ocupado ||
              formulario.partidos.filter(
                (partido) =>
                  partido.visible,
              ).length === 0
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-40"
          >
            {guardando && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary"
                aria-hidden="true"
              />
            )}

            Guardar y finalizar
          </button>
        </div>
      </section>
    </div>
  );
}