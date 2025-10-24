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
    <Button 
      onClick={handleExport} 
      variant="outline" 
      size="sm" 
      disabled={processing}
      className="min-w-[140px] h-10 px-5 rounded-xl border-2 border-slate-300/50 hover:border-neon-cyan hover:shadow-neon-cyan dark:border-slate-700/50 transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm"
    >
      <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
        {processing ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            生成中...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="gradient-text font-semibold">导出PDF报告</span>
          </>
        )}
      </span>
    </Button>
  );
}
