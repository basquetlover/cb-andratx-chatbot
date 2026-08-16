import { useEffect, useMemo, useState } from "react";

import MensajeIA from "@components/MensajeIA";

interface EquipoDisponible {
  id: string;
  nombre: string | null;
  nombreCorto: string | null;
  categoria: string | null;
  genero: string | null;
  nivel: string | null;
  imagen: string | null;
}

interface RespuestaEquipos {
  ok: boolean;
  data: EquipoDisponible[];
  total: number;
  error?: string;
}

interface Propiedades {
  equipoSeleccionado: EquipoDisponible | null;
  alSeleccionar: (equipo: EquipoDisponible) => void;
}

interface GrupoCategoria {
  categoria: string;
  equipos: EquipoDisponible[];
}

const ordenCategorias = [
  "escoleta",
  "iniciacion",
  "babybasket",
  "premini",
  "mini",
  "infantil",
  "cadete",
  "junior",
  "sub 21",
  "senior",
];

function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function obtenerPosicionCategoria(categoria: string): number {
  const categoriaNormalizada = normalizarTexto(categoria);
  const posicion = ordenCategorias.findIndex((nombreCategoria) => categoriaNormalizada.includes(nombreCategoria));

  return posicion === -1 ? ordenCategorias.length : posicion;
}

export default function SeleccionEquipo({ equipoSeleccionado, alSeleccionar }: Propiedades) {
  const [equipos, setEquipos] = useState<EquipoDisponible[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const hayEquipoSeleccionado = equipoSeleccionado !== null;

  return (
    <MensajeIA>
      <p className="font-semibold text-on-secondary-fixed">
        ¿Qué equipo quieres consultar?
      </p>

      <p className="mt-1 text-sm text-on-surface-variant">
        Selecciona uno de los siguientes equipos:
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
              {/* <h3 className="mb-3 border-b border-outline-variant pb-2 font-semibold text-on-secondary-fixed">
                {grupo.categoria}
              </h3> */}
              <div className="w-full grid grid-cols-[1fr_auto_1fr] gap-x-2 place-items-center relative h-auto mb-5">
                <div className="w-full h-px bg-on-secondary-fixed">&nbsp;</div>
                <p className=" uppercase font-semibold">{grupo.categoria}</p>
                <div className="w-full h-px bg-on-secondary-fixed">&nbsp;</div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {grupo.equipos.map((equipo) => {
                  const estaSeleccionado = equipoSeleccionado?.id === equipo.id;

                  const clasesBoton = [
                    "rounded-xl border px-4 py-3 text-left transition-colors",
                    estaSeleccionado
                      ? "border-secondary bg-secondary text-on-secondary opacity-100"
                      : "border-outline-variant bg-surface-container-lowest text-on-secondary-fixed",
                    !hayEquipoSeleccionado
                      ? "cursor-pointer hover:border-on-secondary-fixed hover:bg-secondary-container"
                      : "",
                    hayEquipoSeleccionado && !estaSeleccionado
                      ? "cursor-not-allowed"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  const clasesInformacion = estaSeleccionado
                    ? "mt-1 block text-sm text-on-secondary"
                    : "mt-1 block text-sm text-on-surface-variant";

                  return (
                    <button key={equipo.id} type="button" data-equipo={equipo.id} disabled={hayEquipoSeleccionado} onClick={() => alSeleccionar(equipo)} className={clasesBoton}>
                      <span className="block font-semibold">
                        {equipo.nombre ?? equipo.nombreCorto ?? "Equipo"}
                      </span>

                      {/* {(equipo.genero || equipo.nivel) && (
                        <span className={clasesInformacion}>
                          {[equipo.genero, equipo.nivel].filter(Boolean).join(" · ")}
                        </span>
                      )} */}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </MensajeIA>
  );
}