import type { DatosPersonalesUsuario, TipoUsuarioPanel } from "@tipos/PanelUsuario";

interface ErroresDatosPersonales {
  nombre?: string;
  apellidos?: string;
  email?: string;
  confirmarEmail?: string;
  tipoUsuario?: string;
  cargo?: string;
}

interface Propiedades {
  datos: DatosPersonalesUsuario;
  errores: ErroresDatosPersonales;
  alCambiar: (datos: DatosPersonalesUsuario) => void;
}

const cargosDisponibles = [
  "Directiva",
  "Entrenador/a",
  "Coordinador/a",
  "Delegado/a",
  "Administración",
];

export default function PasoDatosPersonalesUsuario({ datos, errores, alCambiar }: Propiedades) {
  const actualizarCampo = <Campo extends keyof DatosPersonalesUsuario>(campo: Campo, valor: DatosPersonalesUsuario[Campo]) => {
    alCambiar({
      ...datos,
      [campo]: valor,
    });
  };

  const clasesCampo = (tieneError: boolean) => {
    return `h-11 w-full rounded-lg border bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors placeholder:text-outline ${tieneError ? "border-error focus:border-error focus:ring-2 focus:ring-error/20" : "border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20"}`;
  };

  return (
    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6 lg:p-8">
      <div className="border-b border-outline-variant/60 pb-4">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Paso 1 de 4</p>
        <h2 className="mt-1 text-xl font-bold text-on-surface">Datos del usuario</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Introduce la información personal y de contacto de la persona que recibirá el acceso.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-on-surface">Nombre <span className="text-error">*</span></span>
          <input type="text" value={datos.nombre} onChange={(evento) => actualizarCampo("nombre", evento.target.value)} placeholder="Ej. Juan" autoComplete="given-name" className={clasesCampo(Boolean(errores.nombre))} aria-invalid={Boolean(errores.nombre)} />
          {errores.nombre && <span className="text-xs font-medium text-error">{errores.nombre}</span>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-on-surface">Apellidos <span className="text-error">*</span></span>
          <input type="text" value={datos.apellidos} onChange={(evento) => actualizarCampo("apellidos", evento.target.value)} placeholder="Ej. Pérez García" autoComplete="family-name" className={clasesCampo(Boolean(errores.apellidos))} aria-invalid={Boolean(errores.apellidos)} />
          {errores.apellidos && <span className="text-xs font-medium text-error">{errores.apellidos}</span>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-on-surface">Correo electrónico <span className="text-error">*</span></span>
          <input type="email" value={datos.email} onChange={(evento) => actualizarCampo("email", evento.target.value)} placeholder="nombre@ejemplo.com" autoComplete="email" className={clasesCampo(Boolean(errores.email))} aria-invalid={Boolean(errores.email)} />
          {errores.email && <span className="text-xs font-medium text-error">{errores.email}</span>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-on-surface">Confirmar correo <span className="text-error">*</span></span>
          <input type="email" value={datos.confirmarEmail} onChange={(evento) => actualizarCampo("confirmarEmail", evento.target.value)} placeholder="Repite el correo electrónico" autoComplete="off" className={clasesCampo(Boolean(errores.confirmarEmail))} aria-invalid={Boolean(errores.confirmarEmail)} />
          {errores.confirmarEmail && <span className="text-xs font-medium text-error">{errores.confirmarEmail}</span>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-on-surface">Teléfono</span>
          <input type="tel" value={datos.telefono} onChange={(evento) => actualizarCampo("telefono", evento.target.value)} placeholder="+34 600 000 000" autoComplete="tel" className={clasesCampo(false)} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-on-surface">Tipo de usuario <span className="text-error">*</span></span>
          <select value={datos.tipoUsuario} onChange={(evento) => actualizarCampo("tipoUsuario", evento.target.value as TipoUsuarioPanel)} className={clasesCampo(Boolean(errores.tipoUsuario))} aria-invalid={Boolean(errores.tipoUsuario)}>
            <option value="interno">Usuario interno</option>
            <option value="publico">Usuario público</option>
          </select>
          {errores.tipoUsuario && <span className="text-xs font-medium text-error">{errores.tipoUsuario}</span>}
        </label>

        {datos.tipoUsuario === "interno" && (
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-semibold text-on-surface">Cargo o función <span className="text-error">*</span></span>
            <select value={datos.cargo} onChange={(evento) => actualizarCampo("cargo", evento.target.value)} className={clasesCampo(Boolean(errores.cargo))} aria-invalid={Boolean(errores.cargo)}>
              <option value="">Selecciona el cargo o función</option>
              {cargosDisponibles.map((cargo) => (
                <option key={cargo} value={cargo}>{cargo}</option>
              ))}
            </select>
            {errores.cargo && <span className="text-xs font-medium text-error">{errores.cargo}</span>}
          </label>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-primary/20 bg-primary-fixed/40 p-4">
        <div className="flex items-start gap-3">
          <span className="inline-block h-5 w-5 shrink-0 bg-primary mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/informacion.svg')", WebkitMaskImage: "url('/iconos/panel/informacion.svg')" }} aria-hidden="true" />
          <p className="text-sm text-on-primary-fixed-variant">El usuario recibirá posteriormente un enlace de activación en el correo indicado. La contraseña no se establece desde este formulario.</p>
        </div>
      </div>
    </section>
  );
}