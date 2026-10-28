// Operación manual exclusiva de staging. No imprime ni escribe credenciales en disco.
const path = require('node:path');
const auth = require('firebase-tools/lib/auth');
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { Client } = require('firebase-tools/lib/apiv2');
const { logger } = require('firebase-tools/lib/logger');
const nodemailer = require('nodemailer');

async function rotate() {
  logger.silent = true;
  process.chdir(path.resolve(__dirname, '..'));
  let password = '';
  for await (const chunk of process.stdin) password += chunk.toString('utf8');
  password = password.replace(/\s/gu, '');
  if (!/^[a-z]{16}$/iu.test(password)) throw new Error('invalid-app-password-format');

  const project = 'eventos-tup-angular-stg';
  const options = { project, nonInteractive: true };
  const account = auth.getProjectDefaultAccount(process.cwd());
  if (account) auth.setActiveAccount(options, account);
  await requireAuth(options);
  const safe = { skipLog: { body: true, resBody: true } };
  const functions = new Client({
    urlPrefix: 'https://cloudfunctions.googleapis.com',
    apiVersion: 'v2',
  });
  const metadata = await functions.get(
    `projects/${project}/locations/us-central1/functions/createEvent`,
    safe,
  );
  const binding = metadata.body.serviceConfig.secretEnvironmentVariables.find(
    (entry) => entry.key === 'SMTP_CONFIG',
  );
  if (!binding || !/^\d+$/u.test(binding.version)) throw new Error('invalid-binding');
  const secrets = new Client({
    urlPrefix: 'https://secretmanager.googleapis.com',
    apiVersion: 'v1',
  });
  const current = await secrets.get(
    `projects/${project}/secrets/SMTP_CONFIG/versions/${binding.version}:access`,
    safe,
  );
  const config = JSON.parse(Buffer.from(current.body.payload.data, 'base64').toString('utf8'));
  if (
    config.host !== 'smtp.gmail.com' ||
    config.port !== 465 ||
    config.secure !== true ||
    config.user !== 'eventos@tecplayacar.edu.mx' ||
    !Array.isArray(config.allowedRecipients)
  )
    throw new Error('unexpected-staging-configuration');
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: true,
    auth: { user: config.user, pass: password },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
  try {
    await transport.verify(); // Solo conexión y autenticación; no envía correos.
  } finally {
    transport.close();
  }
  const result = await secrets.post(
    `projects/${project}/secrets/SMTP_CONFIG:addVersion`,
    { payload: { data: Buffer.from(JSON.stringify({ ...config, password })).toString('base64') } },
    safe,
  );
  password = '';
  const version = result.body.name.split('/').pop();
  console.log(`Autenticación Gmail correcta. SMTP_CONFIG versión ${version} creada en staging.`);
  console.log(
    'No se enviaron correos ni se desplegaron Functions. Informe a Codex para continuar.',
  );
}

rotate().catch((error) => {
  // Nunca imprimir el error original: puede contener configuración o respuestas del proveedor.
  const code =
    typeof error.code === 'string' && /^[A-Z_]+$/u.test(error.code) ? error.code : 'ERROR';
  const status = Number.isInteger(error.responseCode) ? error.responseCode : '';
  console.error(
    `No se completó la rotación SMTP (${code} ${status}). No comparta la contraseña en el chat.`,
  );
  process.exitCode = 1;
});
