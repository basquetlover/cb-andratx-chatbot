import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { EstadoUsuarioPanel, TipoUsuarioPanel, UsuarioDetallePanel } from "../../../../types/UsuarioDetallePanel";

export interface DatosUsuarioGuardados {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  tipoUsuario: TipoUsuarioPanel;
  cargo: string;
  imagen: string | null;
  estado: EstadoUsuarioPanel;
  aceptaComunicaciones: boolean;
}

interface Propiedades {
  usuarioId: string;
  datosIniciales: UsuarioDetallePanel["datosPersonales"];
  alActualizar: (datos: DatosUsuarioGuardados) => void;
}

interface EstadoFormulario {
  nombre: string;
  apellidos: string;
  email: string;
  confirmarEmail: string;
  telefono: string;
  tipoUsuario: TipoUsuarioPanel;
  cargo: string;
  imagen: string;
  aceptaComunicaciones: boolean;
}

interface ErrorCampo {
  campo: string;
  mensaje: string;
}

interface RespuestaActualizacion {
  ok: boolean;
  data: {
    usuario: {
      id: string;
      nombre: string;
      apellidos: string | null;
      email: string;
      telefono: string | null;
      tipo_usuario: TipoUsuarioPanel;
      cargo: string | null;
      imagen: string | null;
      acepta_comunicaciones: boolean;
      estado: EstadoUsuarioPanel;
      updated_at: string;
    };
  } | null;
  error: string | null;
  errores: ErrorCampo[];
}

const cargosDisponibles = [
  "Directiva",
  "Entrenador/a",
  "Coordinador/a",
  "Delegado/a",
  "Administración",
];

function crearEstadoInicial(datos: UsuarioDetallePanel["datosPersonales"]): EstadoFormulario {
  return {
    nombre: datos.nombre,
    apellidos: datos.apellidos,
    email: datos.email,
    confirmarEmail: datos.email,
    telefono: datos.telefono,
    tipoUsuario: datos.tipoUsuario,
    cargo: datos.cargo,
    imagen: datos.imagen ?? "",
    aceptaComunicaciones: datos.aceptaComunicaciones,
  };
}

function normalizarFormulario(estado: EstadoFormulario) {
  return {
    nombre: estado.nombre.trim(),
    apellidos: estado.apellidos.trim(),
    email: estado.email.trim().toLowerCase(),
    telefono: estado.telefono.trim(),
    tipoUsuario: estado.tipoUsuario,
    cargo: estado.tipoUsuario === "interno" ? estado.cargo.trim() : "",
    imagen: estado.imagen.trim(),
    aceptaComunicaciones: estado.aceptaComunicaciones,
  };
}

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function DatosUsuario({ usuarioId, datosIniciales, alActualizar }: Propiedades) {
  const [formulario, setFormulario] = useState<EstadoFormulario>(() => crearEstadoInicial(datosIniciales));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardadoCorrectamente, setGuardadoCorrectamente] = useState(false);

  useEffect(() => {
    setFormulario(crearEstadoInicial(datosIniciales));
  }, [datosIniciales]);

  const datosModificados = useMemo(() => {
    const datosActuales = normalizarFormulario(formulario);

    const datosOriginales = {
      nombre: datosIniciales.nombre.trim(),
      apellidos: datosIniciales.apellidos.trim(),
      email: datosIniciales.email.trim().toLowerCase(),
      telefono: datosIniciales.telefono.trim(),
      tipoUsuario: datosIniciales.tipoUsuario,
      cargo: datosIniciales.tipoUsuario === "interno" ? datosIniciales.cargo.trim() : "",
      imagen: datosIniciales.imagen?.trim() ?? "",
      aceptaComunicaciones: datosIniciales.aceptaComunicaciones,
    };

    return JSON.stringify(datosActuales) !== JSON.stringify(datosOriginales);
  }, [formulario, datosIniciales]);

  const emailModificado = formulario.email.trim().toLowerCase() !== datosIniciales.email.trim().toLowerCase();

  const actualizarCampo = <Campo extends keyof EstadoFormulario>(campo: Campo, valor: EstadoFormulario[Campo]) => {
    setFormulario((formularioActual) => ({
      ...formularioActual,
      [campo]: valor,
    }));

    setErrores((erroresActuales) => {
      if (!erroresActuales[campo]) {
        return erroresActuales;
      }

      const siguientesErrores = {
        ...erroresActuales,
      };

      delete siguientesErrores[campo];

      return siguientesErrores;
    });

    setErrorGeneral(null);
    setGuardadoCorrectamente(false);
  };

  const clasesCampo = (campo: keyof EstadoFormulario) => {
    const tieneError = Boolean(errores[campo]);

    return `h-11 w-full rounded-xl border bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors placeholder:text-outline disabled:cursor-not-allowed disabled:opacity-60 ${tieneError ? "border-error focus:border-error focus:ring-2 focus:ring-error/20" : "border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20"}`;
  };

  const validarFormulario = (): boolean => {
    const nuevosErrores: Record<string, string> = {};

    if (!formulario.nombre.trim()) {
      nuevosErrores.nombre = "Introduce el nombre.";
    }

    if (!formulario.apellidos.trim()) {
      nuevosErrores.apellidos = "Introduce los apellidos.";
    }

    if (!validarEmail(formulario.email.trim())) {
      nuevosErrores.email = "Introduce un correo electrónico válido.";
    }

    if (formulario.email.trim().toLowerCase() !== formulario.confirmarEmail.trim().toLowerCase()) {
      nuevosErrores.confirmarEmail = "Los correos electrónicos no coinciden.";
    }

    if (formulario.tipoUsuario === "interno" && !formulario.cargo.trim()) {
      nuevosErrores.cargo = "Selecciona el cargo o función.";
    }

    if (formulario.imagen.trim() && !formulario.imagen.trim().startsWith("https://") && !formulario.imagen.trim().startsWith("/")) {
      nuevosErrores.imagen = "La imagen debe utilizar HTTPS o una ruta interna.";
    }

    setErrores(nuevosErrores);

    return Object.keys(nuevosErrores).length === 0;
  };

  const cancelarCambios = () => {
    setFormulario(crearEstadoInicial(datosIniciales));
    setErrores({});
    setErrorGeneral(null);
    setGuardadoCorrectamente(false);
  };

  const guardarCambios = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    if (!datosModificados || guardando || !validarFormulario()) {
      return;
    }

    try {
      setGuardando(true);
      setErrorGeneral(null);
      setGuardadoCorrectamente(false);

      const respuesta = await fetch(`/api/panel/usuarios/${encodeURIComponent(usuarioId)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seccion: "datos-personales",
          datos: {
            nombre: formulario.nombre,
            apellidos: formulario.apellidos,
            email: formulario.email,
            telefono: formulario.telefono,
            tipoUsuario: formulario.tipoUsuario,
            cargo: formulario.cargo,
            imagen: formulario.imagen || null,
            aceptaComunicaciones: formulario.aceptaComunicaciones,
          },
        }),
      });

      const contenido = (await respuesta.json()) as RespuestaActualizacion;

      if (!respuesta.ok || !contenido.ok || !contenido.data) {
        const erroresServidor: Record<string, string> = {};

        contenido.errores?.forEach((error) => {
          erroresServidor[error.campo] = error.mensaje;
        });

        setErrores(erroresServidor);

        throw new Error(contenido.error ?? "No se han podido guardar los cambios.");
      }

      const usuarioActualizado = contenido.data.usuario;

      const datosGuardados: DatosUsuarioGuardados = {
        nombre: usuarioActualizado.nombre,
        apellidos: usuarioActualizado.apellidos ?? "",
        email: usuarioActualizado.email,
        telefono: usuarioActualizado.telefono ?? "",
        tipoUsuario: usuarioActualizado.tipo_usuario,
        cargo: usuarioActualizado.cargo ?? "",
        imagen: usuarioActualizado.imagen,
        estado: usuarioActualizado.estado,
        aceptaComunicaciones: usuarioActualizado.acepta_comunicaciones,
      };

      alActualizar(datosGuardados);
      setFormulario(crearEstadoInicial(datosGuardados));
      setGuardadoCorrectamente(true);
    } catch (error) {
      console.error("Error actualizando los datos del usuario:", error);
      setErrorGeneral(error instanceof Error ? error.message : "No se han podido guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardarCambios} className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-bold text-on-surface">Datos personales</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Modifica la información personal y de contacto del usuario.</p>
      </div>

      <div className="p-5 sm:p-6">
        {errorGeneral && (
          <div className="mb-5 rounded-xl border border-error/40 bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
            <p className="font-bold">No se han podido guardar los cambios</p>
            <p className="mt-1">{errorGeneral}</p>
          </div>
        )}

        {guardadoCorrectamente && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-success/30 bg-success-container px-4 py-3 text-sm font-semibold text-on-success-container" role="status">
            <span className="inline-block h-5 w-5 shrink-0 bg-success mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/correcto.svg')", WebkitMaskImage: "url('/iconos/panel/correcto.svg')" }} aria-hidden="true" />
            Los datos del usuario se han actualizado correctamente.
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Nombre <span className="text-error">*</span></span>
            <input type="text" value={formulario.nombre} onChange={(evento) => actualizarCampo("nombre", evento.target.value)} disabled={guardando} autoComplete="off" className={clasesCampo("nombre")} />
            {errores.nombre && <span className="text-xs font-medium text-error">{errores.nombre}</span>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Apellidos <span className="text-error">*</span></span>
            <input type="text" value={formulario.apellidos} onChange={(evento) => actualizarCampo("apellidos", evento.target.value)} disabled={guardando} autoComplete="off" className={clasesCampo("apellidos")} />
            {errores.apellidos && <span className="text-xs font-medium text-error">{errores.apellidos}</span>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Correo electrónico <span className="text-error">*</span></span>
            <input type="email" value={formulario.email} onChange={(evento) => actualizarCampo("email", evento.target.value)} disabled={guardando} autoComplete="off" className={clasesCampo("email")} />
            {errores.email && <span className="text-xs font-medium text-error">{errores.email}</span>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Confirmar correo <span className="text-error">*</span></span>
            <input type="email" value={formulario.confirmarEmail} onChange={(evento) => actualizarCampo("confirmarEmail", evento.target.value)} disabled={guardando} autoComplete="off" className={clasesCampo("confirmarEmail")} />
            {errores.confirmarEmail && <span className="text-xs font-medium text-error">{errores.confirmarEmail}</span>}
          </label>

          {emailModificado && (
            <div className="rounded-xl border border-tertiary/30 bg-tertiary-fixed px-4 py-3 text-sm text-on-tertiary-fixed sm:col-span-2">
              <p className="font-bold">Se modificará el correo de acceso</p>
              <p className="mt-1">El nuevo correo quedará pendiente de verificación.</p>
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Teléfono</span>
            <input type="tel" value={formulario.telefono} onChange={(evento) => actualizarCampo("telefono", evento.target.value)} disabled={guardando} autoComplete="off" className={clasesCampo("telefono")} />
            {errores.telefono && <span className="text-xs font-medium text-error">{errores.telefono}</span>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Tipo de usuario <span className="text-error">*</span></span>
            <select value={formulario.tipoUsuario} onChange={(evento) => actualizarCampo("tipoUsuario", evento.target.value as TipoUsuarioPanel)} disabled={guardando} className={clasesCampo("tipoUsuario")}>
              <option value="interno">Usuario interno</option>
              <option value="publico">Usuario público</option>
            </select>
          </label>

          {formulario.tipoUsuario === "interno" && (
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-semibold text-on-surface">Cargo o función <span className="text-error">*</span></span>
              <select value={formulario.cargo} onChange={(evento) => actualizarCampo("cargo", evento.target.value)} disabled={guardando} className={clasesCampo("cargo")}>
                <option value="">Selecciona el cargo o función</option>

                {cargosDisponibles.map((cargo) => (
                  <option key={cargo} value={cargo}>{cargo}</option>
                ))}
              </select>

              {errores.cargo && <span className="text-xs font-medium text-error">{errores.cargo}</span>}
            </label>
          )}

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-semibold text-on-surface">Imagen de perfil</span>
            <input type="text" value={formulario.imagen} onChange={(evento) => actualizarCampo("imagen", evento.target.value)} disabled={guardando} placeholder="https://... o /imagenes/..." className={clasesCampo("imagen")} />
            {errores.imagen && <span className="text-xs font-medium text-error">{errores.imagen}</span>}
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low p-4 sm:col-span-2">
            <input type="checkbox" checked={formulario.aceptaComunicaciones} onChange={(evento) => actualizarCampo("aceptaComunicaciones", evento.target.checked)} disabled={guardando} className="mt-0.5 h-4 w-4 accent-primary" />

            <span>
              <span className="block text-sm font-semibold text-on-surface">Acepta comunicaciones del club</span>
              <span className="mt-1 block text-xs text-on-surface-variant">Indica si el usuario ha autorizado recibir comunicaciones no imprescindibles.</span>
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-outline-variant/60 bg-surface-container-low px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <button type="button" onClick={cancelarCambios} disabled={!datosModificados || guardando} className="min-h-11 rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40">
          Descartar cambios
        </button>

        <button type="submit" disabled={!datosModificados || guardando} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-40">
          {guardando && <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary" aria-hidden="true" />}
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}