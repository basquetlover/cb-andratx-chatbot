import { useState, type FormEvent } from "react";

import RedesPatrocinador from "@components/panel/patrocinadores/formulario/RedesPatrocinador";
import SelectorEquiposPatrocinador from "@components/panel/patrocinadores/formulario/SelectorEquiposPatrocinador";
import SelectorImagenPatrocinador from "@components/panel/patrocinadores/formulario/SelectorImagenPatrocinador";

import type { PatrocinadorCreadoPanel, RedSocialPatrocinador } from "@tipos/PatrocinadorPanel";

interface RespuestaCrearPatrocinador {
  ok: boolean;
  data?: PatrocinadorCreadoPanel;
  error?: string;
  errores?: Array<{
    campo: string;
    mensaje: string;
  }>;
}

interface ErroresFormulario {
  nombre?: string;
  slug?: string;
  descripcion?: string;
  web?: string;
  redes?: string;
  logo?: string;
  banner?: string;
  general?: string;
}

function normalizarSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function urlValida(url: string): boolean {
  if (!url.trim()) {
    return true;
  }

  try {
    const urlConvertida = new URL(url);

    return urlConvertida.protocol === "https:" || urlConvertida.protocol === "http:";
  } catch {
    return false;
  }
}

function SeparadorFormulario() {
  return (
    <div className="flex items-center gap-3 py-1" aria-hidden="true">
      <span className="h-px flex-1 bg-outline-variant"></span>
      <span className="inline-block h-5 w-5 bg-tertiary mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/balon.svg')", WebkitMaskImage: "url('/iconos/panel/balon.svg')" }}></span>
      <span className="h-px flex-1 bg-outline-variant"></span>
    </div>
  );
}

export default function FormularioPatrocinador() {
  const [nombre, setNombre] = useState("");
  const [nombreCorto, setNombreCorto] = useState("");
  const [slug, setSlug] = useState("");
  const [slugModificado, setSlugModificado] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [web, setWeb] = useState("");
  const [activo, setActivo] = useState(true);
  const [logo, setLogo] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [equiposIds, setEquiposIds] = useState<string[]>([]);
  const [redes, setRedes] = useState<RedSocialPatrocinador[]>([]);
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<PatrocinadorCreadoPanel | null>(null);

  const cambiarNombre = (nuevoNombre: string) => {
    setNombre(nuevoNombre);

    if (!slugModificado) {
      setSlug(normalizarSlug(nuevoNombre));
    }
  };

  const cambiarSlug = (nuevoSlug: string) => {
    setSlugModificado(true);
    setSlug(normalizarSlug(nuevoSlug));
  };

  const validarFormulario = (): boolean => {
    const nuevosErrores: ErroresFormulario = {};

    if (!nombre.trim()) {
      nuevosErrores.nombre = "El nombre del patrocinador es obligatorio.";
    } else if (nombre.trim().length > 150) {
      nuevosErrores.nombre = "El nombre no puede superar los 150 caracteres.";
    }

    if (!slug.trim()) {
      nuevosErrores.slug = "El slug es obligatorio.";
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      nuevosErrores.slug = "El slug solo puede contener letras minúsculas, números y guiones.";
    }

    if (descripcion.trim().length > 2_000) {
      nuevosErrores.descripcion = "La descripción no puede superar los 2.000 caracteres.";
    }

    if (!urlValida(web)) {
      nuevosErrores.web = "Introduce una página web completa y válida.";
    }

    const redInvalida = redes.find((red) => !red.url.trim() || !urlValida(red.url));

    if (redInvalida) {
      nuevosErrores.redes = `Revisa la URL de ${redInvalida.nombre}.`;
    }

    setErrores(nuevosErrores);

    return Object.keys(nuevosErrores).length === 0;
  };

  const guardarPatrocinador = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    if (guardando || !validarFormulario()) {
      return;
    }

    setGuardando(true);
    setErrores({});

    const datos = {
      nombre: nombre.trim(),
      nombreCorto: nombreCorto.trim() || null,
      slug: slug.trim(),
      descripcion: descripcion.trim() || null,
      web: web.trim() || null,
      activo,
      redes,
      equiposIds,
    };

    const formulario = new FormData();

    formulario.append("datos", JSON.stringify(datos));

    if (logo) {
      formulario.append("logo", logo);
    }

    if (banner) {
      formulario.append("banner", banner);
    }

    try {
      const respuesta = await fetch("/api/panel/patrocinadores", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
        body: formulario,
      });

      const contenido = (await respuesta.json()) as RespuestaCrearPatrocinador;

      if (!respuesta.ok || !contenido.ok || !contenido.data) {
        const erroresServidor: ErroresFormulario = {};

        contenido.errores?.forEach((error) => {
          if (error.campo in erroresServidor || ["nombre", "slug", "descripcion", "web", "redes", "logo", "banner"].includes(error.campo)) {
            erroresServidor[error.campo as keyof ErroresFormulario] = error.mensaje;
          }
        });

        if (Object.keys(erroresServidor).length === 0) {
          erroresServidor.general = contenido.error ?? "No se ha podido crear el patrocinador.";
        }

        setErrores(erroresServidor);
        return;
      }

      setResultado(contenido.data);
    } catch (error) {
      console.error("Error creando el patrocinador:", error);

      setErrores({
        general: "No se ha podido conectar con el servidor. Vuelve a intentarlo.",
      });
    } finally {
      setGuardando(false);
    }
  };

  if (resultado) {
    return (
      <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
        <div className="bg-primary-fixed/50 px-5 py-8 text-center sm:px-8">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-container text-success">
            <span className="inline-block h-8 w-8 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/correcto.svg')", WebkitMaskImage: "url('/iconos/panel/correcto.svg')" }} aria-hidden="true" />
          </span>

          <h2 className="mt-4 text-2xl font-bold text-on-surface">Patrocinador creado</h2>
          <p className="mt-2 text-on-surface-variant">{resultado.nombre} se ha registrado correctamente.</p>
        </div>

        <div className="p-5 sm:p-8">
          <div className="flex items-center gap-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4">
            <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest text-lg font-bold text-primary">
              {resultado.nombre.charAt(0).toUpperCase()}

              {resultado.logo && <img src={resultado.logo} alt="" className="absolute inset-0 h-full w-full object-contain p-1" />}
            </span>

            <div className="min-w-0">
              <p className="font-bold text-on-surface">{resultado.nombre}</p>
              <p className="mt-1 text-sm text-on-surface-variant">{resultado.equiposAsignados === 1 ? "1 equipo patrocinado" : `${resultado.equiposAsignados} equipos patrocinados`}</p>
              <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${resultado.activo ? "bg-success-container text-on-success-container" : "bg-surface-container text-on-surface-variant"}`}>{resultado.activo ? "Activo" : "Inactivo"}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a href={`/panel/sponsors/${resultado.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-primary px-4 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary">
              Ver patrocinador
            </a>

            <a href="/panel/sponsors" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary transition-opacity hover:opacity-90">
              Volver al listado
            </a>
          </div>

          <button type="button" onClick={() => window.location.reload()} className="mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container">
            Crear otro patrocinador
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={guardarPatrocinador} className="flex flex-col gap-6" noValidate>
      {errores.general && <div className="rounded-2xl border border-error/40 bg-error-container p-4 text-on-error-container" role="alert"><p className="font-bold">No se ha podido crear el patrocinador</p><p className="mt-1 text-sm">{errores.general}</p></div>}

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <div className="border-b border-outline-variant/60 pb-4">
          <h2 className="text-lg font-bold text-on-surface">Información general</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Introduce los datos principales del patrocinador.</p>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Nombre <span className="text-error">*</span></span>
            <input type="text" value={nombre} onChange={(evento) => cambiarNombre(evento.target.value)} disabled={guardando} maxLength={150} placeholder="Ej. Empresa colaboradora" className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors placeholder:text-outline focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${errores.nombre ? "border-error focus:border-error focus:ring-error/20" : "border-outline-variant focus:border-primary focus:ring-primary/20"}`} />
            {errores.nombre && <span className="text-xs text-error">{errores.nombre}</span>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Nombre corto</span>
            <input type="text" value={nombreCorto} onChange={(evento) => setNombreCorto(evento.target.value)} disabled={guardando} maxLength={80} placeholder="Ej. Empresa" className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50" />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Slug <span className="text-error">*</span></span>
            <input type="text" value={slug} onChange={(evento) => cambiarSlug(evento.target.value)} disabled={guardando} placeholder="empresa-colaboradora" className={`h-11 rounded-xl border bg-surface-container-lowest px-3 font-mono text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${errores.slug ? "border-error focus:border-error focus:ring-error/20" : "border-outline-variant focus:border-primary focus:ring-primary/20"}`} />
            <span className="text-xs text-on-surface-variant">Se utiliza en las URL y se genera automáticamente desde el nombre.</span>
            {errores.slug && <span className="text-xs text-error">{errores.slug}</span>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Estado</span>
            <select value={activo ? "activo" : "inactivo"} onChange={(evento) => setActivo(evento.target.value === "activo")} disabled={guardando} className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50">
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-semibold text-on-surface">Página web</span>
            <input type="url" value={web} onChange={(evento) => setWeb(evento.target.value)} disabled={guardando} placeholder="https://www.empresa.com" className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors placeholder:text-outline focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${errores.web ? "border-error focus:border-error focus:ring-error/20" : "border-outline-variant focus:border-primary focus:ring-primary/20"}`} />
            {errores.web && <span className="text-xs text-error">{errores.web}</span>}
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-semibold text-on-surface">Descripción</span>
            <textarea value={descripcion} onChange={(evento) => setDescripcion(evento.target.value)} disabled={guardando} maxLength={2_000} rows={5} placeholder="Describe brevemente la empresa y su colaboración con el club." className={`resize-y rounded-xl border bg-surface-container-lowest px-3 py-3 text-on-surface outline-none transition-colors placeholder:text-outline focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${errores.descripcion ? "border-error focus:border-error focus:ring-error/20" : "border-outline-variant focus:border-primary focus:ring-primary/20"}`} />
            <span className="text-right text-xs text-on-surface-variant">{descripcion.length} / 2.000</span>
            {errores.descripcion && <span className="text-xs text-error">{errores.descripcion}</span>}
          </label>
        </div>
      </section>

      <SeparadorFormulario />

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <div className="border-b border-outline-variant/60 pb-4">
          <h2 className="text-lg font-bold text-on-surface">Identidad visual</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Las imágenes se convertirán automáticamente a WebP antes de guardarse.</p>
        </div>

        <div className="mt-5 grid items-start gap-6 lg:grid-cols-2">
          <SelectorImagenPatrocinador tipo="logo" archivo={logo} alCambiar={setLogo} deshabilitado={guardando} />
          <SelectorImagenPatrocinador tipo="banner" archivo={banner} alCambiar={setBanner} deshabilitado={guardando} />
        </div>

        {(errores.logo || errores.banner) && <p className="mt-4 rounded-xl border border-error/40 bg-error-container px-3 py-2 text-sm text-on-error-container">{errores.logo ?? errores.banner}</p>}
      </section>

      <SeparadorFormulario />

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <div className="border-b border-outline-variant/60 pb-4">
          <h2 className="text-lg font-bold text-on-surface">Equipos patrocinados</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Puedes asociar el patrocinador con uno o varios equipos.</p>
        </div>

        <div className="mt-5">
          <SelectorEquiposPatrocinador equiposSeleccionados={equiposIds} alCambiar={setEquiposIds} deshabilitado={guardando} />
        </div>
      </section>

      <SeparadorFormulario />

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <RedesPatrocinador redes={redes} alCambiar={setRedes} deshabilitado={guardando} />

        {errores.redes && <p className="mt-4 rounded-xl border border-error/40 bg-error-container px-3 py-2 text-sm text-on-error-container" role="alert">{errores.redes}</p>}
      </section>

      <div className="sticky bottom-4 z-20 flex flex-col-reverse gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest/95 p-4 shadow-[0_16px_50px_rgba(0,30,50,0.18)] backdrop-blur-md sm:flex-row sm:justify-end">
        <a href="/panel/sponsors" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline-variant px-5 py-2.5 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container">
          Cancelar
        </a>

        <button type="submit" disabled={guardando} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
          {guardando && <span className="h-5 w-5 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" aria-hidden="true" />}
          {guardando ? "Guardando patrocinador..." : "Guardar patrocinador"}
        </button>
      </div>
    </form>
  );
}