import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface VideoUploadProps {
  onUploadComplete: (taskId: string) => void;
  trainingType: 'dribbling' | 'defense' | 'shooting';
}

export function VideoUpload({ onUploadComplete, trainingType }: VideoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // 验证文件类型
      const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/x-matroska'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('请选择有效的视频文件（MP4, AVI, MOV, MKV）');
        return;
      }
      
      // 验证文件大小（最大500MB）
      if (selectedFile.size > 500 * 1024 * 1024) {
        setError('文件大小不能超过500MB');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('training_type', trainingType);

      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('上传失败');
      }

      const data = await response.json();
      const taskId = data.task_id;

      // 轮询获取处理进度
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`http://localhost:5000/api/status/${taskId}`);
          const statusData = await statusResponse.json();

          setProgress(statusData.progress);

          if (statusData.status === 'completed') {
            clearInterval(pollInterval);
            setUploading(false);
            onUploadComplete(taskId);
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            setUploading(false);
            setError(statusData.error || '处理失败');
          }
        } catch (err) {
          console.error('获取状态失败:', err);
        }
      }, 1000);
    } catch (err) {
      setUploading(false);
      setError(err instanceof Error ? err.message : '上传失败');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && fileInputRef.current) {
      // 创建一个新的 FileList 对象
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      fileInputRef.current.files = dataTransfer.files;
      
      // 触发 change 事件
      const event = new Event('change', { bubbles: true });
      fileInputRef.current.dispatchEvent(event);
      
      // 手动调用处理函数
      setFile(droppedFile);
      setError(null);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div
          className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-brand transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/avi,video/mov,video/x-matroska"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          
          <div className="flex flex-col items-center gap-4">
            {!file && (
              <>
                <Upload className="w-12 h-12 text-slate-400" />
                <div>
                  <p className="text-lg font-medium text-slate-700">点击或拖拽上传视频</p>
                  <p className="text-sm text-slate-500 mt-1">支持 MP4, AVI, MOV, MKV 格式，最大 500MB</p>
                </div>
              </>
            )}
            
            {file && !uploading && (
              <>
                <CheckCircle className="w-12 h-12 text-green-500" />
                <div>
                  <p className="text-lg font-medium text-slate-700">{file.name}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </>
            )}
            
            {uploading && (
              <>
                <Loader2 className="w-12 h-12 text-brand animate-spin" />
                <div className="w-full max-w-md">
                  <p className="text-lg font-medium text-slate-700 mb-2">处理中...</p>
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-slate-500 mt-2">{progress}%</p>
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {file && !uploading && (
          <div className="mt-4 flex gap-3">
            <Button
              onClick={handleUpload}
              className="flex-1"
              disabled={uploading}
            >
              开始分析
            </Button>
            <Button
              onClick={() => {
                setFile(null);
                setError(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              variant="outline"
            >
              重新选择
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
