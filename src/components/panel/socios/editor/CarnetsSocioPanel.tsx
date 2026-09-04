import {
  useMemo,
} from "react";

import TarjetaCarnetSocioPanel from "./TarjetaCarnetSocioPanel";

import type {
  CarnetTemporadaSocio,
  SocioPanel,
} from "@tipos/SocioPanel";

interface Propiedades {
  socio: SocioPanel;
  tiposSocio: string[];
  puedeEditar: boolean;

  alActualizar: (
    socio: SocioPanel,
  ) => void;
}

function obtenerMarcaTiempo(
  carnet:
    CarnetTemporadaSocio,
): number {
  const fecha =
    carnet.temporada
      .fechaInicio ||
    carnet.fechaAlta ||
    carnet.createdAt ||
    carnet.updatedAt;

  if (!fecha) {
    return 0;
  }

  const marcaTiempo =
    new Date(
      fecha,
    ).getTime();

  return Number.isNaN(
    marcaTiempo,
  )
    ? 0
    : marcaTiempo;
}

function ordenarCarnets(
  carnets:
    CarnetTemporadaSocio[],
): CarnetTemporadaSocio[] {
  return [...carnets].sort(
    (
      carnetA,
      carnetB,
    ) => {
      const activaA =
        carnetA.temporada
          .activa
          ? 1
          : 0;

      const activaB =
        carnetB.temporada
          .activa
          ? 1
          : 0;

      if (
        activaA !== activaB
      ) {
        return (
          activaB -
          activaA
        );
      }

      const fechaA =
        obtenerMarcaTiempo(
          carnetA,
        );

      const fechaB =
        obtenerMarcaTiempo(
          carnetB,
        );

      if (
        fechaA !== fechaB
      ) {
        return (
          fechaB -
          fechaA
        );
      }

      return (
        carnetB.numeroSocio -
        carnetA.numeroSocio
      );
    },
  );
}

export default function CarnetsSocioPanel({
  socio,
  tiposSocio,
  puedeEditar,
  alActualizar,
}: Propiedades) {
  const carnetsOrdenados =
    useMemo(
      () =>
        ordenarCarnets(
          socio.carnets,
        ),
      [socio.carnets],
    );

  const carnetActivo =
    carnetsOrdenados.find(
      (carnet) =>
        carnet.estado ===
          "activo" &&
        carnet.temporada
          .activa,
    ) ?? null;

  const totalActivos =
    carnetsOrdenados.filter(
      (carnet) =>
        carnet.estado ===
        "activo",
    ).length;

  const totalBloqueados =
    carnetsOrdenados.filter(
      (carnet) =>
        carnet.estado ===
        "bloqueado",
    ).length;

  return (
    <section
      className="space-y-5"
      aria-labelledby="titulo-carnets-socio"
    >
      <header className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Historial del socio
            </p>

            <h2
              id="titulo-carnets-socio"
              className="mt-1 text-xl font-bold text-on-surface sm:text-2xl"
            >
              Carnets por temporada
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
              Cada temporada dispone de su propio número de socio, número de carnet y estado de acceso. Los carnets anteriores se conservan como historial.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-80">
            <div className="rounded-xl bg-surface-container-low px-3 py-3 text-center">
              <p className="text-xl font-black text-on-surface">
                {
                  carnetsOrdenados.length
                }
              </p>

              <p className="mt-0.5 text-xs text-on-surface-variant">
                Total
              </p>
            </div>

            <div className="rounded-xl bg-success-container px-3 py-3 text-center text-on-success-container">
              <p className="text-xl font-black">
                {totalActivos}
              </p>

              <p className="mt-0.5 text-xs">
                Activos
              </p>
            </div>

            <div className="rounded-xl bg-error-container px-3 py-3 text-center text-on-error-container">
              <p className="text-xl font-black">
                {
                  totalBloqueados
                }
              </p>

              <p className="mt-0.5 text-xs">
                Bloqueados
              </p>
            </div>
          </div>
        </div>

        {carnetActivo ? (
          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-success/30 bg-success-container px-4 py-4 text-on-success-container sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide">
                Carnet vigente
              </p>

              <p className="mt-1 font-mono text-lg font-black tracking-wide">
                {
                  carnetActivo.numeroCarnet
                }
              </p>

              <p className="mt-1 text-xs font-bold">
                Socio nº{" "}
                {
                  carnetActivo.numeroSocio
                }
              </p>
            </div>

            <div className="text-sm sm:text-right">
              <p className="font-semibold">
                {
                  carnetActivo.temporada
                    .nombre
                }
              </p>

              <p className="mt-0.5 text-xs opacity-80">
                {carnetActivo.tipoSocio ??
                  "Socio general"}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-tertiary/30 bg-tertiary-container px-4 py-4 text-on-tertiary-container">
            <p className="text-sm font-bold">
              No existe un carnet activo para la temporada actual
            </p>

            <p className="mt-1 text-xs leading-5 opacity-85">
              Puedes crear un carnet nuevo o revisar el estado del carnet correspondiente a la temporada activa.
            </p>
          </div>
        )}
      </header>

      {carnetsOrdenados.length >
      0 ? (
        <div className="grid gap-5">
          {carnetsOrdenados.map(
            (carnet) => (
              <TarjetaCarnetSocioPanel
                key={
                  carnet.id
                }
                socioId={
                  socio.id
                }
                carnet={
                  carnet
                }
                tiposSocio={
                  tiposSocio
                }
                puedeEditar={
                  puedeEditar
                }
                alActualizar={
                  alActualizar
                }
              />
            ),
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-8 text-center sm:p-10">
          <span
            className="mx-auto inline-block h-12 w-12 bg-outline mask-center mask-contain mask-no-repeat"
            style={{
              maskImage:
                "url('/iconos/panel/carnet.svg')",

              WebkitMaskImage:
                "url('/iconos/panel/carnet.svg')",
            }}
            aria-hidden="true"
          />

          <h3 className="mt-4 text-lg font-bold text-on-surface">
            Todavía no tiene carnets
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-on-surface-variant">
            Este socio todavía no ha sido asociado a ninguna temporada. Puedes crear su primer carnet desde el formulario correspondiente.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low px-4 py-3">
        <p className="text-xs leading-5 text-on-surface-variant">
          El número de socio y el número de carnet se asignan de nuevo en cada temporada. La contraseña de acceso permanece igual a la establecida con el primer carnet. Bloquear o caducar un carnet no genera una contraseña nueva.
        </p>
      </div>
    </section>
  );
}