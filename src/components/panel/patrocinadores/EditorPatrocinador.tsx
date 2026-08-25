import { useState } from "react";

import ImagenesPatrocinador from "@components/panel/patrocinadores/editor/ImagenesPatrocinador";
import InformacionPatrocinador from "@components/panel/patrocinadores/editor/InformacionPatrocinador";
import EquiposPatrocinador from "@components/panel/patrocinadores/editor/EquiposPatrocinador";
import RedesSocialesPatrocinador from "@components/panel/patrocinadores/editor/RedesSocialesPatrocinador";

import type { InformacionPatrocinadorActualizada, PatrocinadorListadoPanel } from "@tipos/PatrocinadorPanel";

type SeccionEditor = "informacion" | "imagenes" | "equipos" | "redes";

interface Propiedades {
  patrocinadorInicial: PatrocinadorListadoPanel;
}

const secciones: Array<{
  id: SeccionEditor;
  nombre: string;
  icono: string;
}> = [
  {
    id: "informacion",
    nombre: "Información",
    icono: "informacion",
  },
  {
    id: "imagenes",
    nombre: "Identidad visual",
    icono: "imagen",
  },
  {
    id: "equipos",
    nombre: "Equipos patrocinados",
    icono: "equipos",
  },
  {
    id: "redes",
    nombre: "Redes sociales",
    icono: "web",
  },
];

export default function EditorPatrocinador({ patrocinadorInicial }: Propiedades) {
  const [patrocinador, setPatrocinador] = useState(patrocinadorInicial);
  const [seccionActual, setSeccionActual] = useState<SeccionEditor>("informacion");

  const actualizarInformacion = (datos: InformacionPatrocinadorActualizada) => {
    setPatrocinador((patrocinadorActual) => ({
      ...patrocinadorActual,
      nombre: datos.nombre,
      nombreCorto: datos.nombreCorto,
      slug: datos.slug,
      descripcion: datos.descripcion,
      web: datos.web,
      activo: datos.activo,
    }));
  };

  const actualizarImagenes = (logo: string | null, banner: string | null) => {
    setPatrocinador((patrocinadorActual) => ({
      ...patrocinadorActual,
      logo,
      banner,
    }));
  };

  const actualizarEquipos = (equipos: PatrocinadorListadoPanel["equipos"]) => {
  setPatrocinador((patrocinadorActual) => ({
    ...patrocinadorActual,
    equipos,
  }));
};

const actualizarRedes = (redes: PatrocinadorListadoPanel["redes"]) => {
  setPatrocinador((patrocinadorActual) => ({
    ...patrocinadorActual,
    redes,
  }));
};

  return (
    <section className="flex flex-col gap-5">
      <article className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
        {patrocinador.banner && (
          <div className="h-32 w-full bg-surface-container-low sm:h-40">
            <img src={patrocinador.banner} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low text-2xl font-bold text-primary">
            {patrocinador.nombre.charAt(0).toUpperCase()}

            {patrocinador.logo && <img src={patrocinador.logo} alt={`Logotipo de ${patrocinador.nombre}`} className="absolute inset-0 h-full w-full bg-surface-container-lowest object-contain p-2" />}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-on-surface">{patrocinador.nombre}</h2>

              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${patrocinador.activo ? "border-success/30 bg-success-container text-on-success-container" : "border-outline-variant bg-surface-container text-on-surface-variant"}`}>
                {patrocinador.activo ? "Activo" : "Inactivo"}
              </span>
            </div>

            {patrocinador.nombreCorto && <p className="mt-1 text-sm text-on-surface-variant">{patrocinador.nombreCorto}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
              <span>{patrocinador.equipos.length === 1 ? "1 equipo patrocinado" : `${patrocinador.equipos.length} equipos patrocinados`}</span>

              {patrocinador.web && (
                <a href={patrocinador.web} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                  Visitar página web
                </a>
              )}
            </div>
          </div>
        </div>
      </article>

      <nav className="overflow-x-auto rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-2 shadow-sm" aria-label="Apartados del patrocinador">
        <div className="flex min-w-max gap-1">
          {secciones.map((seccion) => (
            <button key={seccion.id} type="button" onClick={() => setSeccionActual(seccion.id)} className={`flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${seccionActual === seccion.id ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-primary-fixed hover:text-primary"}`} aria-current={seccionActual === seccion.id ? "page" : undefined}>
              <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: `url('/iconos/panel/${seccion.icono}.svg')`, WebkitMaskImage: `url('/iconos/panel/${seccion.icono}.svg')` }} aria-hidden="true" />
              {seccion.nombre}
            </button>
          ))}
        </div>
      </nav>

      {seccionActual === "informacion" && (
        <InformacionPatrocinador
          patrocinadorId={patrocinador.id}
          datosIniciales={{
            nombre: patrocinador.nombre,
            nombreCorto: patrocinador.nombreCorto,
            slug: patrocinador.slug ?? "",
            descripcion: patrocinador.descripcion,
            web: patrocinador.web,
            activo: patrocinador.activo,
          }}
          alActualizar={actualizarInformacion}
        />
      )}

      {seccionActual === "imagenes" && (
        <ImagenesPatrocinador
          patrocinadorId={patrocinador.id}
          nombrePatrocinador={patrocinador.nombre}
          logoInicial={patrocinador.logo}
          bannerInicial={patrocinador.banner}
          alActualizar={actualizarImagenes}
        />
      )}

      {seccionActual === "equipos" && (
            <EquiposPatrocinador
                patrocinadorId={patrocinador.id}
                equiposIniciales={patrocinador.equipos}
                alActualizar={actualizarEquipos}
            />
        )}

        {seccionActual === "redes" && (
            <RedesSocialesPatrocinador
                patrocinadorId={patrocinador.id}
                redesIniciales={patrocinador.redes}
                alActualizar={actualizarRedes}
            />
            )}
    </section>
  );
}