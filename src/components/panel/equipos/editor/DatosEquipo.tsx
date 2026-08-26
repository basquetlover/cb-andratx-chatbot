


import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import SelectorImagenEquipo, {
  type CambioImagenEquipo,
} from "@components/panel/equipos/editor/SelectorImagenEquipo";

import type { DatosGeneralesEquipoDetalle } from "@tipos/EquipoDetallePanel";

interface Propiedades {
  equipoId: string;
  datosIniciales: DatosGeneralesEquipoDetalle;
  alActualizar: (
    datos: DatosGeneralesEquipoDetalle,
  ) => void;
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
}

interface ErrorCampo {
  campo: string;
  mensaje: string;
}

interface RespuestaActualizacion {
  ok: boolean;
  data: {
    datosGenerales: DatosGeneralesEquipoDetalle;
  } | null;
  error: string | null;
  errores: ErrorCampo[];
}

interface RespuestaImagen {
  ok: boolean;
  data?: {
    imagen: {
      url: string;
      ruta: string;
      ancho: number;
      alto: number;
      tamaño: number;
    } | null;
  };
  error?: string;
  errores?: ErrorCampo[];
}

interface OpcionSelector {
  valor: string;
  etiqueta: string;
}

const CATEGORIAS_PREDETERMINADAS = [
  { valor: "escoleta", etiqueta: "Escoleta" },
  { valor: "iniciación", etiqueta: "Iniciación" },
  { valor: "premini", etiqueta: "Premini" },
  { valor: "mini", etiqueta: "Mini" },
  { valor: "infantil", etiqueta: "Infantil" },
  { valor: "cadete", etiqueta: "Cadete" },
  { valor: "junior", etiqueta: "Junior" },
  { valor: "senior", etiqueta: "Senior" },
  { valor: "+40", etiqueta: "+40" },
] satisfies OpcionSelector[];

const GENEROS_PREDETERMINADOS = [
  { valor: "masculino", etiqueta: "Masculino" },
  { valor: "femenino", etiqueta: "Femenino" },
  { valor: "mixto", etiqueta: "Mixto" },
] satisfies OpcionSelector[];

const NIVELES_PREDETERMINADOS = [
  { valor: "formación", etiqueta: "Formación" },
  { valor: "insular", etiqueta: "Insular" },
  { valor: "balear", etiqueta: "Balear" },
  { valor: "preferente", etiqueta: "Preferente" },
  { valor: "autonómico", etiqueta: "Autonómico" },
  { valor: "nacional", etiqueta: "Nacional" },
] satisfies OpcionSelector[];

function textoSeguro(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function normalizarTexto(texto: unknown): string {
  return textoSeguro(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizarSlug(texto: unknown): string {
  return normalizarTexto(texto)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizarValorSelector(
  valor: unknown,
): string {
  return textoSeguro(valor).trim().toLowerCase();
}

function crearEtiquetaOpcion(valor: string): string {
  return valor
    .split(" ")
    .map((parte) =>
      parte
        ? `${parte.charAt(0).toUpperCase()}${parte.slice(1)}`
        : parte,
    )
    .join(" ");
}

function combinarOpciones(
  predeterminadas: OpcionSelector[],
  valorActual: unknown,
): OpcionSelector[] {
  const opciones = new Map<
    string,
    OpcionSelector
  >();

  predeterminadas.forEach((opcion) => {
    opciones.set(
      normalizarTexto(opcion.valor),
      opcion,
    );
  });

  const valorLimpio =
    normalizarValorSelector(valorActual);

  if (valorLimpio) {
    const clave = normalizarTexto(valorLimpio);

    if (!opciones.has(clave)) {
      opciones.set(clave, {
        valor: valorLimpio,
        etiqueta: crearEtiquetaOpcion(valorLimpio),
      });
    }
  }

  return Array.from(opciones.values());
}

function crearEstadoInicial(
  datos: DatosGeneralesEquipoDetalle,
): EstadoFormulario {
  return {
    nombre: textoSeguro(datos.nombre),
    nombreCorto: textoSeguro(
      datos.nombreCorto,
    ),
    slug: textoSeguro(datos.slug),
    categoria: normalizarValorSelector(
      datos.categoria,
    ),
    genero: normalizarValorSelector(datos.genero),
    nivel: normalizarValorSelector(datos.nivel),
    descripcion: textoSeguro(
      datos.descripcion,
    ),
    activo: Boolean(datos.activo),
  };
}

function normalizarFormulario(
  formulario: EstadoFormulario,
) {
  return {
    nombre: formulario.nombre.trim(),
    nombreCorto: formulario.nombreCorto.trim(),
    slug: normalizarSlug(formulario.slug),
    categoria: normalizarValorSelector(
      formulario.categoria,
    ),
    genero: normalizarValorSelector(
      formulario.genero,
    ),
    nivel: normalizarValorSelector(formulario.nivel),
    descripcion: formulario.descripcion.trim(),
    activo: formulario.activo,
  };
}

export default function DatosEquipo({
  equipoId,
  datosIniciales,
  alActualizar,
}: Propiedades) {
  const [formulario, setFormulario] =
    useState<EstadoFormulario>(() =>
      crearEstadoInicial(datosIniciales),
    );

  const [cambioImagen, setCambioImagen] =
    useState<CambioImagenEquipo>({
      tipo: "sin-cambios",
    });

  const [errores, setErrores] = useState<
    Record<string, string>
  >({});

  const [errorGeneral, setErrorGeneral] = useState<
    string | null
  >(null);

  const [guardando, setGuardando] =
    useState(false);

  const [
    guardadoCorrectamente,
    setGuardadoCorrectamente,
  ] = useState(false);

  useEffect(() => {
    setFormulario(
      crearEstadoInicial(datosIniciales),
    );
  }, [datosIniciales]);

  const categoriasDisponibles = useMemo(
    () =>
      combinarOpciones(
        CATEGORIAS_PREDETERMINADAS,
        formulario.categoria,
      ),
    [formulario.categoria],
  );

  const generosDisponibles = useMemo(
    () =>
      combinarOpciones(
        GENEROS_PREDETERMINADOS,
        formulario.genero,
      ),
    [formulario.genero],
  );

  const nivelesDisponibles = useMemo(
    () =>
      combinarOpciones(
        NIVELES_PREDETERMINADOS,
        formulario.nivel,
      ),
    [formulario.nivel],
  );

  const datosModificados = useMemo(() => {
    const formularioActual =
      normalizarFormulario(formulario);

    const datosOriginales = {
      nombre: textoSeguro(
        datosIniciales.nombre,
      ).trim(),
      nombreCorto: textoSeguro(
        datosIniciales.nombreCorto,
      ).trim(),
      slug: normalizarSlug(datosIniciales.slug),
      categoria: normalizarValorSelector(
        datosIniciales.categoria,
      ),
      genero: normalizarValorSelector(
        datosIniciales.genero,
      ),
      nivel: normalizarValorSelector(
        datosIniciales.nivel,
      ),
      descripcion: textoSeguro(
        datosIniciales.descripcion,
      ).trim(),
      activo: Boolean(datosIniciales.activo),
    };

    return (
      JSON.stringify(formularioActual) !==
        JSON.stringify(datosOriginales) ||
      cambioImagen.tipo !== "sin-cambios"
    );
  }, [
    formulario,
    datosIniciales,
    cambioImagen,
  ]);

  const actualizarCampo = <
    Campo extends keyof EstadoFormulario,
  >(
    campo: Campo,
    valor: EstadoFormulario[Campo],
  ) => {
    setFormulario((formularioActual) => ({
      ...formularioActual,
      [campo]: valor,
    }));

    setErrores((erroresActuales) => {
      if (!erroresActuales[campo]) {
        return erroresActuales;
      }

      const siguientesErrores = {
        ...erroresActuales,
      };

      delete siguientesErrores[campo];

      return siguientesErrores;
    });

    setErrorGeneral(null);
    setGuardadoCorrectamente(false);
  };

  const actualizarErrorImagen = (
    mensaje: string | null,
  ) => {
    setErrores((erroresActuales) => {
      const siguientesErrores = {
        ...erroresActuales,
      };

      if (mensaje) {
        siguientesErrores.imagen = mensaje;
      } else {
        delete siguientesErrores.imagen;
      }

      return siguientesErrores;
    });

    setErrorGeneral(null);
    setGuardadoCorrectamente(false);
  };

  const clasesCampo = (
    campo: keyof EstadoFormulario,
  ) => {
    const tieneError = Boolean(errores[campo]);

    return `h-11 w-full rounded-xl border bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors placeholder:text-outline disabled:cursor-not-allowed disabled:opacity-60 ${
      tieneError
        ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
        : "border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
    }`;
  };

  const validarFormulario = (): boolean => {
    const nuevosErrores: Record<string, string> =
      {};

    if (!formulario.nombre.trim()) {
      nuevosErrores.nombre =
        "Introduce el nombre del equipo.";
    }

    if (!normalizarSlug(formulario.slug)) {
      nuevosErrores.slug =
        "Introduce un slug válido.";
    }

    if (!formulario.categoria.trim()) {
      nuevosErrores.categoria =
        "Selecciona la categoría.";
    }

    if (!formulario.genero.trim()) {
      nuevosErrores.genero =
        "Selecciona el género.";
    }

    if (formulario.nombre.trim().length > 120) {
      nuevosErrores.nombre =
        "El nombre no puede superar los 120 caracteres.";
    }

    if (
      formulario.nombreCorto.trim().length > 60
    ) {
      nuevosErrores.nombreCorto =
        "El nombre corto no puede superar los 60 caracteres.";
    }

    if (formulario.slug.length > 120) {
      nuevosErrores.slug =
        "El slug no puede superar los 120 caracteres.";
    }

    if (
      formulario.descripcion.length > 1500
    ) {
      nuevosErrores.descripcion =
        "La descripción no puede superar los 1500 caracteres.";
    }

    if (errores.imagen) {
      nuevosErrores.imagen = errores.imagen;
    }

    setErrores(nuevosErrores);

    return (
      Object.keys(nuevosErrores).length === 0
    );
  };

  const cancelarCambios = () => {
    setFormulario(
      crearEstadoInicial(datosIniciales),
    );

    setCambioImagen({
      tipo: "sin-cambios",
    });

    setErrores({});
    setErrorGeneral(null);
    setGuardadoCorrectamente(false);
  };

  const actualizarImagen = async (): Promise<
    string | null
  > => {
    if (cambioImagen.tipo === "sin-cambios") {
      return datosIniciales.imagen;
    }

    if (cambioImagen.tipo === "eliminar") {
      const respuesta = await fetch(
        `/api/panel/equipos/${encodeURIComponent(equipoId)}/imagen`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const contenido =
        (await respuesta.json()) as RespuestaImagen;

      if (!respuesta.ok || !contenido.ok) {
        throw new Error(
          contenido.error ??
            "No se ha podido eliminar la imagen.",
        );
      }

      return null;
    }

    const datosImagen = new FormData();

    datosImagen.append(
      "imagen",
      cambioImagen.archivo,
    );

    const respuesta = await fetch(
      `/api/panel/equipos/${encodeURIComponent(equipoId)}/imagen`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
        body: datosImagen,
      },
    );

    const contenido =
      (await respuesta.json()) as RespuestaImagen;

    if (
      !respuesta.ok ||
      !contenido.ok ||
      !contenido.data?.imagen?.url
    ) {
      const errorImagen =
        contenido.errores?.find(
          (error) => error.campo === "imagen",
        )?.mensaje;

      throw new Error(
        errorImagen ??
          contenido.error ??
          "No se ha podido actualizar la imagen.",
      );
    }

    return contenido.data.imagen.url;
  };

  const guardarCambios = async (
    evento: FormEvent<HTMLFormElement>,
  ) => {
    evento.preventDefault();

    if (
      !datosModificados ||
      guardando ||
      !validarFormulario()
    ) {
      return;
    }

    let datosGuardados:
      | DatosGeneralesEquipoDetalle
      | null = null;

    try {
      setGuardando(true);
      setErrorGeneral(null);
      setGuardadoCorrectamente(false);

      const respuesta = await fetch(
        `/api/panel/equipos/${encodeURIComponent(equipoId)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            seccion: "datos-generales",
            datos: {
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
            },
          }),
        },
      );

      const contenido =
        (await respuesta.json()) as RespuestaActualizacion;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data?.datosGenerales
      ) {
        const erroresServidor: Record<
          string,
          string
        > = {};

        contenido.errores?.forEach((error) => {
          erroresServidor[error.campo] =
            error.mensaje;
        });

        setErrores(erroresServidor);

        throw new Error(
          contenido.error ??
            "No se han podido guardar los cambios.",
        );
      }

      datosGuardados =
        contenido.data.datosGenerales;

      const imagenActualizada =
        await actualizarImagen();

      const datosCompletos: DatosGeneralesEquipoDetalle =
        {
          ...datosGuardados,
          imagen: imagenActualizada,
        };

      alActualizar(datosCompletos);

      setFormulario(
        crearEstadoInicial(datosCompletos),
      );

      setCambioImagen({
        tipo: "sin-cambios",
      });

      setErrores({});
      setGuardadoCorrectamente(true);
    } catch (error) {
      console.error(
        "Error actualizando los datos del equipo:",
        error,
      );

      const mensaje =
        error instanceof Error
          ? error.message
          : "No se han podido guardar los cambios.";

      if (datosGuardados) {
        alActualizar(datosGuardados);

        setFormulario(
          crearEstadoInicial(datosGuardados),
        );

        setErrorGeneral(
          `${mensaje} Los demás datos del equipo sí se han guardado.`,
        );
      } else {
        setErrorGeneral(mensaje);
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form
      onSubmit={guardarCambios}
      className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm"
      noValidate
    >
      <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-bold text-on-surface">
          Datos del equipo
        </h2>

        <p className="mt-1 text-sm text-on-surface-variant">
          Modifica la información pública y el estado del
          equipo.
        </p>
      </div>

      <div className="p-5 sm:p-6">
        {errorGeneral && (
          <div
            className="mb-5 rounded-xl border border-error/40 bg-error-container px-4 py-3 text-sm text-on-error-container"
            role="alert"
          >
            <p className="font-bold">
              No se han podido guardar todos los cambios
            </p>

            <p className="mt-1">{errorGeneral}</p>
          </div>
        )}

        {guardadoCorrectamente && (
          <div
            className="mb-5 flex items-center gap-3 rounded-xl border border-success/30 bg-success-container px-4 py-3 text-sm font-semibold text-on-success-container"
            role="status"
          >
            <span
              className="inline-block h-5 w-5 shrink-0 bg-success mask-center mask-contain mask-no-repeat"
              style={{
                maskImage:
                  "url('/iconos/panel/correcto.svg')",
                WebkitMaskImage:
                  "url('/iconos/panel/correcto.svg')",
              }}
              aria-hidden="true"
            />

            Los datos del equipo se han actualizado
            correctamente.
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">
              Temporada
            </span>

            <input
              type="text"
              value={datosIniciales.temporada.nombre}
              disabled
              className="h-11 w-full cursor-not-allowed rounded-xl border border-outline-variant bg-surface-container px-3 text-on-surface-variant"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">
              Estado
            </span>

            <div className="grid h-11 grid-cols-2 rounded-xl border border-outline-variant bg-surface-container p-1">
              <button
                type="button"
                onClick={() =>
                  actualizarCampo("activo", true)
                }
                disabled={guardando}
                className={`rounded-lg px-2 text-sm font-bold transition-colors sm:px-3 ${
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
                disabled={guardando}
                className={`rounded-lg px-2 text-sm font-bold transition-colors sm:px-3 ${
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
            <span className="text-sm font-semibold text-on-surface">
              Nombre del equipo{" "}
              <span className="text-error">*</span>
            </span>

            <input
              type="text"
              value={formulario.nombre}
              onChange={(evento) =>
                actualizarCampo(
                  "nombre",
                  evento.target.value,
                )
              }
              disabled={guardando}
              maxLength={120}
              autoComplete="off"
              className={clasesCampo("nombre")}
            />

            {errores.nombre && (
              <span className="text-xs font-medium text-error">
                {errores.nombre}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">
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
              disabled={guardando}
              maxLength={60}
              autoComplete="off"
              className={clasesCampo("nombreCorto")}
            />

            {errores.nombreCorto && (
              <span className="text-xs font-medium text-error">
                {errores.nombreCorto}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">
              Slug <span className="text-error">*</span>
            </span>

            <input
              type="text"
              value={formulario.slug}
              onChange={(evento) =>
                actualizarCampo(
                  "slug",
                  normalizarSlug(evento.target.value),
                )
              }
              disabled={guardando}
              maxLength={120}
              autoComplete="off"
              className={clasesCampo("slug")}
            />

            {errores.slug && (
              <span className="text-xs font-medium text-error">
                {errores.slug}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">
              Categoría{" "}
              <span className="text-error">*</span>
            </span>

            <select
              value={formulario.categoria}
              onChange={(evento) =>
                actualizarCampo(
                  "categoria",
                  evento.target.value,
                )
              }
              disabled={guardando}
              className={clasesCampo("categoria")}
            >
              <option value="">
                Seleccionar categoría
              </option>

              {categoriasDisponibles.map(
                (categoria) => (
                  <option
                    key={categoria.valor}
                    value={categoria.valor}
                  >
                    {categoria.etiqueta}
                  </option>
                ),
              )}
            </select>

            {errores.categoria && (
              <span className="text-xs font-medium text-error">
                {errores.categoria}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">
              Género{" "}
              <span className="text-error">*</span>
            </span>

            <select
              value={formulario.genero}
              onChange={(evento) =>
                actualizarCampo(
                  "genero",
                  evento.target.value,
                )
              }
              disabled={guardando}
              className={clasesCampo("genero")}
            >
              <option value="">
                Seleccionar género
              </option>

              {generosDisponibles.map((genero) => (
                <option
                  key={genero.valor}
                  value={genero.valor}
                >
                  {genero.etiqueta}
                </option>
              ))}
            </select>

            {errores.genero && (
              <span className="text-xs font-medium text-error">
                {errores.genero}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-semibold text-on-surface">
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
              disabled={guardando}
              className={clasesCampo("nivel")}
            >
              <option value="">
                Sin nivel definido
              </option>

              {nivelesDisponibles.map((nivel) => (
                <option
                  key={nivel.valor}
                  value={nivel.valor}
                >
                  {nivel.etiqueta}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-semibold text-on-surface">
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
              disabled={guardando}
              maxLength={1500}
              rows={5}
              className={`w-full resize-y rounded-xl border bg-surface-container-lowest px-3 py-3 text-on-surface outline-none transition-colors placeholder:text-outline disabled:cursor-not-allowed disabled:opacity-60 ${
                errores.descripcion
                  ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                  : "border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
              }`}
            />

            <span className="text-right text-xs text-on-surface-variant">
              {formulario.descripcion.length}/1500
            </span>

            {errores.descripcion && (
              <span className="text-xs font-medium text-error">
                {errores.descripcion}
              </span>
            )}
          </label>

          <div className="sm:col-span-2">
            <SelectorImagenEquipo
              imagenActual={datosIniciales.imagen}
              cambio={cambioImagen}
              alCambiar={(cambio) => {
                setCambioImagen(cambio);
                setErrorGeneral(null);
                setGuardadoCorrectamente(false);
              }}
              alCambiarError={
                actualizarErrorImagen
              }
              error={errores.imagen}
              deshabilitado={guardando}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-outline-variant/60 bg-surface-container-low px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <button
          type="button"
          onClick={cancelarCambios}
          disabled={!datosModificados || guardando}
          className="min-h-11 rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          Descartar cambios
        </button>

        <button
          type="submit"
          disabled={!datosModificados || guardando}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-40"
        >
          {guardando && (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary"
              aria-hidden="true"
            />
          )}

          {guardando
            ? "Guardando..."
            : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}