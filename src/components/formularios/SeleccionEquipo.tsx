import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import MensajeIA from "@components/MensajeIA";

import type { EquipoDisponible } from "@tipos/Equipo";

interface ConfiguracionSeleccionEquipo {
  requiereFbib: boolean;
  alContinuarSinEquipos?: () => void;
}

export const ContextoSeleccionEquipo =
  createContext<ConfiguracionSeleccionEquipo>({
    requiereFbib: false,
  });

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

type Propiedades =
  | PropiedadesSeleccionUnica
  | PropiedadesSeleccionMultiple;

interface GrupoCategoria {
  categoria: string;
  equipos: EquipoDisponible[];
}

const ordenCategorias = [
  "escoleta",
  "iniciacion",
  "premini",
  "mini",
  "infantil",
  "cadete",
  "junior",
  "senior",
];

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function obtenerPosicionCategoria(categoria: string): number {
  const texto = normalizarTexto(categoria);

  const posicion = ordenCategorias.findIndex((nombre) =>
    texto.includes(nombre),
  );

  return posicion === -1 ? ordenCategorias.length : posicion;
}

export default function SeleccionEquipo(propiedades: Propiedades) {
  const {
    requiereFbib,
    alContinuarSinEquipos,
  } = useContext(ContextoSeleccionEquipo);

  const [equipos, setEquipos] = useState<EquipoDisponible[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccionOmitida, setSeleccionOmitida] = useState(false);

  const esMultiple = propiedades.modo === "multiple";
  const maximo = esMultiple ? propiedades.maximo ?? 5 : 1;

  const seleccionConfirmada = esMultiple
    ? propiedades.seleccionConfirmada
    : propiedades.equipoSeleccionado !== null;

  const equiposSeleccionados = esMultiple
    ? propiedades.equiposSeleccionados
    : propiedades.equipoSeleccionado
      ? [propiedades.equipoSeleccionado]
      : [];

  const bloqueado = seleccionConfirmada || seleccionOmitida;

  const estaDisponible = (equipo: EquipoDisponible): boolean =>
    !requiereFbib || equipo.tieneVinculacionFbib === true;

  const cantidadDisponibles = equipos.filter(estaDisponible).length;

  const hayEquiposSinVincular =
    requiereFbib &&
    equipos.some((equipo) => !estaDisponible(equipo));

  const seleccionValida =
    !cargando &&
    !error &&
    equiposSeleccionados.length > 0 &&
    equiposSeleccionados.length <= maximo &&
    equiposSeleccionados.every((seleccionado) =>
      equipos.some(
        (equipo) =>
          equipo.id === seleccionado.id &&
          estaDisponible(equipo),
      ),
    );

  const equiposPorCategoria = useMemo<GrupoCategoria[]>(() => {
    const grupos = new Map<string, EquipoDisponible[]>();

    equipos.forEach((equipo) => {
      const categoria = equipo.categoria?.trim() || "Sin categoría";
      const grupo = grupos.get(categoria) ?? [];

      grupo.push(equipo);
      grupos.set(categoria, grupo);
    });

    return Array.from(grupos.entries())
      .map(([categoria, equiposCategoria]) => ({
        categoria,
        equipos: equiposCategoria.sort((primero, segundo) =>
          (primero.nombre ?? primero.nombreCorto ?? "").localeCompare(
            segundo.nombre ?? segundo.nombreCorto ?? "",
            "es",
          ),
        ),
      }))
      .sort((primero, segundo) => {
        const diferencia =
          obtenerPosicionCategoria(primero.categoria) -
          obtenerPosicionCategoria(segundo.categoria);

        return (
          diferencia ||
          primero.categoria.localeCompare(segundo.categoria, "es")
        );
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

        const resultado = (await respuesta.json()) as RespuestaEquipos;

        if (
          !respuesta.ok ||
          !resultado.ok ||
          !Array.isArray(resultado.data)
        ) {
          throw new Error(
            resultado.error ?? "No se han podido obtener los equipos",
          );
        }

        if (controlador.signal.aborted) return;

        setEquipos(
          resultado.data.filter(
            (equipo) => typeof equipo.id === "string",
          ),
        );
      } catch (error) {
        if (controlador.signal.aborted) return;

        console.error("Error al cargar los equipos:", error);
        setError("No se ha podido cargar la lista de equipos.");
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      }
    };

    void cargarEquipos();

    return () => controlador.abort();
  }, []);

  const alternarEquipo = (equipo: EquipoDisponible) => {
    if (bloqueado || cargando || error || !estaDisponible(equipo)) {
      return;
    }

    if (propiedades.modo !== "multiple") {
      propiedades.alSeleccionar(equipo);
      return;
    }

    const seleccionado = propiedades.equiposSeleccionados.some(
      (elemento) => elemento.id === equipo.id,
    );

    if (seleccionado) {
      propiedades.alCambiarSeleccion(
        propiedades.equiposSeleccionados.filter(
          (elemento) => elemento.id !== equipo.id,
        ),
      );
      return;
    }

    if (propiedades.equiposSeleccionados.length >= maximo) {
      return;
    }

    propiedades.alCambiarSeleccion([
      ...propiedades.equiposSeleccionados,
      equipo,
    ]);
  };

  const confirmarSeleccion = () => {
    if (
      propiedades.modo !== "multiple" ||
      bloqueado ||
      !seleccionValida
    ) {
      return;
    }

    propiedades.alConfirmar();
  };

  const continuarSinEquipos = () => {
    if (
      bloqueado ||
      cargando ||
      !alContinuarSinEquipos ||
      (!error && cantidadDisponibles > 0)
    ) {
      return;
    }

    setSeleccionOmitida(true);
    alContinuarSinEquipos();
  };

  return (
    <MensajeIA>
      <p className="font-semibold text-on-secondary-fixed">
        {esMultiple
          ? "¿Qué equipos quieres consultar?"
          : "¿Qué equipo quieres consultar?"}
      </p>

      <p className="mt-1 text-sm text-on-surface-variant">
        {esMultiple
          ? `Selecciona hasta ${maximo} equipos y confirma cuando hayas terminado:`
          : "Selecciona uno de los siguientes equipos:"}
      </p>

      {cargando && (
        <div
          className="mt-4 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm text-on-surface-variant"
          role="status"
        >
          Cargando equipos...
        </div>
      )}

      {!cargando && error && (
        <div
          className="mt-4 rounded-xl border border-error bg-error-container px-4 py-3 text-sm text-on-error-container"
          role="alert"
        >
          {error}
        </div>
      )}

      {!cargando && !error && equipos.length === 0 && (
        <p className="mt-4 text-sm text-on-surface-variant">
          No hay equipos disponibles en este momento.
        </p>
      )}

      {!cargando && !error && hayEquiposSinVincular && (
        <p className="mt-4 rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
          Esta consulta utiliza información de la FBIB. Los equipos
          que todavía no están vinculados aparecen en la lista,
          pero no se pueden seleccionar para esta consulta.
        </p>
      )}

      {!cargando && !error && equiposPorCategoria.length > 0 && (
        <div className="mt-5 flex flex-col gap-6">
          {equiposPorCategoria.map((grupo) => (
            <section key={grupo.categoria} className="w-full">
              <div className="relative mb-5 grid w-full grid-cols-[1fr_auto_1fr] place-items-center gap-x-2">
                <div
                  className="h-px w-full bg-on-secondary-fixed"
                  aria-hidden="true"
                />

                <p className="font-semibold uppercase">
                  {grupo.categoria}
                </p>

                <div
                  className="h-px w-full bg-on-secondary-fixed"
                  aria-hidden="true"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {grupo.equipos.map((equipo) => {
                  const seleccionado = equiposSeleccionados.some(
                    (elemento) => elemento.id === equipo.id,
                  );

                  const sinVinculacion = !estaDisponible(equipo);

                  const limiteAlcanzado =
                    esMultiple &&
                    equiposSeleccionados.length >= maximo &&
                    !seleccionado;

                  const deshabilitado =
                    bloqueado || sinVinculacion || limiteAlcanzado;

                  return (
                    <button
                      key={equipo.id}
                      type="button"
                      data-equipo={equipo.id}
                      disabled={deshabilitado}
                      aria-pressed={seleccionado}
                      onClick={() => alternarEquipo(equipo)}
                      className={`relative rounded-xl border px-4 py-3 text-left transition-colors ${
                        seleccionado
                          ? "border-secondary bg-secondary text-on-secondary"
                          : "border-outline-variant bg-surface-container-lowest text-on-secondary-fixed"
                      } ${
                        deshabilitado
                          ? "cursor-not-allowed"
                          : "cursor-pointer hover:border-on-secondary-fixed hover:bg-secondary-container"
                      } ${
                        sinVinculacion
                          ? "bg-surface-container opacity-60"
                          : deshabilitado && !seleccionado
                            ? "opacity-50"
                            : ""
                      }`}
                    >
                      <span className="block pr-7 font-semibold">
                        {equipo.nombre ?? equipo.nombreCorto ?? "Equipo"}
                      </span>

                      {sinVinculacion && (
                        <span className="mt-2 block text-xs font-medium">
                          No disponible para esta consulta
                        </span>
                      )}

                      {esMultiple && !sinVinculacion && (
                        <span
                          className={`absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-bold ${
                            seleccionado
                              ? "border-on-secondary bg-on-secondary text-secondary"
                              : "border-outline-variant text-transparent"
                          }`}
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {cantidadDisponibles === 0 && (
            <p className="text-sm text-on-surface-variant">
              Ningún equipo está disponible para esta consulta
              en este momento.
            </p>
          )}

          {esMultiple && !bloqueado && cantidadDisponibles > 0 && (
            <div className="sticky bottom-3 z-10 flex justify-center pt-2">
              <button
                type="button"
                disabled={!seleccionValida}
                onClick={confirmarSeleccion}
                className="rounded-full bg-primary-container px-6 py-3 font-semibold text-on-primary-container shadow-md transition-colors hover:bg-primary-fixed-dim disabled:cursor-not-allowed disabled:opacity-50"
              >
                {equiposSeleccionados.length === 0
                  ? "Selecciona al menos un equipo"
                  : `Consultar ${equiposSeleccionados.length} ${
                      equiposSeleccionados.length === 1
                        ? "equipo"
                        : "equipos"
                    }`}
              </button>
            </div>
          )}
        </div>
      )}

      {!cargando &&
        !bloqueado &&
        alContinuarSinEquipos &&
        (error || cantidadDisponibles === 0) && (
          <button
            type="button"
            onClick={continuarSinEquipos}
            className="mt-4 rounded-full border border-secondary px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-secondary hover:text-on-secondary"
          >
            Continuar
          </button>
        )}
    </MensajeIA>
  );
}