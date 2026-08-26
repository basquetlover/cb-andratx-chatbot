import { useState } from "react";

import DatosEquipo from "@components/panel/equipos/editor/DatosEquipo";
import EntrenamientosEquipo from "@components/panel/equipos/editor/EntrenamientosEquipo";
import IntegracionesEquipo from "@components/panel/equipos/editor/IntegracionesEquipo";
import PatrocinadoresEquipo from "@components/panel/equipos/editor/PatrocinadoresEquipo";

import type {
  DatosGeneralesEquipoDetalle,
  EquipoDetallePanel,
  IntegracionesEquipoDetalle,
  PatrocinadoresEquipoDetalle,
} from "@tipos/EquipoDetallePanel";

interface Propiedades {
  equipoInicial: EquipoDetallePanel;
}

type SeccionEditorEquipo =
  | "datos"
  | "entrenamientos"
  | "patrocinadores"
  | "integraciones";

interface SeccionDisponible {
  id: SeccionEditorEquipo;
  nombre: string;
  nombreCorto: string;
  icono: string;
}

const secciones: SeccionDisponible[] = [
  {
    id: "datos",
    nombre: "Datos del equipo",
    nombreCorto: "Datos",
    icono: "informacion",
  },
  {
    id: "entrenamientos",
    nombre: "Entrenamientos",
    nombreCorto: "Entrenos",
    icono: "equipos",
  },
  {
    id: "patrocinadores",
    nombre: "Patrocinadores",
    nombreCorto: "Sponsors",
    icono: "sponsors",
  },
  {
    id: "integraciones",
    nombre: "Integraciones",
    nombreCorto: "Integraciones",
    icono: "integracion",
  },
];

function obtenerIniciales(
  nombreEquipo: string,
): string {
  const palabras = nombreEquipo
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (palabras.length === 0) {
    return "CB";
  }

  return palabras
    .slice(0, 2)
    .map((palabra) =>
      palabra.charAt(0).toUpperCase(),
    )
    .join("");
}

function formatearFecha(fecha: string): string {
  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return "Sin información";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(fechaConvertida);
}

export default function EditorEquipo({
  equipoInicial,
}: Propiedades) {
  const [equipo, setEquipo] =
    useState(equipoInicial);

  const [seccionActual, setSeccionActual] =
    useState<SeccionEditorEquipo>("datos");

  const actualizarDatosEquipo = (
    datosGenerales: DatosGeneralesEquipoDetalle,
  ) => {
    setEquipo((equipoActual) => ({
      ...equipoActual,
      datosGenerales,
    }));
  };

  const actualizarPatrocinadores = (
    patrocinadores: PatrocinadoresEquipoDetalle,
  ) => {
    setEquipo((equipoActual) => ({
      ...equipoActual,
      patrocinadores,
    }));
  };

  const actualizarIntegraciones = (
    integraciones: IntegracionesEquipoDetalle,
  ) => {
    setEquipo((equipoActual) => ({
      ...equipoActual,
      integraciones,
    }));
  };

  const datos = equipo.datosGenerales;

  const descripcionEquipo = [
    datos.categoria,
    datos.genero,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="w-full">
      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="h-max overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm xl:sticky xl:top-28">
          <div className="bg-primary px-5 py-6 text-on-primary">
            <div className="flex items-center gap-4">
              {datos.imagen ? (
                <img
                  src={datos.imagen}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-2xl border-2 border-on-primary/30 bg-white object-contain p-1.5"
                />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-on-primary/30 bg-on-primary/10 text-lg font-bold">
                  {obtenerIniciales(datos.nombre)}
                </span>
              )}

              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold">
                  {datos.nombre}
                </h2>

                {datos.nombreCorto && (
                  <p className="mt-0.5 truncate text-sm text-on-primary/85">
                    {datos.nombreCorto}
                  </p>
                )}

                <p className="mt-1 truncate text-xs text-on-primary/70">
                  {descripcionEquipo}
                </p>
              </div>
            </div>

            <span
              className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                datos.activo
                  ? "bg-success-container text-on-success-container"
                  : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-current"
                aria-hidden="true"
              />

              {datos.activo ? "Activo" : "Inactivo"}
            </span>
          </div>

          <nav
            className="flex gap-2 overflow-x-auto p-3 xl:flex-col"
            aria-label="Secciones del equipo"
          >
            {secciones.map((seccion) => {
              const estaSeleccionada =
                seccionActual === seccion.id;

              return (
                <button
                  key={seccion.id}
                  type="button"
                  onClick={() =>
                    setSeccionActual(seccion.id)
                  }
                  className={`flex min-w-max items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors xl:w-full ${
                    estaSeleccionada
                      ? "bg-primary-fixed text-on-primary-fixed"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-primary"
                  }`}
                  aria-current={
                    estaSeleccionada
                      ? "page"
                      : undefined
                  }
                >
                  <span
                    className="inline-block h-5 w-5 shrink-0 bg-current mask-center mask-contain mask-no-repeat"
                    style={{
                      maskImage: `url('/iconos/panel/${seccion.icono}.svg')`,
                      WebkitMaskImage: `url('/iconos/panel/${seccion.icono}.svg')`,
                    }}
                    aria-hidden="true"
                  />

                  <span className="hidden xl:inline">
                    {seccion.nombre}
                  </span>

                  <span className="xl:hidden">
                    {seccion.nombreCorto}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="border-t border-outline-variant/60 bg-surface-container-low p-4">
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  Temporada
                </dt>

                <dd className="mt-1 text-on-surface">
                  {datos.temporada.nombre}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  Creado
                </dt>

                <dd className="mt-1 text-on-surface">
                  {formatearFecha(
                    equipo.administracion.createdAt,
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  Última modificación
                </dt>

                <dd className="mt-1 text-on-surface">
                  {formatearFecha(
                    equipo.administracion.updatedAt,
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </aside>

        <div className="min-w-0">
          {seccionActual === "datos" && (
            <DatosEquipo
              equipoId={equipo.id}
              datosIniciales={equipo.datosGenerales}
              alActualizar={actualizarDatosEquipo}
            />
          )}

          {seccionActual ===
            "entrenamientos" && (
            <EntrenamientosEquipo
              equipoId={equipo.id}
              temporadaId={
                equipo.datosGenerales.temporada.id
              }
            />
          )}

          {seccionActual ===
            "patrocinadores" && (
            <PatrocinadoresEquipo
              equipoId={equipo.id}
              datosIniciales={
                equipo.patrocinadores
              }
              alActualizar={
                actualizarPatrocinadores
              }
            />
          )}

          {seccionActual ===
            "integraciones" && (
            <IntegracionesEquipo
              equipoId={equipo.id}
              datosIniciales={
                equipo.integraciones
              }
              alActualizar={
                actualizarIntegraciones
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}