import { useEffect, useState } from "react";

import IndicadorPasosUsuario from "@components/panel/usuarios/IndicadorPasosUsuario";
import PasoDatosPersonalesUsuario from "@components/panel/usuarios/PasoDatosPersonalesUsuario";
import PasoEquiposUsuario from "@components/panel/usuarios/PasoEquiposUsuario";
import PasoPermisosUsuario from "@components/panel/usuarios/PasoPermisosUsuario";
import PasoRevisionUsuario from "@components/panel/usuarios/PasoRevisionUsuario";
import ResultadoUsuarioCreado from "@components/panel/usuarios/ResultadoUsuarioCreado";
import { estadoInicialCreacionUsuario, type ConfiguracionPermisosUsuario, type DatosPersonalesUsuario, type EquipoAsignadoUsuario, type EquipoDisponiblePanel, type EstadoCreacionUsuario, type PasoCreacionUsuario, type PermisoDisponiblePanel, type RespuestaCreacionUsuario } from "@tipos/PanelUsuario";

interface ErroresDatosPersonales {
  nombre?: string;
  apellidos?: string;
  email?: string;
  confirmarEmail?: string;
  tipoUsuario?: string;
  cargo?: string;
}

interface RespuestaPermisosApi {
  ok: boolean;
  data: PermisoDisponiblePanel[];
  total: number;
  error?: string;
}

interface RespuestaEquiposApi {
  ok: boolean;
  data: EquipoDisponiblePanel[];
  total: number;
  error?: string;
}

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function CreadorUsuario() {
  const [pasoActual, setPasoActual] = useState<PasoCreacionUsuario>(1);
  const [pasoMaximoAlcanzado, setPasoMaximoAlcanzado] = useState<PasoCreacionUsuario>(1);
  const [estado, setEstado] = useState<EstadoCreacionUsuario>(estadoInicialCreacionUsuario);
  const [erroresDatos, setErroresDatos] = useState<ErroresDatosPersonales>({});

  const [permisosDisponibles, setPermisosDisponibles] = useState<PermisoDisponiblePanel[]>([]);
  const [cargandoPermisos, setCargandoPermisos] = useState(false);
  const [errorPermisos, setErrorPermisos] = useState<string | null>(null);
  const [intentoPermisos, setIntentoPermisos] = useState(0);

  const [equiposDisponibles, setEquiposDisponibles] = useState<EquipoDisponiblePanel[]>([]);
  const [cargandoEquipos, setCargandoEquipos] = useState(false);
  const [errorEquipos, setErrorEquipos] = useState<string | null>(null);
  const [intentoEquipos, setIntentoEquipos] = useState(0);

  const [creandoUsuario, setCreandoUsuario] = useState(false);
  const [errorCreacion, setErrorCreacion] = useState<string | null>(null);
  const [resultadoCreacion, setResultadoCreacion] = useState<NonNullable<RespuestaCreacionUsuario["data"]> | null>(null);

  const puedeVolver = pasoActual > 1;
  const esUltimoPaso = pasoActual === 4;
  const accesoTodosLosEquipos = estado.configuracionPermisos.nivelAcceso === "todos-equipos" || estado.configuracionPermisos.nivelAcceso === "acceso-total";

  useEffect(() => {
    if (pasoActual !== 2 || permisosDisponibles.length > 0) {
      return;
    }

    const controlador = new AbortController();

    const cargarPermisos = async () => {
      try {
        setCargandoPermisos(true);
        setErrorPermisos(null);

        const respuesta = await fetch("/api/panel/permisos", {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
          signal: controlador.signal,
        });

        const contenido = (await respuesta.json()) as RespuestaPermisosApi;

        if (!respuesta.ok || !contenido.ok) {
          throw new Error(contenido.error ?? "No se han podido cargar los permisos.");
        }

        const permisosValidos = contenido.data.filter((permiso) => typeof permiso.id === "string" && typeof permiso.codigo === "string" && permiso.activo);

        setPermisosDisponibles(permisosValidos);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Error al cargar los permisos:", error);
        setErrorPermisos("No se ha podido obtener la lista de permisos disponibles.");
      } finally {
        if (!controlador.signal.aborted) {
          setCargandoPermisos(false);
        }
      }
    };

    cargarPermisos();

    return () => {
      controlador.abort();
    };
  }, [pasoActual, intentoPermisos, permisosDisponibles.length]);

  useEffect(() => {
    if (pasoActual !== 3 || accesoTodosLosEquipos || equiposDisponibles.length > 0) {
      return;
    }

    const controlador = new AbortController();

    const cargarEquipos = async () => {
      try {
        setCargandoEquipos(true);
        setErrorEquipos(null);

        const respuesta = await fetch("/api/panel/equipos", {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
          signal: controlador.signal,
        });

        const contenido = (await respuesta.json()) as RespuestaEquiposApi;

        if (!respuesta.ok || !contenido.ok) {
          throw new Error(contenido.error ?? "No se han podido cargar los equipos.");
        }

        const equiposValidos = contenido.data.filter((equipo) => typeof equipo.id === "string");

        setEquiposDisponibles(equiposValidos);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Error al cargar los equipos:", error);
        setErrorEquipos("No se ha podido obtener la lista de equipos de la temporada.");
      } finally {
        if (!controlador.signal.aborted) {
          setCargandoEquipos(false);
        }
      }
    };

    cargarEquipos();

    return () => {
      controlador.abort();
    };
  }, [pasoActual, accesoTodosLosEquipos, intentoEquipos, equiposDisponibles.length]);

  const actualizarDatosPersonales = (datosPersonales: DatosPersonalesUsuario) => {
    setEstado((estadoActual) => ({
      ...estadoActual,
      datosPersonales,
    }));

    setErroresDatos({});
  };

  const actualizarConfiguracionPermisos = (configuracionPermisos: ConfiguracionPermisosUsuario) => {
    setEstado((estadoActual) => ({
      ...estadoActual,
      configuracionPermisos,
    }));
  };

  const actualizarEquiposAsignados = (equiposAsignados: EquipoAsignadoUsuario[]) => {
    setEstado((estadoActual) => ({
      ...estadoActual,
      equiposAsignados,
    }));
  };

  const validarDatosPersonales = (): boolean => {
    const nuevosErrores: ErroresDatosPersonales = {};
    const datos = estado.datosPersonales;

    if (!datos.nombre.trim()) {
      nuevosErrores.nombre = "Introduce el nombre.";
    }

    if (!datos.apellidos.trim()) {
      nuevosErrores.apellidos = "Introduce los apellidos.";
    }

    if (!datos.email.trim()) {
      nuevosErrores.email = "Introduce el correo electrónico.";
    } else if (!validarEmail(datos.email.trim())) {
      nuevosErrores.email = "Introduce un correo electrónico válido.";
    }

    if (!datos.confirmarEmail.trim()) {
      nuevosErrores.confirmarEmail = "Confirma el correo electrónico.";
    } else if (datos.email.trim().toLowerCase() !== datos.confirmarEmail.trim().toLowerCase()) {
      nuevosErrores.confirmarEmail = "Los correos electrónicos no coinciden.";
    }

    if (!datos.tipoUsuario) {
      nuevosErrores.tipoUsuario = "Selecciona el tipo de usuario.";
    }

    if (datos.tipoUsuario === "interno" && !datos.cargo.trim()) {
      nuevosErrores.cargo = "Selecciona o introduce el cargo del usuario.";
    }

    setErroresDatos(nuevosErrores);

    return Object.keys(nuevosErrores).length === 0;
  };

  const validarPasoActual = (): boolean => {
    if (pasoActual === 1) {
      return validarDatosPersonales();
    }

    if (pasoActual === 2) {
      if (cargandoPermisos || errorPermisos) {
        return false;
      }

      return true;
    }

    if (pasoActual === 3) {
      if (!accesoTodosLosEquipos && (cargandoEquipos || errorEquipos)) {
        return false;
      }

      return true;
    }

    return true;
  };

  const avanzar = () => {
    if (!validarPasoActual() || pasoActual >= 4) {
      return;
    }

    const siguientePaso = (pasoActual + 1) as PasoCreacionUsuario;

    setPasoActual(siguientePaso);
    setPasoMaximoAlcanzado((pasoMaximoActual) => Math.max(pasoMaximoActual, siguientePaso) as PasoCreacionUsuario);
  };

  const retroceder = () => {
    if (pasoActual <= 1) {
      return;
    }

    setPasoActual((pasoActual - 1) as PasoCreacionUsuario);
  };

  const seleccionarPaso = (paso: PasoCreacionUsuario) => {
    if (paso > pasoMaximoAlcanzado) {
      return;
    }

    setPasoActual(paso);
  };

  const reintentarCargaPermisos = () => {
    setPermisosDisponibles([]);
    setErrorPermisos(null);
    setIntentoPermisos((intentoActual) => intentoActual + 1);
  };

  const reintentarCargaEquipos = () => {
    setEquiposDisponibles([]);
    setErrorEquipos(null);
    setIntentoEquipos((intentoActual) => intentoActual + 1);
  };

  const crearUsuario = async () => {
    if (pasoActual !== 4 || creandoUsuario) {
      return;
    }

    try {
      setCreandoUsuario(true);
      setErrorCreacion(null);

      const { confirmarEmail: _confirmarEmail, ...datosPersonales } = estado.datosPersonales;

      const respuesta = await fetch("/api/panel/usuarios", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          datosPersonales,
          configuracionPermisos: estado.configuracionPermisos,
          equiposAsignados: accesoTodosLosEquipos ? [] : estado.equiposAsignados,
        }),
      });

      const contenido = (await respuesta.json()) as RespuestaCreacionUsuario;

      if (!respuesta.ok || !contenido.ok || !contenido.data) {
        throw new Error(contenido.error ?? "No se ha podido crear el usuario.");
      }

      setResultadoCreacion(contenido.data);
    } catch (error) {
      console.error("Error al crear el usuario:", error);
      setErrorCreacion(error instanceof Error ? error.message : "No se ha podido crear el usuario.");
    } finally {
      setCreandoUsuario(false);
    }
  };

  const reiniciarCreador = () => {
    setPasoActual(1);
    setPasoMaximoAlcanzado(1);
    setEstado(estadoInicialCreacionUsuario);
    setErroresDatos({});
    setErrorCreacion(null);
    setResultadoCreacion(null);
  };

  const siguienteDeshabilitado = (pasoActual === 2 && (cargandoPermisos || Boolean(errorPermisos))) || (pasoActual === 3 && !accesoTodosLosEquipos && (cargandoEquipos || Boolean(errorEquipos)));

  if (resultadoCreacion) {
    return <ResultadoUsuarioCreado resultado={resultadoCreacion} alCrearOtro={reiniciarCreador} />;
  }

  return (
    <div className="flex w-full flex-col gap-5 sm:gap-6">
      <IndicadorPasosUsuario pasoActual={pasoActual} pasoMaximoAlcanzado={pasoMaximoAlcanzado} alSeleccionarPaso={seleccionarPaso} />

      {pasoActual === 1 && <PasoDatosPersonalesUsuario datos={estado.datosPersonales} errores={erroresDatos} alCambiar={actualizarDatosPersonales} />}

      {pasoActual === 2 && <PasoPermisosUsuario configuracion={estado.configuracionPermisos} permisos={permisosDisponibles} cargando={cargandoPermisos} error={errorPermisos} alCambiar={actualizarConfiguracionPermisos} alReintentar={reintentarCargaPermisos} />}

      {pasoActual === 3 && <PasoEquiposUsuario equipos={equiposDisponibles} equiposAsignados={estado.equiposAsignados} nivelAcceso={estado.configuracionPermisos.nivelAcceso} cargando={cargandoEquipos} error={errorEquipos} alCambiar={actualizarEquiposAsignados} alReintentar={reintentarCargaEquipos} />}

      {pasoActual === 4 && <PasoRevisionUsuario estado={estado} permisosDisponibles={permisosDisponibles} equiposDisponibles={equiposDisponibles} alEditar={seleccionarPaso} />}

      {pasoActual === 4 && errorCreacion && (
        <div className="rounded-xl border border-error/40 bg-error-container p-4" role="alert">
          <div className="flex items-start gap-3">
            <span className="inline-block h-5 w-5 shrink-0 bg-error mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/error.svg')", WebkitMaskImage: "url('/iconos/panel/error.svg')" }} aria-hidden="true" />

            <div>
              <p className="font-bold text-on-error-container">No se ha podido crear el usuario</p>
              <p className="mt-1 text-sm text-on-error-container">{errorCreacion}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {puedeVolver && (
            <button type="button" onClick={retroceder} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 text-sm font-bold text-on-surface transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto">
              <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/volver.svg')", WebkitMaskImage: "url('/iconos/panel/volver.svg')" }} aria-hidden="true" />
              Atrás
            </button>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <a href="/panel/usuarios" className="inline-flex h-11 items-center justify-center rounded-lg border border-outline-variant px-5 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            Cancelar
          </a>

          {!esUltimoPaso && (
            <button type="button" onClick={avanzar} disabled={siguienteDeshabilitado} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-on-primary transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              Siguiente paso
              <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/siguiente.svg')", WebkitMaskImage: "url('/iconos/panel/siguiente.svg')" }} aria-hidden="true" />
            </button>
          )}

          {esUltimoPaso && (
            <button type="button" onClick={crearUsuario} disabled={creandoUsuario} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-on-primary transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              {creandoUsuario ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary" aria-hidden="true" />
                  Creando usuario...
                </>
              ) : (
                <>
                  Crear usuario y generar acceso
                  <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/siguiente.svg')", WebkitMaskImage: "url('/iconos/panel/siguiente.svg')" }} aria-hidden="true" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}