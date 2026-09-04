import {
  useState,
} from "react";

import {
  QRCodeSVG,
} from "qrcode.react";

import type {
  CarnetSocioPublico,
} from "@tipos/SocioPanel";

import type {
  RespuestaCerrarSesionSocio,
} from "@tipos/SocioPublico";

interface Propiedades {
  datos:
    CarnetSocioPublico;
}

function obtenerTemporadaVisible(
  nombre: string,
): string {
  const texto =
    nombre.trim();

  if (!texto) {
    return "TEMPORADA";
  }

  return texto
    .replace(
      /^temporada\s+/i,
      "",
    )
    .toUpperCase();
}

function obtenerTipoSocio(
  tipoSocio:
    | string
    | null,
): string {
  const tipo =
    tipoSocio?.trim();

  if (!tipo) {
    return "SOCIO/A";
  }

  const normalizado =
    tipo.toLowerCase();

  if (
    normalizado ===
      "socio" ||
    normalizado ===
      "socia" ||
    normalizado ===
      "socio/a"
  ) {
    return "SOCIO/A";
  }

  return tipo.toUpperCase();
}

export default function SocioPublico({
  datos,
}: Propiedades) {
  const [
    cerrandoSesion,
    setCerrandoSesion,
  ] = useState(false);

  const [
    errorCerrarSesion,
    setErrorCerrarSesion,
  ] = useState<
    string | null
  >(null);

  const nombreCompleto =
    (
      datos.socio
        .nombreCompleto ||
      [
        datos.socio.nombre,
        datos.socio.apellidos,
      ]
        .filter(Boolean)
        .join(" ")
    )
      .trim()
      .toUpperCase();

  const nombreSocio =
    datos.socio.nombre
      ?.trim() ||
    datos.socio
      .nombreCompleto
      ?.trim() ||
    "Socio/a";

  const nombreTemporada =
    datos.carnet
      .temporada
      .nombre ||
    "Temporada";

  const temporada =
    obtenerTemporadaVisible(
      nombreTemporada,
    );

  const tipoSocio =
    obtenerTipoSocio(
      datos.carnet
        .tipoSocio,
    );

  const numeroCarnet =
    datos.carnet
      .numeroCarnet;

  const numeroSocio =
    datos.carnet
      .numeroSocio;

  async function cerrarSesion() {
    if (cerrandoSesion) {
      return;
    }

    setCerrandoSesion(true);
    setErrorCerrarSesion(
      null,
    );

    try {
      const respuesta =
        await fetch(
          "/api/socios/cerrar-sesion",
          {
            method: "POST",

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
          RespuestaCerrarSesionSocio;

      if (
        !respuesta.ok ||
        !contenido.ok
      ) {
        throw new Error(
          contenido.error ??
            "No se ha podido cerrar la sesión.",
        );
      }

      window.location.assign(
        "/socios/iniciar-sesion",
      );
    } catch (error) {
      console.error(
        "Error cerrando la sesión del socio:",
        error,
      );

      setErrorCerrarSesion(
        error instanceof Error
          ? error.message
          : "No se ha podido cerrar la sesión. Inténtalo de nuevo.",
      );

      setCerrandoSesion(
        false,
      );
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl items-start gap-6 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)] lg:gap-8">
      <section
        className="relative mx-auto aspect-9/16 w-full max-w-107.5 overflow-hidden rounded-4xl border border-white/10 bg-[#032a55] text-white shadow-[0_24px_70px_rgba(0,36,80,0.35)]"
        aria-label={`Carnet de socio de ${datos.socio.nombreCompleto}`}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 35%, rgba(0, 173, 239, 0.20), transparent 34%),
              linear-gradient(145deg, #021d3c 0%, #032a55 48%, #001a38 100%)
            `,
          }}
          aria-hidden="true"
        />

        <div
          className="absolute left-[-18%] top-[5%] h-[12%] w-[72%] rotate-[-48deg] bg-[#ffc801]"
          style={{
            clipPath:
              "polygon(0 36%, 100% 0, 91% 27%, 100% 46%, 82% 54%, 94% 78%, 0 100%, 8% 68%)",
          }}
          aria-hidden="true"
        />

        <div
          className="absolute right-[-18%] top-[20%] h-[17%] w-[105%] rotate-[-17deg] bg-[#00adef]"
          style={{
            clipPath:
              "polygon(0 43%, 94% 0, 83% 20%, 100% 30%, 82% 44%, 96% 54%, 8% 100%, 18% 72%)",

            opacity: 0.8,
          }}
          aria-hidden="true"
        />

        <div
          className="absolute bottom-[-4%] right-[-30%] h-[17%] w-[90%] rotate-[-38deg] bg-[#00adef]"
          style={{
            clipPath:
              "polygon(0 30%, 100% 0, 84% 28%, 100% 44%, 79% 55%, 92% 79%, 0 100%, 14% 65%)",

            opacity: 0.85,
          }}
          aria-hidden="true"
        />

        <div
          className="absolute bottom-[-2%] right-[-13%] h-[8%] w-[58%] rotate-[-42deg] bg-[#ffc801]"
          style={{
            clipPath:
              "polygon(0 38%, 100% 0, 84% 34%, 100% 56%, 0 100%, 12% 67%)",
          }}
          aria-hidden="true"
        />

        <svg
          viewBox="0 0 400 720"
          className="absolute inset-0 h-full w-full opacity-[0.09]"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M260 0v720M260 190h140M260 530h140M260 270h140v180H260"
            stroke="currentColor"
            strokeWidth="3"
          />

          <circle
            cx="400"
            cy="360"
            r="83"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="11 8"
          />

          <path
            d="M0 520h92v200M0 615h92M92 570a48 48 0 0 1 0 95"
            stroke="currentColor"
            strokeWidth="3"
          />
        </svg>

        <div className="relative z-10 flex h-full flex-col items-center px-[7%] pb-[4%] pt-[5%] text-center">
          <p className="text-[clamp(0.7rem,3vw,1rem)] font-black italic tracking-wide text-white">
            CARNET DIGITAL
          </p>

          <p className="mt-[2%] rounded-full bg-[#ffc801] px-[7%] py-[1.5%] text-[clamp(0.68rem,3vw,1rem)] font-black italic text-[#032a55] shadow-md">
            TEMPORADA{" "}
            {temporada}
          </p>

          <div className="relative mt-[4%] flex h-[19%] w-[45%] items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[#00adef]/20 blur-2xl" />

            <img
              src="/favicon.svg"
              alt="Escudo del C.B. Andratx"
              className="relative z-10 h-full w-full object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,0.35)]"
            />
          </div>

          <p
            className="mt-[1%] text-[clamp(2.25rem,12vw,4.3rem)] font-black italic leading-none tracking-tight text-[#ffc801]"
            style={{
              textShadow:
                "0 4px 0 rgba(0, 36, 80, 0.75), 0 7px 14px rgba(0, 0, 0, 0.3)",
            }}
          >
            {tipoSocio}
          </p>

          <div className="mt-[2.5%] h-0.75 w-[72%] bg-linear-to-r from-transparent via-[#ffc801] to-transparent" />

          <p className="mt-[2.5%] max-w-full truncate px-2 text-[clamp(1rem,5vw,1.7rem)] font-black italic leading-tight tracking-wide text-white drop-shadow-md">
            {nombreCompleto}
          </p>

          <p className="mt-[1%] text-[clamp(0.75rem,3.5vw,1.05rem)] font-bold italic tracking-wider text-white/95">
            {numeroCarnet}
          </p>

          <div className="mt-[3%] flex w-[43%] max-w-45 items-center justify-center rounded-2xl bg-white p-[3%] shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
            <QRCodeSVG
              value={
                numeroCarnet
              }
              size={360}
              level="H"
              bgColor="#ffffff"
              fgColor="#000000"
              className="h-auto w-full"
              aria-label={`Código QR del carnet ${numeroCarnet}`}
            />
          </div>

          <div className="mt-[2.5%] inline-flex items-center gap-2 text-[clamp(0.7rem,3.2vw,1rem)] font-black italic text-[#22dc83]">
            <span
              className="h-3.5 w-3.5 rounded-full bg-current shadow-[0_0_14px_currentColor]"
              aria-hidden="true"
            />

            SOCIO ACTIVO
          </div>

          <div className="mt-auto w-full">
            <div className="mx-auto mb-[2%] h-px w-[65%] bg-linear-to-r from-transparent via-[#ffc801]/80 to-transparent" />

            <p className="text-[clamp(0.74rem,3.5vw,1.08rem)] font-black italic leading-tight text-white">
              #FENT BÀSQUET{" "}
              <span className="text-[#ffc801]">
                DES DE 1985
              </span>
            </p>

            <p className="mt-[1%] text-[clamp(0.57rem,2.7vw,0.82rem)] font-extrabold text-[#ffc801]">
              #sentimentblaugroc
            </p>

            <p className="mt-[0.5%] text-[clamp(0.52rem,2.4vw,0.75rem)] font-bold text-white">
              cbandratx.es
            </p>
          </div>
        </div>
      </section>

      <aside className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
        <div className="border-b border-outline-variant/60 bg-primary-container px-5 py-5 text-on-primary-container sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">
            Carnet digital
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            Hola, {nombreSocio}
          </h2>

          <p className="mt-1 text-sm opacity-85">
            Este es tu carnet del Club Bàsquet Andratx.
          </p>
        </div>

        <div className="grid gap-5 p-5 sm:p-6">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-surface-container-low p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Número de socio
              </dt>

              <dd className="mt-1 font-bold text-on-surface">
                {numeroSocio}
              </dd>
            </div>

            <div className="rounded-xl bg-surface-container-low p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Número de carnet
              </dt>

              <dd className="mt-1 font-mono font-bold text-on-surface">
                {numeroCarnet}
              </dd>
            </div>

            <div className="rounded-xl bg-surface-container-low p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Temporada
              </dt>

              <dd className="mt-1 font-bold text-on-surface">
                {nombreTemporada}
              </dd>
            </div>

            <div className="rounded-xl bg-surface-container-low p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Tipo
              </dt>

              <dd className="mt-1 font-bold text-on-surface">
                {datos.carnet
                  .tipoSocio ??
                  "Socio/a"}
              </dd>
            </div>

            <div className="rounded-xl bg-surface-container-low p-4 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Estado
              </dt>

              <dd className="mt-1 inline-flex items-center gap-2 font-bold text-success">
                <span
                  className="h-2.5 w-2.5 rounded-full bg-current"
                  aria-hidden="true"
                />

                Activo
              </dd>
            </div>
          </dl>

          <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
            <p className="text-sm font-semibold text-on-surface">
              Uso del carnet
            </p>

            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
              Muestra el código QR cuando el club necesite comprobar tu condición de socio. El carnet es personal e intransferible.
            </p>
          </div>

          {errorCerrarSesion && (
            <p
              className="rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container"
              role="alert"
            >
              {
                errorCerrarSesion
              }
            </p>
          )}

          <button
            type="button"
            onClick={
              cerrarSesion
            }
            disabled={
              cerrandoSesion
            }
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:border-primary hover:bg-primary-container hover:text-on-primary-container disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cerrandoSesion && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            )}

            {cerrandoSesion
              ? "Cerrando sesión..."
              : "Cerrar sesión"}
          </button>
        </div>
      </aside>
    </div>
  );
}