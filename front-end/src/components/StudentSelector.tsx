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
}

export function StudentSelector({ value, onValueChange, placeholder = "选择学员" }: StudentSelectorProps) {
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
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {students.map((student) => (
          <SelectItem key={student.id} value={student.id}>
            {student.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}