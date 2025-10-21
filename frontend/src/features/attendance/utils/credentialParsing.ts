import { ScrapedStudent } from '../types';

const ENTITY_MAP: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  aacute: 'á',
  eacute: 'é',
  iacute: 'í',
  oacute: 'ó',
  uacute: 'ú',
  Aacute: 'Á',
  Eacute: 'É',
  Iacute: 'Í',
  Oacute: 'Ó',
  Uacute: 'Ú',
  ntilde: 'ñ',
  Ntilde: 'Ñ',
  lacute: 'l',
  quot: '"',
  lt: '<',
  gt: '>',
};

export const sanitizeText = (text: string) =>
  text
    .replace(/&#(\d+);/g, (_, code) => {
      const parsed = Number(code);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : '';
    })
    .replace(/&([A-Za-z]+);/g, (match, entity) => ENTITY_MAP[entity.toLowerCase()] ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

export const parseStudentHtml = (html: string): ScrapedStudent => {
  const extractField = (patterns: RegExp[], valueIndex = 1): string | undefined => {
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[valueIndex]) {
        return sanitizeText(match[valueIndex]);
      }
    }
    return undefined;
  };

  const rawBoleta = extractField([
    /Boleta:\s*([0-9]{8,10})/i,
    /Boleta&lt;\/strong&gt;:\s*([0-9]{8,10})/i,
    /<div class='boleta'[^>]*>([0-9]{8,10})<\/div>/i,
  ]);

  const nombreCompleto = extractField([
    /Nombre:\s*([^&lt;\n]+)/i,
    /<div class='nombre'[^>]*>([^<]+)<\/div>/i,
  ]);

  const carrera = extractField([
    /Carrera:\s*([^&lt;\n]+)/i,
    /Programa\s+acad[eé]mico:\s*([^&lt;\n]+)/i,
    /<div class='carrera'[^>]*>([^<]+)<\/div>/i,
  ]);

  let escuela = extractField([
    /Escuela:\s*([^&lt;\n]+)/i,
    /Unidad\s+Profesional[^&lt;]+/i,
    /(UPIICSA)/i,
    /<div class='escuela'[^>]*>([^<]+)<\/div>/i,
  ]);

  if (escuela) {
    escuela = escuela.replace(/^(Y\s+)?Escuela:/i, '').trim();
    if (!escuela.includes('UPIICSA')) {
      escuela = `${escuela} (UPIICSA)`;
    }
  }

  if (!rawBoleta || !nombreCompleto) {
    throw new Error('No se pudo extraer boleta o nombre del HTML de credencial');
  }

  return {
    boleta: rawBoleta,
    nombreCompleto,
    carrera,
    escuela: escuela ?? 'UPIICSA',
  };
};

export const splitNombre = (nombreCompleto: string) => {
  const partes = nombreCompleto.split(/\s+/).filter(Boolean);
  if (partes.length === 0) {
    return { nombres: '', apellidos: '' };
  }
  if (partes.length === 1) {
    return { nombres: partes[0], apellidos: '' };
  }
  if (partes.length === 2) {
    return { nombres: partes[0], apellidos: partes[1] };
  }
  const apellidos = partes.slice(-2).join(' ');
  const nombres = partes.slice(0, partes.length - 2).join(' ');
  return { nombres, apellidos };
};
