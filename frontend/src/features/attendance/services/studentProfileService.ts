import * as Network from 'expo-network';

import { ScrapedStudent } from '../types';
import { parseStudentHtml } from '../utils/credentialParsing';

const SCRAPER_ALLOWED_DOMAINS = [
  'servicios.dae.ipn.mx',
  'dae.ipn.mx',
  'upiicsa.ipn.mx',
  'ipn.mx',
];

const SCRAPER_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-MX,es;q=0.8,en;q=0.6',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  Referer: 'https://servicios.dae.ipn.mx/',
  Origin: 'https://servicios.dae.ipn.mx',
};

export const isAllowedUrl = (url: URL) =>
  url.protocol === 'https:' &&
  SCRAPER_ALLOWED_DOMAINS.some((host) => url.hostname.toLowerCase().endsWith(host));

export const checkConnectivity = async () => {
  const networkState = await Network.getNetworkStateAsync();
  if (!networkState.isConnected) {
    throw new Error('No hay conexión a internet');
  }
  const ipAddress = await Network.getIpAddressAsync();
  if (!ipAddress) {
    throw new Error('No se detectó IP local (red no reachable)');
  }
};

export const fetchStudentProfile = async (url: URL): Promise<ScrapedStudent> => {
  await checkConnectivity();

  const hashParam = url.searchParams.get('h');
  const targetUrl = hashParam
    ? `https://servicios.dae.ipn.mx/vcred/?h=${hashParam}`
    : url.toString();

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: SCRAPER_HEADERS,
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const html = await response.text();
    if (!html || html.length < 200) {
      throw new Error('Contenido insuficiente o bloqueado');
    }

    return parseStudentHtml(html);
  } catch (error: any) {
    throw new Error(
      `No se pudo obtener la información del estudiante. Detalle: ${
        error?.message ?? 'Error desconocido'
      }`
    );
  }
};
