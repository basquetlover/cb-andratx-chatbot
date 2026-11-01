
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";

import FamiliaresFormularioAlta, {
  validarNombresFamiliares,
  vincularFamiliaresAlNuevoCarnet,
} from "./FamiliaresFormularioAlta";

import type {
  CarnetTemporadaSocio,
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

interface RespuestaConsultaSocio {
  ok: boolean;
  data: {
    socio: SocioPanel;
  } | null;
  error: string | null;
}

type EstadoVinculacion =
  | "pendiente"
  | "guardando"
  | "completo"
  | "error";

const claseCampo =
  "min-h-11 w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

const claseEtiqueta =
  "text-sm font-bold text-on-surface";

function esFamiliar(tipo: string): boolean {
  return tipo.trim().toLowerCase() === "familiar";
}

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
    return fecha;
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

function extraerErrores(
  valor: unknown,
): ErrorCampo[] {
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
  const temporadaInicial =
    obtenerTemporadaInicial(temporadas);

  const [temporadaId, setTemporadaId] = useState(
    temporadaInicial?.id ?? "",
  );

  const [tipoSocio, setTipoSocio] = useState(
    tiposSocio[0] ?? "General",
  );

  const [estado, setEstado] =
    useState<"pendiente" | "activo">("activo");

  const [fechaAlta, setFechaAlta] =
    useState("");

  const [fechaCaducidad, setFechaCaducidad] =
    useState(temporadaInicial?.fechaFin ?? "");

  const [nombresFamiliares, setNombresFamiliares] =
    useState<string[]>([]);

  const [carnetsOrigen, setCarnetsOrigen] =
    useState<CarnetTemporadaSocio[]>([]);

  const [carnetOrigenId, setCarnetOrigenId] =
    useState("");

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [erroresCampo, setErroresCampo] =
    useState<ErrorCampo[]>([]);

  const [resultadoCreacion, setResultadoCreacion] =
    useState<ResultadoCrearCarnetSocio | null>(null);

  const [estadoVinculacion, setEstadoVinculacion] =
    useState<EstadoVinculacion>("pendiente");

  const [errorFamiliares, setErrorFamiliares] =
    useState<string | null>(null);

  const [copiado, setCopiado] =
    useState<string | null>(null);

  const enviandoRef = useRef(false);

  const opcionesTipoSocio =
    tiposSocio.length > 0
      ? tiposSocio
      : ["General"];

  const temporadaSeleccionada =
    temporadas.find(
      (temporada) => temporada.id === temporadaId,
    );

  const carnetFamiliar = esFamiliar(tipoSocio);

  const errorNombres = carnetFamiliar
    ? validarNombresFamiliares(nombresFamiliares)
    : null;

  const requiereVincular =
    carnetFamiliar &&
    (
      nombresFamiliares.some(
        (nombre) => nombre.trim().length > 0,
      ) ||
      Boolean(carnetOrigenId)
    );

  useEffect(() => {
    const actualizar = () =>
      setFechaAlta(obtenerFechaMadrid());

    actualizar();

    const intervalo = window.setInterval(
      actualizar,
      60_000,
    );

    window.addEventListener("focus", actualizar);

    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("focus", actualizar);
    };
  }, []);

  // Consultar carnets familiares anteriores del socio.
  useEffect(() => {
    const controlador = new AbortController();

    async function cargarCarnetsOrigen() {
      try {
        const respuesta = await fetch(
          `/api/panel/socios/${encodeURIComponent(
            socioId,
          )}`,
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controlador.signal,
            headers: {
              Accept: "application/json",
            },
          },
        );

        const contenido =
          (await respuesta.json()) as
            RespuestaConsultaSocio;

        if (
          !respuesta.ok ||
          !contenido.ok ||
          !contenido.data?.socio
        ) {
          return;
        }

        if (!controlador.signal.aborted) {
          setCarnetsOrigen(
            contenido.data.socio.carnets.filter(
              (carnet) =>
                esFamiliar(carnet.tipoSocio ?? ""),
            ),
          );
        }
      } catch {
        // La creación manual de familiares sigue disponible.
      }
    }

    void cargarCarnetsOrigen();

    return () => controlador.abort();
  }, [socioId]);

  useEffect(() => {
    if (resultadoCreacion || temporadas.length === 0) {
      return;
    }

    if (
      !temporadas.some(
        (temporada) => temporada.id === temporadaId,
      )
    ) {
      const siguiente =
        obtenerTemporadaInicial(temporadas);

      setTemporadaId(siguiente?.id ?? "");
      setFechaCaducidad(siguiente?.fechaFin ?? "");
    }
  }, [temporadas, temporadaId, resultadoCreacion]);

  useEffect(() => {
    if (
      tiposSocio.length > 0 &&
      !tiposSocio.includes(tipoSocio)
    ) {
      setTipoSocio(tiposSocio[0]);
    }
  }, [tiposSocio, tipoSocio]);

  function cambiarTemporada(id: string) {
    setTemporadaId(id);

    const temporada = temporadas.find(
      (elemento) => elemento.id === id,
    );

    setFechaCaducidad(temporada?.fechaFin ?? "");
    setError(null);
    setErroresCampo([]);
  }

  function mostrarErrorCampo(campo: string) {
    const mensaje = erroresCampo.find(
      (elemento) =>
        elemento.campo === campo ||
        elemento.campo.endsWith(`.${campo}`),
    )?.mensaje;

    return mensaje ? (
      <span className="text-xs text-error">
        {mensaje}
      </span>
    ) : null;
  }

  async function guardarFamiliares(
    resultado: ResultadoCrearCarnetSocio,
  ): Promise<void> {
    setEstadoVinculacion("guardando");
    setErrorFamiliares(null);

    try {
      await vincularFamiliaresAlNuevoCarnet({
        socioId: resultado.socio.id,
        carnetId: resultado.carnet.id,
        nombres: nombresFamiliares,
        carnetOrigenId: carnetOrigenId || null,
      });

      setEstadoVinculacion("completo");
    } catch (capturado) {
      setEstadoVinculacion("error");

      setErrorFamiliares(
        capturado instanceof Error
          ? capturado.message
          : "No se han podido guardar los familiares.",
      );
    }
  }

  async function crearCarnet(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (
      enviandoRef.current ||
      resultadoCreacion ||
      !temporadaId
    ) {
      return;
    }

    if (errorNombres) {
      setError(errorNombres);
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
        `/api/panel/socios/${encodeURIComponent(
          socioId,
        )}/carnets`,
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
        !contenido.data?.carnet ||
        !contenido.data?.socio
      ) {
        setErroresCampo(
          extraerErrores(contenido.errores),
        );

        throw new Error(
          contenido.error ||
            "No se ha podido crear el carnet.",
        );
      }

      // Guardar el resultado antes de vincular nombres:
      // nunca repetiremos la creación del carnet.
      setResultadoCreacion(contenido.data);

      if (requiereVincular) {
        await guardarFamiliares(contenido.data);
      } else {
        setEstadoVinculacion("completo");
      }
    } catch (capturado) {
      setError(
        capturado instanceof Error
          ? capturado.message
          : "No se ha podido crear el carnet.",
      );
    } finally {
      enviandoRef.current = false;
      setGuardando(false);
    }
  }

  async function copiarTexto(
    texto: string,
  ) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(texto);
    } catch {
      setError(
        "No se ha podido copiar el dato.",
      );
    }
  }

  function cerrarResultado() {
    if (!resultadoCreacion) {
      return;
    }

    alCrear(resultadoCreacion.socio);
    alCancelar();
  }

  if (resultadoCreacion) {
    const {
      carnet,
      credenciales,
      emailEnviado,
    } = resultadoCreacion;

    const datos = [
      ["Usuario", credenciales.email],
      ["Número de socio", String(credenciales.numeroSocio)],
      ["Número de carnet", credenciales.numeroCarnet],
      ["Contraseña", credenciales.passwordCarnet],
    ];

    return (
      <section className="overflow-hidden rounded-2xl border border-success/40 bg-surface-container-lowest shadow-sm">
        <header className="bg-success p-5 text-on-success sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wide">
            Carnet creado
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Nueva temporada añadida
          </h3>

          <p className="mt-2 text-sm">
            {carnet.temporada.nombre}
          </p>
        </header>

        <div className="grid gap-5 p-5 sm:p-6">
          <div className="grid gap-3 rounded-xl bg-surface-container-low p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-on-surface-variant">
                Fecha de alta
              </p>

              <p className="mt-1 font-bold text-on-surface">
                {formatearFecha(carnet.fechaAlta)}
              </p>
            </div>

            <div>
              <p className="text-xs text-on-surface-variant">
                Fecha de caducidad
              </p>

              <p className="mt-1 font-bold text-on-surface">
                {formatearFecha(carnet.fechaCaducidad)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary-fixed p-4 text-on-primary-fixed">
            {datos.map(([etiqueta, valor]) => (
              <div
                key={etiqueta}
                className="flex flex-col justify-between gap-2 border-b border-on-primary-fixed/15 py-3 last:border-0 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-xs font-bold uppercase opacity-70">
                    {etiqueta}
                  </p>

                  <p className="mt-1 break-all font-mono text-lg font-bold">
                    {valor}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void copiarTexto(valor)}
                  className="w-fit rounded-lg border border-on-primary-fixed/30 px-3 py-2 text-xs font-bold"
                >
                  {copiado === valor
                    ? "Copiado"
                    : "Copiar"}
                </button>
              </div>
            ))}
          </div>

          <p className="text-sm text-on-surface-variant">
            {emailEnviado
              ? "Se ha enviado el correo de bienvenida."
              : "No consta el envío del correo. Conserva las credenciales para facilitárselas al socio."}
          </p>

          {requiereVincular && (
            <div
              role="status"
              className={`rounded-xl border p-4 text-sm ${
                estadoVinculacion === "completo"
                  ? "border-success/30 bg-success-container text-on-success-container"
                  : estadoVinculacion === "error"
                    ? "border-error/30 bg-error-container text-on-error-container"
                    : "border-outline-variant bg-surface-container-low text-on-surface"
              }`}
            >
              <p className="font-bold">
                {estadoVinculacion === "completo"
                  ? "Familiares vinculados correctamente"
                  : estadoVinculacion === "error"
                    ? "El carnet existe, pero hay familiares pendientes"
                    : "Registrando familiares..."}
              </p>

              {errorFamiliares && (
                <p className="mt-2">
                  {errorFamiliares}
                </p>
              )}

              {estadoVinculacion === "error" && (
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() =>
                    void guardarFamiliares(
                      resultadoCreacion,
                    )
                  }
                  className="mt-3 rounded-lg border border-current px-3 py-2 text-xs font-bold disabled:opacity-50"
                >
                  Reintentar guardar familiares
                </button>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={cerrarResultado}
              disabled={estadoVinculacion === "guardando"}
              className="min-h-11 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary disabled:opacity-50"
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
      <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
        <p className="font-bold">
          No hay temporadas disponibles
        </p>

        <button
          type="button"
          onClick={alCancelar}
          className="mt-4 rounded-xl border border-outline-variant px-4 py-2 text-sm"
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
      <header className="border-b border-outline-variant/60 bg-primary-fixed p-5 text-on-primary-fixed">
        <h3 className="text-lg font-bold">
          Crear carnet para otra temporada
        </h3>

        <p className="mt-1 text-sm leading-6">
          El carnet tendrá su propio número,
          contraseña y fecha de alta.
        </p>
      </header>

      <fieldset
        disabled={guardando}
        className="grid min-w-0 gap-5 p-5 sm:grid-cols-2 sm:p-6"
      >
        <label className="grid gap-1.5 sm:col-span-2">
          <span className={claseEtiqueta}>
            Temporada
          </span>

          <select
            value={temporadaId}
            onChange={(evento) =>
              cambiarTemporada(
                evento.target.value,
              )
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
            </span>
          )}
        </label>

        <label className="grid gap-1.5">
          <span className={claseEtiqueta}>
            Tipo de socio
          </span>

          <select
            value={tipoSocio}
            onChange={(evento) =>
              setTipoSocio(
                evento.target.value,
              )
            }
            required
            className={claseCampo}
          >
            {opcionesTipoSocio.map((tipo) => (
              <option
                key={tipo}
                value={tipo}
              >
                {tipo}
              </option>
            ))}
          </select>
          {mostrarErrorCampo("tipoSocio")}
        </label>

        <label className="grid gap-1.5">
          <span className={claseEtiqueta}>
            Estado inicial
          </span>

          <select
            value={estado}
            onChange={(evento) => {
              const valor =
                evento.target.value;

              if (
                valor === "activo" ||
                valor === "pendiente"
              ) {
                setEstado(valor);
              }
            }}
            className={claseCampo}
          >
            <option value="activo">
              Activo
            </option>
            <option value="pendiente">
              Pendiente
            </option>
          </select>
        </label>

        <div className="grid gap-1.5">
          <span
            id={idFechaAlta}
            className={claseEtiqueta}
          >
            Fecha de alta
          </span>

          <output
            aria-labelledby={idFechaAlta}
            className="flex min-h-11 items-center rounded-xl border border-outline-variant bg-surface-container px-3 text-sm text-on-surface"
          >
            {formatearFecha(fechaAlta)}
          </output>

          <p className="text-xs text-on-surface-variant">
            Se asigna automáticamente al crear el carnet.
          </p>
        </div>

        <label className="grid gap-1.5">
          <span className={claseEtiqueta}>
            Fecha de caducidad
          </span>

          <input
            type="date"
            value={fechaCaducidad}
            onChange={(evento) =>
              setFechaCaducidad(
                evento.target.value,
              )
            }
            max={
              temporadaSeleccionada?.fechaFin ||
              undefined
            }
            required
            className={claseCampo}
          />
          {mostrarErrorCampo("fechaCaducidad")}
        </label>

        {carnetFamiliar && (
          <div className="grid gap-4 sm:col-span-2">
            {carnetsOrigen.length > 0 && (
              <label className="grid gap-1.5">
                <span className={claseEtiqueta}>
                  Copiar familiares de otro carnet
                </span>

                <select
                  value={carnetOrigenId}
                  onChange={(evento) =>
                    setCarnetOrigenId(
                      evento.target.value,
                    )
                  }
                  className={claseCampo}
                >
                  <option value="">
                    No copiar automáticamente
                  </option>

                  {carnetsOrigen.map((carnet) => (
                    <option
                      key={carnet.id}
                      value={carnet.id}
                    >
                      {carnet.temporada.nombre}
                      {" · "}
                      {carnet.numeroCarnet}
                    </option>
                  ))}
                </select>

                <span className="text-xs text-on-surface-variant">
                  Se copiarán los nombres al nuevo
                  carnet sin modificar el anterior.
                </span>
              </label>
            )}

            <FamiliaresFormularioAlta
              nombres={nombresFamiliares}
              onChange={setNombresFamiliares}
              disabled={guardando}
            />
          </div>
        )}
      </fieldset>

      {error && (
        <p
          role="alert"
          className="mx-5 mb-5 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container"
        >
          {error}
        </p>
      )}

      <footer className="flex flex-col gap-3 border-t border-outline-variant/60 bg-surface-container-low p-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={alCancelar}
          disabled={guardando}
          className="min-h-11 rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={
            guardando ||
            !temporadaId ||
            Boolean(errorNombres)
          }
          className="min-h-11 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary disabled:opacity-50"
        >
          {guardando
            ? "Creando carnet..."
            : "Crear carnet"}
        </button>
      </footer>
    </form>
  );
}
