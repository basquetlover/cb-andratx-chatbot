import {
  useMemo,
  useState,
} from "react";

import CarnetsSocioPanel from "./CarnetsSocioPanel";
import DatosSocioPanel from "./DatosSocioPanel";
import EstadoAccesoSocioPanel from "./EstadoAccesoSocioPanel";
import FormularioNuevoCarnetSocio from "./FormularioNuevoCarnetSocio";

import type {
  OpcionesSociosPanel,
  SocioPanel,
} from "@tipos/SocioPanel";

type SeccionEditorSocio =
  | "datos"
  | "carnets";

interface Propiedades {
  socioInicial: SocioPanel;
  opciones: OpcionesSociosPanel;
  puedeEditar: boolean;
  puedeCrearCarnet: boolean;
}

interface OpcionSeccion {
  id: SeccionEditorSocio;
  nombre: string;
  descripcion: string;
  icono: string;
}

const secciones: OpcionSeccion[] = [
  {
    id: "datos",
    nombre: "Datos del socio",
    descripcion:
      "Información personal y acceso",
    icono:
      "/iconos/panel/usuario.svg",
  },
  {
    id: "carnets",
    nombre: "Carnets",
    descripcion:
      "Temporadas e historial",
    icono:
      "/iconos/panel/carnet.svg",
  },
];

export default function EditorSocioPanel({
  socioInicial,
  opciones,
  puedeEditar,
  puedeCrearCarnet,
}: Propiedades) {
  const [
    socio,
    setSocio,
  ] = useState<SocioPanel>(
    socioInicial,
  );

  const [
    seccionActiva,
    setSeccionActiva,
  ] =
    useState<SeccionEditorSocio>(
      "datos",
    );

  const [
    mostrandoFormularioCarnet,
    setMostrandoFormularioCarnet,
  ] = useState(false);

  const carnetActual =
    socio.carnetActual;

  const numeroSocioActual =
    carnetActual?.numeroSocio ??
    null;

  const accesoBloqueado =
    carnetActual
      ?.accesoBloqueado ??
    false;

  const intentosFallidos =
    carnetActual
      ?.intentosFallidos ??
    0;

  const tiposSocio =
    useMemo(
      () =>
        opciones.tiposSocio.map(
          (tipo) =>
            tipo.valor,
        ),
      [
        opciones.tiposSocio,
      ],
    );

  function actualizarSocio(
    socioActualizado: SocioPanel,
  ) {
    setSocio(
      socioActualizado,
    );
  }

  function registrarCarnetCreado(
    socioActualizado: SocioPanel,
  ) {
    setSocio(
      socioActualizado,
    );

    setMostrandoFormularioCarnet(
      false,
    );
  }

  function cambiarSeccion(
    seccion: SeccionEditorSocio,
  ) {
    setSeccionActiva(
      seccion,
    );

    if (
      seccion !== "carnets"
    ) {
      setMostrandoFormularioCarnet(
        false,
      );
    }
  }

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
              <span
                className="inline-block h-8 w-8 bg-current mask-center mask-contain mask-no-repeat"
                style={{
                  maskImage:
                    "url('/iconos/panel/usuario.svg')",

                  WebkitMaskImage:
                    "url('/iconos/panel/usuario.svg')",
                }}
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0">
              {numeroSocioActual !==
              null ? (
                <p className="text-xs font-bold uppercase tracking-wide text-primary">
                  Socio número{" "}
                  {
                    numeroSocioActual
                  }
                </p>
              ) : (
                <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  Sin carnet para la
                  temporada activa
                </p>
              )}

              <h1 className="mt-1 wrap-break-word text-2xl font-black text-on-surface sm:text-3xl">
                {
                  socio.nombreCompleto
                }
              </h1>

              <p className="mt-1 break-all text-sm text-on-surface-variant">
                {socio.email}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${
                socio.activo
                  ? "border-success/30 bg-success-container text-on-success-container"
                  : "border-error/30 bg-error-container text-on-error-container"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  socio.activo
                    ? "bg-success"
                    : "bg-error"
                }`}
                aria-hidden="true"
              />

              {socio.activo
                ? "Socio activo"
                : "Socio desactivado"}
            </span>

            {carnetActual && (
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${
                  accesoBloqueado
                    ? "border-error/30 bg-error-container text-on-error-container"
                    : intentosFallidos >
                        0
                      ? "border-tertiary/30 bg-tertiary-container text-on-tertiary-container"
                      : "border-success/30 bg-success-container text-on-success-container"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    accesoBloqueado
                      ? "bg-error"
                      : intentosFallidos >
                          0
                        ? "bg-tertiary"
                        : "bg-success"
                  }`}
                  aria-hidden="true"
                />

                {accesoBloqueado
                  ? "Acceso bloqueado"
                  : intentosFallidos >
                      0
                    ? `${intentosFallidos} ${
                        intentosFallidos ===
                        1
                          ? "intento fallido"
                          : "intentos fallidos"
                      }`
                    : "Acceso disponible"}
              </span>
            )}

            {carnetActual && (
              <span className="inline-flex rounded-full border border-primary/30 bg-primary-container px-3 py-1.5 font-mono text-sm font-bold text-on-primary-container">
                {
                  carnetActual.numeroCarnet
                }
              </span>
            )}
          </div>
        </div>

        {!socio.activo && (
          <div className="border-t border-error/30 bg-error-container px-5 py-4 text-sm text-on-error-container sm:px-6">
            <p className="font-bold">
              El socio está desactivado
            </p>

            <p className="mt-1">
              No podrá iniciar sesión ni
              consultar ningún carnet hasta
              que vuelva a activarse.
            </p>
          </div>
        )}

        {socio.activo &&
          !carnetActual && (
            <div className="border-t border-tertiary/30 bg-tertiary-container px-5 py-4 text-sm text-on-tertiary-container sm:px-6">
              <p className="font-bold">
                No tiene carnet para la
                temporada activa
              </p>

              <p className="mt-1">
                Puedes crear uno desde la
                sección de carnets si el
                socio debe tener acceso esta
                temporada.
              </p>
            </div>
          )}

        {socio.activo &&
          carnetActual &&
          accesoBloqueado && (
            <div className="border-t border-error/30 bg-error-container px-5 py-4 text-sm text-on-error-container sm:px-6">
              <p className="font-bold">
                El acceso al carnet está
                bloqueado temporalmente
              </p>

              <p className="mt-1">
                Se han producido demasiados
                intentos de inicio de sesión
                incorrectos. Un administrador
                puede desbloquear el acceso
                desde los datos del socio.
              </p>
            </div>
          )}
      </section>

      <nav
        className="grid gap-2 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-2 shadow-sm sm:grid-cols-2"
        aria-label="Secciones del socio"
      >
        {secciones.map(
          (seccion) => {
            const seleccionada =
              seccionActiva ===
              seccion.id;

            return (
              <button
                key={seccion.id}
                type="button"
                onClick={() =>
                  cambiarSeccion(
                    seccion.id,
                  )
                }
                className={`flex min-h-16 items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                  seleccionada
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface hover:bg-surface-container-low"
                }`}
                aria-current={
                  seleccionada
                    ? "page"
                    : undefined
                }
              >
                <span
                  className="inline-block h-6 w-6 shrink-0 bg-current mask-center mask-contain mask-no-repeat"
                  style={{
                    maskImage: `url('${seccion.icono}')`,

                    WebkitMaskImage: `url('${seccion.icono}')`,
                  }}
                  aria-hidden="true"
                />

                <span className="min-w-0">
                  <span className="block font-bold">
                    {
                      seccion.nombre
                    }
                  </span>

                  <span
                    className={`mt-0.5 block text-xs ${
                      seleccionada
                        ? "text-on-primary/80"
                        : "text-on-surface-variant"
                    }`}
                  >
                    {
                      seccion.descripcion
                    }
                  </span>
                </span>
              </button>
            );
          },
        )}
      </nav>

      {seccionActiva ===
        "datos" && (
        <div className="grid gap-6">
          <DatosSocioPanel
            socio={socio}
            puedeEditar={
              puedeEditar
            }
            alActualizar={
              actualizarSocio
            }
          />

          <EstadoAccesoSocioPanel
            socio={socio}
            puedeEditar={
              puedeEditar
            }
            alActualizar={
              actualizarSocio
            }
          />
        </div>
      )}

      {seccionActiva ===
        "carnets" && (
        <div className="grid gap-6">
          {puedeCrearCarnet &&
            !mostrandoFormularioCarnet && (
              <section className="flex flex-col gap-4 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <h2 className="text-lg font-bold text-on-surface">
                    Añadir un carnet
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                    Crea el carnet del socio
                    para una nueva temporada.
                    Se generarán un nuevo
                    número de socio y una
                    nueva contraseña
                    vinculados exclusivamente
                    a ese carnet.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setMostrandoFormularioCarnet(
                      true,
                    )
                  }
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-primary/90"
                >
                  <span
                    className="text-xl leading-none"
                    aria-hidden="true"
                  >
                    +
                  </span>

                  Crear carnet
                </button>
              </section>
            )}

          {puedeCrearCarnet &&
            mostrandoFormularioCarnet && (
              <FormularioNuevoCarnetSocio
                socioId={
                  socio.id
                }
                temporadas={
                  opciones.temporadas
                }
                tiposSocio={
                  tiposSocio
                }
                alCrear={
                  registrarCarnetCreado
                }
                alCancelar={() =>
                  setMostrandoFormularioCarnet(
                    false,
                  )
                }
              />
            )}

          <CarnetsSocioPanel
            socio={socio}
            tiposSocio={
              tiposSocio
            }
            puedeEditar={
              puedeEditar
            }
            alActualizar={
              actualizarSocio
            }
          />
        </div>
      )}
    </div>
  );
}