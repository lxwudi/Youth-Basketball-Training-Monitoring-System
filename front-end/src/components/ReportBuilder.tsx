import { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';

interface ReportBuilderProps {
  targetId: string;
  fileName?: string;
  title?: string;
}

export function ReportBuilder({ targetId, fileName = '训练报告.pdf', title = '青少年体态与篮球矫正报告' }: ReportBuilderProps) {
  const [processing, setProcessing] = useState(false);

  const handleExport = async () => {
    const el = document.getElementById(targetId);
    if (!el) return;
    setProcessing(true);
    try {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
      const imageData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      // const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const renderHeight = pageWidth * ratio;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text(title, pageWidth / 2, 18, { align: 'center' });
      pdf.addImage(imageData, 'PNG', 10, 28, pageWidth - 20, renderHeight - 30);
      pdf.save(fileName);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm" disabled={processing}>
      {processing ? '生成中...' : '导出PDF报告'}
    </Button>
  );
}
