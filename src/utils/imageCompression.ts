import JSZip from 'jszip';
import { Medicine } from '../types';

/**
 * Deterministic color palette for company initials placeholder tiles when medicine has no photo
 */
const TILE_PALETTES = [
  { bg: 'bg-teal-700', text: 'text-white' },
  { bg: 'bg-sky-700', text: 'text-white' },
  { bg: 'bg-indigo-700', text: 'text-white' },
  { bg: 'bg-emerald-700', text: 'text-white' },
  { bg: 'bg-amber-700', text: 'text-white' },
  { bg: 'bg-rose-700', text: 'text-white' },
  { bg: 'bg-cyan-800', text: 'text-white' },
  { bg: 'bg-slate-800', text: 'text-white' },
];

export function getCompanyInitials(company: string): string {
  const cleaned = (company || 'AM').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

export function getCompanyTilePalette(company: string): { bg: string; text: string } {
  let hash = 0;
  const str = (company || 'Aman Medical').toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TILE_PALETTES.length;
  return TILE_PALETTES[index];
}

/**
 * Compresses any image File or Blob to WebP (~40 KB target) using HTML5 Canvas
 */
export async function compressImageToWebP(
  fileOrBlob: Blob,
  targetMaxKb: number = 40
): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format'));
      img.onload = () => {
        // Start with max dimension 640px for crisp product thumbnails under 40KB
        let maxDim = 640;
        let quality = 0.78;
        let dataUrl = '';
        let sizeKb = 0;

        for (let attempt = 0; attempt < 6; attempt++) {
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }

          // Fill crisp white background for transparent PNGs
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          dataUrl = canvas.toDataURL('image/webp', quality);
          // Fallback if browser doesn't encode webp
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          const base64Length = dataUrl.split(',')[1]?.length || 0;
          sizeKb = Math.round(((base64Length * 3) / 4 / 1024) * 10) / 10;

          if (sizeKb <= targetMaxKb) {
            break;
          }

          quality = Math.max(0.35, quality - 0.12);
          maxDim = Math.round(maxDim * 0.82);
        }

        resolve({ dataUrl, sizeKb });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Generates a realistic sample ZIP file containing medicine product photos named after medicine codes
 * so mobile users can immediately test the Bulk Photo ZIP Upload workflow.
 */
export async function generateSampleMedicinePhotosZip(medicines: Medicine[]): Promise<Blob> {
  const zip = new JSZip();
  const sampleMeds = medicines.slice(0, 8);

  const colors = [
    ['#0f766e', '#115e59'],
    ['#0369a1', '#075985'],
    ['#4338ca', '#3730a3'],
    ['#15803d', '#166534'],
    ['#b45309', '#92400e'],
    ['#be123c', '#9f1239'],
    ['#0e7490', '#155e75'],
    ['#334155', '#1e293b'],
  ];

  for (let i = 0; i < sampleMeds.length; i++) {
    const med = sampleMeds[i];
    const [c1, c2] = colors[i % colors.length];

    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Background box
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 480, 360);

      // Medicine carton card
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(40, 40, 400, 280);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, 400, 280);

      // Brand header stripe
      const grad = ctx.createLinearGradient(40, 40, 440, 110);
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      ctx.fillStyle = grad;
      ctx.fillRect(40, 40, 400, 72);

      // Company & Rx text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(med.company.toUpperCase(), 62, 84);

      // Medicine Name
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(med.name.slice(0, 22), 62, 168);

      // Pack & Code
      ctx.fillStyle = '#475569';
      ctx.font = '18px monospace';
      ctx.fillText(`PACK: ${med.pack}`, 62, 212);
      ctx.fillText(`CODE: ${med.code}  |  MRP/RATE: Rs.${med.rate}`, 62, 248);

      // Blister strip circles
      ctx.fillStyle = c1;
      for (let pill = 0; pill < 6; pill++) {
        ctx.beginPath();
        ctx.arc(80 + pill * 52, 286, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64Data = dataUrl.split(',')[1];
    zip.file(`${med.code}.jpg`, base64Data, { base64: true });
  }

  return await zip.generateAsync({ type: 'blob' });
}
