import os from 'os';
import path from 'path';
import fs from 'fs';

/**
 * Retourne le dossier de données adapté à l'environnement :
 * - Sur Vercel (AWS Lambda) : os.tmpdir()/.data (seul répertoire accessible en écriture)
 * - En local (Windows/Mac/Linux) : ./data dans la racine du projet
 */
export function getDataDirectory(): string {
  const isServerless =
    process.env.VERCEL === '1' ||
    process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
    (process.env.NODE_ENV === 'production' && process.platform !== 'win32');

  const dir = isServerless
    ? path.join(os.tmpdir(), '.data')
    : path.join(process.cwd(), '.data');

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    // Ne jamais crasher si le dossier existe déjà ou si restriction temporaire
  }

  return dir;
}
