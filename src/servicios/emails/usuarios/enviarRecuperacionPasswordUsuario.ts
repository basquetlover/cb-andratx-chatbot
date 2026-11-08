
import { enviarEmailApi } from "../cliente/enviarEmailApi";

interface DatosCorreo {
  nombre: string;
  email: string;
  enlace: string;
}

function escaparHtml(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function enviarRecuperacionPasswordUsuario({
  nombre,
  email,
  enlace,
}: DatosCorreo): Promise<void> {
  const nombreSeguro = escaparHtml(nombre);
  const enlaceSeguro = escaparHtml(enlace);

  const html = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="margin:0;padding:32px 16px;background:#f3f6fa;font-family:Arial,sans-serif;color:#032a55;">
        <table role="presentation" style="width:100%;max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border-collapse:separate;overflow:hidden;">
          <tr>
            <td style="background:#032a55;padding:28px;text-align:center;">
              <h1 style="color:#ffffff;font-size:24px;margin:0;">
                C.B. Andratx
              </h1>
              <p style="color:#ffc801;margin:8px 0 0;">
                Recuperación de contraseña
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <h2 style="font-size:21px;margin:0 0 18px;">
                Hola, ${nombreSeguro}
              </h2>
              <p style="line-height:1.6;">
                Hemos recibido una solicitud para restablecer
                la contraseña de acceso al panel de gestión.
              </p>
              <p style="line-height:1.6;">
                Utiliza el siguiente enlace para establecer
                una nueva contraseña:
              </p>
              <div style="text-align:center;margin:30px 0;">
                <a href="${enlaceSeguro}"
                   style="display:inline-block;background:#0b87ca;color:#ffffff;padding:15px 24px;text-decoration:none;border-radius:10px;font-weight:bold;">
                  Restablecer contraseña
                </a>
              </div>
              <p style="font-size:14px;line-height:1.6;">
                El enlace caduca en 30 minutos y solo
                puede utilizarse una vez.
              </p>
              <p style="font-size:13px;line-height:1.6;word-break:break-all;">
                Si el botón no funciona, copia este enlace:
                <br>
                <a href="${enlaceSeguro}">${enlaceSeguro}</a>
              </p>
              <p style="font-size:13px;color:#53657a;line-height:1.6;">
                Si no has solicitado este cambio, ignora el
                mensaje. Tu contraseña seguirá siendo la misma.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px;text-align:center;background:#e1e4e7;font-size:12px;color:#032a55;">
              C.B. Andratx · #FentBasquetDesde1985
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  await enviarEmailApi({
    to: email,
    subject: "Restablecer contraseña | C.B. Andratx",
    html,
    origen: "info",
  });
}
