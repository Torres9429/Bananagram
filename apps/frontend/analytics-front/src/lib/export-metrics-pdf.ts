// Exportación 100% cliente — captura el DOM tal cual está renderizado (ya
// refleja los filtros activos, sin recalcular nada del lado del servidor) y
// lo convierte a un PDF paginado. Import dinámico: ambas librerías tocan el
// DOM/canvas del navegador, no deben intentar cargarse durante SSR.
//
// Riesgo conocido (Tailwind v4 de este proyecto usa colores oklch() en su
// paleta por defecto): html-to-image/html2canvas históricamente fallan o
// pintan fondos negros/transparentes con funciones de color modernas
// (oklch/lab/color-mix) que no saben parsear. No se pudo probar en vivo en
// esta sesión (requiere navegador) — si al probar aparece este problema, el
// workaround es forzar los estilos computados a rgb/hex antes de capturar
// (opción `style` de toPng), no cambiar de librería.
export async function exportVisibleMetricsAsPdf(element: HTMLElement, filename: string): Promise<void> {
  const { toPng } = await import('html-to-image');
  const { jsPDF } = await import('jspdf');

  const dataUrl = await toPng(element, { backgroundColor: '#F7F7F7', pixelRatio: 2 });

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('No se pudo procesar la captura.'));
    img.src = dataUrl;
  });

  const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (img.height * imgWidth) / img.width;

  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
