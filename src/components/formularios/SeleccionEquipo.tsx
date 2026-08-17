import { useEffect, useMemo, useState } from "react";

import MensajeIA from "@components/MensajeIA";

import type { EquipoDisponible } from "@tipos/Equipo";

interface RespuestaEquipos {
  ok: boolean;
  data: EquipoDisponible[];
  total: number;
  error?: string;
}

interface PropiedadesSeleccionUnica {
  modo?: "unico";
  equipoSeleccionado: EquipoDisponible | null;
  alSeleccionar: (equipo: EquipoDisponible) => void;
}

interface PropiedadesSeleccionMultiple {
  modo: "multiple";
  equiposSeleccionados: EquipoDisponible[];
  seleccionConfirmada: boolean;
  maximo?: number;
  alCambiarSeleccion: (equipos: EquipoDisponible[]) => void;
  alConfirmar: () => void;
}

type Propiedades = PropiedadesSeleccionUnica | PropiedadesSeleccionMultiple;

interface GrupoCategoria {
  categoria: string;
  equipos: EquipoDisponible[];
}

const ordenCategorias = ["escoleta", "iniciacion", "premini", "mini", "infantil", "cadete", "junior", "senior"];

function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function obtenerPosicionCategoria(categoria: string): number {
  const categoriaNormalizada = normalizarTexto(categoria);
  const posicion = ordenCategorias.findIndex((nombreCategoria) => categoriaNormalizada.includes(nombreCategoria));

  return posicion === -1 ? ordenCategorias.length : posicion;
}

export default function SeleccionEquipo(propiedades: Propiedades) {
  const [equipos, setEquipos] = useState<EquipoDisponible[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const esMultiple = propiedades.modo === "multiple";
  const maximo = esMultiple ? propiedades.maximo ?? 5 : 1;
  const seleccionConfirmada = esMultiple ? propiedades.seleccionConfirmada : propiedades.equipoSeleccionado !== null;
  const equiposSeleccionados = esMultiple ? propiedades.equiposSeleccionados : propiedades.equipoSeleccionado ? [propiedades.equipoSeleccionado] : [];

  const equiposPorCategoria = useMemo<GrupoCategoria[]>(() => {
    const grupos = new Map<string, EquipoDisponible[]>();

    equipos.forEach((equipo) => {
      const categoria = equipo.categoria?.trim() || "Sin categoría";
      const equiposCategoria = grupos.get(categoria) ?? [];

      equiposCategoria.push(equipo);
      grupos.set(categoria, equiposCategoria);
    });

    return Array.from(grupos.entries())
      .map(([categoria, equiposCategoria]) => ({
        categoria,
        equipos: equiposCategoria.sort((primerEquipo, segundoEquipo) => {
          const primerNombre = primerEquipo.nombre ?? primerEquipo.nombreCorto ?? "";
          const segundoNombre = segundoEquipo.nombre ?? segundoEquipo.nombreCorto ?? "";

          return primerNombre.localeCompare(segundoNombre, "es");
        }),
      }))
      .sort((primerGrupo, segundoGrupo) => {
        const primeraPosicion = obtenerPosicionCategoria(primerGrupo.categoria);
        const segundaPosicion = obtenerPosicionCategoria(segundoGrupo.categoria);

        if (primeraPosicion !== segundaPosicion) {
          return primeraPosicion - segundaPosicion;
        }

        return primerGrupo.categoria.localeCompare(segundoGrupo.categoria, "es");
      });
  }, [equipos]);

  useEffect(() => {
    const controlador = new AbortController();

    const cargarEquipos = async () => {
      try {
        setCargando(true);
        setError(null);

        const respuesta = await fetch("/api/equipos/disponibles", {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
          signal: controlador.signal,
        });

        if (!respuesta.ok) {
          throw new Error("No se han podido obtener los equipos");
        }

        const resultado = (await respuesta.json()) as RespuestaEquipos;

        if (!resultado.ok) {
          throw new Error(resultado.error ?? "No se han podido obtener los equipos");
        }

        const equiposValidos = resultado.data.filter((equipo) => typeof equipo.id === "string");

        setEquipos(equiposValidos);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Error al cargar los equipos:", error);
        setError("No se ha podido cargar la lista de equipos.");
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      }
    };

    cargarEquipos();

    return () => {
      controlador.abort();
    };
  }, []);

  const alternarEquipo = (equipo: EquipoDisponible) => {
    if (seleccionConfirmada) {
      return;
    }

    if (propiedades.modo !== "multiple") {
      propiedades.alSeleccionar(equipo);
      return;
    }

    const estaSeleccionado = propiedades.equiposSeleccionados.some((equipoSeleccionado) => equipoSeleccionado.id === equipo.id);

    if (estaSeleccionado) {
      propiedades.alCambiarSeleccion(propiedades.equiposSeleccionados.filter((equipoSeleccionado) => equipoSeleccionado.id !== equipo.id));
      return;
    }

    if (propiedades.equiposSeleccionados.length >= maximo) {
      return;
    }

    propiedades.alCambiarSeleccion([...propiedades.equiposSeleccionados, equipo]);
  };

  const confirmarSeleccion = () => {
    if (propiedades.modo !== "multiple" || propiedades.equiposSeleccionados.length === 0) {
      return;
    }

    propiedades.alConfirmar();
  };

  return (
    <MensajeIA>
      <p className="font-semibold text-on-secondary-fixed">{esMultiple ? "¿Qué equipos quieres consultar?" : "¿Qué equipo quieres consultar?"}</p>

      <p className="mt-1 text-sm text-on-surface-variant">
        {esMultiple ? `Selecciona hasta ${maximo} equipos y confirma cuando hayas terminado:` : "Selecciona uno de los siguientes equipos:"}
      </p>

      {cargando && (
        <div className="mt-4 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm text-on-surface-variant" role="status">
          Cargando equipos...
        </div>
      )}

      {!cargando && error && (
        <div className="mt-4 rounded-xl border border-error bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
          {error}
        </div>
      )}

      {!cargando && !error && equipos.length === 0 && (
        <div className="mt-4 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm text-on-surface-variant">
          No hay equipos disponibles en este momento.
        </div>
      )}

      {!cargando && !error && equiposPorCategoria.length > 0 && (
        <div className="mt-5 flex flex-col gap-6">
          {equiposPorCategoria.map((grupo) => (
            <section key={grupo.categoria} className="w-full">
              <div className="relative mb-5 grid h-auto w-full grid-cols-[1fr_auto_1fr] place-items-center gap-x-2">
                <div className="h-px w-full bg-on-secondary-fixed" aria-hidden="true" />
                <p className="font-semibold uppercase">{grupo.categoria}</p>
                <div className="h-px w-full bg-on-secondary-fixed" aria-hidden="true" />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {grupo.equipos.map((equipo) => {
                  const estaSeleccionado = equiposSeleccionados.some((equipoSeleccionado) => equipoSeleccionado.id === equipo.id);
                  const limiteAlcanzado = esMultiple && equiposSeleccionados.length >= maximo && !estaSeleccionado;
                  const estaDeshabilitado = seleccionConfirmada || limiteAlcanzado;

                  const clasesBoton = [
                    "relative rounded-xl border px-4 py-3 text-left transition-colors",
                    estaSeleccionado ? "border-secondary bg-secondary text-on-secondary opacity-100" : "border-outline-variant bg-surface-container-lowest text-on-secondary-fixed",
                    !estaDeshabilitado ? "cursor-pointer hover:border-on-secondary-fixed hover:bg-secondary-container" : "cursor-not-allowed",
                    estaDeshabilitado && !estaSeleccionado ? "opacity-50" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <button key={equipo.id} type="button" data-equipo={equipo.id} disabled={estaDeshabilitado} onClick={() => alternarEquipo(equipo)} className={clasesBoton} aria-pressed={estaSeleccionado}>
                      <span className="block pr-7 font-semibold">{equipo.nombre ?? equipo.nombreCorto ?? "Equipo"}</span>

                      {esMultiple && (
                        <span className={`absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-bold ${estaSeleccionado ? "border-on-secondary bg-on-secondary text-secondary" : "border-outline-variant text-transparent"}`} aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {esMultiple && !seleccionConfirmada && (
            <div className="sticky bottom-3 z-10 flex justify-center pt-2">
              <button type="button" disabled={equiposSeleccionados.length === 0} onClick={confirmarSeleccion} className="rounded-full bg-primary-container px-6 py-3 font-semibold text-on-primary-container shadow-md transition-colors hover:bg-primary-fixed-dim disabled:cursor-not-allowed disabled:opacity-50">
                {equiposSeleccionados.length === 0 ? "Selecciona al menos un equipo" : `Consultar ${equiposSeleccionados.length} ${equiposSeleccionados.length === 1 ? "equipo" : "equipos"}`}
              </button>
            </div>
          )}
        </div>
      )}
    </MensajeIA>
  );
}