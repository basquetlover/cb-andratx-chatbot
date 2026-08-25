import { useMemo, useState, type FormEvent } from "react";

import type { DatosInformacionPatrocinador, InformacionPatrocinadorActualizada } from "@tipos/PatrocinadorPanel";

interface Propiedades {
  patrocinadorId: string;
  datosIniciales: DatosInformacionPatrocinador;
  alActualizar: (datos: InformacionPatrocinadorActualizada) => void;
}

interface RespuestaActualizacion {
  ok: boolean;
  data?: {
    patrocinador?: InformacionPatrocinadorActualizada;
  };
  error?: string;
  errores?: Array<{
    campo: string;
    mensaje: string;
  }>;
}

interface ErroresFormulario {
  nombre?: string;
  nombreCorto?: string;
  slug?: string;
  descripcion?: string;
  web?: string;
  activo?: string;
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

export default function InformacionPatrocinador({ patrocinadorId, datosIniciales, alActualizar }: Propiedades) {
  const [nombre, setNombre] = useState(datosIniciales.nombre);
  const [nombreCorto, setNombreCorto] = useState(datosIniciales.nombreCorto ?? "");
  const [slug, setSlug] = useState(datosIniciales.slug);
  const [descripcion, setDescripcion] = useState(datosIniciales.descripcion ?? "");
  const [web, setWeb] = useState(datosIniciales.web ?? "");
  const [activo, setActivo] = useState(datosIniciales.activo);
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const hayCambios = useMemo(() => {
    return (
      nombre.trim() !== datosIniciales.nombre ||
      (nombreCorto.trim() || null) !== datosIniciales.nombreCorto ||
      slug.trim() !== datosIniciales.slug ||
      (descripcion.trim() || null) !== datosIniciales.descripcion ||
      (web.trim() || null) !== datosIniciales.web ||
      activo !== datosIniciales.activo
    );
  }, [activo, datosIniciales, descripcion, nombre, nombreCorto, slug, web]);

  const validar = (): boolean => {
    const nuevosErrores: ErroresFormulario = {};

    if (!nombre.trim()) {
      nuevosErrores.nombre = "El nombre es obligatorio.";
    } else if (nombre.trim().length > 150) {
      nuevosErrores.nombre = "El nombre no puede superar los 150 caracteres.";
    }

    if (nombreCorto.trim().length > 80) {
      nuevosErrores.nombreCorto = "El nombre corto no puede superar los 80 caracteres.";
    }

    if (!slug.trim()) {
      nuevosErrores.slug = "El slug es obligatorio.";
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) {
      nuevosErrores.slug = "El slug solo puede contener letras minúsculas, números y guiones.";
    }

    if (descripcion.trim().length > 2_000) {
      nuevosErrores.descripcion = "La descripción no puede superar los 2.000 caracteres.";
    }

    if (!urlValida(web)) {
      nuevosErrores.web = "Introduce una página web completa y válida.";
    }

    setErrores(nuevosErrores);

    return Object.keys(nuevosErrores).length === 0;
  };

  const descartarCambios = () => {
    setNombre(datosIniciales.nombre);
    setNombreCorto(datosIniciales.nombreCorto ?? "");
    setSlug(datosIniciales.slug);
    setDescripcion(datosIniciales.descripcion ?? "");
    setWeb(datosIniciales.web ?? "");
    setActivo(datosIniciales.activo);
    setErrores({});
    setMensaje(null);
  };

  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    if (!hayCambios || guardando || !validar()) {
      return;
    }

    setGuardando(true);
    setErrores({});
    setMensaje(null);

    try {
      const respuesta = await fetch(`/api/panel/patrocinadores/${encodeURIComponent(patrocinadorId)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seccion: "informacion",
          datos: {
            nombre: nombre.trim(),
            nombreCorto: nombreCorto.trim() || null,
            slug: slug.trim(),
            descripcion: descripcion.trim() || null,
            web: web.trim() || null,
            activo,
          },
        }),
      });

      const contenido = (await respuesta.json()) as RespuestaActualizacion;

      if (!respuesta.ok || !contenido.ok || !contenido.data?.patrocinador) {
        const erroresServidor: ErroresFormulario = {};

        contenido.errores?.forEach((error) => {
          if (["nombre", "nombreCorto", "slug", "descripcion", "web", "activo"].includes(error.campo)) {
            erroresServidor[error.campo as keyof ErroresFormulario] = error.mensaje;
          }
        });

        if (Object.keys(erroresServidor).length === 0) {
          erroresServidor.general = contenido.error ?? "No se han podido guardar los cambios.";
        }

        setErrores(erroresServidor);
        return;
      }

      const datosActualizados = contenido.data.patrocinador;

      setNombre(datosActualizados.nombre);
      setNombreCorto(datosActualizados.nombreCorto ?? "");
      setSlug(datosActualizados.slug);
      setDescripcion(datosActualizados.descripcion ?? "");
      setWeb(datosActualizados.web ?? "");
      setActivo(datosActualizados.activo);
      setMensaje("La información del patrocinador se ha actualizado.");
      alActualizar(datosActualizados);
    } catch (error) {
      console.error("Error actualizando el patrocinador:", error);

      setErrores({
        general: "No se ha podido conectar con el servidor.",
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm" noValidate>
      <div className="border-b border-outline-variant/60 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-on-surface">Información general</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Modifica los datos principales y el estado del patrocinador.</p>
      </div>

      <div className="p-5 sm:p-6">
        {mensaje && <p className="mb-5 rounded-xl border border-success/40 bg-success-container px-4 py-3 text-sm text-on-success-container" role="status">{mensaje}</p>}
        {errores.general && <p className="mb-5 rounded-xl border border-error/40 bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">{errores.general}</p>}

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Nombre <span className="text-error">*</span></span>
            <input type="text" value={nombre} onChange={(evento) => setNombre(evento.target.value)} disabled={guardando} maxLength={150} className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors focus:ring-2 disabled:opacity-50 ${errores.nombre ? "border-error focus:ring-error/20" : "border-outline-variant focus:border-primary focus:ring-primary/20"}`} />
            {errores.nombre && <span className="text-xs text-error">{errores.nombre}</span>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Nombre corto</span>
            <input type="text" value={nombreCorto} onChange={(evento) => setNombreCorto(evento.target.value)} disabled={guardando} maxLength={80} className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors focus:ring-2 disabled:opacity-50 ${errores.nombreCorto ? "border-error focus:ring-error/20" : "border-outline-variant focus:border-primary focus:ring-primary/20"}`} />
            {errores.nombreCorto && <span className="text-xs text-error">{errores.nombreCorto}</span>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Slug <span className="text-error">*</span></span>
            <input type="text" value={slug} onChange={(evento) => setSlug(normalizarSlug(evento.target.value))} disabled={guardando} className={`h-11 rounded-xl border bg-surface-container-lowest px-3 font-mono text-sm text-on-surface outline-none transition-colors focus:ring-2 disabled:opacity-50 ${errores.slug ? "border-error focus:ring-error/20" : "border-outline-variant focus:border-primary focus:ring-primary/20"}`} />
            {errores.slug && <span className="text-xs text-error">{errores.slug}</span>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Estado</span>
            <select value={activo ? "activo" : "inactivo"} onChange={(evento) => setActivo(evento.target.value === "activo")} disabled={guardando} className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50">
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-semibold text-on-surface">Página web</span>
            <input type="url" value={web} onChange={(evento) => setWeb(evento.target.value)} disabled={guardando} placeholder="https://www.empresa.com" className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors focus:ring-2 disabled:opacity-50 ${errores.web ? "border-error focus:ring-error/20" : "border-outline-variant focus:border-primary focus:ring-primary/20"}`} />
            {errores.web && <span className="text-xs text-error">{errores.web}</span>}
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-semibold text-on-surface">Descripción</span>
            <textarea value={descripcion} onChange={(evento) => setDescripcion(evento.target.value)} disabled={guardando} maxLength={2_000} rows={7} className={`resize-y rounded-xl border bg-surface-container-lowest px-3 py-3 text-on-surface outline-none transition-colors focus:ring-2 disabled:opacity-50 ${errores.descripcion ? "border-error focus:ring-error/20" : "border-outline-variant focus:border-primary focus:ring-primary/20"}`} />
            <span className="text-right text-xs text-on-surface-variant">{descripcion.length} / 2.000</span>
            {errores.descripcion && <span className="text-xs text-error">{errores.descripcion}</span>}
          </label>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-outline-variant/60 bg-surface-container-low p-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={descartarCambios} disabled={!hayCambios || guardando} className="rounded-xl border border-outline-variant bg-surface-container-lowest px-5 py-2.5 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40">
          Descartar cambios
        </button>

        <button type="submit" disabled={!hayCambios || guardando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
          {guardando && <span className="h-5 w-5 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" aria-hidden="true" />}
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}