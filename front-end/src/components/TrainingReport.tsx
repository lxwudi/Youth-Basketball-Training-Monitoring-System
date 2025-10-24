import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StudentSelector } from '@/components/StudentSelector';
import {
  type AIAnalysisResponse,
  type TrainingReport,
  generateTrainingReport,
  sendReportToParent,
  type MetricsFrame
} from '@/lib/api';
import {
  Download,
  Send,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Target,
  Star
} from 'lucide-react';

interface TrainingReportProps {
  trainingType: 'shooting' | 'dribbling' | 'defense';
  metrics: MetricsFrame[];
  aiAnalysis: AIAnalysisResponse;
}

interface Student {
  id: string;
  name: string;
  parentId: string;
}

export function TrainingReportComponent({
  trainingType,
  metrics,
  aiAnalysis
}: TrainingReportProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [report, setReport] = useState<TrainingReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ success: boolean; message: string } | null>(null);

  const getTrainingTypeLabel = () => {
    switch (trainingType) {
      case 'shooting': return '投篮训练';
      case 'dribbling': return '运球训练';
      case 'defense': return '防守训练';
      default: return '训练';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleGenerateReport = async () => {
    if (!selectedStudent) return;

    setGenerating(true);
    try {
      const newReport = await generateTrainingReport(
        selectedStudent.id,
        selectedStudent.name,
        trainingType,
        aiAnalysis,
        metrics
      );
      setReport(newReport);
      setSendStatus(null);
    } catch (error) {
      console.error('生成报告失败:', error);
      setSendStatus({ success: false, message: '报告生成服务暂时不可用，请稍后重试' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSendToParent = async () => {
    if (!report || !selectedStudent) return;

    setSending(true);
    try {
      const result = await sendReportToParent(report.id, selectedStudent.parentId);
      setSendStatus(result);
      if (result.success) {
        setReport({ ...report, sentToParent: true });
      }
    } catch (error) {
      console.error('发送报告失败:', error);
      setSendStatus({ success: false, message: '发送失败，请稍后重试' });
    } finally {
      setSending(false);
    }
  };

  const handleDownloadReport = () => {
    if (!report) return;

    const reportContent = `
${getTrainingTypeLabel()}报告
学员: ${report.studentName}
生成时间: ${new Date(report.timestamp).toLocaleString()}

总体评分: ${report.analysisResult.overallScore}分

分析总结:
${report.analysisResult.summary}

优势方面:
${report.analysisResult.strengths.map(s => `• ${s}`).join('\n')}

需要改进:
${report.analysisResult.improvementAreas.map(a => `• ${a}`).join('\n')}

训练建议:
${report.analysisResult.suggestions.map(s => `• ${s}`).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getTrainingTypeLabel()}_${report.studentName}_${new Date().toLocaleDateString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 学员选择卡片 - 霓虹玻璃态 */}
      <Card className="u-card-glass relative overflow-hidden">
        <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-neon-cyan/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold gradient-text">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple text-white shadow-lg shadow-neon-cyan/30">
              <Target className="w-5 h-5" />
            </div>
            选择学员
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <StudentSelector
            value={selectedStudent?.id}
            onValueChange={(_, student) => setSelectedStudent(student)}
            placeholder="请选择要生成报告的学员"
            className="input-glass"
          />
        </CardContent>
      </Card>

      {/* AI分析结果卡片 - 霓虹主题 */}
      <Card className="u-card-glass relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-br from-neon-purple/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-3 text-lg font-semibold gradient-text">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink text-white shadow-lg shadow-neon-purple/30">
                <Star className="w-5 h-5" />
              </div>
              AI智能分析结果
            </span>
            <Badge variant="outline" className={`text-sm font-bold ${getScoreColor(aiAnalysis.overallScore)} border-current bg-current/10`}>
              {aiAnalysis.overallScore}分
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 space-y-6">
          <div className="rounded-2xl bg-slate-50/80 p-4 dark:bg-slate-900/60">
            <h4 className="mb-3 text-base font-semibold text-slate-800 dark:text-slate-100">分析总结</h4>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{aiAnalysis.summary}</p>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-60" />

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-emerald-50/80 p-4 dark:bg-emerald-950/60">
              <h4 className="mb-3 flex items-center gap-2 text-base font-semibold text-emerald-800 dark:text-emerald-100">
                <TrendingUp className="w-5 h-5" />
                优势方面
              </h4>
              <ul className="space-y-2">
                {aiAnalysis.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-emerald-700 dark:text-emerald-300">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">✓</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-red-50/80 p-4 dark:bg-red-950/60">
              <h4 className="mb-3 flex items-center gap-2 text-base font-semibold text-red-800 dark:text-red-100">
                <TrendingDown className="w-5 h-5" />
                需要改进
              </h4>
              <ul className="space-y-2">
                {aiAnalysis.improvementAreas.map((area, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-red-700 dark:text-red-300">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">!</span>
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl bg-blue-50/80 p-4 dark:bg-blue-950/60">
            <h4 className="mb-3 text-base font-semibold text-blue-800 dark:text-blue-100">训练建议</h4>
            <ul className="space-y-2">
              {aiAnalysis.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-blue-700 dark:text-blue-300">
                  <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">{index + 1}</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮卡片 - 霓虹按钮组 */}
      <Card className="u-card-glass relative overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-neon-cyan via-neon-purple to-neon-pink" />
        <CardContent className="relative z-10 pt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              onClick={handleGenerateReport}
              disabled={!selectedStudent || generating}
              className="h-12 rounded-xl bg-gradient-to-r from-neon-purple to-neon-cyan px-6 font-semibold text-white shadow-lg hover:shadow-neon-purple transition-all duration-300 hover:scale-105"
            >
              {generating ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  生成中...
                </>
              ) : (
                '生成训练报告'
              )}
            </Button>

            {report && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleDownloadReport}
                  className="h-12 rounded-xl border-2 border-neon-cyan/50 px-4 font-semibold text-neon-cyan hover:bg-neon-cyan/10 transition-all duration-300"
                >
                  <Download className="mr-2 h-4 w-4" />
                  下载报告
                </Button>

                <Button
                  onClick={handleSendToParent}
                  disabled={sending || report.sentToParent}
                  className="h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 font-semibold text-white shadow-lg hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-105"
                >
                  {sending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      发送中...
                    </>
                  ) : report.sentToParent ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      已发送
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      发送给家长
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {sendStatus && (
            <div className={`mt-6 flex items-center gap-3 rounded-2xl border-2 p-4 ${
              sendStatus.success
                ? 'border-emerald-500/30 bg-emerald-50/80 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'border-red-500/30 bg-red-50/80 text-red-700 dark:border-red-400/40 dark:bg-red-950/60 dark:text-red-300'
            }`}>
              {sendStatus.success ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span className="font-medium">{sendStatus.message}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
