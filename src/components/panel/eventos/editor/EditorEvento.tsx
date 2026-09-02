import {
  useEffect,
  useMemo,
  useState,
} from "react";

import AccionesEditorEvento from "./AccionesEditorEvento";
import DatosGeneralesEvento from "./DatosGeneralesEvento";
import EnlacesEvento from "./EnlacesEvento";
import FechasEvento from "./FechasEvento";
import ImagenesEvento from "./ImagenesEvento";
import SelectorEquiposEvento from "./SelectorEquiposEvento";
import UbicacionEvento from "./UbicacionEvento";

import type {
  AlcanceEvento,
  EquipoEventoPanel,
  EstadoEvento,
  EventoPanel,
  InstalacionEventoPanel,
  TemporadaEventoPanel,
  TipoEvento,
} from "@tipos/EventoPanel";

interface Propiedades {
  eventoInicial?: EventoPanel | null;
  puedeEliminar?: boolean;
}

interface EstadoFormulario {
  temporadaId: string | null;

  titulo: string;
  descripcionCorta: string;
  descripcion: string;

  tipo: TipoEvento;
  alcance: AlcanceEvento;

  fechaInicio: string;
  fechaFin: string;

  horaInicio: string;
  horaFin: string;

  todoElDia: boolean;

  instalacionId: string;
  ubicacion: string;
  direccion: string;

  imagen: string;
  bannerNotificacion: string;

  urlInformacion: string;
  urlInscripcion: string;

  requiereInscripcion: boolean;

  destacado: boolean;
  mostrarCalendario: boolean;

  estado: EstadoEvento;

  equipos:
    EquipoEventoPanel[];
}

interface RespuestaOpciones {
  ok: boolean;

  data: {
    temporada:
      TemporadaEventoPanel | null;

    equipos:
      EquipoEventoPanel[];

    instalaciones:
      InstalacionEventoPanel[];
  } | null;

  error: string | null;
}

interface ErrorCampo {
  campo: string;
  mensaje: string;
}

interface RespuestaGuardado {
  ok: boolean;

  data: {
    evento: EventoPanel;
  } | null;

  error: string | null;

  errores?: ErrorCampo[];
}

interface RespuestaEliminacion {
  ok: boolean;
  data: unknown;
  error: string | null;
}

function obtenerFechaActual(): string {
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
  ) =>
    partes.find(
      (parte) =>
        parte.type === tipo,
    )?.value ?? "";

  return [
    obtenerParte("year"),
    obtenerParte("month"),
    obtenerParte("day"),
  ].join("-");
}

function textoSeguro(
  valor: unknown,
): string {
  return typeof valor ===
    "string"
    ? valor
    : "";
}

function crearEstadoVacio():
  EstadoFormulario {
  const fechaActual =
    obtenerFechaActual();

  return {
    temporadaId: null,

    titulo: "",
    descripcionCorta: "",
    descripcion: "",

    tipo: "evento",
    alcance: "todo-club",

    fechaInicio:
      fechaActual,

    fechaFin:
      fechaActual,

    horaInicio: "",
    horaFin: "",

    todoElDia: true,

    instalacionId: "",
    ubicacion: "",
    direccion: "",

    imagen: "",
    bannerNotificacion: "",

    urlInformacion: "",
    urlInscripcion: "",

    requiereInscripcion: false,

    destacado: false,
    mostrarCalendario: true,

    estado: "borrador",

    equipos: [],
  };
}

function crearEstadoDesdeEvento(
  evento: EventoPanel,
): EstadoFormulario {
  return {
    temporadaId:
      evento.temporadaId ??
      null,

    titulo:
      textoSeguro(
        evento.titulo,
      ),

    descripcionCorta:
      textoSeguro(
        evento.descripcionCorta,
      ),

    descripcion:
      textoSeguro(
        evento.descripcion,
      ),

    tipo: evento.tipo,
    alcance: evento.alcance,

    fechaInicio:
      textoSeguro(
        evento.fechaInicio,
      ),

    fechaFin:
      textoSeguro(
        evento.fechaFin,
      ),

    horaInicio:
      textoSeguro(
        evento.horaInicio,
      ).slice(0, 5),

    horaFin:
      textoSeguro(
        evento.horaFin,
      ).slice(0, 5),

    todoElDia:
      Boolean(
        evento.todoElDia,
      ),

    instalacionId:
      textoSeguro(
        evento.instalacionId,
      ),

    ubicacion:
      textoSeguro(
        evento.ubicacion,
      ),

    direccion:
      textoSeguro(
        evento.direccion,
      ),

    imagen:
      textoSeguro(
        evento.imagen,
      ),

    bannerNotificacion:
      textoSeguro(
        evento.bannerNotificacion,
      ),

    urlInformacion:
      textoSeguro(
        evento.urlInformacion,
      ),

    urlInscripcion:
      textoSeguro(
        evento.urlInscripcion,
      ),

    requiereInscripcion:
      Boolean(
        evento.requiereInscripcion,
      ),

    destacado:
      Boolean(
        evento.destacado,
      ),

    mostrarCalendario:
      Boolean(
        evento.mostrarCalendario,
      ),

    estado:
      evento.estado,

    equipos:
      Array.isArray(
        evento.equipos,
      )
        ? evento.equipos
        : [],
  };
}

function normalizarFormulario(
  formulario:
    EstadoFormulario,
) {
  return {
    temporadaId:
      formulario.temporadaId,

    titulo:
      formulario.titulo.trim(),

    descripcionCorta:
      formulario.descripcionCorta.trim(),

    descripcion:
      formulario.descripcion.trim(),

    tipo: formulario.tipo,
    alcance:
      formulario.alcance,

    fechaInicio:
      formulario.fechaInicio,

    fechaFin:
      formulario.fechaFin,

    horaInicio:
      formulario.todoElDia
        ? null
        : formulario
            .horaInicio ||
          null,

    horaFin:
      formulario.todoElDia
        ? null
        : formulario.horaFin ||
          null,

    todoElDia:
      formulario.todoElDia,

    instalacionId:
      formulario
        .instalacionId ||
      null,

    ubicacion:
      formulario.ubicacion.trim(),

    direccion:
      formulario.direccion.trim(),

    imagen:
      formulario.imagen.trim(),

    bannerNotificacion:
      formulario.bannerNotificacion.trim(),

    urlInformacion:
      formulario.urlInformacion.trim(),

    urlInscripcion:
      formulario.requiereInscripcion
        ? formulario
            .urlInscripcion
            .trim()
        : "",

    requiereInscripcion:
      formulario
        .requiereInscripcion,

    destacado:
      formulario.destacado,

    mostrarCalendario:
      formulario
        .mostrarCalendario,

    estado:
      formulario.estado,

    equiposIds:
      formulario.alcance ===
      "equipos"
        ? formulario.equipos
            .map(
              (equipo) =>
                equipo.id,
            )
            .sort()
        : [],
  };
}

export default function EditorEvento({
  eventoInicial = null,
  puedeEliminar = false,
}: Propiedades) {
  const modo =
    eventoInicial
      ? "editar"
      : "crear";

  const estadoInicial =
    useMemo(
      () =>
        eventoInicial
          ? crearEstadoDesdeEvento(
              eventoInicial,
            )
          : crearEstadoVacio(),
      [eventoInicial],
    );

  const [
    formulario,
    setFormulario,
  ] =
    useState<EstadoFormulario>(
      estadoInicial,
    );

  const [
    referenciaGuardada,
    setReferenciaGuardada,
  ] =
    useState<EstadoFormulario>(
      estadoInicial,
    );

  const [
    temporada,
    setTemporada,
  ] =
    useState<TemporadaEventoPanel | null>(
      null,
    );

  const [
    equiposDisponibles,
    setEquiposDisponibles,
  ] = useState<
    EquipoEventoPanel[]
  >([]);

  const [
    instalaciones,
    setInstalaciones,
  ] = useState<
    InstalacionEventoPanel[]
  >([]);

  const [
    cargandoOpciones,
    setCargandoOpciones,
  ] = useState(true);

  const [
    errorOpciones,
    setErrorOpciones,
  ] = useState<
    string | null
  >(null);

  const [
    errores,
    setErrores,
  ] = useState<
    Record<string, string>
  >({});

  const [
    errorGeneral,
    setErrorGeneral,
  ] = useState<
    string | null
  >(null);

  const [
    guardadoCorrectamente,
    setGuardadoCorrectamente,
  ] = useState(false);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    eliminando,
    setEliminando,
  ] = useState(false);

  const [
    intentoOpciones,
    setIntentoOpciones,
  ] = useState(0);

  useEffect(() => {
    const controlador =
      new AbortController();

    const cargarOpciones =
      async () => {
        try {
          setCargandoOpciones(
            true,
          );

          setErrorOpciones(
            null,
          );

          const respuesta =
            await fetch(
              "/api/panel/eventos/opciones",
              {
                method: "GET",

                credentials:
                  "same-origin",

                headers: {
                  Accept:
                    "application/json",
                },

                signal:
                  controlador.signal,
              },
            );

          const contenido =
            (await respuesta.json()) as
              RespuestaOpciones;

          if (
            !respuesta.ok ||
            !contenido.ok ||
            !contenido.data
          ) {
            throw new Error(
              contenido.error ??
                "No se han podido cargar las opciones del evento.",
            );
          }

          setTemporada(
            contenido.data
              .temporada,
          );

          setEquiposDisponibles(
            contenido.data.equipos ??
              [],
          );

          setInstalaciones(
            contenido.data
              .instalaciones ?? [],
          );

          if (
            !eventoInicial &&
            contenido.data
              .temporada?.id
          ) {
            setFormulario(
              (
                formularioActual,
              ) => ({
                ...formularioActual,

                temporadaId:
                  contenido.data
                    ?.temporada
                    ?.id ??
                  null,
              }),
            );

            setReferenciaGuardada(
              (
                formularioActual,
              ) => ({
                ...formularioActual,

                temporadaId:
                  contenido.data
                    ?.temporada
                    ?.id ??
                  null,
              }),
            );
          }
        } catch (error) {
          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          console.error(
            "Error cargando las opciones del editor de eventos:",
            error,
          );

          setErrorOpciones(
            error instanceof Error
              ? error.message
              : "No se han podido cargar las opciones del evento.",
          );
        } finally {
          if (
            !controlador.signal
              .aborted
          ) {
            setCargandoOpciones(
              false,
            );
          }
        }
      };

    cargarOpciones();

    return () => {
      controlador.abort();
    };
  }, [
    eventoInicial,
    intentoOpciones,
  ]);

  const formularioModificado =
    useMemo(
      () =>
        JSON.stringify(
          normalizarFormulario(
            formulario,
          ),
        ) !==
        JSON.stringify(
          normalizarFormulario(
            referenciaGuardada,
          ),
        ),
      [
        formulario,
        referenciaGuardada,
      ],
    );

  const actualizarCampo = <
    Campo extends
      keyof EstadoFormulario,
  >(
    campo: Campo,
    valor:
      EstadoFormulario[Campo],
  ) => {
    setFormulario(
      (formularioActual) => ({
        ...formularioActual,
        [campo]: valor,
      }),
    );

    setErrores(
      (erroresActuales) => {
        if (
          !erroresActuales[
            campo
          ]
        ) {
          return erroresActuales;
        }

        const siguientesErrores =
          {
            ...erroresActuales,
          };

        delete siguientesErrores[
          campo
        ];

        return siguientesErrores;
      },
    );

    setErrorGeneral(null);
    setGuardadoCorrectamente(
      false,
    );
  };

  const validarEnCliente =
    (
      estadoDestino:
        EstadoEvento,
    ): boolean => {
      const nuevosErrores:
        Record<
          string,
          string
        > = {};

      if (
        !formulario.titulo.trim()
      ) {
        nuevosErrores.titulo =
          "Debes indicar el título del evento.";
      }

      if (
        formulario.titulo
          .trim().length > 150
      ) {
        nuevosErrores.titulo =
          "El título no puede superar los 150 caracteres.";
      }

      if (
        !formulario.fechaInicio
      ) {
        nuevosErrores.fechaInicio =
          "Debes indicar la fecha de inicio.";
      }

      if (
        !formulario.fechaFin
      ) {
        nuevosErrores.fechaFin =
          "Debes indicar la fecha de finalización.";
      }

      if (
        formulario.fechaInicio &&
        formulario.fechaFin &&
        formulario.fechaFin <
          formulario.fechaInicio
      ) {
        nuevosErrores.fechaFin =
          "La fecha de finalización no puede ser anterior a la fecha de inicio.";
      }

      if (
        !formulario.todoElDia &&
        !formulario.horaInicio
      ) {
        nuevosErrores.horaInicio =
          "Debes indicar la hora de inicio o marcar el evento como todo el día.";
      }

      if (
        !formulario.todoElDia &&
        formulario.fechaInicio ===
          formulario.fechaFin &&
        formulario.horaInicio &&
        formulario.horaFin &&
        formulario.horaFin <
          formulario.horaInicio
      ) {
        nuevosErrores.horaFin =
          "La hora de finalización no puede ser anterior a la hora de inicio.";
      }

      if (
        formulario.alcance ===
          "equipos" &&
        formulario.equipos
          .length === 0
      ) {
        nuevosErrores.equipos =
          "Debes seleccionar al menos un equipo.";
      }

      if (
        formulario
          .requiereInscripcion &&
        !formulario
          .urlInscripcion
          .trim()
      ) {
        nuevosErrores.urlInscripcion =
          "Debes indicar el enlace de inscripción.";
      }

      if (
        estadoDestino ===
          "publicado" &&
        !formulario
          .mostrarCalendario &&
        !formulario
          .descripcionCorta
          .trim() &&
        !formulario
          .descripcion
          .trim()
      ) {
        nuevosErrores.descripcionCorta =
          "Añade una descripción antes de publicar el evento.";
      }

      setErrores(
        nuevosErrores,
      );

      if (
        Object.keys(
          nuevosErrores,
        ).length > 0
      ) {
        setErrorGeneral(
          "Revisa los campos marcados antes de guardar el evento.",
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        return false;
      }

      return true;
    };

  const guardarEvento = async (
    estadoDestino:
      EstadoEvento,
  ) => {
    if (
      guardando ||
      eliminando
    ) {
      return;
    }

    if (
      !validarEnCliente(
        estadoDestino,
      )
    ) {
      return;
    }

    try {
      setGuardando(true);
      setErrorGeneral(null);
      setGuardadoCorrectamente(
        false,
      );

      const datosFormulario = {
        ...normalizarFormulario(
          formulario,
        ),

        estado:
          estadoDestino,
      };

      const ruta =
        modo === "editar" &&
        eventoInicial
          ? `/api/panel/eventos/${encodeURIComponent(
              eventoInicial.id,
            )}`
          : "/api/panel/eventos";

      const respuesta =
        await fetch(
          ruta,
          {
            method:
              modo === "editar"
                ? "PATCH"
                : "POST",

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
                datosFormulario,
              ),
          },
        );

      const contenido =
        (await respuesta.json()) as
          RespuestaGuardado;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data?.evento
      ) {
        const erroresServidor:
          Record<
            string,
            string
          > = {};

        contenido.errores?.forEach(
          (error) => {
            erroresServidor[
              error.campo
            ] =
              error.mensaje;
          },
        );

        setErrores(
          erroresServidor,
        );

        throw new Error(
          contenido.error ??
            "No se ha podido guardar el evento.",
        );
      }

      const eventoGuardado =
        contenido.data.evento;

      const nuevoEstado =
        crearEstadoDesdeEvento(
          eventoGuardado,
        );

      setFormulario(
        nuevoEstado,
      );

      setReferenciaGuardada(
        nuevoEstado,
      );

      setErrores({});
      setGuardadoCorrectamente(
        true,
      );

      if (
        modo === "crear"
      ) {
        window.location.href =
          `/panel/eventos/${encodeURIComponent(
            eventoGuardado.id,
          )}?creado=1`;

        return;
      }

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(
        "Error guardando el evento:",
        error,
      );

      setErrorGeneral(
        error instanceof Error
          ? error.message
          : "No se ha podido guardar el evento.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setGuardando(false);
    }
  };

  const cancelarCambios =
    () => {
      if (
        modo === "crear"
      ) {
        const estadoVacio =
          crearEstadoVacio();

        estadoVacio.temporadaId =
          temporada?.id ??
          null;

        setFormulario(
          estadoVacio,
        );

        setReferenciaGuardada(
          estadoVacio,
        );
      } else {
        setFormulario(
          referenciaGuardada,
        );
      }

      setErrores({});
      setErrorGeneral(null);
      setGuardadoCorrectamente(
        false,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

  const eliminarEvento =
    async () => {
      if (
        !eventoInicial ||
        eliminando ||
        guardando
      ) {
        return;
      }

      const confirmado =
        window.confirm(
          `¿Seguro que quieres eliminar "${eventoInicial.titulo}"? Esta acción eliminará también sus relaciones con equipos.`,
        );

      if (!confirmado) {
        return;
      }

      try {
        setEliminando(true);
        setErrorGeneral(null);

        const respuesta =
          await fetch(
            `/api/panel/eventos/${encodeURIComponent(
              eventoInicial.id,
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
            RespuestaEliminacion;

        if (
          !respuesta.ok ||
          !contenido.ok
        ) {
          throw new Error(
            contenido.error ??
              "No se ha podido eliminar el evento.",
          );
        }

        window.location.href =
          "/panel/eventos";
      } catch (error) {
        console.error(
          "Error eliminando el evento:",
          error,
        );

        setErrorGeneral(
          error instanceof Error
            ? error.message
            : "No se ha podido eliminar el evento.",
        );

        setEliminando(false);

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    };

  const ocupado =
    guardando ||
    eliminando;

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-primary">
            {modo === "crear"
              ? "Nuevo evento"
              : "Editar evento"}
          </p>

          <h1 className="mt-1 text-3xl font-bold text-on-surface">
            {formulario.titulo.trim() ||
              (
                modo === "crear"
                  ? "Crear evento"
                  : "Evento sin título"
              )}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
            Configura la información,
            las fechas, los equipos y
            las imágenes del evento.
          </p>

          {temporada && (
            <p className="mt-2 text-xs font-semibold text-on-surface-variant">
              Temporada:{" "}
              {temporada.nombre ??
                "Temporada activa"}
            </p>
          )}
        </div>

        <a
          href="/panel/eventos"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          <span
            className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat"
            style={{
              maskImage:
                "url('/iconos/panel/volver.svg')",

              WebkitMaskImage:
                "url('/iconos/panel/volver.svg')",
            }}
            aria-hidden="true"
          />

          Volver a eventos
        </a>
      </header>

      {errorGeneral && (
        <section
          className="rounded-2xl border border-error/40 bg-error-container p-5 text-on-error-container shadow-sm"
          role="alert"
        >
          <h2 className="font-bold">
            No se han podido guardar
            los cambios
          </h2>

          <p className="mt-1 text-sm">
            {errorGeneral}
          </p>
        </section>
      )}

      {guardadoCorrectamente && (
        <section
          className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success-container p-5 text-on-success-container shadow-sm"
          role="status"
        >
          <span
            className="mt-0.5 inline-block h-5 w-5 shrink-0 bg-current mask-center mask-contain mask-no-repeat"
            style={{
              maskImage:
                "url('/iconos/panel/correcto.svg')",

              WebkitMaskImage:
                "url('/iconos/panel/correcto.svg')",
            }}
            aria-hidden="true"
          />

          <div>
            <p className="font-bold">
              Evento guardado
              correctamente
            </p>

            <p className="mt-1 text-sm">
              Los cambios ya están
              registrados.
            </p>
          </div>
        </section>
      )}

      {errorOpciones && (
        <section
          className="rounded-2xl border border-error/40 bg-error-container p-5 text-on-error-container shadow-sm"
          role="alert"
        >
          <h2 className="font-bold">
            No se han podido cargar
            las opciones
          </h2>

          <p className="mt-1 text-sm">
            {errorOpciones}
          </p>

          <button
            type="button"
            onClick={() =>
              setIntentoOpciones(
                (valor) =>
                  valor + 1,
              )
            }
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-error px-4 py-2 text-sm font-bold"
          >
            Volver a intentarlo
          </button>
        </section>
      )}

      <DatosGeneralesEvento
        titulo={formulario.titulo}
        descripcionCorta={
          formulario.descripcionCorta
        }
        descripcion={
          formulario.descripcion
        }
        tipo={formulario.tipo}
        estado={formulario.estado}
        destacado={
          formulario.destacado
        }
        mostrarCalendario={
          formulario.mostrarCalendario
        }
        alCambiarTitulo={(
          valor,
        ) =>
          actualizarCampo(
            "titulo",
            valor,
          )
        }
        alCambiarDescripcionCorta={(
          valor,
        ) =>
          actualizarCampo(
            "descripcionCorta",
            valor,
          )
        }
        alCambiarDescripcion={(
          valor,
        ) =>
          actualizarCampo(
            "descripcion",
            valor,
          )
        }
        alCambiarTipo={(
          valor,
        ) =>
          actualizarCampo(
            "tipo",
            valor,
          )
        }
        alCambiarEstado={(
          valor,
        ) =>
          actualizarCampo(
            "estado",
            valor,
          )
        }
        alCambiarDestacado={(
          valor,
        ) =>
          actualizarCampo(
            "destacado",
            valor,
          )
        }
        alCambiarMostrarCalendario={(
          valor,
        ) =>
          actualizarCampo(
            "mostrarCalendario",
            valor,
          )
        }
        errores={errores}
        deshabilitado={ocupado}
      />

      <FechasEvento
        fechaInicio={
          formulario.fechaInicio
        }
        fechaFin={
          formulario.fechaFin
        }
        horaInicio={
          formulario.horaInicio
        }
        horaFin={
          formulario.horaFin
        }
        todoElDia={
          formulario.todoElDia
        }
        alCambiarFechaInicio={(
          valor,
        ) =>
          actualizarCampo(
            "fechaInicio",
            valor,
          )
        }
        alCambiarFechaFin={(
          valor,
        ) =>
          actualizarCampo(
            "fechaFin",
            valor,
          )
        }
        alCambiarHoraInicio={(
          valor,
        ) =>
          actualizarCampo(
            "horaInicio",
            valor,
          )
        }
        alCambiarHoraFin={(
          valor,
        ) =>
          actualizarCampo(
            "horaFin",
            valor,
          )
        }
        alCambiarTodoElDia={(
          valor,
        ) =>
          actualizarCampo(
            "todoElDia",
            valor,
          )
        }
        errores={errores}
        deshabilitado={ocupado}
      />

      <SelectorEquiposEvento
        alcance={
          formulario.alcance
        }
        equiposDisponibles={
          equiposDisponibles
        }
        equiposSeleccionados={
          formulario.equipos
        }
        alCambiarAlcance={(
          valor,
        ) =>
          actualizarCampo(
            "alcance",
            valor,
          )
        }
        alCambiarEquipos={(
          valor,
        ) =>
          actualizarCampo(
            "equipos",
            valor,
          )
        }
        error={
          errores.equipos ??
          errores.equiposIds ??
          null
        }
        deshabilitado={
          ocupado ||
          cargandoOpciones ||
          Boolean(errorOpciones)
        }
      />

      <UbicacionEvento
        instalacionId={
          formulario.instalacionId
        }
        ubicacion={
          formulario.ubicacion
        }
        direccion={
          formulario.direccion
        }
        instalaciones={
          instalaciones
        }
        alCambiarInstalacionId={(
          valor,
        ) =>
          actualizarCampo(
            "instalacionId",
            valor,
          )
        }
        alCambiarUbicacion={(
          valor,
        ) =>
          actualizarCampo(
            "ubicacion",
            valor,
          )
        }
        alCambiarDireccion={(
          valor,
        ) =>
          actualizarCampo(
            "direccion",
            valor,
          )
        }
        errores={errores}
        deshabilitado={ocupado}
        cargandoInstalaciones={
          cargandoOpciones
        }
      />

      <ImagenesEvento
        eventoId={
          eventoInicial?.id ??
          null
        }
        imagen={formulario.imagen}
        bannerNotificacion={
          formulario.bannerNotificacion
        }
        alCambiarImagen={(
          valor,
        ) =>
          actualizarCampo(
            "imagen",
            valor,
          )
        }
        alCambiarBannerNotificacion={(
          valor,
        ) =>
          actualizarCampo(
            "bannerNotificacion",
            valor,
          )
        }
        errores={errores}
        deshabilitado={ocupado}
      />

      <EnlacesEvento
        urlInformacion={
          formulario.urlInformacion
        }
        urlInscripcion={
          formulario.urlInscripcion
        }
        requiereInscripcion={
          formulario.requiereInscripcion
        }
        alCambiarUrlInformacion={(
          valor,
        ) =>
          actualizarCampo(
            "urlInformacion",
            valor,
          )
        }
        alCambiarUrlInscripcion={(
          valor,
        ) =>
          actualizarCampo(
            "urlInscripcion",
            valor,
          )
        }
        alCambiarRequiereInscripcion={(
          valor,
        ) =>
          actualizarCampo(
            "requiereInscripcion",
            valor,
          )
        }
        errores={errores}
        deshabilitado={ocupado}
      />

      <AccionesEditorEvento
        modo={modo}
        estadoEvento={
          formulario.estado
        }
        guardando={guardando}
        eliminando={eliminando}
        modificado={
          formularioModificado
        }
        puedeEliminar={
          puedeEliminar
        }
        alGuardarBorrador={() => {
          actualizarCampo(
            "estado",
            "borrador",
          );

          void guardarEvento(
            "borrador",
          );
        }}
        alPublicar={() => {
          actualizarCampo(
            "estado",
            "publicado",
          );

          void guardarEvento(
            "publicado",
          );
        }}
        alCancelarCambios={
          cancelarCambios
        }
        alEliminar={
          eliminarEvento
        }
      />
    </div>
  );
}