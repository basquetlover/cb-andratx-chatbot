import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";

import type {
  ResultadoCrearCarnetSocio,
  SocioPanel,
} from "@tipos/SocioPanel";

export interface TemporadaDisponibleCarnet {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activa: boolean;
}

interface Propiedades {
  socioId: string;
  temporadas: TemporadaDisponibleCarnet[];
  tiposSocio: string[];
  alCrear: (socio: SocioPanel) => void;
  alCancelar: () => void;
}

interface ErrorCampo {
  campo: string;
  mensaje: string;
}

interface RespuestaCreacion {
  ok: boolean;
  data: ResultadoCrearCarnetSocio | null;
  error: string | null;
  errores?: ErrorCampo[];
}

const claseCampo =
  "h-11 w-full rounded-xl border border-outline-variant " +
  "bg-surface-container-low px-3 text-sm text-on-surface " +
  "outline-none focus:border-primary focus:ring-2 " +
  "focus:ring-primary/20";

const claseEtiqueta =
  "text-sm font-bold text-on-surface";

function obtenerFechaMadrid(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const anio = partes.find(
    (parte) => parte.type === "year",
  )?.value;

  const mes = partes.find(
    (parte) => parte.type === "month",
  )?.value;

  const dia = partes.find(
    (parte) => parte.type === "day",
  )?.value;

  return anio && mes && dia
    ? `${anio}-${mes}-${dia}`
    : "";
}

function formatearFecha(fecha: string): string {
  if (!fecha) {
    return "Se asignará al crear el carnet";
  }

  const fechaConvertida = new Date(
    `${fecha}T12:00:00.000Z`,
  );

  if (!Number.isFinite(fechaConvertida.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fechaConvertida);
}

function obtenerTemporadaInicial(
  temporadas: TemporadaDisponibleCarnet[],
): TemporadaDisponibleCarnet | undefined {
  return (
    temporadas.find((temporada) => temporada.activa) ??
    temporadas[0]
  );
}

function extraerErroresCampo(valor: unknown): ErrorCampo[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.flatMap((elemento) => {
    if (
      typeof elemento !== "object" ||
      elemento === null ||
      typeof elemento.campo !== "string" ||
      typeof elemento.mensaje !== "string"
    ) {
      return [];
    }

    return [
      {
        campo: elemento.campo,
        mensaje: elemento.mensaje,
      },
    ];
  });
}

export default function FormularioNuevoCarnetSocio({
  socioId,
  temporadas,
  tiposSocio,
  alCrear,
  alCancelar,
}: Propiedades) {
  const idFechaAlta = useId();
  const temporadaInicial = obtenerTemporadaInicial(temporadas);

  const [temporadaId, setTemporadaId] = useState(
    temporadaInicial?.id ?? "",
  );

  const [tipoSocio, setTipoSocio] = useState(
    tiposSocio[0] ?? "General",
  );

  const [estado, setEstado] =
    useState<"pendiente" | "activo">("activo");

  const [fechaAlta, setFechaAlta] = useState("");

  const [fechaCaducidad, setFechaCaducidad] = useState(
    temporadaInicial?.fechaFin ?? "",
  );

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [erroresCampo, setErroresCampo] =
    useState<ErrorCampo[]>([]);

  const [resultadoCreacion, setResultadoCreacion] =
    useState<ResultadoCrearCarnetSocio | null>(null);

  const [copiado, setCopiado] =
    useState<string | null>(null);

  const enviandoRef = useRef(false);
  const temporizadorCopiadoRef = useRef<number | null>(null);

  const opcionesTipoSocio =
    tiposSocio.length > 0 ? tiposSocio : ["General"];

  const temporadaSeleccionada = temporadas.find(
    (temporada) => temporada.id === temporadaId,
  );

  useEffect(() => {
    function actualizarFecha() {
      setFechaAlta(obtenerFechaMadrid());
    }

    actualizarFecha();

    const intervalo = window.setInterval(
      actualizarFecha,
      60_000,
    );

    window.addEventListener("focus", actualizarFecha);

    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("focus", actualizarFecha);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (temporizadorCopiadoRef.current !== null) {
        window.clearTimeout(temporizadorCopiadoRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (resultadoCreacion) {
      return;
    }

    if (temporadas.length === 0) {
      setTemporadaId("");
      setFechaCaducidad("");
      return;
    }

    const existeTemporada = temporadas.some(
      (temporada) => temporada.id === temporadaId,
    );

    if (existeTemporada) {
      return;
    }

    const siguienteTemporada =
      obtenerTemporadaInicial(temporadas);

    setTemporadaId(siguienteTemporada?.id ?? "");
    setFechaCaducidad(siguienteTemporada?.fechaFin ?? "");
  }, [temporadas, temporadaId, resultadoCreacion]);

  useEffect(() => {
    if (tiposSocio.length === 0) {
      setTipoSocio("General");
      return;
    }

    if (!tiposSocio.includes(tipoSocio)) {
      setTipoSocio(tiposSocio[0]);
    }
  }, [tiposSocio, tipoSocio]);

  function cambiarTemporada(nuevaTemporadaId: string): void {
    setTemporadaId(nuevaTemporadaId);

    const temporada = temporadas.find(
      (elemento) => elemento.id === nuevaTemporadaId,
    );

    setFechaCaducidad(temporada?.fechaFin ?? "");
    setError(null);
    setErroresCampo([]);
  }

  function obtenerErrorCampo(campo: string): string | null {
    return (
      erroresCampo.find(
        (elemento) =>
          elemento.campo === campo ||
          elemento.campo.endsWith(`.${campo}`),
      )?.mensaje ?? null
    );
  }

  function mostrarErrorCampo(campo: string) {
    const mensaje = obtenerErrorCampo(campo);

    return mensaje ? (
      <span className="text-xs text-error">
        {mensaje}
      </span>
    ) : null;
  }

  async function crearCarnet(
    evento: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    evento.preventDefault();

    if (
      enviandoRef.current ||
      resultadoCreacion ||
      !temporadaId
    ) {
      return;
    }

    enviandoRef.current = true;
    setGuardando(true);
    setError(null);
    setErroresCampo([]);

    const fechaActual = obtenerFechaMadrid();
    setFechaAlta(fechaActual);

    try {
      const respuesta = await fetch(
        `/api/panel/socios/${encodeURIComponent(socioId)}/carnets`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            temporadaId,
            tipoSocio,
            estado,

            // La API actual espera este campo.
            // El servidor lo sustituye por su fecha de creación.
            fechaAlta: fechaActual,

            fechaCaducidad,
          }),
        },
      );

      const contenido =
        (await respuesta.json()) as RespuestaCreacion;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data
      ) {
        setErroresCampo(
          extraerErroresCampo(contenido.errores),
        );

        throw new Error(
          contenido.error ||
            "No se ha podido crear el carnet.",
        );
      }

      /*
       * Se mantienen visibles las credenciales.
       * El editor actual cierra este formulario al recibir
       * alCrear, por lo que se llama al pulsar Cerrar.
       */
      setResultadoCreacion(contenido.data);
    } catch (errorCreacion) {
      setError(
        errorCreacion instanceof Error
          ? errorCreacion.message
          : "No se ha podido crear el carnet.",
      );
    } finally {
      enviandoRef.current = false;
      setGuardando(false);
    }
  }

  function cerrarResultado(): void {
    if (!resultadoCreacion) {
      return;
    }

    alCrear(resultadoCreacion.socio);
    alCancelar();
  }

  async function copiarTexto(
    texto: string,
    identificador: string,
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(texto);

      setError(null);
      setCopiado(identificador);

      if (temporizadorCopiadoRef.current !== null) {
        window.clearTimeout(temporizadorCopiadoRef.current);
      }

      temporizadorCopiadoRef.current = window.setTimeout(
        () => {
          setCopiado(null);
          temporizadorCopiadoRef.current = null;
        },
        1800,
      );
    } catch {
      setError(
        "No se ha podido copiar el valor. Selecciónalo y cópialo manualmente.",
      );
    }
  }

  if (resultadoCreacion) {
    const {
      carnet,
      credenciales,
      emailEnviado,
      socio,
    } = resultadoCreacion;

    const datosAcceso = [
      {
        etiqueta: "Usuario",
        valor: credenciales.email,
        identificador: "email",
      },
      {
        etiqueta: "Número de socio de la temporada",
        valor: String(credenciales.numeroSocio),
        identificador: "numero-socio",
      },
      {
        etiqueta: "Número del nuevo carnet",
        valor: credenciales.numeroCarnet,
        identificador: "numero-carnet",
      },
      {
        etiqueta: "Contraseña del nuevo carnet",
        valor: credenciales.passwordCarnet,
        identificador: "password",
      },
    ];

    const mensajeCorreo = emailEnviado
      ? "El correo con las nuevas credenciales se ha enviado correctamente."
      : !socio.activo
        ? "El socio está desactivado. El correo no se envía mientras permanezca desactivado."
        : carnet.estado === "pendiente"
          ? "El carnet está pendiente. Se intentará enviar el correo cuando se active."
          : "No consta el envío del correo. Conserva estas credenciales para facilitárselas al socio.";

    return (
      <section className="overflow-hidden rounded-2xl border border-success/40 bg-surface-container-lowest shadow-sm">
        <header className="bg-success px-5 py-5 text-on-success">
          <p className="text-xs font-bold uppercase tracking-wider opacity-80">
            Carnet creado
          </p>
          <h3 className="mt-1 text-xl font-bold">
            Nueva temporada añadida
          </h3>
          <p className="mt-2 text-sm leading-6 opacity-90">
            {carnet.temporada.nombre}
          </p>
        </header>

        <div className="grid gap-4 p-5">
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container"
            >
              {error}
            </p>
          )}

          <div className="grid gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-on-surface-variant">
                Fecha de alta
              </p>
              <p className="mt-1 text-sm font-bold text-on-surface">
                {formatearFecha(carnet.fechaAlta)}
              </p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">
                Fecha de caducidad
              </p>
              <p className="mt-1 text-sm font-bold text-on-surface">
                {formatearFecha(carnet.fechaCaducidad)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-primary-fixed p-5 text-on-primary-fixed">
            <dl className="divide-y divide-on-primary-fixed/20">
              {datosAcceso.map((dato) => (
                <div
                  key={dato.identificador}
                  className="py-4 first:pt-0 last:pb-0"
                >
                  <dt className="text-xs font-bold uppercase tracking-wide opacity-70">
                    {dato.etiqueta}
                  </dt>
                  <dd className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="break-all font-mono text-xl font-bold">
                      {dato.valor}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        void copiarTexto(
                          dato.valor,
                          dato.identificador,
                        )
                      }
                      aria-label={`Copiar ${dato.etiqueta.toLowerCase()}`}
                      className="w-fit shrink-0 rounded-lg border border-on-primary-fixed/30 px-3 py-1.5 text-xs font-bold"
                    >
                      {copiado === dato.identificador
                        ? "Copiado"
                        : "Copiar"}
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <p
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
              emailEnviado
                ? "border-success/30 bg-success/10 text-success"
                : "border-outline-variant bg-surface-container-low text-on-surface-variant"
            }`}
          >
            {mensajeCorreo}
          </p>

          <p className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm leading-6 text-on-surface-variant">
            Estas credenciales corresponden únicamente a este
            carnet. Los carnets anteriores se conservan en el
            historial.
          </p>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={cerrarResultado}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-primary-fixed-dim"
            >
              Cerrar y actualizar ficha
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (temporadas.length === 0) {
    return (
      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm">
        <h3 className="font-bold text-on-surface">
          No hay temporadas disponibles
        </h3>
        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
          No hay ninguna temporada disponible en este formulario
          para crear un carnet.
        </p>
        <button
          type="button"
          onClick={alCancelar}
          className="mt-4 rounded-xl border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container"
        >
          Cerrar
        </button>
      </section>
    );
  }

  return (
    <form
      onSubmit={crearCarnet}
      aria-busy={guardando}
      className="overflow-hidden rounded-2xl border border-primary/40 bg-surface-container-lowest shadow-sm"
    >
      <header className="border-b border-outline-variant/60 bg-primary-fixed px-5 py-5 text-on-primary-fixed">
        <h3 className="text-lg font-bold">
          Crear carnet para otra temporada
        </h3>
        <p className="mt-1 text-sm leading-6">
          Se conservará el historial y se generarán un número
          y una contraseña para el nuevo carnet.
        </p>
      </header>

      <fieldset
        disabled={guardando}
        className="grid min-w-0 gap-5 p-5 sm:grid-cols-2 disabled:opacity-75"
      >
        <label className="grid gap-1.5 sm:col-span-2">
          <span className={claseEtiqueta}>Temporada</span>
          <select
            value={temporadaId}
            onChange={(evento) =>
              cambiarTemporada(evento.target.value)
            }
            required
            className={claseCampo}
          >
            {temporadas.map((temporada) => (
              <option
                key={temporada.id}
                value={temporada.id}
              >
                {temporada.nombre}
                {temporada.activa ? " · Activa" : ""}
              </option>
            ))}
          </select>
          {mostrarErrorCampo("temporadaId")}

          {temporadaSeleccionada && (
            <span className="text-xs text-on-surface-variant">
              Del{" "}
              {formatearFecha(
                temporadaSeleccionada.fechaInicio,
              )}{" "}
              al{" "}
              {formatearFecha(
                temporadaSeleccionada.fechaFin,
              )}
              .
            </span>
          )}
        </label>

        <label className="grid gap-1.5">
          <span className={claseEtiqueta}>Tipo de socio</span>
          <select
            value={tipoSocio}
            onChange={(evento) =>
              setTipoSocio(evento.target.value)
            }
            required
            className={claseCampo}
          >
            {opcionesTipoSocio.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
          {mostrarErrorCampo("tipoSocio")}
        </label>

        <label className="grid gap-1.5">
          <span className={claseEtiqueta}>Estado inicial</span>
          <select
            value={estado}
            onChange={(evento) => {
              const nuevoEstado = evento.target.value;

              if (
                nuevoEstado === "activo" ||
                nuevoEstado === "pendiente"
              ) {
                setEstado(nuevoEstado);
              }
            }}
            className={claseCampo}
          >
            <option value="activo">Activo</option>
            <option value="pendiente">Pendiente</option>
          </select>
          {mostrarErrorCampo("estado")}
        </label>

        <div className="grid content-start gap-1.5">
          <span
            id={idFechaAlta}
            className={claseEtiqueta}
          >
            Fecha de alta
          </span>
          <output
            aria-labelledby={idFechaAlta}
            className="flex min-h-11 items-center rounded-xl border border-outline-variant bg-surface-container px-3 py-2 text-sm font-semibold text-on-surface"
          >
            {formatearFecha(fechaAlta)}
          </output>
          <p className="text-xs leading-5 text-on-surface-variant">
            Se asignará automáticamente el día en que crees
            el carnet.
          </p>
          {mostrarErrorCampo("fechaAlta")}
        </div>

        <label className="grid content-start gap-1.5">
          <span className={claseEtiqueta}>
            Fecha de caducidad
          </span>
          <input
            type="date"
            value={fechaCaducidad}
            onChange={(evento) =>
              setFechaCaducidad(evento.target.value)
            }
            max={
              temporadaSeleccionada?.fechaFin || undefined
            }
            required
            className={claseCampo}
          />
          {mostrarErrorCampo("fechaCaducidad")}
        </label>
      </fieldset>

      {error && (
        <div className="px-5 pb-5">
          <p
            role="alert"
            className="rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container"
          >
            {error}
          </p>
        </div>
      )}

      <footer className="flex flex-col gap-3 border-t border-outline-variant/60 bg-surface-container-low px-5 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={alCancelar}
          disabled={guardando}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={guardando || !temporadaId}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-primary-fixed-dim disabled:opacity-50"
        >
          {guardando ? "Creando carnet..." : "Crear carnet"}
        </button>
      </footer>
    </form>
  );
}