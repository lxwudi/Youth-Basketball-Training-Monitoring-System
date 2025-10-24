import { useState } from 'react';
import { ArrowLeft, Brain, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { VideoUpload } from '@/components/VideoUpload';
import { LiveMetricsDisplay } from '@/components/LiveMetricsDisplay';
import { TrainingReportComponent } from '@/components/TrainingReport';
import { StudentSelector } from '@/components/StudentSelector';
import { useToast } from '@/components/ui/use-toast';
import { getAnalysisResult, getVideoUrl, analyzeWithAI, generateTrainingReport, sendReportToParent } from '@/lib/api';
import type { MetricsFrame, AIAnalysisResponse } from '@/lib/api';

const METRIC_LABELS = {
  dribble_frequency: '运球频率(次/秒)',
  center_of_mass: '重心高度(cm)',
  left_wrist_angle: '左腕角度',
  right_wrist_angle: '右腕角度',
  left_elbow_angle: '左肘角度',
  right_elbow_angle: '右肘角度',
  left_shoulder_angle: '左肩角度',
  right_shoulder_angle: '右肩角度',
  left_knee_angle: '左膝角度',
  right_knee_angle: '右膝角度',
};

export function Dribbling() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsFrame[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{id: string; name: string; parentId: string} | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [sendingReport, setSendingReport] = useState(false);

  const handleUploadComplete = async (completedTaskId: string) => {
    setTaskId(completedTaskId);

    try {
      // 获取分析结果
      const result = await getAnalysisResult(completedTaskId);
      setMetricsData(result.metrics);

      // 设置视频URL
      setVideoUrl(getVideoUrl(completedTaskId));

      // 自动进行AI分析
      await performAIAnalysis(result.metrics);
    } catch (error) {
      console.error('获取分析结果失败:', error);
    }
  };

  const performAIAnalysis = async (metrics: MetricsFrame[]) => {
    if (metrics.length === 0) return;

    setAnalyzing(true);
    try {
      const analysisResult = await analyzeWithAI({
        trainingType: 'dribbling',
        metrics: metrics,
        videoSummary: '运球动作分析视频'
      });
      setAiAnalysis(analysisResult);
    } catch (error) {
      console.error('AI分析失败:', error);
      toast({
        title: 'AI分析失败',
        description: 'AI分析服务暂时不可用，已使用模拟数据',
        variant: 'destructive',
      });
      // API不可用时显示错误提示
      setAiAnalysis({
        summary: 'AI分析服务暂时不可用，请稍后重试或联系技术支持。',
        suggestions: ['请检查网络连接或联系管理员'],
        improvementAreas: ['AI服务暂时不可用'],
        strengths: ['请稍后重试'],
        overallScore: 0
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSendReportToParent = async () => {
    if (!selectedStudent || !aiAnalysis) {
      toast({
        title: '请选择学员',
        description: '请先选择要发送报告的学员',
        variant: 'destructive',
      });
      return;
    }

    setSendingReport(true);
    try {
      // 如果还没有生成报告，先生成
      let currentReportId = reportId;
      if (!currentReportId) {
        const report = await generateTrainingReport(
          selectedStudent.id,
          selectedStudent.name,
          'dribbling',
          aiAnalysis,
          metricsData
        );
        currentReportId = report.id;
        setReportId(currentReportId);
      }

      // 发送报告到家长端
      await sendReportToParent(currentReportId, selectedStudent.parentId);
      
      toast({
        title: '发送成功',
        description: `训练报告已成功发送到${selectedStudent.name}的家长`,
      });
    } catch (error) {
      console.error('发送报告失败:', error);
      toast({
        title: '发送失败',
        description: '发送报告到家长端失败，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setSendingReport(false);
    }
  };

  return (
    <div className="space-y-6 u-dribbling-container">
      {/* 运球节奏装饰层 */}
      <div className="u-dribbling-rhythm-board">
        <div className="u-beat-particles"></div>
      </div>
      <div className="u-rhythm-pulse" />
      
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/coach/training')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>
        <h1 className="text-2xl font-bold text-slate-800">运球训练分析</h1>
      </div>

      <div className="u-card-glass is-dribble p-6 rounded-xl">
        <h2 className="text-lg font-semibold mb-2">分析指标</h2>
        <p className="text-sm opacity-80 mb-3">
          本页面将分析以下运球相关指标：
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.values(METRIC_LABELS).map((label) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-current" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {!taskId ? (
        <VideoUpload onUploadComplete={handleUploadComplete} trainingType="dribbling" />
      ) : (
        <div className="space-y-6">
          {/* AI分析状态显示 */}
          {analyzing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
              <Brain className="w-5 h-5 text-blue-600 animate-pulse" />
              <div>
                <p className="text-sm font-medium text-blue-800">AI正在分析视频...</p>
                <p className="text-xs text-blue-600">这可能需要几秒钟时间</p>
              </div>
            </div>
          )}

          {/* AI分析结果和学员选择 */}
          {aiAnalysis && !showReport && (
            <div className="space-y-4">
              <div className="u-card-glass is-dribble u-ai-card-enter p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-slate-800 flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI智能分析结果
                  </h3>
                  <div className="u-progress-ring">
                    <svg>
                      <circle
                        className="u-progress-ring-bg"
                        cx="40"
                        cy="40"
                        r="40"
                      />
                      <circle
                        className="u-progress-ring-progress"
                        cx="40"
                        cy="40"
                        r="40"
                        style={{
                          strokeDashoffset: 251.2 - (251.2 * aiAnalysis.overallScore) / 100
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold">{aiAnalysis.overallScore}</span>
                    </div>
                  </div>
                </div>
                
                <div className="u-ionic-separator" />
                
                <div className="u-four-color-grid mb-4">
                  <div className="u-color-tag tag-strength">
                    <h4 className="font-medium text-sm mb-1">优势表现</h4>
                    <p className="text-xs opacity-80">{aiAnalysis.strengths?.[0] || '运球节奏稳定'}</p>
                  </div>
                  <div className="u-color-tag tag-improve">
                    <h4 className="font-medium text-sm mb-1">改进要点</h4>
                    <p className="text-xs opacity-80">{aiAnalysis.improvementAreas?.[0] || '重心控制'}</p>
                  </div>
                  <div className="u-color-tag tag-suggest">
                    <h4 className="font-medium text-sm mb-1">训练建议</h4>
                    <p className="text-xs opacity-80">{aiAnalysis.suggestions?.[0] || '加强基础练习'}</p>
                  </div>
                  <div className="u-color-tag tag-risk">
                    <h4 className="font-medium text-sm mb-1">总结</h4>
                    <p className="text-xs opacity-80">{aiAnalysis.summary}</p>
                  </div>
                </div>
                
                <Button
                  onClick={() => setShowReport(true)}
                  size="sm"
                  className="w-full btn-neon u-ripple"
                >
                  查看详细报告
                </Button>
              </div>

              {/* 学员选择和发送报告 */}
              <div className="u-card-glass is-dribble p-6 rounded-xl">
                <h3 className="font-medium text-slate-800 mb-4 flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  发送训练报告到家长端
                </h3>
                <div className="space-y-4">
                  <div className="focus-ring-gradient">
                    <StudentSelector
                      value={selectedStudent?.id}
                      onValueChange={(_, student) => setSelectedStudent(student)}
                      placeholder="选择学员"
                      className="input-glass"
                    />
                  </div>
                  {selectedStudent && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold">
                        {selectedStudent.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-emerald-800">{selectedStudent.name}</p>
                        <p className="text-xs text-emerald-600">已选择学员</p>
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={handleSendReportToParent}
                    disabled={!selectedStudent || sendingReport}
                    className="w-full gap-2 btn-neon u-ripple"
                  >
                    <Send className="w-4 h-4" />
                    {sendingReport ? '发送中...' : '发送到家长端'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 实时指标显示 */}
          <LiveMetricsDisplay
            videoUrl={videoUrl}
            metricsData={metricsData}
            metricLabels={METRIC_LABELS}
            trainingType="dribbling"
          />

          {/* 训练报告 */}
          {showReport && aiAnalysis && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">训练报告</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReport(false)}
                >
                  返回分析
                </Button>
              </div>
              <TrainingReportComponent
                trainingType="dribbling"
                metrics={metricsData}
                aiAnalysis={aiAnalysis}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
