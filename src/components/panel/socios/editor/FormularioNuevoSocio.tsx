
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import FamiliaresFormularioAlta, {
  validarNombresFamiliares,
  vincularFamiliaresAlNuevoCarnet,
} from "./FamiliaresFormularioAlta";

type EstadoCarnet = "pendiente" | "activo";

type EstadoVinculacion =
  | "pendiente"
  | "guardando"
  | "completo"
  | "error";

interface TemporadaOpcion {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activa: boolean;
}

interface CredencialesCreadas {
  socioId: string;
  carnetId: string;
  email: string;
  numeroSocio: number;
  numeroCarnet: string;
  passwordCarnet: string;
  emailEnviado: boolean;
}

interface ErrorCampo {
  campo: string;
  mensaje: string;
}

interface RespuestaApi {
  ok: boolean;
  data: unknown;
  error: string | null;
  errores?: ErrorCampo[];
}

const TIPOS_SOCIO_INICIALES = [
  "General",
  "Familiar",
  "Jugador/a",
  "Entrenador/a",
  "Colaborador/a",
  "Directiva",
  "Simpatizante",
];

const claseCampo =
  "min-h-11 w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

const claseEtiqueta =
  "text-sm font-bold text-on-surface";

const claseSeccion =
  "overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm";

const claseBotonSecundario =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container";

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function texto(valor: unknown): string {
  return (
    typeof valor === "string" ||
    typeof valor === "number"
  )
    ? String(valor).trim()
    : "";
}

function numero(valor: unknown): number | null {
  const convertido = Number(valor);

  return Number.isSafeInteger(convertido) &&
    convertido >= 1
    ? convertido
    : null;
}

function obtenerFechaMadrid(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const anio = partes.find(
    (parte) => parte.type === "year",
  )?.value;

  const mes = partes.find(
    (parte) => parte.type === "month",
  )?.value;

  const dia = partes.find(
    (parte) => parte.type === "day",
  )?.value;

  return anio && mes && dia
    ? `${anio}-${mes}-${dia}`
    : "";
}

function formatearFecha(fecha: string): string {
  if (!fecha) {
    return "Se asignará al crear el carnet";
  }

  const fechaConvertida = new Date(
    `${fecha}T12:00:00.000Z`,
  );

  if (!Number.isFinite(fechaConvertida.getTime())) {
    return fecha;
  }

  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fechaConvertida);
}

function convertirTemporada(
  valor: unknown,
): TemporadaOpcion | null {
  if (!esObjeto(valor)) {
    return null;
  }

  const id = texto(valor.id);

  if (!id) {
    return null;
  }

  return {
    id,
    nombre: texto(valor.nombre) || "Temporada",
    fechaInicio: texto(
      valor.fechaInicio ?? valor.fecha_inicio,
    ),
    fechaFin: texto(
      valor.fechaFin ?? valor.fecha_fin,
    ),
    activa: valor.activa === true,
  };
}

function extraerOpciones(valor: unknown): {
  temporadas: TemporadaOpcion[];
  temporadaActiva: TemporadaOpcion | null;
  tiposSocio: string[];
} {
  if (!esObjeto(valor)) {
    return {
      temporadas: [],
      temporadaActiva: null,
      tiposSocio: [],
    };
  }

  const opciones = esObjeto(valor.opciones)
    ? valor.opciones
    : valor;

  const temporadas = Array.isArray(opciones.temporadas)
    ? opciones.temporadas.flatMap((elemento) => {
        const temporada = convertirTemporada(elemento);
        return temporada ? [temporada] : [];
      })
    : [];

  const temporadaActiva =
    convertirTemporada(opciones.temporadaActiva) ??
    temporadas.find((temporada) => temporada.activa) ??
    null;

  const tiposSocio = Array.isArray(opciones.tiposSocio)
    ? opciones.tiposSocio.flatMap((elemento) => {
        if (typeof elemento === "string") {
          return elemento.trim()
            ? [elemento.trim()]
            : [];
        }

        if (esObjeto(elemento)) {
          const tipo = texto(
            elemento.valor ?? elemento.nombre,
          );

          return tipo ? [tipo] : [];
        }

        return [];
      })
    : [];

  return {
    temporadas,
    temporadaActiva,
    tiposSocio: [...new Set(tiposSocio)],
  };
}

function extraerCredenciales(
  valor: unknown,
): CredencialesCreadas | null {
  if (!esObjeto(valor)) {
    return null;
  }

  const socio = esObjeto(valor.socio)
    ? valor.socio
    : null;

  const carnet = esObjeto(valor.carnet)
    ? valor.carnet
    : null;

  const credenciales = esObjeto(valor.credenciales)
    ? valor.credenciales
    : null;

  if (!socio || !carnet || !credenciales) {
    return null;
  }

  const socioId = texto(socio.id);
  const carnetId = texto(carnet.id);
  const email = texto(credenciales.email);

  const numeroSocio = numero(
    credenciales.numeroSocio ??
      credenciales.numero_socio,
  );

  const numeroCarnet = texto(
    credenciales.numeroCarnet ??
      credenciales.numero_carnet,
  );

  const passwordCarnet = texto(
    credenciales.passwordCarnet ??
      credenciales.password_carnet,
  );

  if (
    !socioId ||
    !carnetId ||
    !email ||
    numeroSocio === null ||
    !numeroCarnet ||
    !passwordCarnet
  ) {
    return null;
  }

  return {
    socioId,
    carnetId,
    email,
    numeroSocio,
    numeroCarnet,
    passwordCarnet,
    emailEnviado: valor.emailEnviado === true,
  };
}

function extraerErrores(
  valor: unknown,
): ErrorCampo[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.flatMap((elemento) => {
    if (!esObjeto(elemento)) {
      return [];
    }

    const campo = texto(elemento.campo);
    const mensaje = texto(elemento.mensaje);

    return campo && mensaje
      ? [{ campo, mensaje }]
      : [];
  });
}

export default function FormularioNuevoSocio() {
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [observaciones, setObservaciones] =
    useState("");
  const [socioActivo, setSocioActivo] =
    useState(true);

  const [temporadaId, setTemporadaId] =
    useState("");

  const [tipoSocio, setTipoSocio] =
    useState("General");

  const [estadoCarnet, setEstadoCarnet] =
    useState<EstadoCarnet>("activo");

  const [fechaAlta, setFechaAlta] =
    useState("");

  const [fechaCaducidad, setFechaCaducidad] =
    useState("");

  const [temporadas, setTemporadas] =
    useState<TemporadaOpcion[]>([]);

  const [tiposSocio, setTiposSocio] =
    useState<string[]>(TIPOS_SOCIO_INICIALES);

  const [nombresFamiliares, setNombresFamiliares] =
    useState<string[]>([]);

  const [cargandoOpciones, setCargandoOpciones] =
    useState(true);

  const [errorOpciones, setErrorOpciones] =
    useState<string | null>(null);

  const [intentoOpciones, setIntentoOpciones] =
    useState(0);

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [erroresCampo, setErroresCampo] =
    useState<ErrorCampo[]>([]);

  const [credenciales, setCredenciales] =
    useState<CredencialesCreadas | null>(null);

  const [estadoVinculacion, setEstadoVinculacion] =
    useState<EstadoVinculacion>("pendiente");

  const [errorFamiliares, setErrorFamiliares] =
    useState<string | null>(null);

  const [textoCopiado, setTextoCopiado] =
    useState<string | null>(null);

  const enviandoRef = useRef(false);

  const temporadaSeleccionada =
    temporadas.find(
      (temporada) => temporada.id === temporadaId,
    );

  const carnetFamiliar =
    tipoSocio.trim().toLowerCase() === "familiar";

  const titular =
    [nombre.trim(), apellidos.trim()]
      .filter(Boolean)
      .join(" ");

  const errorNombres = carnetFamiliar
    ? validarNombresFamiliares(
        nombresFamiliares,
        titular,
      )
    : null;

  const requiereVincular =
    carnetFamiliar &&
    nombresFamiliares.some(
      (familiar) => familiar.trim().length > 0,
    );

  useEffect(() => {
    const actualizarFecha = () =>
      setFechaAlta(obtenerFechaMadrid());

    actualizarFecha();

    const intervalo = window.setInterval(
      actualizarFecha,
      60_000,
    );

    window.addEventListener(
      "focus",
      actualizarFecha,
    );

    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener(
        "focus",
        actualizarFecha,
      );
    };
  }, []);

  useEffect(() => {
    const controlador = new AbortController();

    async function cargarOpciones() {
      setCargandoOpciones(true);
      setErrorOpciones(null);

      try {
        const respuesta = await fetch(
          "/api/panel/socios/opciones",
          {
            credentials: "same-origin",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
            signal: controlador.signal,
          },
        );

        const contenido =
          (await respuesta.json()) as
            RespuestaApi;

        if (
          !respuesta.ok ||
          !contenido.ok ||
          !contenido.data
        ) {
          throw new Error(
            contenido.error ||
              "No se han podido cargar las opciones.",
          );
        }

        const opciones = extraerOpciones(
          contenido.data,
        );

        if (controlador.signal.aborted) {
          return;
        }

        setTemporadas(opciones.temporadas);

        if (opciones.tiposSocio.length > 0) {
          setTiposSocio(opciones.tiposSocio);
          setTipoSocio(opciones.tiposSocio[0]);
        }

        const temporada =
          opciones.temporadaActiva ??
          opciones.temporadas[0];

        setTemporadaId(temporada?.id ?? "");
        setFechaCaducidad(
          temporada?.fechaFin ?? "",
        );
      } catch (capturado) {
        if (controlador.signal.aborted) {
          return;
        }

        setErrorOpciones(
          capturado instanceof Error
            ? capturado.message
            : "No se han podido cargar las opciones.",
        );
      } finally {
        if (!controlador.signal.aborted) {
          setCargandoOpciones(false);
        }
      }
    }

    void cargarOpciones();

    return () => controlador.abort();
  }, [intentoOpciones]);

  function cambiarTemporada(id: string) {
    setTemporadaId(id);

    const temporada = temporadas.find(
      (elemento) => elemento.id === id,
    );

    setFechaCaducidad(
      temporada?.fechaFin ?? "",
    );

    setError(null);
    setErroresCampo([]);
  }

  function mostrarErrorCampo(campo: string) {
    const mensaje = erroresCampo.find(
      (elemento) =>
        elemento.campo === campo ||
        elemento.campo.endsWith(`.${campo}`),
    )?.mensaje;

    return mensaje ? (
      <span className="text-xs text-error">
        {mensaje}
      </span>
    ) : null;
  }

  async function guardarFamiliares(
    datos: CredencialesCreadas,
  ): Promise<void> {
    setEstadoVinculacion("guardando");
    setErrorFamiliares(null);

    try {
      await vincularFamiliaresAlNuevoCarnet({
        socioId: datos.socioId,
        carnetId: datos.carnetId,
        nombres: nombresFamiliares,
      });

      setEstadoVinculacion("completo");
    } catch (capturado) {
      setEstadoVinculacion("error");

      setErrorFamiliares(
        capturado instanceof Error
          ? capturado.message
          : "No se han podido guardar los familiares.",
      );
    }
  }

  async function guardarSocio(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (
      enviandoRef.current ||
      credenciales ||
      cargandoOpciones ||
      errorOpciones
    ) {
      return;
    }

    if (!temporadaId) {
      setError(
        "Debes seleccionar una temporada.",
      );
      return;
    }

    if (errorNombres) {
      setError(errorNombres);
      return;
    }

    enviandoRef.current = true;
    setGuardando(true);
    setError(null);
    setErroresCampo([]);

    const fechaActual = obtenerFechaMadrid();
    setFechaAlta(fechaActual);

    try {
      const respuesta = await fetch(
        "/api/panel/socios",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre: nombre.trim(),
            apellidos: apellidos.trim(),
            email: email.trim().toLowerCase(),
            telefono: telefono.trim() || null,
            observaciones:
              observaciones.trim() || null,
            activo: socioActivo,
            carnet: {
              temporadaId,
              tipoSocio,
              estado: estadoCarnet,
              fechaAlta: fechaActual,
              fechaCaducidad,
            },
          }),
        },
      );

      const contenido =
        (await respuesta.json()) as
          RespuestaApi;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data
      ) {
        setErroresCampo(
          extraerErrores(contenido.errores),
        );

        throw new Error(
          contenido.error ||
            "No se ha podido crear el socio.",
        );
      }

      const datos = extraerCredenciales(
        contenido.data,
      );

      if (!datos) {
        throw new Error(
          "El socio puede haberse creado, pero la API no ha devuelto todos sus datos. Consulta el listado antes de repetir el alta.",
        );
      }

      // El socio ya existe. Conservamos sus credenciales
      // antes de comenzar a registrar familiares.
      setCredenciales(datos);

      if (requiereVincular) {
        await guardarFamiliares(datos);
      } else {
        setEstadoVinculacion("completo");
      }
    } catch (capturado) {
      setError(
        capturado instanceof Error
          ? capturado.message
          : "No se ha podido crear el socio.",
      );
    } finally {
      enviandoRef.current = false;
      setGuardando(false);
    }
  }

  async function copiarTexto(valor: string) {
    try {
      await navigator.clipboard.writeText(valor);
      setTextoCopiado(valor);
    } catch {
      setError(
        "No se ha podido copiar este dato.",
      );
    }
  }

  if (credenciales) {
    const datos = [
      ["Usuario", credenciales.email],
      ["Número de socio", String(credenciales.numeroSocio)],
      ["Número de carnet", credenciales.numeroCarnet],
      ["Contraseña", credenciales.passwordCarnet],
    ];

    return (
      <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-success/40 bg-surface-container-lowest shadow-sm">
        <header className="bg-success p-6 text-on-success">
          <p className="text-xs font-bold uppercase tracking-wide">
            Socio creado
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            Credenciales del carnet
          </h2>

          <p className="mt-2 text-sm">
            Conserva estos datos para el acceso
            del socio.
          </p>
        </header>

        <div className="grid gap-5 p-6">
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-error/30 bg-error-container p-4 text-sm text-on-error-container"
            >
              {error}
            </p>
          )}

          <div className="rounded-2xl border border-primary/30 bg-primary-fixed p-5 text-on-primary-fixed">
            {datos.map(([etiqueta, valor]) => (
              <div
                key={etiqueta}
                className="flex flex-col justify-between gap-3 border-b border-on-primary-fixed/20 py-4 last:border-0 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-xs font-bold uppercase opacity-70">
                    {etiqueta}
                  </p>

                  <p className="mt-1 break-all font-mono text-lg font-bold">
                    {valor}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void copiarTexto(valor)
                  }
                  className="w-fit rounded-lg border border-on-primary-fixed/30 px-3 py-2 text-xs font-bold"
                >
                  {textoCopiado === valor
                    ? "Copiado"
                    : "Copiar"}
                </button>
              </div>
            ))}
          </div>

          <p className="rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
            {credenciales.emailEnviado
              ? "El correo de bienvenida se ha enviado correctamente."
              : "No consta el envío del correo. Facilita las credenciales al socio por otro medio si es necesario."}
          </p>

          {requiereVincular && (
            <div
              role="status"
              className={`rounded-xl border p-4 text-sm ${
                estadoVinculacion === "completo"
                  ? "border-success/30 bg-success-container text-on-success-container"
                  : estadoVinculacion === "error"
                    ? "border-error/30 bg-error-container text-on-error-container"
                    : "border-outline-variant bg-surface-container-low text-on-surface"
              }`}
            >
              <p className="font-bold">
                {estadoVinculacion === "completo"
                  ? "Familiares registrados correctamente"
                  : estadoVinculacion === "error"
                    ? "Socio creado, familiares pendientes"
                    : "Registrando familiares..."}
              </p>

              {errorFamiliares && (
                <p className="mt-2">
                  {errorFamiliares}
                </p>
              )}

              {estadoVinculacion === "error" && (
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() =>
                    void guardarFamiliares(
                      credenciales,
                    )
                  }
                  className="mt-3 rounded-lg border border-current px-3 py-2 text-xs font-bold disabled:opacity-50"
                >
                  Reintentar vinculación
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <a
              href="/panel/socios"
              className={claseBotonSecundario}
            >
              Volver al listado
            </a>

            <a
              href={`/panel/socios/${encodeURIComponent(
                credenciales.socioId,
              )}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary"
            >
              Abrir ficha del socio
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={guardarSocio}
      aria-busy={guardando}
      className="grid gap-5"
    >
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-error/30 bg-error-container p-4 text-sm text-on-error-container"
        >
          {error}
        </p>
      )}

      {errorOpciones && (
        <div
          role="alert"
          className="rounded-xl border border-error/30 bg-error-container p-4 text-sm text-on-error-container"
        >
          <p>{errorOpciones}</p>

          <button
            type="button"
            onClick={() =>
              setIntentoOpciones(
                (valor) => valor + 1,
              )
            }
            className="mt-3 rounded-lg border border-current px-4 py-2 text-xs font-bold"
          >
            Volver a intentarlo
          </button>
        </div>
      )}

      <section className={claseSeccion}>
        <header className="border-b border-outline-variant/60 p-5 sm:p-6">
          <h2 className="text-xl font-bold text-on-surface">
            Datos del socio
          </h2>

          <p className="mt-1 text-sm text-on-surface-variant">
            Estos datos identifican al titular y
            se mantienen entre temporadas.
          </p>
        </header>

        <fieldset
          disabled={guardando}
          className="grid min-w-0 gap-5 p-5 sm:grid-cols-2 sm:p-6"
        >
          <label className="grid gap-1.5">
            <span className={claseEtiqueta}>
              Nombre
            </span>

            <input
              type="text"
              value={nombre}
              onChange={(evento) =>
                setNombre(evento.target.value)
              }
              required
              maxLength={100}
              autoComplete="given-name"
              className={claseCampo}
            />
            {mostrarErrorCampo("nombre")}
          </label>

          <label className="grid gap-1.5">
            <span className={claseEtiqueta}>
              Apellidos
            </span>

            <input
              type="text"
              value={apellidos}
              onChange={(evento) =>
                setApellidos(evento.target.value)
              }
              required
              maxLength={150}
              autoComplete="family-name"
              className={claseCampo}
            />
            {mostrarErrorCampo("apellidos")}
          </label>

          <label className="grid gap-1.5">
            <span className={claseEtiqueta}>
              Correo electrónico
            </span>

            <input
              type="email"
              value={email}
              onChange={(evento) =>
                setEmail(evento.target.value)
              }
              required
              maxLength={254}
              autoComplete="email"
              className={claseCampo}
            />
            {mostrarErrorCampo("email")}
          </label>

          <label className="grid gap-1.5">
            <span className={claseEtiqueta}>
              Teléfono
            </span>

            <input
              type="tel"
              value={telefono}
              onChange={(evento) =>
                setTelefono(evento.target.value)
              }
              maxLength={30}
              autoComplete="tel"
              className={claseCampo}
            />
            {mostrarErrorCampo("telefono")}
          </label>

          <label className="grid gap-1.5 sm:col-span-2">
            <span className={claseEtiqueta}>
              Observaciones internas
            </span>

            <textarea
              rows={4}
              value={observaciones}
              onChange={(evento) =>
                setObservaciones(
                  evento.target.value,
                )
              }
              maxLength={2000}
              className="w-full resize-y rounded-xl border border-outline-variant bg-surface-container-low px-3 py-3 text-sm text-on-surface outline-none focus:border-primary"
            />
            {mostrarErrorCampo("observaciones")}
          </label>

          <label className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-4 sm:col-span-2">
            <span>
              <span className="block text-sm font-bold text-on-surface">
                Socio activo
              </span>

              <span className="mt-1 block text-xs text-on-surface-variant">
                Si se desactiva, no podrá acceder a
                ninguno de sus carnets.
              </span>
            </span>

            <input
              type="checkbox"
              checked={socioActivo}
              onChange={(evento) =>
                setSocioActivo(
                  evento.target.checked,
                )
              }
              className="h-5 w-5 accent-primary"
            />
          </label>
        </fieldset>
      </section>

      <section className={claseSeccion}>
        <header className="border-b border-outline-variant/60 p-5 sm:p-6">
          <h2 className="text-xl font-bold text-on-surface">
            Primer carnet
          </h2>

          <p className="mt-1 text-sm text-on-surface-variant">
            El número de socio y el de carnet se
            asignan automáticamente.
          </p>
        </header>

        <fieldset
          disabled={
            guardando ||
            cargandoOpciones ||
            Boolean(errorOpciones)
          }
          className="grid min-w-0 gap-5 p-5 sm:grid-cols-2 sm:p-6"
        >
          <label className="grid gap-1.5 sm:col-span-2">
            <span className={claseEtiqueta}>
              Temporada
            </span>

            <select
              value={temporadaId}
              onChange={(evento) =>
                cambiarTemporada(
                  evento.target.value,
                )
              }
              required
              className={claseCampo}
            >
              <option value="">
                {cargandoOpciones
                  ? "Cargando temporadas..."
                  : "Selecciona una temporada"}
              </option>

              {temporadas.map((temporada) => (
                <option
                  key={temporada.id}
                  value={temporada.id}
                >
                  {temporada.nombre}
                  {temporada.activa
                    ? " · Activa"
                    : ""}
                </option>
              ))}
            </select>
            {mostrarErrorCampo("temporadaId")}

            {temporadaSeleccionada && (
              <span className="text-xs text-on-surface-variant">
                Del{" "}
                {formatearFecha(
                  temporadaSeleccionada.fechaInicio,
                )}{" "}
                al{" "}
                {formatearFecha(
                  temporadaSeleccionada.fechaFin,
                )}
              </span>
            )}
          </label>

          <label className="grid gap-1.5">
            <span className={claseEtiqueta}>
              Tipo de socio
            </span>

            <select
              value={tipoSocio}
              onChange={(evento) =>
                setTipoSocio(
                  evento.target.value,
                )
              }
              required
              className={claseCampo}
            >
              {tiposSocio.map((tipo) => (
                <option
                  key={tipo}
                  value={tipo}
                >
                  {tipo}
                </option>
              ))}
            </select>

            {mostrarErrorCampo("tipoSocio")}
          </label>

          <label className="grid gap-1.5">
            <span className={claseEtiqueta}>
              Estado inicial
            </span>

            <select
              value={estadoCarnet}
              onChange={(evento) => {
                const valor = evento.target.value;

                if (
                  valor === "activo" ||
                  valor === "pendiente"
                ) {
                  setEstadoCarnet(valor);
                }
              }}
              className={claseCampo}
            >
              <option value="activo">
                Activo
              </option>

              <option value="pendiente">
                Pendiente
              </option>
            </select>
          </label>

          <div className="grid gap-1.5">
            <span className={claseEtiqueta}>
              Fecha de alta
            </span>

            <output className="flex min-h-11 items-center rounded-xl border border-outline-variant bg-surface-container px-3 text-sm text-on-surface">
              {formatearFecha(fechaAlta)}
            </output>

            <p className="text-xs text-on-surface-variant">
              Se asigna al crear el carnet.
            </p>
          </div>

          <label className="grid gap-1.5">
            <span className={claseEtiqueta}>
              Fecha de caducidad
            </span>

            <input
              type="date"
              value={fechaCaducidad}
              onChange={(evento) =>
                setFechaCaducidad(
                  evento.target.value,
                )
              }
              max={
                temporadaSeleccionada?.fechaFin ||
                undefined
              }
              required
              className={claseCampo}
            />

            {mostrarErrorCampo("fechaCaducidad")}
          </label>

          {carnetFamiliar && (
            <div className="sm:col-span-2">
              <FamiliaresFormularioAlta
                nombres={nombresFamiliares}
                onChange={setNombresFamiliares}
                disabled={guardando}
                titular={titular}
              />
            </div>
          )}
        </fieldset>
      </section>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
        <a
          href="/panel/socios"
          className={claseBotonSecundario}
        >
          Cancelar
        </a>

        <button
          type="submit"
          disabled={
            guardando ||
            cargandoOpciones ||
            Boolean(errorOpciones) ||
            !temporadaId ||
            Boolean(errorNombres)
          }
          className="min-h-11 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando
            ? "Creando socio..."
            : "Crear socio y carnet"}
        </button>
      </div>
    </form>
  );
}
