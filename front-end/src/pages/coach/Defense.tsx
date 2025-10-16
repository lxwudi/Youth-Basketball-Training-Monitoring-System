import { useState } from 'react';
import { ArrowLeft, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { VideoUpload } from '@/components/VideoUpload';
import { LiveMetricsDisplay } from '@/components/LiveMetricsDisplay';
import { TrainingReportComponent } from '@/components/TrainingReport';
import { getAnalysisResult, getVideoUrl, analyzeWithAI } from '@/lib/api';
import type { MetricsFrame, AIAnalysisResponse } from '@/lib/api';

const METRIC_LABELS = {
  defense_center_fluctuation: '重心起伏(cm)',
  arm_spread_ratio: '胳膊张开比例',
  arm_spread_distance: '胳膊张开距离(cm)',
  leg_spread_ratio: '双腿张开比例',
  leg_spread_distance: '双腿张开距离(cm)',
  defense_knee_angle: '膝盖角度',
  body_balance: '身体平衡度',
};

export function Defense() {
  const navigate = useNavigate();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsFrame[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showReport, setShowReport] = useState(false);

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
        trainingType: 'defense',
        metrics: metrics,
        videoSummary: '防守动作分析视频'
      });
      setAiAnalysis(analysisResult);
    } catch (error) {
      console.error('AI分析失败:', error);
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

  return (
    <div className="space-y-6">
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
        <h1 className="text-2xl font-bold text-slate-800">防守训练分析</h1>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">分析指标</h2>
        <p className="text-sm text-slate-600 mb-3">
          本页面将分析以下防守相关指标：
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.values(METRIC_LABELS).map((label) => (
            <div key={label} className="flex items-center gap-2 text-sm text-slate-700">
              <div className="w-2 h-2 rounded-full bg-green-600" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {!taskId ? (
        <VideoUpload onUploadComplete={handleUploadComplete} trainingType="defense" />
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

          {/* AI分析结果 */}
          {aiAnalysis && !showReport && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-blue-800 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  AI智能分析结果
                </h3>
                <span className={`text-sm font-medium ${
                  aiAnalysis.overallScore >= 80 ? 'text-green-600' :
                  aiAnalysis.overallScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {aiAnalysis.overallScore}分
                </span>
              </div>
              <p className="text-sm text-blue-700 mb-3">{aiAnalysis.summary}</p>
              <Button
                onClick={() => setShowReport(true)}
                size="sm"
                className="w-full"
              >
                查看详细报告
              </Button>
            </div>
          )}

          {/* 实时指标显示 */}
          <LiveMetricsDisplay
            videoUrl={videoUrl}
            metricsData={metricsData}
            metricLabels={METRIC_LABELS}
            trainingType="defense"
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
                trainingType="defense"
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
