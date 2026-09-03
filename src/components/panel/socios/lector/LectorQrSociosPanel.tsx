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

interface RespuestaEscaneoApi {
  ok: boolean;

  data: {
    resultado:
      ResultadoEscaneoCarnet;
  } | null;

  error: string | null;
}

function formatearFecha(
  fecha: string | null,
): string {
  if (!fecha) {
    return "Sin definir";
  }

  const fechaConvertida =
    new Date(
      `${fecha}T12:00:00`,
    );

  if (
    Number.isNaN(
      fechaConvertida.getTime(),
    )
  ) {
    return fecha;
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone:
        "Europe/Madrid",
    },
  ).format(
    fechaConvertida,
  );
}

function obtenerEtiquetaEstado(
  estado: string,
): string {
  switch (estado) {
    case "activo":
      return "Activo";

    case "pendiente":
      return "Pendiente";

    case "bloqueado":
      return "Bloqueado";

    case "caducado":
      return "Caducado";

    default:
      return estado;
  }
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
  const idReact =
    useId();

  const idLector =
    `lector-qr-socio-${idReact.replace(
      /[^a-zA-Z0-9_-]/g,
      "",
    )}`;

  const lectorRef =
    useRef<Html5Qrcode | null>(
      null,
    );

  const componenteMontadoRef =
    useRef(true);

  const procesandoRef =
    useRef(false);

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
  ] =
    useState<ResultadoEscaneoCarnet | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    componenteMontadoRef.current =
      true;

    return () => {
      componenteMontadoRef.current =
        false;

      const lector =
        lectorRef.current;

      lectorRef.current =
        null;

      void liberarLector(
        lector,
      );
    };
  }, []);

  async function detenerCamara(): Promise<void> {
    const lector =
      lectorRef.current;

    lectorRef.current =
      null;

    await liberarLector(
      lector,
    );

    if (
      componenteMontadoRef.current
    ) {
      setCamaraActiva(false);
      setIniciandoCamara(false);
    }
  }

  async function consultarCarnet(
    codigoRecibido: string,
  ): Promise<void> {
    const codigo =
      codigoRecibido.trim();

    if (!codigo) {
      setError(
        "Introduce o escanea un número de carnet.",
      );

      return;
    }

    if (
      procesandoRef.current
    ) {
      return;
    }

    procesandoRef.current =
      true;

    setConsultando(true);
    setError(null);
    setResultado(null);

    await detenerCamara();

    try {
      const respuesta =
        await fetch(
          "/api/panel/socios/escanear",
          {
            method: "POST",
            credentials:
              "same-origin",
            headers: {
              Accept:
                "application/json",
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                numeroCarnet:
                  codigo,
              }),
          },
        );

      const contenido =
        (await respuesta.json()) as
          RespuestaEscaneoApi;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data
      ) {
        throw new Error(
          contenido.error ||
            "No se ha podido consultar el carnet.",
        );
      }

      if (
        !componenteMontadoRef.current
      ) {
        return;
      }

      setResultado(
        contenido.data.resultado,
      );

      setNumeroManual(
        contenido.data.resultado
          .carnet
          ?.numeroCarnet ??
          codigo.toUpperCase(),
      );
    } catch (error) {
      if (
        !componenteMontadoRef.current
      ) {
        return;
      }

      console.error(
        "Error consultando el carnet escaneado:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "No se ha podido consultar el carnet.",
      );
    } finally {
      procesandoRef.current =
        false;

      if (
        componenteMontadoRef.current
      ) {
        setConsultando(false);
      }
    }
  }

  async function iniciarCamara(): Promise<void> {
    if (
      iniciandoCamara ||
      camaraActiva ||
      consultando
    ) {
      return;
    }

    setIniciandoCamara(true);
    setResultado(null);
    setError(null);

    try {
      await detenerCamara();

      const {
        Html5Qrcode:
          ClaseHtml5Qrcode,
      } = await import(
        "html5-qrcode"
      );

      if (
        !componenteMontadoRef.current
      ) {
        return;
      }

      const lector =
        new ClaseHtml5Qrcode(
          idLector,
          {
            verbose: false,
          },
        );

      lectorRef.current =
        lector;

      await lector.start(
        {
          facingMode:
            "environment",
        },
        {
          fps: 10,

          qrbox: (
            anchoDisponible,
            altoDisponible,
          ) => {
            const lado =
              Math.min(
                anchoDisponible,
                altoDisponible,
                280,
              );

            const ladoSeguro =
              Math.max(
                180,
                Math.floor(
                  lado * 0.78,
                ),
              );

            return {
              width:
                ladoSeguro,
              height:
                ladoSeguro,
            };
          },

          aspectRatio:
            1,
        },
        (
          textoDecodificado,
        ) => {
          if (
            procesandoRef.current
          ) {
            return;
          }

          void consultarCarnet(
            textoDecodificado,
          );
        },
        () => {
          /*
           * html5-qrcode llama a esta
           * función continuamente
           * mientras no detecta un QR.
           * No debe mostrarse como error.
           */
        },
      );

      if (
        !componenteMontadoRef.current
      ) {
        await liberarLector(
          lector,
        );

        return;
      }

      setCamaraActiva(true);
    } catch (error) {
      console.error(
        "Error iniciando el lector QR:",
        error,
      );

      const lector =
        lectorRef.current;

      lectorRef.current =
        null;

      await liberarLector(
        lector,
      );

      if (
        !componenteMontadoRef.current
      ) {
        return;
      }

      setCamaraActiva(false);

      if (
        error instanceof DOMException &&
        error.name ===
          "NotAllowedError"
      ) {
        setError(
          "No se ha concedido permiso para utilizar la cámara.",
        );
      } else {
        setError(
          "No se ha podido iniciar la cámara. Comprueba sus permisos o introduce el carnet manualmente.",
        );
      }
    } finally {
      if (
        componenteMontadoRef.current
      ) {
        setIniciandoCamara(false);
      }
    }
  }

  function enviarNumeroManual(
    evento: FormEvent<HTMLFormElement>,
  ): void {
    evento.preventDefault();

    void consultarCarnet(
      numeroManual,
    );
  }

  function limpiarResultado(): void {
    setResultado(null);
    setError(null);
    setNumeroManual("");
  }

  const resultadoCorrecto =
    Boolean(
      resultado?.encontrado &&
        resultado.valido,
    );

  const resultadoRechazado =
    Boolean(
      resultado &&
        !resultado.valido,
    );

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <header className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
            <span
              className="inline-block h-7 w-7 bg-current"
              style={{
                maskImage:
                  "url('/iconos/panel/qr.svg')",
                WebkitMaskImage:
                  "url('/iconos/panel/qr.svg')",
                maskRepeat:
                  "no-repeat",
                WebkitMaskRepeat:
                  "no-repeat",
                maskPosition:
                  "center",
                WebkitMaskPosition:
                  "center",
                maskSize:
                  "contain",
                WebkitMaskSize:
                  "contain",
              }}
              aria-hidden="true"
            />
          </span>

          <div>
            <h2 className="text-xl font-bold text-on-surface">
              Lector de carnets
            </h2>

            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
              Escanea el código QR del
              carnet para consultar el
              estado actual del socio.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <div>
          <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-black">
            <div
              id={idLector}
              className="min-h-72 w-full overflow-hidden [&_img]:mx-auto [&_video]:min-h-72 [&_video]:w-full [&_video]:object-cover"
            />

            {!camaraActiva &&
              !iniciandoCamara && (
                <div className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center text-white">
                  <span
                    className="inline-block h-14 w-14 bg-white/80"
                    style={{
                      maskImage:
                        "url('/iconos/panel/camara.svg')",
                      WebkitMaskImage:
                        "url('/iconos/panel/camara.svg')",
                      maskRepeat:
                        "no-repeat",
                      WebkitMaskRepeat:
                        "no-repeat",
                      maskPosition:
                        "center",
                      WebkitMaskPosition:
                        "center",
                      maskSize:
                        "contain",
                      WebkitMaskSize:
                        "contain",
                    }}
                    aria-hidden="true"
                  />

                  <p className="mt-4 font-bold">
                    Cámara desactivada
                  </p>

                  <p className="mt-1 max-w-sm text-sm leading-6 text-white/70">
                    La cámara solamente se
                    activará cuando pulses
                    el botón.
                  </p>
                </div>
              )}

            {iniciandoCamara && (
              <div className="flex min-h-72 items-center justify-center">
                <div
                  className="flex flex-col items-center gap-3 text-white"
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
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
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
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-primary-fixed-dim disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  className="inline-block h-5 w-5 bg-current"
                  style={{
                    maskImage:
                      "url('/iconos/panel/camara.svg')",
                    WebkitMaskImage:
                      "url('/iconos/panel/camara.svg')",
                    maskRepeat:
                      "no-repeat",
                    WebkitMaskRepeat:
                      "no-repeat",
                    maskPosition:
                      "center",
                    WebkitMaskPosition:
                      "center",
                    maskSize:
                      "contain",
                    WebkitMaskSize:
                      "contain",
                  }}
                  aria-hidden="true"
                />

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
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container"
              >
                Detener cámara
              </button>
            )}

            {(resultado ||
              error) && (
              <button
                type="button"
                onClick={
                  limpiarResultado
                }
                disabled={consultando}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50"
              >
                Limpiar
              </button>
            )}
          </div>

          <form
            onSubmit={
              enviarNumeroManual
            }
            className="mt-6 rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4"
          >
            <label className="block">
              <span className="text-sm font-bold text-on-surface">
                Introducir carnet
                manualmente
              </span>

              <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
                Puedes utilizar esta opción
                si el dispositivo no dispone
                de cámara.
              </span>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={numeroManual}
                  onChange={(evento) =>
                    setNumeroManual(
                      evento.target.value
                        .toUpperCase(),
                    )
                  }
                  disabled={consultando}
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={50}
                  placeholder="CBA-2627001"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 font-mono text-sm uppercase text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={
                    consultando ||
                    numeroManual.trim()
                      .length === 0
                  }
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-secondary px-5 text-sm font-bold text-on-secondary transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Consultar
                </button>
              </div>
            </label>
          </form>
        </div>

        <div>
          {consultando && (
            <div
              className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-outline-variant/60 bg-surface-container-low p-6 text-center"
              role="status"
            >
              <span
                className="h-9 w-9 animate-spin rounded-full border-4 border-outline-variant border-t-primary"
                aria-hidden="true"
              />

              <p className="mt-4 font-bold text-on-surface">
                Consultando carnet
              </p>

              <p className="mt-1 text-sm text-on-surface-variant">
                Comprobando el estado actual
                del socio.
              </p>
            </div>
          )}

          {!consultando &&
            error && (
              <div
                className="rounded-2xl border border-error/40 bg-error-container p-5 text-on-error-container"
                role="alert"
              >
                <span
                  className="inline-block h-9 w-9 bg-current"
                  style={{
                    maskImage:
                      "url('/iconos/panel/error.svg')",
                    WebkitMaskImage:
                      "url('/iconos/panel/error.svg')",
                    maskRepeat:
                      "no-repeat",
                    WebkitMaskRepeat:
                      "no-repeat",
                    maskPosition:
                      "center",
                    WebkitMaskPosition:
                      "center",
                    maskSize:
                      "contain",
                    WebkitMaskSize:
                      "contain",
                  }}
                  aria-hidden="true"
                />

                <h3 className="mt-3 text-lg font-bold">
                  No se ha podido consultar
                </h3>

                <p className="mt-1 text-sm leading-6">
                  {error}
                </p>
              </div>
            )}

          {!consultando &&
            resultadoCorrecto &&
            resultado?.socio &&
            resultado.carnet && (
              <article className="overflow-hidden rounded-2xl border border-success/40 bg-surface-container-lowest shadow-sm">
                <div className="bg-success px-5 py-5 text-on-success">
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-block h-9 w-9 bg-current"
                      style={{
                        maskImage:
                          "url('/iconos/panel/completado.svg')",
                        WebkitMaskImage:
                          "url('/iconos/panel/completado.svg')",
                        maskRepeat:
                          "no-repeat",
                        WebkitMaskRepeat:
                          "no-repeat",
                        maskPosition:
                          "center",
                        WebkitMaskPosition:
                          "center",
                        maskSize:
                          "contain",
                        WebkitMaskSize:
                          "contain",
                      }}
                      aria-hidden="true"
                    />

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                        Acceso permitido
                      </p>

                      <h3 className="text-xl font-bold">
                        Carnet válido
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-xl font-bold text-on-surface">
                    {
                      resultado.socio
                        .nombreCompleto
                    }
                  </p>

                  <p className="mt-1 font-mono text-sm font-bold text-primary">
                    {
                      resultado.carnet
                        .numeroCarnet
                    }
                  </p>

                  <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                        Número de socio
                      </dt>

                      <dd className="mt-1 font-bold text-on-surface">
                        {
                          resultado.socio
                            .numeroSocio
                        }
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                        Estado
                      </dt>

                      <dd className="mt-1 font-bold text-success">
                        {obtenerEtiquetaEstado(
                          resultado.carnet
                            .estado,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                        Tipo de socio
                      </dt>

                      <dd className="mt-1 font-bold text-on-surface">
                        {resultado.carnet
                          .tipoSocio ||
                          "General"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                        Válido hasta
                      </dt>

                      <dd className="mt-1 font-bold text-on-surface">
                        {formatearFecha(
                          resultado.carnet
                            .fechaCaducidad,
                        )}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-5 rounded-xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">
                    {resultado.mensaje}
                  </p>

                  <a
                    href={`/panel/socios/${encodeURIComponent(
                      resultado.socio.id,
                    )}`}
                    className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-success px-4 py-3 text-sm font-bold text-success transition-colors hover:bg-success hover:text-on-success"
                  >
                    Ver ficha del socio
                  </a>
                </div>
              </article>
            )}

          {!consultando &&
            resultadoRechazado &&
            resultado && (
              <article
                className="overflow-hidden rounded-2xl border border-error/40 bg-surface-container-lowest shadow-sm"
                role="alert"
              >
                <div className="bg-error px-5 py-5 text-on-error">
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-block h-9 w-9 bg-current"
                      style={{
                        maskImage:
                          "url('/iconos/panel/bloqueado.svg')",
                        WebkitMaskImage:
                          "url('/iconos/panel/bloqueado.svg')",
                        maskRepeat:
                          "no-repeat",
                        WebkitMaskRepeat:
                          "no-repeat",
                        maskPosition:
                          "center",
                        WebkitMaskPosition:
                          "center",
                        maskSize:
                          "contain",
                        WebkitMaskSize:
                          "contain",
                      }}
                      aria-hidden="true"
                    />

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                        Acceso rechazado
                      </p>

                      <h3 className="text-xl font-bold">
                        Carnet no válido
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  {resultado.socio && (
                    <>
                      <p className="text-xl font-bold text-on-surface">
                        {
                          resultado.socio
                            .nombreCompleto
                        }
                      </p>

                      {resultado.carnet && (
                        <p className="mt-1 font-mono text-sm font-bold text-error">
                          {
                            resultado.carnet
                              .numeroCarnet
                          }
                        </p>
                      )}
                    </>
                  )}

                  {!resultado.encontrado && (
                    <p className="font-bold text-on-surface">
                      Carnet desconocido
                    </p>
                  )}

                  <p className="mt-4 rounded-xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container">
                    {resultado.mensaje}
                  </p>

                  <p className="mt-3 text-xs text-on-surface-variant">
                    Motivo:{" "}
                    {resultado.motivo}
                  </p>

                  {resultado.socio && (
                    <a
                      href={`/panel/socios/${encodeURIComponent(
                        resultado.socio.id,
                      )}`}
                      className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-outline-variant px-4 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container"
                    >
                      Ver ficha del socio
                    </a>
                  )}
                </div>
              </article>
            )}

          {!consultando &&
            !error &&
            !resultado && (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-6 text-center">
                <span
                  className="inline-block h-12 w-12 bg-outline"
                  style={{
                    maskImage:
                      "url('/iconos/panel/carnet.svg')",
                    WebkitMaskImage:
                      "url('/iconos/panel/carnet.svg')",
                    maskRepeat:
                      "no-repeat",
                    WebkitMaskRepeat:
                      "no-repeat",
                    maskPosition:
                      "center",
                    WebkitMaskPosition:
                      "center",
                    maskSize:
                      "contain",
                    WebkitMaskSize:
                      "contain",
                  }}
                  aria-hidden="true"
                />

                <h3 className="mt-4 font-bold text-on-surface">
                  Ningún carnet consultado
                </h3>

                <p className="mt-1 max-w-sm text-sm leading-6 text-on-surface-variant">
                  Escanea el QR del carnet o
                  introduce su número para
                  comprobarlo.
                </p>
              </div>
            )}
        </div>
      </div>
    </section>
  );
}