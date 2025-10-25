import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStudentsList } from '@/lib/api';

interface Student {
  id: string;
  name: string;
  parentId: string;
}

interface StudentSelectorProps {
  value?: string;
  onValueChange: (studentId: string, student: Student) => void;
  placeholder?: string;
  className?: string;
}

export function StudentSelector({ value, onValueChange, placeholder = "选择学员", className }: StudentSelectorProps) {
  // 使用参数避免未使用警告
  void placeholder;
  void className;
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const studentsList = await getStudentsList();
        setStudents(studentsList);
      } catch (error) {
        console.error('加载学员列表失败:', error);
        setError('学员列表加载失败，请检查网络连接或联系管理员');
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, []);

  const handleStudentChange = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      onValueChange(studentId, student);
    }
  };

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="加载中..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (error) {
    return (
      <Select disabled>
        <SelectTrigger className="border-red-200">
          <SelectValue placeholder={error} />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={handleStudentChange}>
      <SelectTrigger className="w-full bg-gradient-to-r from-white/80 via-white/90 to-white/80 border-slate-200/60 hover:bg-gradient-to-r hover:from-slate-50/80 hover:via-slate-50/90 hover:to-slate-50/80 focus:ring-2 focus:ring-brand/20 backdrop-blur-sm dark:bg-gradient-to-r dark:from-slate-900/80 dark:via-slate-900/90 dark:to-slate-900/80 dark:border-slate-800/60 dark:hover:from-slate-800/80 dark:hover:via-slate-800/90 dark:hover:to-slate-800/80 u-glass-border">
          <SelectValue placeholder="选择学员" />
        </SelectTrigger>
        <SelectContent className="bg-gradient-to-b from-white/90 via-white/95 to-white/90 border-slate-200/60 shadow-xl backdrop-blur-xl z-[99999] dark:bg-gradient-to-b dark:from-slate-900/90 dark:via-slate-900/95 dark:to-slate-900/90 dark:border-slate-800/60 u-glass-border">
        {students.map((student) => (
          <SelectItem 
            key={student.id} 
            value={student.id}
            className="focus:bg-slate-50 focus:text-slate-900 cursor-pointer"
          >
            {student.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}