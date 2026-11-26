
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  FUNCIONES_LIQUIDACION,
  CODIGOS_FUNCIONES_LIQUIDACION,
  crearTarifasIniciales,
  eurosACentimos,
  formatearTarifa,
  formatearImporte,
  guardarTarifas,
  obtenerFuncionesSinTarifa,
  type FuncionLiquidacion,
  type TarifasLiquidaciones,
} from "@servicios/backend/designaciones/tarifasLiquidaciones";

// ======================================================
// TIPOS
// ======================================================

interface Props {
  tarifas: TarifasLiquidaciones;

  onTarifasChange: (
    tarifas: TarifasLiquidaciones,
  ) => void;

  disabled?: boolean;
}

type ValoresFormulario = Record<
  FuncionLiquidacion,
  string
>;

type ErroresFormulario = Partial<
  Record<FuncionLiquidacion, string>
>;

interface MensajeFormulario {
  tipo: "success" | "error";
  texto: string;
}

// ======================================================
// UTILIDADES
// ======================================================

function convertirTarifasFormulario(
  tarifas: TarifasLiquidaciones,
): ValoresFormulario {
  return {
    AP: formatearTarifa(tarifas.AP),
    AX: formatearTarifa(tarifas.AX),
    AN: formatearTarifa(tarifas.AN),
    CR: formatearTarifa(tarifas.CR),
    OP: formatearTarifa(tarifas.OP),
    AY: formatearTarifa(tarifas.AY),
  };
}

function existenCambios(
  valores: ValoresFormulario,
  tarifas: TarifasLiquidaciones,
): boolean {
  return CODIGOS_FUNCIONES_LIQUIDACION.some(
    (codigo) => {
      const valor = valores[codigo].trim();

      if (!valor) {
        return tarifas[codigo] !== null;
      }

      const importe = eurosACentimos(valor);

      if (importe === null) {
        return true;
      }

      return importe !== tarifas[codigo];
    },
  );
}

// ======================================================
// ICONOS
// ======================================================

type NombreIcono =
  | "configuracion"
  | "desplegar"
  | "guardar"
  | "correcto"
  | "error"
  | "informacion"
  | "restablecer"
  | "pista"
  | "mesa";

interface PropsIcono {
  nombre: NombreIcono;
  className?: string;
}

function Icono({
  nombre,
  className = "h-5 w-5",
}: PropsIcono) {
  const propiedades = {
    className,
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (nombre) {
    case "configuracion":
      return (
        <svg {...propiedades}>
          <path d="M4 7h16M4 17h16" />
          <circle cx="9" cy="7" r="3" />
          <circle cx="15" cy="17" r="3" />
        </svg>
      );

    case "desplegar":
      return (
        <svg {...propiedades}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );

    case "guardar":
      return (
        <svg {...propiedades}>
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2Z" />
          <path d="M7 3v6h10V3M7 21v-8h10v8" />
        </svg>
      );

    case "correcto":
      return (
        <svg {...propiedades}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      );

    case "error":
      return (
        <svg {...propiedades}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
      );

    case "informacion":
      return (
        <svg {...propiedades}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      );

    case "restablecer":
      return (
        <svg {...propiedades}>
          <path d="M3 12a9 9 0 1 1 9 9" />
          <path d="M3 4v8h8" />
        </svg>
      );

    case "pista":
      return (
        <svg {...propiedades}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3v18" />
          <path d="M5.6 5.6a9 9 0 0 1 0 12.8M18.4 5.6a9 9 0 0 0 0 12.8" />
        </svg>
      );

    case "mesa":
      return (
        <svg {...propiedades}>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 21h8M12 17v4M7 9h4M14 9h3M7 13h10" />
        </svg>
      );

    default:
      return null;
  }
}

// ======================================================
// CAMPO DE TARIFA
// ======================================================

interface PropsCampoTarifa {
  codigo: FuncionLiquidacion;
  nombre: string;

  valor: string;
  error?: string;

  disabled: boolean;

  onChange: (
    codigo: FuncionLiquidacion,
    valor: string,
  ) => void;
}

function CampoTarifa({
  codigo,
  nombre,
  valor,
  error,
  disabled,
  onChange,
}: PropsCampoTarifa) {
  const id = `tarifa-liquidacion-${codigo}`;

  return (
    <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg bg-primary-fixed px-2 text-sm font-extrabold text-on-primary-fixed">
          {codigo}
        </span>

        <div className="min-w-0 flex-1">
          <label
            htmlFor={id}
            className="block text-sm font-bold text-on-surface"
          >
            {nombre}
          </label>

          <p className="mt-0.5 text-xs text-on-surface-variant">
            Precio por actuación
          </p>
        </div>
      </div>

      <div
        className={[
          "mt-4 flex min-h-12 items-center rounded-xl border bg-surface-container-lowest transition-colors",
          error
            ? "border-error"
            : "border-outline-variant focus-within:border-primary",
        ].join(" ")}
      >
        <input
          id={id}
          name={`tarifa-${codigo}`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="Sin configurar"
          maxLength={12}
          value={valor}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? `${id}-error`
              : undefined
          }
          onChange={(evento) =>
            onChange(
              codigo,
              evento.target.value,
            )
          }
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base font-bold text-on-surface outline-none placeholder:text-sm placeholder:font-normal placeholder:text-on-surface-variant disabled:opacity-60"
        />

        <span className="border-l border-outline-variant px-4 text-sm font-bold text-on-surface-variant">
          €
        </span>
      </div>

      {error && (
        <p
          id={`${id}-error`}
          className="mt-2 text-xs font-medium text-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ======================================================
// COMPONENTE PRINCIPAL
// ======================================================

export default function ConfiguracionTarifas({
  tarifas,
  onTarifasChange,
  disabled = false,
}: Props) {
  // ----------------------------------------------------
  // ESTADOS
  // ----------------------------------------------------

  const [expandido, setExpandido] = useState(
    () =>
      obtenerFuncionesSinTarifa(tarifas)
        .length > 0,
  );

  const [valores, setValores] =
    useState<ValoresFormulario>(
      () =>
        convertirTarifasFormulario(
          tarifas,
        ),
    );

  const [errores, setErrores] =
    useState<ErroresFormulario>({});

  const [mensaje, setMensaje] =
    useState<MensajeFormulario | null>(
      null,
    );

  // ----------------------------------------------------
  // SINCRONIZAR TARIFAS
  // ----------------------------------------------------

  useEffect(() => {
    setValores(
      convertirTarifasFormulario(
        tarifas,
      ),
    );

    setErrores({});
  }, [tarifas]);

  // ----------------------------------------------------
  // INFORMACIÓN DERIVADA
  // ----------------------------------------------------

  const funcionesSinTarifa =
    obtenerFuncionesSinTarifa(
      tarifas,
    );

  const totalConfiguradas =
    FUNCIONES_LIQUIDACION.length -
    funcionesSinTarifa.length;

  const todasConfiguradas =
    funcionesSinTarifa.length === 0;

  const hayCambios =
    existenCambios(
      valores,
      tarifas,
    );

  const funcionesPista =
    FUNCIONES_LIQUIDACION.filter(
      (funcion) =>
        funcion.tipo === "pista",
    );

  const funcionesMesa =
    FUNCIONES_LIQUIDACION.filter(
      (funcion) =>
        funcion.tipo === "mesa",
    );

  // ----------------------------------------------------
  // ACTUALIZAR UN CAMPO
  // ----------------------------------------------------

  function cambiarValor(
    codigo: FuncionLiquidacion,
    valor: string,
  ): void {
    setValores(
      (anteriores) => ({
        ...anteriores,
        [codigo]: valor,
      }),
    );

    setErrores(
      (anteriores) => {
        const nuevos = {
          ...anteriores,
        };

        delete nuevos[codigo];

        return nuevos;
      },
    );

    setMensaje(null);
  }

  // ----------------------------------------------------
  // GUARDAR TARIFAS
  // ----------------------------------------------------

  function guardarConfiguracion(
    evento: FormEvent<HTMLFormElement>,
  ): void {
    evento.preventDefault();

    if (disabled) {
      return;
    }

    setMensaje(null);

    const nuevasTarifas =
      crearTarifasIniciales();

    const nuevosErrores:
      ErroresFormulario = {};

    for (
      const codigo of
      CODIGOS_FUNCIONES_LIQUIDACION
    ) {
      const valor =
        valores[codigo].trim();

      // Un campo vacío representa una
      // tarifa todavía sin configurar.

      if (!valor) {
        nuevasTarifas[codigo] = null;

        continue;
      }

      const importe =
        eurosACentimos(valor);

      if (importe === null) {
        nuevosErrores[codigo] =
          "Introduce un importe válido entre 0 y 1.000 €, con un máximo de dos decimales.";

        continue;
      }

      nuevasTarifas[codigo] =
        importe;
    }

    setErrores(nuevosErrores);

    if (
      Object.keys(nuevosErrores).length > 0
    ) {
      setMensaje({
        tipo: "error",

        texto:
          "Revisa los importes indicados antes de guardar.",
      });

      return;
    }

    // Las tarifas se guardan exclusivamente
    // en el navegador.

    const guardado =
      guardarTarifas(nuevasTarifas);

    if (!guardado) {
      setMensaje({
        tipo: "error",

        texto:
          "No se han podido guardar las tarifas en el almacenamiento local del navegador.",
      });

      return;
    }

    setValores(
      convertirTarifasFormulario(
        nuevasTarifas,
      ),
    );

    onTarifasChange(
      nuevasTarifas,
    );

    setMensaje({
      tipo: "success",

      texto:
        "Las tarifas se han guardado correctamente.",
    });
  }

  // ----------------------------------------------------
  // DESCARTAR CAMBIOS
  // ----------------------------------------------------

  function descartarCambios(): void {
    setValores(
      convertirTarifasFormulario(
        tarifas,
      ),
    );

    setErrores({});

    setMensaje(null);
  }

  // ----------------------------------------------------
  // RESTABLECER TODAS LAS TARIFAS
  // ----------------------------------------------------

  function restablecerConfiguracion(): void {
    if (disabled) {
      return;
    }

    const confirmado = window.confirm(
      "¿Seguro que quieres eliminar todas las tarifas configuradas? Tendrás que introducir nuevamente los importes.",
    );

    if (!confirmado) {
      return;
    }

    const nuevasTarifas =
      crearTarifasIniciales();

    if (
      !guardarTarifas(
        nuevasTarifas,
      )
    ) {
      setMensaje({
        tipo: "error",

        texto:
          "No se han podido restablecer las tarifas.",
      });

      return;
    }

    setValores(
      convertirTarifasFormulario(
        nuevasTarifas,
      ),
    );

    setErrores({});

    onTarifasChange(
      nuevasTarifas,
    );

    setMensaje({
      tipo: "success",

      texto:
        "Se han eliminado todas las tarifas configuradas.",
    });
  }

  // ====================================================
  // INTERFAZ
  // ====================================================

  return (
    <section
      aria-label="Configuración de tarifas"
      className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm"
    >
      {/* ENCABEZADO DESPLEGABLE */}

      <button
        type="button"
        aria-expanded={expandido}
        aria-controls="configuracion-tarifas-contenido"
        onClick={() =>
          setExpandido(
            (anterior) => !anterior,
          )
        }
        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-surface-container-low sm:p-6"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-on-primary-fixed">
          <Icono nombre="configuracion" />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold text-on-surface">
            Configuración de tarifas
          </h2>

          <p className="mt-1 text-sm text-on-surface-variant">
            Establece el precio fijo de cada función de arbitraje.
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
                todasConfiguradas
                  ? "bg-primary-fixed text-on-primary-fixed"
                  : "bg-surface-container-high text-on-surface-variant",
              ].join(" ")}
            >
              {todasConfiguradas && (
                <Icono
                  nombre="correcto"
                  className="h-3.5 w-3.5"
                />
              )}

              {totalConfiguradas} de{" "}
              {FUNCIONES_LIQUIDACION.length}{" "}
              tarifas configuradas
            </span>

            {hayCambios && (
              <span className="rounded-full bg-tertiary-container px-2.5 py-1 text-xs font-bold text-on-tertiary-container">
                Cambios sin guardar
              </span>
            )}
          </div>
        </div>

        <span
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant transition-transform",
            expandido
              ? "rotate-180"
              : "",
          ].join(" ")}
        >
          <Icono nombre="desplegar" />
        </span>
      </button>

      {/* RESUMEN DE TARIFAS */}

      {!expandido && (
        <div className="grid grid-cols-2 gap-2 border-t border-outline-variant/60 p-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-6">
          {FUNCIONES_LIQUIDACION.map(
            (funcion) => (
              <div
                key={funcion.codigo}
                title={funcion.nombre}
                className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-surface-container-low px-3 py-2.5"
              >
                <span className="text-xs font-bold text-on-surface-variant">
                  {funcion.codigo}
                </span>

                <span className="whitespace-nowrap text-sm font-extrabold text-on-surface">
                  {tarifas[funcion.codigo] === null
                    ? "—"
                    : formatearImporte(
                        tarifas[funcion.codigo]!,
                      )}
                </span>
              </div>
            ),
          )}
        </div>
      )}

      {/* FORMULARIO */}

      <div
        id="configuracion-tarifas-contenido"
        hidden={!expandido}
      >
        <form
          noValidate
          onSubmit={guardarConfiguracion}
          className="space-y-6 border-t border-outline-variant/60 p-4 sm:p-6"
        >
          {/* FUNCIONES DE PISTA */}

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Icono
                nombre="pista"
                className="h-5 w-5 text-primary"
              />

              <h3 className="text-sm font-extrabold uppercase tracking-wide text-on-surface">
                Árbitros de pista
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {funcionesPista.map(
                (funcion) => (
                  <CampoTarifa
                    key={funcion.codigo}
                    codigo={funcion.codigo}
                    nombre={funcion.nombre}
                    valor={valores[funcion.codigo]}
                    error={errores[funcion.codigo]}
                    disabled={disabled}
                    onChange={cambiarValor}
                  />
                ),
              )}
            </div>
          </section>

          {/* FUNCIONES DE MESA */}

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Icono
                nombre="mesa"
                className="h-5 w-5 text-primary"
              />

              <h3 className="text-sm font-extrabold uppercase tracking-wide text-on-surface">
                Oficiales de mesa
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {funcionesMesa.map(
                (funcion) => (
                  <CampoTarifa
                    key={funcion.codigo}
                    codigo={funcion.codigo}
                    nombre={funcion.nombre}
                    valor={valores[funcion.codigo]}
                    error={errores[funcion.codigo]}
                    disabled={disabled}
                    onChange={cambiarValor}
                  />
                ),
              )}
            </div>
          </section>

          {/* INFORMACIÓN */}

          <div className="flex items-start gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
            <Icono
              nombre="informacion"
              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
            />

            <div className="space-y-2 text-sm leading-relaxed text-on-surface-variant">
              <p className="font-bold text-on-surface">
                Información sobre las tarifas
              </p>

              <p>
                El precio se aplica a cada función
                realmente realizada, independientemente
                de la categoría del partido.
              </p>

              <p>
                Introduce 0 € si una función no debe
                ser remunerada. Un campo vacío indica
                que todavía no tiene una tarifa
                configurada.
              </p>

              <p>
                Las tarifas se guardan en este
                navegador y no se sincronizan con
                otros dispositivos.
              </p>

              <p>
                Los cambios en los precios se
                aplicarán a las liquidaciones que
                se generen a partir de ese momento,
                aunque correspondan a fechas anteriores.
              </p>
            </div>
          </div>

          {/* MENSAJES */}

          {mensaje && (
            <div
              role={
                mensaje.tipo === "error"
                  ? "alert"
                  : "status"
              }
              className={[
                "flex items-start gap-3 rounded-xl border p-4 text-sm font-medium",
                mensaje.tipo === "success"
                  ? "border-primary/30 bg-primary-container text-on-primary-container"
                  : "border-error/30 bg-error-container text-on-error-container",
              ].join(" ")}
            >
              <Icono
                nombre={
                  mensaje.tipo === "success"
                    ? "correcto"
                    : "error"
                }
                className="h-5 w-5 shrink-0"
              />

              <p>{mensaje.texto}</p>
            </div>
          )}

          {/* ACCIONES */}

          <div className="flex flex-col-reverse gap-3 border-t border-outline-variant/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              disabled={
                disabled ||
                totalConfiguradas === 0
              }
              onClick={
                restablecerConfiguracion
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-error transition-colors hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icono
                nombre="restablecer"
                className="h-4 w-4"
              />

              Restablecer tarifas
            </button>

            <div className="flex flex-col gap-2 sm:flex-row">
              {hayCambios && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={descartarCambios}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline-variant px-5 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Descartar cambios
                </button>
              )}

              <button
                type="submit"
                disabled={
                  disabled ||
                  !hayCambios
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icono
                  nombre="guardar"
                  className="h-5 w-5"
                />

                Guardar tarifas
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
