// PDF helpers for the rendered invoice card.
//
// Both helpers take a DOM element (the <Invoice /> wrapper) and use
// html2canvas to rasterize it, then jsPDF to wrap it in a letter-size PDF.

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

async function renderInvoicePdf(element) {
  if (!element) throw new Error("Invoice element not found");
  const canvas = await html2canvas(element, {
    scale: 2, // higher DPI for crisp text
    backgroundColor: "#ffffff",
    useCORS: true,
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ unit: "pt", format: "letter" }); // 612 x 792 pt
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Fit the rasterized invoice on a single letter page while preserving aspect ratio.
  const widthScale = pageWidth / canvas.width;
  const heightScale = pageHeight / canvas.height;
  const scale = Math.min(widthScale, heightScale);
  const drawWidth = canvas.width * scale;
  const drawHeight = canvas.height * scale;
  const x = (pageWidth - drawWidth) / 2;
  const y = (pageHeight - drawHeight) / 2;

  pdf.addImage(imgData, "PNG", x, y, drawWidth, drawHeight);
  return pdf;
}

// Triggers a browser download of the PDF.
export async function downloadInvoicePdf(element, invoiceNumber) {
  const pdf = await renderInvoicePdf(element);
  pdf.save(`${invoiceNumber}.pdf`);
}

// Returns the raw base64 (no `data:` prefix) for upload to Apps Script.
export async function getInvoicePdfBase64(element) {
  const pdf = await renderInvoicePdf(element);
  // jsPDF returns "data:application/pdf;base64,XXXX" — strip the prefix.
  const dataUri = pdf.output("datauristring");
  return dataUri.split(",", 2)[1];
}
