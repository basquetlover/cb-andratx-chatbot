
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";

import type {
  Html5Qrcode,
} from "html5-qrcode";

import type {
  ResultadoEscaneoCarnet,
} from "@tipos/SocioPanel";

import FamiliaresResultadoEscaneoSocio from "./FamiliaresResultadoEscaneoSocio";

import "./lector-qr-socios.css";

interface RespuestaEscaneoApi {
  ok: boolean;

  data: {
    resultado: ResultadoEscaneoCarnet;
  } | null;

  error: string | null;
}

function formatearFecha(
  fecha: string | null,
): string {
  if (!fecha) {
    return "Sin definir";
  }

  const valor = new Date(
    `${fecha}T12:00:00`,
  );

  if (!Number.isFinite(valor.getTime())) {
    return fecha;
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(valor);
}

function etiquetaEstado(
  estado: string,
): string {
  const etiquetas: Record<string, string> = {
    activo: "Activo",
    pendiente: "Pendiente",
    bloqueado: "Bloqueado",
    caducado: "Caducado",
  };

  return etiquetas[estado] ?? estado;
}

function esFamiliar(
  tipo: string | null | undefined,
): boolean {
  return (
    tipo?.trim().toLowerCase() === "familiar"
  );
}

async function liberarLector(
  lector: Html5Qrcode | null,
): Promise<void> {
  if (!lector) {
    return;
  }

  try {
    if (lector.isScanning) {
      await lector.stop();
    }
  } catch (error) {
    console.warn(
      "No se ha podido detener el lector QR:",
      error,
    );
  }

  try {
    lector.clear();
  } catch (error) {
    console.warn(
      "No se ha podido limpiar el lector QR:",
      error,
    );
  }
}

export default function LectorQrSociosPanel() {
  const idReact = useId();

  const idLector =
    `lector-qr-socio-${idReact.replace(
      /[^a-zA-Z0-9_-]/g,
      "",
    )}`;

  const lectorRef =
    useRef<Html5Qrcode | null>(null);

  const montadoRef = useRef(false);
  const procesandoRef = useRef(false);
  const iniciandoRef = useRef(false);

  const [
    iniciandoCamara,
    setIniciandoCamara,
  ] = useState(false);

  const [
    camaraActiva,
    setCamaraActiva,
  ] = useState(false);

  const [
    consultando,
    setConsultando,
  ] = useState(false);

  const [
    numeroManual,
    setNumeroManual,
  ] = useState("");

  const [
    resultado,
    setResultado,
  ] = useState<ResultadoEscaneoCarnet | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  useEffect(() => {
    montadoRef.current = true;

    return () => {
      montadoRef.current = false;

      const lector = lectorRef.current;
      lectorRef.current = null;

      void liberarLector(lector);
    };
  }, []);

  async function detenerCamara(): Promise<void> {
    const lector = lectorRef.current;
    lectorRef.current = null;

    await liberarLector(lector);

    if (montadoRef.current) {
      setCamaraActiva(false);
    }
  }

  async function consultarCarnet(
    codigoLeido: string,
  ): Promise<void> {
    const codigo = codigoLeido.trim();

    if (!codigo) {
      setError(
        "Introduce o escanea un número de carnet.",
      );
      return;
    }

    if (procesandoRef.current) {
      return;
    }

    procesandoRef.current = true;

    setConsultando(true);
    setError(null);
    setResultado(null);

    await detenerCamara();

    try {
      const respuesta = await fetch(
        "/api/panel/socios/escanear",
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            numeroCarnet: codigo,
          }),
        },
      );

      const contenido =
        (await respuesta.json()) as RespuestaEscaneoApi;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data?.resultado
      ) {
        throw new Error(
          contenido.error ||
            "No se ha podido consultar el carnet.",
        );
      }

      if (!montadoRef.current) {
        return;
      }

      setResultado(
        contenido.data.resultado,
      );

      setNumeroManual(
        contenido.data.resultado.carnet
          ?.numeroCarnet ??
          codigo.toUpperCase(),
      );
    } catch (capturado) {
      if (!montadoRef.current) {
        return;
      }

      console.error(
        "Error consultando el carnet:",
        capturado,
      );

      setError(
        capturado instanceof Error
          ? capturado.message
          : "No se ha podido consultar el carnet.",
      );
    } finally {
      procesandoRef.current = false;

      if (montadoRef.current) {
        setConsultando(false);
      }
    }
  }

  async function iniciarCamara(): Promise<void> {
    if (
      iniciandoRef.current ||
      camaraActiva ||
      consultando
    ) {
      return;
    }

    iniciandoRef.current = true;

    setIniciandoCamara(true);
    setError(null);
    setResultado(null);

    try {
      /*
       * Limpiamos el lector anterior sin
       * desactivar el indicador de carga.
       */
      const anterior = lectorRef.current;

      lectorRef.current = null;

      await liberarLector(anterior);

      const {
        Html5Qrcode: ClaseHtml5Qrcode,
      } = await import("html5-qrcode");

      if (!montadoRef.current) {
        return;
      }

      const lector = new ClaseHtml5Qrcode(
        idLector,
        {
          verbose: false,
        },
      );

      lectorRef.current = lector;

      await lector.start(
        {
          facingMode: "environment",
        },
        {
          fps: 10,

          /*
           * El recuadro QR nunca supera
           * el tamaño disponible.
           *
           * Se elimina el mínimo fijo de
           * 180 px que causaba overflow.
           */
          qrbox: (
            anchoDisponible,
            altoDisponible,
          ) => {
            const minimo = Math.max(
              1,
              Math.min(
                anchoDisponible,
                altoDisponible,
              ),
            );

            const lado = Math.max(
              1,
              Math.min(
                260,
                Math.floor(minimo * 0.74),
              ),
            );

            return {
              width: lado,
              height: lado,
            };
          },
        },
        (textoDecodificado) => {
          if (!procesandoRef.current) {
            void consultarCarnet(
              textoDecodificado,
            );
          }
        },
        () => {
          // No detectar QR en un fotograma es normal.
        },
      );

      if (!montadoRef.current) {
        await liberarLector(lector);
        return;
      }

      if (!procesandoRef.current) {
        setCamaraActiva(true);
      }
    } catch (capturado) {
      console.error(
        "Error iniciando la cámara:",
        capturado,
      );

      const lector = lectorRef.current;
      lectorRef.current = null;

      await liberarLector(lector);

      if (!montadoRef.current) {
        return;
      }

      setCamaraActiva(false);

      setError(
        capturado instanceof DOMException &&
          capturado.name === "NotAllowedError"
          ? "No se ha concedido permiso para utilizar la cámara."
          : "No se ha podido iniciar la cámara. Comprueba los permisos o utiliza la entrada manual.",
      );
    } finally {
      iniciandoRef.current = false;

      if (montadoRef.current) {
        setIniciandoCamara(false);
      }
    }
  }

  function enviarManual(
    evento: FormEvent<HTMLFormElement>,
  ): void {
    evento.preventDefault();

    void consultarCarnet(numeroManual);
  }

  function limpiar(): void {
    setResultado(null);
    setError(null);
    setNumeroManual("");
  }

  const encontrado =
    resultado?.encontrado === true &&
    Boolean(
      resultado.socio &&
        resultado.carnet,
    );

  const valido =
    encontrado &&
    resultado?.valido === true;

  const rechazado =
    resultado !== null &&
    !resultado.valido;

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <header className="border-b border-outline-variant/60 px-3 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
            <span
              className="h-6 w-6 bg-current mask-center mask-contain mask-no-repeat"
              style={{
                maskImage:
                  "url('/iconos/panel/qr.svg')",
                WebkitMaskImage:
                  "url('/iconos/panel/qr.svg')",
              }}
              aria-hidden="true"
            />
          </span>

          <div className="min-w-0">
            <h2 className="text-lg font-bold text-on-surface sm:text-xl">
              Lector de carnets
            </h2>

            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
              Escanea el QR del carnet o introduce
              su número para comprobar si está vigente.
            </p>
          </div>
        </div>
      </header>

      <div className="grid w-full min-w-0 grid-cols-1 gap-4 p-3 sm:gap-6 sm:p-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="min-w-0 space-y-4">
          <div className="lector-socios__visor relative isolate aspect-[4/3] w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-outline-variant/60 bg-black sm:aspect-video">
            <div
              id={idLector}
              className="lector-socios__camara"
              aria-label="Vista de la cámara para escanear códigos QR"
            />

            {!camaraActiva &&
              !iniciandoCamara && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black px-4 py-5 text-center text-white">
                  <span
                    className="h-12 w-12 bg-white/80 mask-center mask-contain mask-no-repeat"
                    style={{
                      maskImage:
                        "url('/iconos/panel/camara.svg')",
                      WebkitMaskImage:
                        "url('/iconos/panel/camara.svg')",
                    }}
                    aria-hidden="true"
                  />

                  <p className="mt-3 font-bold">
                    Cámara desactivada
                  </p>

                  <p className="mt-1 max-w-sm text-xs leading-5 text-white/70 sm:text-sm">
                    Se activa al pulsar «Abrir cámara».
                  </p>
                </div>
              )}

            {iniciandoCamara && (
              <div
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 px-3 text-center text-white"
                role="status"
              >
                <span
                  className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white"
                  aria-hidden="true"
                />

                <span className="text-sm font-semibold">
                  Iniciando cámara...
                </span>
              </div>
            )}
          </div>

          <div className="flex w-full min-w-0 flex-wrap gap-2 sm:gap-3">
            {!camaraActiva ? (
              <button
                type="button"
                onClick={() =>
                  void iniciarCamara()
                }
                disabled={
                  iniciandoCamara ||
                  consultando
                }
                className="min-h-11 min-w-0 flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary disabled:opacity-50 sm:flex-none sm:px-5"
              >
                {iniciandoCamara
                  ? "Iniciando..."
                  : "Abrir cámara"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  void detenerCamara()
                }
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-outline-variant px-4 py-3 text-sm font-bold text-on-surface sm:flex-none sm:px-5"
              >
                Detener cámara
              </button>
            )}

            {(resultado || error) && (
              <button
                type="button"
                onClick={limpiar}
                disabled={consultando}
                className="min-h-11 rounded-xl border border-outline-variant px-4 py-3 text-sm font-bold text-on-surface disabled:opacity-50"
              >
                Limpiar
              </button>
            )}
          </div>

          <form
            onSubmit={enviarManual}
            className="w-full min-w-0 rounded-2xl border border-outline-variant/60 bg-surface-container-low p-3 sm:p-4"
          >
            <label
              htmlFor={`${idLector}-manual`}
              className="block text-sm font-bold text-on-surface"
            >
              Introducir carnet manualmente
            </label>

            <p className="mt-1 text-xs text-on-surface-variant">
              Útil si no tienes cámara o el QR
              no se puede leer.
            </p>

            <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:gap-3">
              <input
                id={`${idLector}-manual`}
                type="text"
                value={numeroManual}
                onChange={(evento) =>
                  setNumeroManual(
                    evento.target.value.toUpperCase(),
                  )
                }
                disabled={consultando}
                autoComplete="off"
                spellCheck={false}
                maxLength={50}
                placeholder="Número de carnet"
                className="h-11 w-full min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 font-mono text-sm uppercase text-on-surface outline-none focus:border-primary sm:w-auto"
              />

              <button
                type="submit"
                disabled={
                  consultando ||
                  !numeroManual.trim()
                }
                className="h-11 w-full shrink-0 rounded-xl bg-secondary px-5 text-sm font-bold text-on-secondary disabled:opacity-50 sm:w-auto"
              >
                Consultar
              </button>
            </div>
          </form>
        </div>

        <div className="min-w-0">
          {consultando && (
            <div
              role="status"
              className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-outline-variant/60 bg-surface-container-low p-6 text-center"
            >
              <span
                className="h-9 w-9 animate-spin rounded-full border-4 border-outline-variant border-t-primary"
                aria-hidden="true"
              />

              <h3 className="mt-4 font-bold text-on-surface">
                Consultando carnet...
              </h3>

              <p className="mt-1 text-sm text-on-surface-variant">
                Comprobando el estado del socio.
              </p>
            </div>
          )}

          {!consultando && error && (
            <div
              role="alert"
              className="min-w-0 rounded-2xl border border-error/40 bg-error-container p-4 text-on-error-container sm:p-5"
            >
              <h3 className="font-bold">
                No se ha podido consultar el carnet
              </h3>

              <p className="mt-2 break-words text-sm">
                {error}
              </p>
            </div>
          )}

          {!consultando &&
            encontrado &&
            resultado?.socio &&
            resultado.carnet && (
              <article
                className={`min-w-0 overflow-hidden rounded-2xl border bg-surface-container-lowest shadow-sm ${
                  valido
                    ? "border-success/40"
                    : "border-error/40"
                }`}
              >
                <header
                  className={`p-4 text-sm font-bold sm:p-5 ${
                    valido
                      ? "bg-success text-on-success"
                      : "bg-error text-on-error"
                  }`}
                >
                  <p className="text-xs uppercase tracking-wider">
                    {valido
                      ? "Acceso permitido"
                      : "Acceso rechazado"}
                  </p>

                  <h3 className="mt-1 text-xl">
                    {valido
                      ? "Carnet válido"
                      : "Carnet no válido"}
                  </h3>
                </header>

                <div className="min-w-0 p-4 sm:p-5">
                  <p className="break-words text-lg font-bold text-on-surface sm:text-xl">
                    {resultado.socio.nombreCompleto}
                  </p>

                  <p className="mt-1 break-all font-mono text-sm font-bold text-primary">
                    {resultado.carnet.numeroCarnet}
                  </p>

                  <dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <div className="min-w-0">
                      <dt className="text-xs uppercase text-on-surface-variant">
                        Número de socio
                      </dt>

                      <dd className="mt-1 font-bold text-on-surface">
                        {resultado.carnet.numeroSocio}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-xs uppercase text-on-surface-variant">
                        Estado
                      </dt>

                      <dd
                        className={`mt-1 font-bold ${
                          valido
                            ? "text-success"
                            : "text-error"
                        }`}
                      >
                        {etiquetaEstado(
                          resultado.carnet.estado,
                        )}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-xs uppercase text-on-surface-variant">
                        Tipo de socio
                      </dt>

                      <dd className="mt-1 break-words font-bold text-on-surface">
                        {resultado.carnet.tipoSocio ||
                          "General"}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-xs uppercase text-on-surface-variant">
                        Válido hasta
                      </dt>

                      <dd className="mt-1 font-bold text-on-surface">
                        {formatearFecha(
                          resultado.carnet.fechaCaducidad,
                        )}
                      </dd>
                    </div>
                  </dl>

                  {esFamiliar(
                    resultado.carnet.tipoSocio,
                  ) && (
                    <FamiliaresResultadoEscaneoSocio
                      key={resultado.carnet.id}
                      socioId={resultado.socio.id}
                      carnetId={resultado.carnet.id}
                      titular={
                        resultado.socio.nombreCompleto
                      }
                    />
                  )}

                  <p
                    className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
                      valido
                        ? "bg-success/10 text-success"
                        : "bg-error-container text-on-error-container"
                    }`}
                  >
                    {resultado.mensaje}
                  </p>

                  {!valido && (
                    <p className="mt-2 text-xs text-on-surface-variant">
                      Motivo: {resultado.motivo}
                    </p>
                  )}

                  <a
                    href={`/panel/socios/${encodeURIComponent(
                      resultado.socio.id,
                    )}`}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-primary px-3 py-2 text-center text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary"
                  >
                    Ver ficha del socio
                  </a>
                </div>
              </article>
            )}

          {!consultando &&
            rechazado &&
            !encontrado &&
            resultado && (
              <div
                role="alert"
                className="rounded-2xl border border-error/40 bg-surface-container-lowest p-4 sm:p-5"
              >
                <h3 className="font-bold text-error">
                  Carnet no válido
                </h3>

                <p className="mt-2 break-words text-sm text-on-surface">
                  {resultado.mensaje}
                </p>

                <p className="mt-2 text-xs text-on-surface-variant">
                  Motivo: {resultado.motivo}
                </p>
              </div>
            )}

          {!consultando &&
            !error &&
            !resultado && (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-6 text-center">
                <span
                  className="h-11 w-11 bg-outline mask-center mask-contain mask-no-repeat"
                  style={{
                    maskImage:
                      "url('/iconos/panel/carnet.svg')",
                    WebkitMaskImage:
                      "url('/iconos/panel/carnet.svg')",
                  }}
                  aria-hidden="true"
                />

                <h3 className="mt-4 font-bold text-on-surface">
                  Ningún carnet consultado
                </h3>

                <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                  Escanea el QR o introduce el número
                  de carnet.
                </p>
              </div>
            )}
        </div>
      </div>
    </section>
  );
}
