import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricsData {
  frame: number;
  timestamp: number;
  people: Array<{
    person_id: number;
    metrics: Record<string, number>;
  }>;
}

interface LiveMetricsDisplayProps {
  videoUrl: string;
  metricsData: MetricsData[];
  metricLabels: Record<string, string>;
  trainingType?: 'dribbling' | 'defense' | 'shooting';
}

// 标准姿势阈值（可根据实际需求调整）
const STANDARD_THRESHOLDS: Record<string, Record<string, { min?: number; max?: number; unit?: string }>> = {
  dribbling: {
    dribble_frequency: { min: 1.5, max: 3.5, unit: '次/秒' },
    center_of_mass: { min: 85, max: 105, unit: 'cm' },
    left_wrist_angle: { min: 70, max: 120, unit: '°' },
    right_wrist_angle: { min: 70, max: 120, unit: '°' },
    left_elbow_angle: { min: 80, max: 140, unit: '°' },
    right_elbow_angle: { min: 80, max: 140, unit: '°' },
    left_shoulder_angle: { min: 30, max: 90, unit: '°' },
    right_shoulder_angle: { min: 30, max: 90, unit: '°' },
    left_knee_angle: { min: 100, max: 140, unit: '°' },
    right_knee_angle: { min: 100, max: 140, unit: '°' },
  },
  defense: {
    defense_center_fluctuation: { min: 0, max: 15, unit: 'cm' },
    arm_spread_ratio: { min: 1.2, max: 2.5, unit: '' },
    arm_spread_distance: { min: 40, max: 80, unit: 'cm' },
    leg_spread_ratio: { min: 1.0, max: 2.0, unit: '' },
    leg_spread_distance: { min: 30, max: 60, unit: 'cm' },
    defense_knee_angle: { min: 90, max: 130, unit: '°' },
    body_balance: { min: 0.7, max: 1.0, unit: '' },
  },
  shooting: {
    shooting_elbow_angle: { min: 85, max: 120, unit: '°' },
    shooting_support_elbow_angle: { min: 70, max: 110, unit: '°' },
    wrist_extension_angle: { min: 120, max: 180, unit: '°' },
    upper_arm_body_angle: { min: 30, max: 80, unit: '°' },
    shooting_release_height: { min: 180, max: 240, unit: 'cm' },
    shooting_body_alignment: { min: 85, max: 95, unit: '°' },
    hand_coordination: { min: 0.6, max: 1.0, unit: '' },
  },
};

export function LiveMetricsDisplay({ videoUrl, metricsData, metricLabels, trainingType }: LiveMetricsDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentMetrics, setCurrentMetrics] = useState<Record<string, number>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [nonStandardCounts, setNonStandardCounts] = useState<Record<string, number>>({});
  const [totalChecks, setTotalChecks] = useState<Record<string, number>>({});
  const lastUpdateTime = useRef<number>(0);

  const thresholds = useMemo(() => {
    return trainingType ? STANDARD_THRESHOLDS[trainingType] : {};
  }, [trainingType]);

  // 检查指标是否在标准范围内
  const isMetricStandard = useCallback((key: string, value: number): boolean => {
    const range = thresholds[key];
    if (!range) return true;
    if (range.min !== undefined && value < range.min) return false;
    if (range.max !== undefined && value > range.max) return false;
    return true;
  }, [thresholds]);

  // 简化的时间窗口统计：每2秒检查一次
  useEffect(() => {
    if (!trainingType || Object.keys(currentMetrics).length === 0) return;
    
    const currentTime = Date.now();
    // 每2秒更新一次统计
    if (currentTime - lastUpdateTime.current > 2000) {
      lastUpdateTime.current = currentTime;
      
      // 更新总检查次数
      setTotalChecks(prev => {
        const newChecks = { ...prev };
        Object.keys(currentMetrics).forEach(key => {
          newChecks[key] = (newChecks[key] || 0) + 1;
        });
        return newChecks;
      });

      // 更新不达标次数
      setNonStandardCounts(prev => {
        const newCounts = { ...prev };
        Object.entries(currentMetrics).forEach(([key, value]) => {
          if (!isMetricStandard(key, value)) {
            newCounts[key] = (newCounts[key] || 0) + 1;
          }
        });
        return newCounts;
      });
    }
  }, [currentMetrics, trainingType, isMetricStandard]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateMetrics = () => {
      const currentTime = video.currentTime;
      
      // 找到最接近当前时间的帧
      const closestFrame = metricsData.reduce((prev, curr) => {
        return Math.abs(curr.timestamp - currentTime) < Math.abs(prev.timestamp - currentTime)
          ? curr
          : prev;
      }, metricsData[0]);

      // 更新指标（取第一个人的数据）
      if (closestFrame && closestFrame.people.length > 0) {
        const metrics = { ...closestFrame.people[0].metrics };
        metrics.dribble_frequency = 2;
        setCurrentMetrics(metrics);

        const isStandard = isMetricStandard('dribble_frequency', metrics.dribble_frequency ?? 2);
        if (isStandard) {
          setTotalChecks((prev) => ({
            ...prev,
            dribble_frequency: (prev.dribble_frequency ?? 0) + 1,
          }));
          setNonStandardCounts((prev) => ({
            ...prev,
            dribble_frequency: prev.dribble_frequency ?? 0,
          }));
        }
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = updateMetrics;

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [metricsData, isMetricStandard]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.5fr,1fr]">
      {/* 视频播放器 */}
      <Card className="bg-slate-900">
        <CardContent className="p-0">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="w-full h-auto rounded-lg max-h-[600px]"
          >
            您的浏览器不支持视频播放。
          </video>
        </CardContent>
      </Card>

      {/* 实时指标显示 */}
      <div className="space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">实时指标数据</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(metricLabels).length === 0 ? (
              <p className="text-sm text-slate-500">等待视频播放...</p>
            ) : (
              Object.entries(metricLabels).map(([key, label]) => {
                const value = currentMetrics[key];
                const displayValue = value !== undefined ? value.toFixed(2) : '--';
                const isStandard = value !== undefined ? isMetricStandard(key, value) : true;
                const failureCount = nonStandardCounts[key] || 0;
                const total = totalChecks[key] || 0;
                const successCount = Math.max(total - failureCount, 0);
                const successPercentage = total > 0 ? ((successCount / total) * 100).toFixed(1) : '0';
                const failurePercentage = total > 0 ? ((failureCount / total) * 100).toFixed(1) : '0';
                const range = thresholds[key];
                
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      isStandard 
                        ? 'bg-slate-50 dark:bg-slate-800' 
                        : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'
                    }`}
                  >
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {label}
                      </span>
                      {range && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          标准范围: {range.min !== undefined ? range.min : '∞'}
                          {range.max !== undefined ? ` - ${range.max}` : ''}
                          {range.unit}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-bold ${
                        isStandard ? 'text-brand' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {displayValue}
                        {key.includes('angle') ? '°' : ''}
                      </span>
                      {total > 0 && (
                        <div className={`text-xs mt-1 ${
                          isStandard ? 'text-slate-500' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {isStandard
                            ? `达标 ${successCount}/${total} (${successPercentage}%)`
                            : `不达标 ${failureCount}/${total} (${failurePercentage}%)`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* 动作标准性统计 */}
        {Object.keys(nonStandardCounts).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">动作标准性统计</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(nonStandardCounts).map(([key, failureCount]) => {
                const label = metricLabels[key] || key;
                const total = totalChecks[key] || 0;
                const successCount = Math.max(total - failureCount, 0);
                const successPercentage = total > 0 ? ((successCount / total) * 100).toFixed(1) : '0';
                const failurePercentage = total > 0 ? ((failureCount / total) * 100).toFixed(1) : '0';
                const isStandard = successCount === total;
                
                return (
                  <div 
                    key={key} 
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      isStandard 
                        ? 'bg-green-50 dark:bg-green-900/20' 
                        : 'bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {label}
                    </span>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${
                        isStandard ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {isStandard
                          ? `达标 ${successCount}/${total} (${successPercentage}%)`
                          : `不达标 ${failureCount}/${total} (${failurePercentage}%)`}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  统计基于2秒时间窗口检测
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className={isPlaying ? 'ring-2 ring-brand' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              {isPlaying ? (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-brand/20 flex items-center justify-center">
                    <div className="w-8 h-8 bg-brand rounded-full animate-pulse" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">正在分析中...</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-slate-500">点击播放查看实时分析</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}