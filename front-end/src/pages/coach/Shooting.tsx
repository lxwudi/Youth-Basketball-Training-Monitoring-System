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
  shooting_elbow_angle: '主手肘部角度',
  shooting_support_elbow_angle: '辅助手肘部角度',
  wrist_extension_angle: '手腕角度',
  upper_arm_body_angle: '大臂与身体角度',
  shooting_release_height: '出手点高度(cm)',
  shooting_body_alignment: '身体垂直度',
  hand_coordination: '双手协调性',
};

export function Shooting() {
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
        trainingType: 'shooting',
        metrics: metrics,
        videoSummary: '投篮动作分析视频'
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
          'shooting',
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
    <div className="space-y-6 u-shooting-container">
      {/* 投篮弧线装饰层 */}
      <div className="u-shooting-arc-overlay">
        <div className="u-shooting-sparks"></div>
      </div>
      
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
        <h1 className="text-2xl font-bold text-slate-800">投篮训练分析</h1>
      </div>

      <div className="u-card-glass is-shoot p-6 rounded-xl">
        <h2 className="text-lg font-semibold mb-2">分析指标</h2>
        <p className="text-sm opacity-80 mb-3">
          本页面将分析以下投篮相关指标：
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
        <VideoUpload onUploadComplete={handleUploadComplete} trainingType="shooting" />
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
              <div className="u-card-glass is-shoot p-6 rounded-xl ai-result-enter">
                {/* 顶部分隔线 */}
                <div className="u-sep-aurora mb-4"></div>
                
                <div className="flex items-start gap-6">
                  {/* 左侧圆形进度环 */}
                  <div className="flex-shrink-0">
                    <div className="u-progress-ring" style={{'--progress': `${aiAnalysis.overallScore}%`} as React.CSSProperties}>
                      <svg className="w-20 h-20" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          className="opacity-20"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="var(--c-shoot)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          className="progress-circle"
                          style={{
                            strokeDasharray: '283',
                            strokeDashoffset: `${283 - (283 * aiAnalysis.overallScore) / 100}`,
                            transform: 'rotate(-90deg)',
                            transformOrigin: '50% 50%',
                            filter: 'drop-shadow(0 0 8px var(--c-shoot))'
                          }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-slate-800">{aiAnalysis.overallScore}</span>
                      </div>
                    </div>
                  </div>

                  {/* 右侧四色标签分栏 */}
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    {/* 优势 */}
                    <div className="tag-quadrant tag-strength">
                      <div className="tag-header">
                        <div className="tag-icon">💪</div>
                        <h4 className="tag-title">优势</h4>
                      </div>
                      <div className="tag-content">
                        {aiAnalysis.strengths?.slice(0, 2).map((strength, index) => (
                          <p key={index} className="text-xs">{strength}</p>
                        )) || <p className="text-xs opacity-60">暂无数据</p>}
                      </div>
                    </div>

                    {/* 改进点 */}
                    <div className="tag-quadrant tag-improvement">
                      <div className="tag-header">
                        <div className="tag-icon">🎯</div>
                        <h4 className="tag-title">改进点</h4>
                      </div>
                      <div className="tag-content">
                        {aiAnalysis.improvementAreas?.slice(0, 2).map((area, index) => (
                          <p key={index} className="text-xs">{area}</p>
                        )) || <p className="text-xs opacity-60">暂无数据</p>}
                      </div>
                    </div>

                    {/* 建议 */}
                    <div className="tag-quadrant tag-suggestion">
                      <div className="tag-header">
                        <div className="tag-icon">💡</div>
                        <h4 className="tag-title">建议</h4>
                      </div>
                      <div className="tag-content">
                        {aiAnalysis.suggestions?.slice(0, 2).map((suggestion, index) => (
                          <p key={index} className="text-xs">{suggestion}</p>
                        )) || <p className="text-xs opacity-60">暂无数据</p>}
                      </div>
                    </div>

                    {/* 摘要 */}
                    <div className="tag-quadrant tag-summary">
                      <div className="tag-header">
                        <div className="tag-icon">📋</div>
                        <h4 className="tag-title">摘要</h4>
                      </div>
                      <div className="tag-content">
                        <p className="text-xs">{aiAnalysis.summary}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 离子分隔线 */}
                <div className="u-sep-ionic my-4"></div>

                <Button
                  onClick={() => setShowReport(true)}
                  size="sm"
                  className="w-full btn-neon"
                >
                  查看详细报告
                </Button>
              </div>

              {/* 学员选择和发送报告 */}
              <div className="u-card-glass is-shoot p-6 rounded-xl">
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
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-sm font-bold">
                        {selectedStudent.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-orange-800">{selectedStudent.name}</p>
                        <p className="text-xs text-orange-600">已选择学员</p>
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
            trainingType="shooting"
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
                trainingType="shooting"
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
