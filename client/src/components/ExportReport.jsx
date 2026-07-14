import { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Ticket 4.1: Local PDF Export ──────────────────────────────────────────
// Captures DOM of conversation history → converts to PDF → browser download
// Done entirely client side using jsPDF + html2canvas
// No server side rendering needed — avoids Catalyst memory limits

// ─── Export Report Button Component ────────────────────────────────────────
// Import and use this in Chat.jsx and Analytics page
// Props:
//   targetRef → ref to the DOM element to capture
//   filename  → name of downloaded PDF file
//   label     → button label text
const ExportReport = ({ targetRef, filename = 'ASTRA_Investigation_Report', label = 'Export Report' }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!targetRef?.current || isExporting) return;
    setIsExporting(true);

    try {
      const element = targetRef.current;

      // ── Step 1: Capture DOM as canvas image ───────────────────────────
      const canvas = await html2canvas(element, {
        scale: 2,              // higher resolution
        useCORS: true,         // allow cross origin images
        backgroundColor: '#FFFFFF',
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      // ── Step 2: Create PDF ────────────────────────────────────────────
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Calculate image dimensions to fit A4
      const imgWidth = pdfWidth - 20; // 10mm margin each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // ── Step 3: Add KSP header ────────────────────────────────────────
      pdf.setFillColor(26, 58, 92); // #1A3A5C navy
      pdf.rect(0, 0, pdfWidth, 20, 'F');

      pdf.setTextColor(232, 197, 71); // #E8C547 yellow
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ASTRA — Karnataka State Police', 10, 13);

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `Investigation Report · Generated: ${new Date().toLocaleString('en-IN')}`,
        pdfWidth - 10, 13,
        { align: 'right' }
      );

      // ── Step 4: Add red accent line ───────────────────────────────────
      pdf.setDrawColor(192, 57, 43); // #C0392B red
      pdf.setLineWidth(0.8);
      pdf.line(0, 20, pdfWidth, 20);

      // ── Step 5: Add content (paginate if tall) ────────────────────────
      let yPosition = 25; // start below header
      let remainingHeight = imgHeight;
      let sourceY = 0;

      while (remainingHeight > 0) {
        const pageContentHeight = pdfHeight - yPosition - 15; // 15mm bottom margin
        const sliceHeight = Math.min(remainingHeight, pageContentHeight);
        const sliceCanvas = document.createElement('canvas');

        sliceCanvas.width = canvas.width;
        sliceCanvas.height = (sliceHeight / imgWidth) * canvas.width;

        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(
          canvas,
          0, sourceY,
          canvas.width, sliceCanvas.height,
          0, 0,
          canvas.width, sliceCanvas.height
        );

        const sliceData = sliceCanvas.toDataURL('image/png');
        pdf.addImage(sliceData, 'PNG', 10, yPosition, imgWidth, sliceHeight);

        remainingHeight -= sliceHeight;
        sourceY += sliceCanvas.height;

        if (remainingHeight > 0) {
          pdf.addPage();

          // Repeat header on each page
          pdf.setFillColor(26, 58, 92);
          pdf.rect(0, 0, pdfWidth, 14, 'F');
          pdf.setTextColor(232, 197, 71);
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.text('ASTRA — Karnataka State Police', 10, 10);
          pdf.setDrawColor(192, 57, 43);
          pdf.line(0, 14, pdfWidth, 14);

          yPosition = 18;
        }
      }

      // ── Step 6: Add footer on last page ──────────────────────────────
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setDrawColor(226, 213, 195); // #E2D5C3
        pdf.setLineWidth(0.3);
        pdf.line(10, pdfHeight - 10, pdfWidth - 10, pdfHeight - 10);
        pdf.setTextColor(160, 137, 107); // #A0896B
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Karnataka State Police — Authorised Personnel Only', 10, pdfHeight - 6);
        pdf.text(`Page ${i} of ${totalPages}`, pdfWidth - 10, pdfHeight - 6, { align: 'right' });
      }

      // ── Step 7: Trigger browser download ─────────────────────────────
      pdf.save(`${filename}_${Date.now()}.pdf`);

    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      style={{
        padding: '9px 18px',
        background: isExporting ? '#E2D5C3' : '#1A3A5C',
        color: isExporting ? '#A0896B' : '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: isExporting ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
      }}
    >
      {isExporting ? (
        <>⏳ Generating PDF...</>
      ) : (
        <>📄 {label}</>
      )}
    </button>
  );
};

export default ExportReport;