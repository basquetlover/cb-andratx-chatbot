import type {
  EstadoEvento,
  TipoEvento,
} from "@tipos/EventoPanel";

interface ErroresDatosGenerales {
  titulo?: string;
  descripcionCorta?: string;
  descripcion?: string;
  tipo?: string;
  estado?: string;
}

interface Propiedades {
  titulo: string;
  descripcionCorta: string;
  descripcion: string;

  tipo: TipoEvento;
  estado: EstadoEvento;

  destacado: boolean;
  mostrarCalendario: boolean;

  alCambiarTitulo: (
    titulo: string,
  ) => void;

  alCambiarDescripcionCorta: (
    descripcion: string,
  ) => void;

  alCambiarDescripcion: (
    descripcion: string,
  ) => void;

  alCambiarTipo: (
    tipo: TipoEvento,
  ) => void;

  alCambiarEstado: (
    estado: EstadoEvento,
  ) => void;

  alCambiarDestacado: (
    destacado: boolean,
  ) => void;

  alCambiarMostrarCalendario: (
    mostrar: boolean,
  ) => void;

  errores?: ErroresDatosGenerales;
  deshabilitado?: boolean;
}

interface PropiedadesInterruptor {
  activo: boolean;
  etiqueta: string;
  descripcion: string;

  alCambiar: (
    activo: boolean,
  ) => void;

  deshabilitado?: boolean;
}

const opcionesTipo: {
  valor: TipoEvento;
  etiqueta: string;
}[] = [
  {
    valor: "evento",
    etiqueta: "Evento",
  },
  {
    valor: "campus",
    etiqueta: "Campus",
  },
  {
    valor: "torneo",
    etiqueta: "Torneo",
  },
  {
    valor: "presentacion",
    etiqueta: "Presentación",
  },
  {
    valor: "reunion",
    etiqueta: "Reunión",
  },
  {
    valor: "actividad",
    etiqueta: "Actividad",
  },
  {
    valor: "otro",
    etiqueta: "Otro",
  },
];

const opcionesEstado: {
  valor: EstadoEvento;
  etiqueta: string;
  descripcion: string;
}[] = [
  {
    valor: "borrador",
    etiqueta: "Borrador",
    descripcion:
      "El evento permanece oculto en la web pública.",
  },
  {
    valor: "publicado",
    etiqueta: "Publicado",
    descripcion:
      "El evento puede aparecer en la web y el calendario.",
  },
  {
    valor: "cancelado",
    etiqueta: "Cancelado",
    descripcion:
      "El evento se conserva, pero se muestra como cancelado.",
  },
  {
    valor: "archivado",
    etiqueta: "Archivado",
    descripcion:
      "El evento queda guardado únicamente como histórico.",
  },
];

function Interruptor({
  activo,
  etiqueta,
  descripcion,
  alCambiar,
  deshabilitado = false,
}: PropiedadesInterruptor) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={deshabilitado}
      onClick={() =>
        alCambiar(!activo)
      }
      className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        activo
          ? "border-primary/50 bg-primary-container/40"
          : "border-outline-variant/60 bg-surface-container-low"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-on-surface">
          {etiqueta}
        </span>

        <span className="mt-0.5 block text-xs leading-5 text-on-surface-variant">
          {descripcion}
        </span>
      </span>

      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          activo
            ? "bg-primary"
            : "bg-outline-variant"
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            activo
              ? "translate-x-5"
              : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

export default function DatosGeneralesEvento({
  titulo,
  descripcionCorta,
  descripcion,
  tipo,
  estado,
  destacado,
  mostrarCalendario,
  alCambiarTitulo,
  alCambiarDescripcionCorta,
  alCambiarDescripcion,
  alCambiarTipo,
  alCambiarEstado,
  alCambiarDestacado,
  alCambiarMostrarCalendario,
  errores = {},
  deshabilitado = false,
}: Propiedades) {
  const estadoSeleccionado =
    opcionesEstado.find(
      (opcion) =>
        opcion.valor === estado,
    );

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-bold text-on-surface">
          Información general
        </h2>

        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
          Define el nombre, el contenido
          y la visibilidad principal del
          evento.
        </p>
      </div>

      <div className="grid gap-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)]">
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">
              Título del evento
              <span
                className="ml-1 text-error"
                aria-hidden="true"
              >
                *
              </span>
            </span>

            <input
              type="text"
              value={titulo}
              onChange={(evento) =>
                alCambiarTitulo(
                  evento.target.value,
                )
              }
              disabled={deshabilitado}
              maxLength={150}
              required
              aria-invalid={
                Boolean(
                  errores.titulo,
                )
              }
              placeholder="Ej. Presentación de los equipos"
              className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                errores.titulo
                  ? "border-error focus:border-error focus:ring-error/20"
                  : "border-outline-variant focus:border-primary focus:ring-primary/20"
              }`}
            />

            <span className="flex justify-between gap-3 text-xs">
              <span
                className={
                  errores.titulo
                    ? "font-semibold text-error"
                    : "text-on-surface-variant"
                }
              >
                {errores.titulo ??
                  "Nombre visible en la web y el calendario."}
              </span>

              <span className="shrink-0 text-outline">
                {titulo.length}/150
              </span>
            </span>
          </label>

          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">
              Tipo de evento
              <span
                className="ml-1 text-error"
                aria-hidden="true"
              >
                *
              </span>
            </span>

            <select
              value={tipo}
              onChange={(evento) =>
                alCambiarTipo(
                  evento.target
                    .value as TipoEvento,
                )
              }
              disabled={deshabilitado}
              aria-invalid={
                Boolean(
                  errores.tipo,
                )
              }
              className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                errores.tipo
                  ? "border-error focus:border-error focus:ring-error/20"
                  : "border-outline-variant focus:border-primary focus:ring-primary/20"
              }`}
            >
              {opcionesTipo.map(
                (opcion) => (
                  <option
                    key={
                      opcion.valor
                    }
                    value={
                      opcion.valor
                    }
                  >
                    {
                      opcion.etiqueta
                    }
                  </option>
                ),
              )}
            </select>

            <span
              className={`text-xs ${
                errores.tipo
                  ? "font-semibold text-error"
                  : "text-on-surface-variant"
              }`}
            >
              {errores.tipo ??
                "Se utilizará para clasificar e identificar el evento."}
            </span>
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-on-surface">
            Descripción corta
          </span>

          <textarea
            value={descripcionCorta}
            onChange={(evento) =>
              alCambiarDescripcionCorta(
                evento.target.value,
              )
            }
            disabled={deshabilitado}
            maxLength={300}
            rows={3}
            aria-invalid={
              Boolean(
                errores.descripcionCorta,
              )
            }
            placeholder="Resumen breve que aparecerá en tarjetas y notificaciones."
            className={`resize-y rounded-xl border bg-surface-container-lowest px-3 py-3 text-sm leading-6 text-on-surface outline-none transition-colors placeholder:text-outline focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
              errores.descripcionCorta
                ? "border-error focus:border-error focus:ring-error/20"
                : "border-outline-variant focus:border-primary focus:ring-primary/20"
            }`}
          />

          <span className="flex justify-between gap-3 text-xs">
            <span
              className={
                errores.descripcionCorta
                  ? "font-semibold text-error"
                  : "text-on-surface-variant"
              }
            >
              {errores.descripcionCorta ??
                "Procura que se entienda sin abrir el evento completo."}
            </span>

            <span className="shrink-0 text-outline">
              {
                descripcionCorta.length
              }
              /300
            </span>
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-on-surface">
            Descripción completa
          </span>

          <textarea
            value={descripcion}
            onChange={(evento) =>
              alCambiarDescripcion(
                evento.target.value,
              )
            }
            disabled={deshabilitado}
            maxLength={10000}
            rows={7}
            aria-invalid={
              Boolean(
                errores.descripcion,
              )
            }
            placeholder="Añade toda la información necesaria sobre la actividad."
            className={`resize-y rounded-xl border bg-surface-container-lowest px-3 py-3 text-sm leading-6 text-on-surface outline-none transition-colors placeholder:text-outline focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
              errores.descripcion
                ? "border-error focus:border-error focus:ring-error/20"
                : "border-outline-variant focus:border-primary focus:ring-primary/20"
            }`}
          />

          <span className="flex justify-between gap-3 text-xs">
            <span
              className={
                errores.descripcion
                  ? "font-semibold text-error"
                  : "text-on-surface-variant"
              }
            >
              {errores.descripcion ??
                "Puedes incluir horarios, requisitos y cualquier información adicional."}
            </span>

            <span className="shrink-0 text-outline">
              {descripcion.length}
              /10000
            </span>
          </span>
        </label>

        <div className="grid gap-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4 sm:grid-cols-2 sm:p-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">
              Estado
              <span
                className="ml-1 text-error"
                aria-hidden="true"
              >
                *
              </span>
            </span>

            <select
              value={estado}
              onChange={(evento) =>
                alCambiarEstado(
                  evento.target
                    .value as EstadoEvento,
                )
              }
              disabled={deshabilitado}
              aria-invalid={
                Boolean(
                  errores.estado,
                )
              }
              className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                errores.estado
                  ? "border-error focus:border-error focus:ring-error/20"
                  : "border-outline-variant focus:border-primary focus:ring-primary/20"
              }`}
            >
              {opcionesEstado.map(
                (opcion) => (
                  <option
                    key={
                      opcion.valor
                    }
                    value={
                      opcion.valor
                    }
                  >
                    {
                      opcion.etiqueta
                    }
                  </option>
                ),
              )}
            </select>

            <span
              className={`text-xs leading-5 ${
                errores.estado
                  ? "font-semibold text-error"
                  : "text-on-surface-variant"
              }`}
            >
              {errores.estado ??
                estadoSeleccionado
                  ?.descripcion}
            </span>
          </label>

          <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-4 py-3">
            <p className="text-sm font-bold text-on-surface">
              Visibilidad actual
            </p>

            <p className="mt-1 text-xs leading-5 text-on-surface-variant">
              {estado ===
              "publicado"
                ? mostrarCalendario
                  ? "El evento puede mostrarse públicamente y aparecerá en el calendario."
                  : "El evento puede mostrarse públicamente, pero está oculto en el calendario."
                : estado ===
                    "cancelado"
                  ? "El evento se conservará marcado como cancelado."
                  : estado ===
                      "archivado"
                    ? "El evento estará oculto y se conservará como histórico."
                    : "El evento está guardado como borrador y no será público."}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Interruptor
            activo={destacado}
            etiqueta="Evento destacado"
            descripcion="Permite dar mayor prioridad visual al evento en la web."
            alCambiar={
              alCambiarDestacado
            }
            deshabilitado={
              deshabilitado
            }
          />

          <Interruptor
            activo={
              mostrarCalendario
            }
            etiqueta="Mostrar en el calendario"
            descripcion="Añade el evento al calendario público cuando esté publicado."
            alCambiar={
              alCambiarMostrarCalendario
            }
            deshabilitado={
              deshabilitado
            }
          />
        </div>
      </div>
    </section>
  );
}