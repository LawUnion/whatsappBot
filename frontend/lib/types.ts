// TypeScript types for the Court Kachahri Bot application

// =====================================================
// ADMIN ROLES
// =====================================================

export enum AdminRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  COLLEGE_CONTENT_ADMIN = "COLLEGE_CONTENT_ADMIN",
  NOTICES_ADMIN = "NOTICES_ADMIN",
  SOCIETIES_ADMIN = "SOCIETIES_ADMIN",
  SECTION_ADMIN = "SECTION_ADMIN",
  STUDY_MATERIAL_ADMIN = "STUDY_MATERIAL_ADMIN",
  EVENTS_ADMIN = "EVENTS_ADMIN",
  INTERNSHIP_ADMIN = "INTERNSHIP_ADMIN",
  SUB_ADMIN = "SUB_ADMIN",
}

export enum TargetLevel {
  FACULTY = "FACULTY",
  COLLEGE = "COLLEGE",
  YEAR = "YEAR",
  SECTION = "SECTION",
}

export type Platform = "TELEGRAM";

export enum StudentStatus {
  ACTIVE = "Active",
  BLOCKED = "Blocked",
  PENDING = "Pending",
  REJECTED = "Rejected",
}

export enum BroadcastStatus {
  PENDING = "Pending",
  SUCCESS = "Success",
  PARTIAL = "Partial",
  FAILED = "Failed",
}

export enum ActionType {
  MODULE = "MODULE",
  URL = "URL",
  TEXT = "TEXT",
}

// =====================================================
// DATABASE TYPES
// =====================================================

export interface College {
  id: number;
  code: string;
  name: string;
  created_at: string;
}

export interface Year {
  id: number;
  college_id: number;
  year_number: number;
  name: string;
  created_at: string;
  college?: College;
}

export interface Semester {
  id: number;
  year_id: number;
  semester_number: number;
  name: string;
  created_at: string;
  year?: Year;
}

export interface Section {
  id: number;
  semester_id: number;
  name: string;
  created_at: string;
  semester?: Semester;
}

export interface Society {
  id: number;
  college_id: number;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
  college?: College;
}

export interface EventType {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  created_at: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  allocated_modules?: string[];
  college_id?: number;
  year_id?: number;
  section_id?: number;
  society_id?: number;
  active: boolean;
  first_login: boolean;
  created_at: string;
  college?: College;
  year?: Year;
  section?: Section;
  society?: Society;
}

export interface Student {
  id: string;
  telegram_user_id: number;
  telegram_username?: string;
  roll_number?: string;
  form_number?: string;
  name?: string;
  college_id?: number;
  year_id?: number;
  section_id?: number;
  college_code?: string;
  admission_batch?: string;
  father_name?: string;
  status: StudentStatus;
  roster_id?: string;
  rejection_reason?: string;
  approved_by?: string;
  approved_at?: string;
  joined_at: string;
  created_at: string;
  college?: College;
  year?: Year;
  section?: Section;
}

export interface StudentRoster {
  id: string;
  roll_number: string;
  form_number?: string;
  name: string;
  college_id?: number;
  year_id?: number;
  section_id?: number;
  college_code?: string;
  admission_batch?: string;
  father_name?: string;
  email?: string;
  phone?: string;
  is_claimed: boolean;
  claimed_by?: string;
  claimed_at?: string;
  created_at: string;
  updated_at: string;
  college?: College;
  year?: Year;
  section?: Section;
}

export interface RegistrationSession {
  id: string;
  telegram_user_id: number;
  telegram_username?: string;
  telegram_first_name?: string;
  telegram_last_name?: string;
  step: string;
  roll_number?: string;
  roster_id?: string;
  attempts: number;
  created_at: string;
  updated_at: string;
}

export interface BotButton {
  id: number;
  label: string;
  icon?: string;
  action_type: ActionType;
  action_value: string;
  row_order: number;
  button_order: number;
  active: boolean;
  created_at: string;
}

export interface BotSettings {
  id: number;
  telegram_token?: string;
  telegram_webhook_url?: string;
  ai_enabled: boolean;
  ai_doc_count: number;
  updated_at: string;
}

export interface Event {
  id: string;
  event_type_id?: number;
  title: string;
  description?: string;
  event_date?: string;
  event_time?: string;
  location?: string;
  file_url?: string;
  target_colleges?: number[];
  society_id?: number;
  created_by?: string;
  created_at: string;
  event_type?: EventType;
  society?: Society;
  admin?: Admin;
}

export interface Internship {
  id: string;
  title: string;
  info?: string;
  deadline?: string;
  apply_url?: string;
  file_url?: string;
  target_colleges?: number[];
  target_years?: number[];
  created_by?: string;
  created_at: string;
  admin?: Admin;
}

export interface Notice {
  id: string;
  title: string;
  description?: string;
  file_url?: string;
  target_colleges?: number[];
  year_id?: number;
  section_id?: number;
  posted_by?: string;
  created_at: string;
  year?: Year;
  section?: Section;
  admin?: Admin;
}

export interface StudyMaterial {
  id: string;
  subject: string;
  topic?: string;
  description?: string;
  file_url?: string;
  target_colleges?: number[];
  year_id?: number;
  section_id?: number;
  uploaded_by?: string;
  created_at: string;
  year?: Year;
  section?: Section;
  admin?: Admin;
}

export interface ScheduleNote {
  id: string;
  date: string;
  semester_id?: number;
  section_id?: number;
  subject?: string;
  topic?: string;
  notes?: string;
  file_url?: string;
  posted_by?: string;
  created_at: string;
  semester?: Semester;
  section?: Section;
  admin?: Admin;
}

export interface Broadcast {
  id: string;
  message: string;
  target_level?: TargetLevel;
  platform?: Platform;
  college_id?: number;
  year_id?: number;
  section_id?: number;
  sent_by?: string;
  status: BroadcastStatus;
  recipient_count: number;
  sent_at?: string;
  created_at: string;
  college?: College;
  year?: Year;
  section?: Section;
  admin?: Admin;
}

export interface ActivityLog {
  id: string;
  admin_id?: string;
  action: string;
  module?: string;
  scope?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
  admin?: Admin;
}

export interface SupportMessage {
  id: string;
  student_id?: string;
  message: string;
  read: boolean;
  replied_at?: string;
  reply_text?: string;
  created_at: string;
  student?: Student;
}

// =====================================================
// UI TYPES
// =====================================================

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles?: AdminRole[];
}

export interface BotMenuRow {
  id: string;
  buttons: BotButton[];
}
