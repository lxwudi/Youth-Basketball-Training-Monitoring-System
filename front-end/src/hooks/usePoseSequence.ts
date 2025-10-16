import { useEffect, useRef, useState } from 'react';

export type PoseKeypoint = {
  name: string;
  x: number;
  y: number;
  confidence: number;
};

export type PoseFrame = {
  time: number;
  keypoints: PoseKeypoint[];
  metrics?: Record<string, number>;
};

export type PoseSequence = {
  videoSource: string;
  frameRate: number;
  size: { width: number; height: number };
  frames: PoseFrame[];
};

type PoseSequenceState = {
  keypoints: PoseKeypoint[];
  videoUrl?: string;
  sourceSize?: { width: number; height: number };
  isLoading: boolean;
  error?: string;
};

/**
 * 拉取离线导出的骨架关键点并与 video 元素时间轴同步。
 */
export function usePoseSequence(sequenceUrl: string | null) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sequenceRef = useRef<PoseSequence | null>(null);
  const activeFrameIndexRef = useRef(0);
  const [state, setState] = useState<PoseSequenceState>({ keypoints: [], isLoading: false });
  const [sequenceVersion, setSequenceVersion] = useState(0);
  const [currentMetrics, setCurrentMetrics] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!sequenceUrl) {
      sequenceRef.current = null;
      activeFrameIndexRef.current = 0;
      setState({ keypoints: [], isLoading: false });
      return;
    }

    let isCancelled = false;
    setState((prev) => ({ ...prev, isLoading: true, error: undefined }));

    fetch(sequenceUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`加载失败 (${response.status})`);
        }
        return response.json() as Promise<PoseSequence>;
      })
      .then((data) => {
        if (isCancelled) return;
        sequenceRef.current = data;
        activeFrameIndexRef.current = 0;
        setState({
          keypoints: data.frames[0]?.keypoints ?? [],
          videoUrl: data.videoSource ? `/videos/${data.videoSource}` : undefined,
          sourceSize: data.size,
          isLoading: false,
          error: undefined,
        });
        setSequenceVersion((prev) => prev + 1);
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        const message = error instanceof Error ? error.message : '未知错误';
        sequenceRef.current = null;
        activeFrameIndexRef.current = 0;
        setState({ keypoints: [], isLoading: false, error: message });
        setSequenceVersion((prev) => prev + 1);
      });

    return () => {
      isCancelled = true;
    };
  }, [sequenceUrl]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const sequence = sequenceRef.current;
    if (!videoElement || !sequence || sequence.frames.length === 0) {
      return;
    }

    const { frames } = sequence;

    const syncKeypoints = () => {
      const time = videoElement.currentTime;
      let frameIndex = activeFrameIndexRef.current;

      if (time >= frames[frameIndex].time && frameIndex < frames.length - 1) {
        while (frameIndex < frames.length - 1 && time >= frames[frameIndex + 1].time) {
          frameIndex += 1;
        }
      } else if (time < frames[frameIndex].time) {
        while (frameIndex > 0 && time < frames[frameIndex].time) {
          frameIndex -= 1;
        }
      }

      if (frameIndex !== activeFrameIndexRef.current) {
        activeFrameIndexRef.current = frameIndex;
      }

      const nextKeypoints = frames[frameIndex]?.keypoints ?? [];
      const nextMetrics = frames[frameIndex]?.metrics ?? {};
      setState((prev) => (prev.keypoints === nextKeypoints ? prev : { ...prev, keypoints: nextKeypoints }));
      setCurrentMetrics(nextMetrics);
    };

    const handleLoadedData = () => {
      activeFrameIndexRef.current = 0;
      const firstKeypoints = frames[0]?.keypoints ?? [];
      setState((prev) => (prev.keypoints === firstKeypoints ? prev : { ...prev, keypoints: firstKeypoints }));
    };

    videoElement.addEventListener('timeupdate', syncKeypoints);
    videoElement.addEventListener('seeked', syncKeypoints);
    videoElement.addEventListener('play', syncKeypoints);
    videoElement.addEventListener('loadeddata', handleLoadedData);

    return () => {
      videoElement.removeEventListener('timeupdate', syncKeypoints);
      videoElement.removeEventListener('seeked', syncKeypoints);
      videoElement.removeEventListener('play', syncKeypoints);
      videoElement.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [sequenceVersion]);

  return {
    videoRef,
    keypoints: state.keypoints,
    videoUrl: state.videoUrl,
    sourceSize: state.sourceSize,
    isLoading: state.isLoading,
    error: state.error,
    hasData: !!sequenceRef.current && (sequenceRef.current.frames.length > 0),
    currentMetrics,
  } as const;
}
