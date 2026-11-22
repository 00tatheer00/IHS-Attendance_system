export type Role = "admin" | "teacher" | "student";
export type Gender = "male" | "female";
export type AttendanceStatus = "present" | "absent" | "excused";
export type SessionStatus = "open" | "closed" | "cancelled";

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  must_change_password: boolean;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  is_locked: boolean;
}

export interface Batch {
  id: string;
  name: string;
  intake_code: string | null;
  session_label: string | null;
}

export interface ClassRow {
  id: string;
  section: string | null;
  department: Department;
  batch: Batch;
}

export interface Student {
  id: string;
  user_id: string | null;
  roll_no: string;
  full_name: string;
  father_name: string | null;
  gender: Gender | null;
  cnic: string | null;
  phone: string | null;
  class_id: string;
  photo_path: string | null;
  qr_token: string;
  status: "active" | "inactive" | "graduated";
  remarks: string | null;
}

export interface StudentWithClass extends Student {
  class: ClassRow;
}

export interface Offering {
  id: string;
  term_label: string;
  is_active: boolean;
  subject: { id: string; code: string; name: string };
  class: ClassRow;
  teacher: { id: string; full_name: string };
}

export interface Session {
  id: string;
  offering_id: string;
  session_date: string;
  started_at: string;
  closed_at: string | null;
  status: SessionStatus;
  topic: string | null;
}

export interface CourseStats {
  offering_id: string;
  student_id: string;
  total: number;
  present: number;
  absent: number;
  excused: number;
  percentage: number | null;
}

/** Select fragment that returns a class with its department and batch. */
export const CLASS_SELECT = "id, section, department:departments(id, code, name, is_locked), batch:batches(id, name, intake_code, session_label)";

export const OFFERING_SELECT = `id, term_label, is_active,
  subject:subjects(id, code, name),
  class:classes(${CLASS_SELECT}),
  teacher:teachers(id, full_name)`;
