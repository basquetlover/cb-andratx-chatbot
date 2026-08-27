import {
  useEffect,
  useState,
} from "react";

import {
  alternarEquipoFavorito,
  esEquipoFavorito,
  escucharCambiosFavoritos,
} from "@servicios/favoritos/equiposFavoritos";

import type { DatosEquipoPublico } from "@tipos/EquipoPublico";

interface Propiedades {
  equipo: DatosEquipoPublico;
}

function obtenerIniciales(
  nombre: string,
): string {
  const palabras = nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (palabras.length === 0) {
    return "CB";
  }

  if (palabras.length === 1) {
    return palabras[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return palabras
    .slice(0, 2)
    .map((palabra) =>
      palabra.charAt(0),
    )
    .join("")
    .toUpperCase();
}

function obtenerEtiquetaEquipo(
  equipo: DatosEquipoPublico,
): string {
  return [
    equipo.categoria,
    equipo.genero,
  ]
    .filter(Boolean)
    .join(" · ");
}

function IconoEstrella({
  rellena,
}: {
  rellena: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="m12 2.75 2.86 5.8 6.4.93-4.63 4.51 1.1 6.37L12 17.35l-5.73 3.01 1.1-6.37-4.63-4.51 6.4-.93L12 2.75Z"
        fill={
          rellena
            ? "currentColor"
            : "none"
        }
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ResumenEquipoPublico({
  equipo,
}: Propiedades) {
  const [favorito, setFavorito] =
    useState(false);

  const [
    favoritosCargados,
    setFavoritosCargados,
  ] = useState(false);

  useEffect(() => {
    const temporadaId =
      equipo.temporada?.id;

    setFavoritosCargados(false);

    if (!temporadaId) {
      setFavorito(false);
      setFavoritosCargados(true);

      return;
    }

    setFavorito(
      esEquipoFavorito(
        temporadaId,
        equipo.id,
      ),
    );

    setFavoritosCargados(true);

    const dejarDeEscuchar =
      escucharCambiosFavoritos(
        temporadaId,
        (equiposIds) => {
          setFavorito(
            equiposIds.includes(
              equipo.id,
            ),
          );
        },
      );

    return dejarDeEscuchar;
  }, [
    equipo.id,
    equipo.temporada?.id,
  ]);

  const cambiarFavorito = () => {
    const temporadaId =
      equipo.temporada?.id;

    if (!temporadaId) {
      return;
    }

    const resultado =
      alternarEquipoFavorito(
        temporadaId,
        equipo.id,
      );

    setFavorito(
      resultado.esFavorito,
    );
  };

  const etiqueta =
    obtenerEtiquetaEquipo(equipo);

  const nombre =
    equipo.nombreCorto?.trim() ||
    equipo.nombre;

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="relative flex min-h-28 items-center justify-center overflow-hidden bg-primary-fixed p-5">
        <span
          className="absolute -right-8 -top-8 h-32 w-32 rounded-full border-2 border-primary/10"
          aria-hidden="true"
        />

        <span
          className="absolute -right-2 top-7 h-24 w-24 rounded-full border-2 border-primary/10"
          aria-hidden="true"
        />

        <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-surface-container-lowest text-2xl font-black text-primary shadow-sm">
          {equipo.imagen ? (
            <img
              src={equipo.imagen}
              alt={`Escudo de ${equipo.nombre}`}
              className="h-full w-full object-contain p-2"
            />
          ) : (
            obtenerIniciales(
              equipo.nombre,
            )
          )}
        </div>
      </div>

      <div className="p-5 text-center">
        {etiqueta && (
          <p className="mx-auto mb-3 w-fit rounded-full bg-tertiary-fixed px-3 py-1 text-xs font-bold text-on-tertiary-fixed">
            {etiqueta}
          </p>
        )}

        <h1 className="text-2xl font-black leading-tight text-on-surface">
          {nombre}
        </h1>

        {equipo.nivel && (
          <p className="mt-1 text-sm font-semibold text-on-surface-variant">
            {equipo.nivel}
          </p>
        )}

        {equipo.temporada && (
          <p className="mt-1 text-xs text-outline">
            Temporada{" "}
            {equipo.temporada.nombre}
          </p>
        )}

        <button
          type="button"
          onClick={cambiarFavorito}
          disabled={
            !favoritosCargados ||
            !equipo.temporada
          }
          aria-pressed={favorito}
          className={`mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
            favorito
              ? "border-primary bg-primary text-on-primary shadow-sm"
              : "border-primary bg-transparent text-primary hover:bg-primary hover:text-on-primary"
          }`}
        >
          <IconoEstrella
            rellena={favorito}
          />

          {!favoritosCargados
            ? "Cargando..."
            : favorito
              ? "En favoritos"
              : "Añadir a favoritos"}
        </button>
      </div>
    </section>
  );
}