// Sahifa bo'lagini PDF ga aylantirish: brauzer o'zi chizgan ko'rinish (grafiklar, o'zbekcha harflar) rasmga olinadi.
// Kutubxonalar og'ir — faqat tugma bosilganda yuklanadi.

const A4 = { w: 210, h: 297, margin: 10 };

export async function exportElementToPdf(el: HTMLElement, fileName: string): Promise<void> {
  const [{ toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
  el.classList.add('pdf-capture');
  try {
    const dataUrl = await toPng(el, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
      // data-pdf-hide belgili tugma va filtrlar PDF ga tushmaydi
      filter: (node) => !(node instanceof HTMLElement && node.dataset.pdfHide !== undefined),
    });
    const img = await loadImage(dataUrl);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const width = A4.w - A4.margin * 2;
    const pageH = A4.h - A4.margin * 2;
    const height = (img.height * width) / img.width;
    // Uzun sahifa — bir xil rasmni har sahifada yuqoriga surib chizamiz
    for (let offset = 0, page = 0; offset < height; offset += pageH, page += 1) {
      if (page > 0) pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', A4.margin, A4.margin - offset, width, height, undefined, 'FAST');
      // Pastki/yuqori chetga chiqib qolgan bo'lakni oq bilan yopish
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, A4.w, A4.margin, 'F');
      pdf.rect(0, A4.h - A4.margin, A4.w, A4.margin, 'F');
      pdf.setFontSize(8);
      pdf.setTextColor(140);
      pdf.text(`${page + 1}`, A4.w - A4.margin, A4.h - 4, { align: 'right' });
    }
    pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
  } finally {
    el.classList.remove('pdf-capture');
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('PDF uchun rasm tayyorlab bo\'lmadi'));
    img.src = src;
  });
}
