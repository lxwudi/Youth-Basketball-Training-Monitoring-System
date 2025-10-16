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
    <div className="space-y-6">
      {/* 学员选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            选择学员
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StudentSelector
            value={selectedStudent?.id}
            onValueChange={(studentId, student) => setSelectedStudent(student)}
            placeholder="请选择要生成报告的学员"
          />
        </CardContent>
      </Card>

      {/* AI分析结果 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              AI智能分析结果
            </span>
            <Badge variant="outline" className={getScoreColor(aiAnalysis.overallScore)}>
              {aiAnalysis.overallScore}分
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">分析总结</h4>
            <p className="text-sm text-muted-foreground">{aiAnalysis.summary}</p>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              优势方面
            </h4>
            <ul className="space-y-1">
              {aiAnalysis.strengths.map((strength, index) => (
                <li key={index} className="text-sm text-green-700 flex items-start gap-2">
                  <span className="text-green-500">•</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              需要改进
            </h4>
            <ul className="space-y-1">
              {aiAnalysis.improvementAreas.map((area, index) => (
                <li key={index} className="text-sm text-red-700 flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  {area}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">训练建议</h4>
            <ul className="space-y-1">
              {aiAnalysis.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleGenerateReport}
              disabled={!selectedStudent || generating}
              className="flex-1"
            >
              {generating ? '生成中...' : '生成训练报告'}
            </Button>

            {report && (
              <>
                <Button
                  variant="outline"
                  onClick={handleDownloadReport}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  下载报告
                </Button>

                <Button
                  onClick={handleSendToParent}
                  disabled={sending || report.sentToParent}
                  className="flex items-center gap-2"
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      发送中...
                    </>
                  ) : report.sentToParent ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      已发送
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      发送给家长
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {sendStatus && (
            <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
              sendStatus.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {sendStatus.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {sendStatus.message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}