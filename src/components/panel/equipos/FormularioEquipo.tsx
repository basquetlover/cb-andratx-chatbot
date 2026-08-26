import { useMemo, useState, type CSSProperties, type FormEvent } from "react";

import { useToast } from "@components/notificaciones/SistemaNotificaciones";

import type { RespuestaCrearEquipoApi } from "@tipos/EquipoPanel";
import type { DatosFormularioEquipoPanel } from "@tipos/FormularioEquipoPanel";

interface Propiedades {
  datosFormulario: DatosFormularioEquipoPanel;
}

interface EstadoFormulario {
  nombre: string;
  nombreCorto: string;
  slug: string;
  categoria: string;
  genero: string;
  nivel: string;
  descripcion: string;
  activo: boolean;
  chatbot: boolean;
  idEquipoFbib: string;
  mostrarSponsor: boolean;
  patrocinadoresIds: string[];
}

interface PropiedadesInterruptor {
  activo: boolean;
  alCambiar: (activo: boolean) => void;
  etiqueta: string;
  descripcion?: string;
  deshabilitado?: boolean;
}

const CATEGORIAS_PREDETERMINADAS = [
  "Escoleta",
  "Iniciación",
  "Premini",
  "Mini",
  "Infantil",
  "Cadete",
  "Junior",
  "Senior",
  "+40",
];

const GENEROS_PREDETERMINADOS = [
  "Masculino",
  "Femenino",
  "Mixto",
];

const NIVELES_PREDETERMINADOS = [
  "Formación",
  "Insular",
  "Balear",
  "Preferente",
  "Autonómico",
  "Nacional",
];

function normalizarSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function combinarOpciones(
  predeterminadas: string[],
  existentes: string[],
): string[] {
  const opciones = new Map<string, string>();

  [...predeterminadas, ...existentes].forEach((valor) => {
    const valorLimpio = valor.trim();

    if (!valorLimpio) {
      return;
    }

    const clave = normalizarTexto(valorLimpio);

    if (!opciones.has(clave)) {
      opciones.set(clave, valorLimpio);
    }
  });

  return Array.from(opciones.values());
}

function IconoPanel({
  nombre,
  className = "h-5 w-5",
}: {
  nombre: string;
  className?: string;
}) {
  const estilo = {
    maskImage: `url('/iconos/panel/${nombre}.svg')`,
    WebkitMaskImage: `url('/iconos/panel/${nombre}.svg')`,
  } as CSSProperties;

  return (
    <span
      className={`inline-block shrink-0 bg-current mask-center mask-contain mask-no-repeat ${className}`}
      style={estilo}
      aria-hidden="true"
    />
  );
}

function Interruptor({
  activo,
  alCambiar,
  etiqueta,
  descripcion,
  deshabilitado = false,
}: PropiedadesInterruptor) {
  return (
    <button type="button" role="switch" aria-checked={activo} disabled={deshabilitado} onClick={() => alCambiar(!activo)} className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 ${activo ? "border-primary/40 bg-primary-fixed/50" : "border-outline-variant/60 bg-surface-container-low"}`}>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-on-surface">
          {etiqueta}
        </span>

        {descripcion && (
          <span className="mt-0.5 block text-xs leading-4 text-on-surface-variant">
            {descripcion}
          </span>
        )}
      </span>

      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ease-out ${activo ? "bg-primary" : "bg-outline-variant"}`} aria-hidden="true">
        <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${activo ? "translate-x-5" : "translate-x-0"}`} />
      </span>
    </button>
  );
}
export default function FormularioEquipo({
  datosFormulario,
}: Propiedades) {
  const { addToast } = useToast();

  const [formulario, setFormulario] =
    useState<EstadoFormulario>({
      nombre: "",
      nombreCorto: "",
      slug: "",
      categoria: "",
      genero: "",
      nivel: "",
      descripcion: "",
      activo: true,
      chatbot: false,
      idEquipoFbib: "",
      mostrarSponsor: false,
      patrocinadoresIds: [],
    });

  const [slugModificado, setSlugModificado] =
    useState(false);

  const [guardando, setGuardando] = useState(false);

  const [errorGeneral, setErrorGeneral] = useState<
    string | null
  >(null);

  const [erroresCampos, setErroresCampos] = useState<
    Record<string, string>
  >({});

  const [
    busquedaPatrocinador,
    setBusquedaPatrocinador,
  ] = useState("");

  const categoriasDisponibles = useMemo(
    () =>
      combinarOpciones(
        CATEGORIAS_PREDETERMINADAS,
        datosFormulario.categorias,
      ),
    [datosFormulario.categorias],
  );

  const generosDisponibles = useMemo(
    () =>
      combinarOpciones(
        GENEROS_PREDETERMINADOS,
        datosFormulario.generos,
      ),
    [datosFormulario.generos],
  );

  const nivelesDisponibles = useMemo(
    () =>
      combinarOpciones(
        NIVELES_PREDETERMINADOS,
        datosFormulario.niveles,
      ),
    [datosFormulario.niveles],
  );

  const patrocinadoresFiltrados = useMemo(() => {
    const busqueda = normalizarTexto(
      busquedaPatrocinador,
    );

    if (!busqueda) {
      return datosFormulario.patrocinadores;
    }

    return datosFormulario.patrocinadores.filter(
      (patrocinador) => {
        const texto = normalizarTexto(
          [
            patrocinador.nombre,
            patrocinador.nombreCorto,
          ]
            .filter(Boolean)
            .join(" "),
        );

        return texto.includes(busqueda);
      },
    );
  }, [
    datosFormulario.patrocinadores,
    busquedaPatrocinador,
  ]);

  const actualizarCampo = <
    Campo extends keyof EstadoFormulario,
  >(
    campo: Campo,
    valor: EstadoFormulario[Campo],
  ) => {
    setFormulario((estadoActual) => ({
      ...estadoActual,
      [campo]: valor,
    }));

    setErroresCampos((erroresActuales) => {
      if (!erroresActuales[campo]) {
        return erroresActuales;
      }

      const erroresNuevos = {
        ...erroresActuales,
      };

      delete erroresNuevos[campo];

      return erroresNuevos;
    });
  };

  const actualizarNombre = (nombre: string) => {
    setFormulario((estadoActual) => ({
      ...estadoActual,
      nombre,
      slug: slugModificado
        ? estadoActual.slug
        : normalizarSlug(nombre),
    }));

    setErroresCampos((erroresActuales) => {
      const erroresNuevos = {
        ...erroresActuales,
      };

      delete erroresNuevos.nombre;

      if (!slugModificado) {
        delete erroresNuevos.slug;
      }

      return erroresNuevos;
    });
  };

  const actualizarSlug = (slug: string) => {
    setSlugModificado(true);

    actualizarCampo(
      "slug",
      normalizarSlug(slug),
    );
  };

  const alternarPatrocinador = (
    patrocinadorId: string,
  ) => {
    setFormulario((estadoActual) => {
      const estaSeleccionado =
        estadoActual.patrocinadoresIds.includes(
          patrocinadorId,
        );

      const patrocinadoresIds = estaSeleccionado
        ? estadoActual.patrocinadoresIds.filter(
            (id) => id !== patrocinadorId,
          )
        : [
            ...estadoActual.patrocinadoresIds,
            patrocinadorId,
          ];

      return {
        ...estadoActual,
        patrocinadoresIds,
        mostrarSponsor:
          patrocinadoresIds.length > 0
            ? estaSeleccionado
              ? estadoActual.mostrarSponsor
              : true
            : false,
      };
    });

    setErroresCampos((erroresActuales) => {
      if (!erroresActuales.patrocinadoresIds) {
        return erroresActuales;
      }

      const erroresNuevos = {
        ...erroresActuales,
      };

      delete erroresNuevos.patrocinadoresIds;

      return erroresNuevos;
    });
  };

  const enviarFormulario = async (
    evento: FormEvent<HTMLFormElement>,
  ) => {
    evento.preventDefault();

    if (!datosFormulario.temporada) {
      setErrorGeneral(
        "No hay ninguna temporada activa.",
      );

      return;
    }

    try {
      setGuardando(true);
      setErrorGeneral(null);
      setErroresCampos({});

      const respuesta = await fetch(
        "/api/panel/equipos",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            temporadaId:
              datosFormulario.temporada.id,
            nombre: formulario.nombre,
            nombreCorto:
              formulario.nombreCorto || null,
            slug: formulario.slug,
            categoria: formulario.categoria,
            genero: formulario.genero,
            nivel: formulario.nivel || null,
            descripcion:
              formulario.descripcion || null,
            activo: formulario.activo,
            chatbot: formulario.chatbot,
            idEquipoFbib:
              formulario.idEquipoFbib || null,
            mostrarSponsor:
              formulario.patrocinadoresIds.length >
                0 &&
              formulario.mostrarSponsor,
            patrocinadoresIds:
              formulario.patrocinadoresIds,
          }),
        },
      );

      const contenido =
        (await respuesta.json()) as RespuestaCrearEquipoApi;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data?.equipo
      ) {
        const errores = contenido.errores ?? [];

        setErroresCampos(
          Object.fromEntries(
            errores.map((error) => [
              error.campo,
              error.mensaje,
            ]),
          ),
        );

        throw new Error(
          contenido.error ??
            "No se ha podido crear el equipo.",
        );
      }

      addToast({
        type: "success",
        message: `${contenido.data.equipo.nombre} se ha creado correctamente.`,
        duration: 4500,
      });

      window.location.assign(
        `/panel/equipos/${contenido.data.equipo.id}`,
      );
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : "No se ha podido crear el equipo.";

      setErrorGeneral(mensaje);

      addToast({
        type: "error",
        message: mensaje,
        duration: 6000,
      });
    } finally {
      setGuardando(false);
    }
  };

  if (!datosFormulario.temporada) {
    return (
      <section className="rounded-2xl border border-error/30 bg-error-container p-6 text-on-error-container shadow-sm">
        <h2 className="font-bold">
          No hay ninguna temporada activa
        </h2>

        <p className="mt-1 text-sm">
          Debes crear o activar una temporada antes de
          poder registrar un equipo.
        </p>
      </section>
    );
  }

  return (
    <form
      onSubmit={enviarFormulario}
      className="flex flex-col gap-6"
      noValidate
    >
      {errorGeneral && (
        <div
          className="rounded-2xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container"
          role="alert"
        >
          {errorGeneral}
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3 border-b border-outline-variant/60 pb-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
              <IconoPanel nombre="informacion" />
            </span>

            <div>
              <h2 className="font-bold text-on-surface">
                Información general
              </h2>

              <p className="mt-0.5 text-sm text-on-surface-variant">
                Datos públicos e identificativos del
                equipo.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-on-surface">
                Temporada
              </span>

              <input
                type="text"
                value={
                  datosFormulario.temporada.nombre
                }
                disabled
                className="h-11 rounded-xl border border-outline-variant bg-surface-container px-4 text-on-surface-variant disabled:cursor-not-allowed"
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-on-surface">
                Estado
              </span>

              <div className="grid h-11 grid-cols-2 rounded-xl border border-outline-variant bg-surface-container p-1">
                <button
                  type="button"
                  onClick={() =>
                    actualizarCampo("activo", true)
                  }
                  className={`rounded-lg px-3 text-sm font-bold transition-colors ${
                    formulario.activo
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-primary"
                  }`}
                  aria-pressed={formulario.activo}
                >
                  Activo
                </button>

                <button
                  type="button"
                  onClick={() =>
                    actualizarCampo("activo", false)
                  }
                  className={`rounded-lg px-3 text-sm font-bold transition-colors ${
                    !formulario.activo
                      ? "bg-on-surface text-surface shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                  aria-pressed={!formulario.activo}
                >
                  Inactivo
                </button>
              </div>
            </div>

            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-bold text-on-surface">
                Nombre del equipo *
              </span>

              <input
                type="text"
                value={formulario.nombre}
                onChange={(evento) =>
                  actualizarNombre(
                    evento.target.value,
                  )
                }
                maxLength={120}
                placeholder="Ej. Infantil Masculino A"
                className={`h-11 rounded-xl border bg-surface-container-lowest px-4 text-on-surface outline-none placeholder:text-outline focus:ring-2 ${
                  erroresCampos.nombre
                    ? "border-error focus:border-error focus:ring-error/20"
                    : "border-outline-variant focus:border-primary focus:ring-primary/20"
                }`}
                aria-invalid={Boolean(
                  erroresCampos.nombre,
                )}
              />

              {erroresCampos.nombre && (
                <span className="text-xs font-semibold text-error">
                  {erroresCampos.nombre}
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-on-surface">
                Nombre corto
              </span>

              <input
                type="text"
                value={formulario.nombreCorto}
                onChange={(evento) =>
                  actualizarCampo(
                    "nombreCorto",
                    evento.target.value,
                  )
                }
                maxLength={60}
                placeholder="Ej. Infantil M. A"
                className={`h-11 rounded-xl border bg-surface-container-lowest px-4 text-on-surface outline-none placeholder:text-outline focus:ring-2 ${
                  erroresCampos.nombreCorto
                    ? "border-error focus:border-error focus:ring-error/20"
                    : "border-outline-variant focus:border-primary focus:ring-primary/20"
                }`}
              />

              {erroresCampos.nombreCorto && (
                <span className="text-xs font-semibold text-error">
                  {erroresCampos.nombreCorto}
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-on-surface">
                Slug *
              </span>

              <div
                className={`flex h-11 overflow-hidden rounded-xl border bg-surface-container-lowest focus-within:ring-2 ${
                  erroresCampos.slug
                    ? "border-error focus-within:ring-error/20"
                    : "border-outline-variant focus-within:border-primary focus-within:ring-primary/20"
                }`}
              >
                <span className="hidden items-center border-r border-outline-variant bg-surface-container px-3 text-xs text-on-surface-variant sm:flex">
                  /equipo/
                </span>

                <input
                  type="text"
                  value={formulario.slug}
                  onChange={(evento) =>
                    actualizarSlug(
                      evento.target.value,
                    )
                  }
                  maxLength={120}
                  placeholder="infantil-masculino-a"
                  className="min-w-0 flex-1 bg-transparent px-3 text-on-surface outline-none placeholder:text-outline"
                />
              </div>

              {erroresCampos.slug && (
                <span className="text-xs font-semibold text-error">
                  {erroresCampos.slug}
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-on-surface">
                Categoría *
              </span>

              <select
                value={formulario.categoria}
                onChange={(evento) =>
                  actualizarCampo(
                    "categoria",
                    evento.target.value,
                  )
                }
                className={`h-11 rounded-xl border bg-surface-container-lowest px-4 text-on-surface outline-none focus:ring-2 ${
                  erroresCampos.categoria
                    ? "border-error focus:border-error focus:ring-error/20"
                    : "border-outline-variant focus:border-primary focus:ring-primary/20"
                }`}
              >
                <option value="">
                  Seleccionar categoría
                </option>

                {categoriasDisponibles.map(
                  (categoria) => (
                    <option
                      key={categoria}
                      value={categoria}
                    >
                      {categoria}
                    </option>
                  ),
                )}
              </select>

              {erroresCampos.categoria && (
                <span className="text-xs font-semibold text-error">
                  {erroresCampos.categoria}
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-on-surface">
                Género *
              </span>

              <select
                value={formulario.genero}
                onChange={(evento) =>
                  actualizarCampo(
                    "genero",
                    evento.target.value,
                  )
                }
                className={`h-11 rounded-xl border bg-surface-container-lowest px-4 text-on-surface outline-none focus:ring-2 ${
                  erroresCampos.genero
                    ? "border-error focus:border-error focus:ring-error/20"
                    : "border-outline-variant focus:border-primary focus:ring-primary/20"
                }`}
              >
                <option value="">
                  Seleccionar género
                </option>

                {generosDisponibles.map((genero) => (
                  <option key={genero} value={genero}>
                    {genero}
                  </option>
                ))}
              </select>

              {erroresCampos.genero && (
                <span className="text-xs font-semibold text-error">
                  {erroresCampos.genero}
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-bold text-on-surface">
                Nivel o liga
              </span>

              <select
                value={formulario.nivel}
                onChange={(evento) =>
                  actualizarCampo(
                    "nivel",
                    evento.target.value,
                  )
                }
                className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">
                  Sin nivel definido
                </option>

                {nivelesDisponibles.map((nivel) => (
                  <option key={nivel} value={nivel}>
                    {nivel}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-bold text-on-surface">
                Descripción
              </span>

              <textarea
                value={formulario.descripcion}
                onChange={(evento) =>
                  actualizarCampo(
                    "descripcion",
                    evento.target.value,
                  )
                }
                maxLength={1500}
                rows={5}
                placeholder="Información adicional sobre el equipo..."
                className="resize-y rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface outline-none placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20"
              />

              <span className="text-right text-xs text-on-surface-variant">
                {formulario.descripcion.length}/1500
              </span>
            </label>
          </div>
        </section>

        <aside className="flex flex-col gap-6">
          <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary-fixed text-secondary">
                <IconoPanel nombre="integracion" />
              </span>

              <h2 className="font-bold text-on-surface">
                Integraciones
              </h2>
            </div>

            <label className="mt-5 flex flex-col gap-1.5">
              <span className="text-sm font-bold text-on-surface">
                ID del equipo FBIB
              </span>

              <input
                type="text"
                value={formulario.idEquipoFbib}
                onChange={(evento) =>
                  actualizarCampo(
                    "idEquipoFbib",
                    evento.target.value,
                  )
                }
                maxLength={100}
                placeholder="Ej. 10486"
                className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-on-surface outline-none placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20"
              />

              <span className="text-xs text-on-surface-variant">
                Permite obtener partidos, resultados y
                clasificación.
              </span>
            </label>

            <div className="mt-5">
              <Interruptor
                activo={formulario.chatbot}
                alCambiar={(activo) =>
                  actualizarCampo(
                    "chatbot",
                    activo,
                  )
                }
                etiqueta="Asistente virtual"
                descripcion="Mostrar este equipo en las consultas."
              />
            </div>
          </section>

          <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-tertiary-fixed text-tertiary">
                <IconoPanel nombre="sponsors" />
              </span>

              <div>
                <h2 className="font-bold text-on-surface">
                  Patrocinadores
                </h2>

                <p className="text-xs text-on-surface-variant">
                  {
                    formulario.patrocinadoresIds
                      .length
                  }{" "}
                  seleccionados
                </p>
              </div>
            </div>

            <label className="relative mt-4 block">
              <span className="sr-only">
                Buscar patrocinador
              </span>

              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                <IconoPanel nombre="buscar" />
              </span>

              <input
                type="search"
                value={busquedaPatrocinador}
                onChange={(evento) =>
                  setBusquedaPatrocinador(
                    evento.target.value,
                  )
                }
                placeholder="Buscar patrocinador"
                className="h-10 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-3 text-sm text-on-surface outline-none placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
              {patrocinadoresFiltrados.map(
                (patrocinador) => {
                  const seleccionado =
                    formulario.patrocinadoresIds.includes(
                      patrocinador.id,
                    );

                  return (
                    <button
                      key={patrocinador.id}
                      type="button"
                      onClick={() =>
                        alternarPatrocinador(
                          patrocinador.id,
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
                        seleccionado
                          ? "border-primary bg-primary-fixed text-on-primary-container"
                          : "border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-primary hover:bg-primary-fixed/40"
                      }`}
                      aria-pressed={seleccionado}
                    >
                      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container text-sm font-bold text-primary">
                        {patrocinador.nombre
                          .charAt(0)
                          .toUpperCase()}

                        {patrocinador.logo && (
                          <img
                            src={patrocinador.logo}
                            alt=""
                            className="absolute inset-0 h-full w-full bg-white object-contain p-1"
                          />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">
                          {patrocinador.nombre}
                        </span>

                        {patrocinador.nombreCorto && (
                          <span className="block truncate text-xs opacity-70">
                            {
                              patrocinador.nombreCorto
                            }
                          </span>
                        )}
                      </span>

                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                          seleccionado
                            ? "border-primary bg-primary text-on-primary"
                            : "border-outline-variant text-transparent"
                        }`}
                      >
                        <IconoPanel
                          nombre="correcto"
                          className="h-3.5 w-3.5"
                        />
                      </span>
                    </button>
                  );
                },
              )}

              {patrocinadoresFiltrados.length ===
                0 && (
                <p className="rounded-xl bg-surface-container-low p-4 text-center text-sm text-on-surface-variant">
                  No se han encontrado patrocinadores.
                </p>
              )}
            </div>

            <div className="mt-4 border-t border-outline-variant/60 pt-4">
              <Interruptor
                activo={
                  formulario.mostrarSponsor
                }
                alCambiar={(activo) =>
                  actualizarCampo(
                    "mostrarSponsor",
                    activo,
                  )
                }
                etiqueta="Mostrar patrocinadores"
                descripcion={
                  formulario.patrocinadoresIds
                    .length === 0
                    ? "Selecciona algún patrocinador para poder mostrarlo."
                    : "Mostrar sus logotipos públicamente."
                }
                deshabilitado={
                  formulario.patrocinadoresIds
                    .length === 0
                }
              />
            </div>
          </section>
        </aside>
      </div>

      <footer className="sticky bottom-4 z-20 flex flex-col-reverse gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest/95 p-4 shadow-[0_12px_40px_rgba(0,30,50,0.16)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-end">
        <a
          href="/panel/equipos"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          Cancelar
        </a>

        <button
          type="submit"
          disabled={guardando}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary shadow-sm transition-colors hover:bg-on-primary-container disabled:cursor-wait disabled:opacity-60"
        >
          {guardando ? (
            <>
              <span
                className="h-5 w-5 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary"
                aria-hidden="true"
              />

              Creando equipo...
            </>
          ) : (
            <>
              <IconoPanel nombre="guardar" />
              Crear equipo
            </>
          )}
        </button>
      </footer>
    </form>
  );
}