export interface Student {
  id: string;
  telegram_user_id: number | null;
  whatsapp_id: string | null;
  whatsapp_name: string | null;
  telegram_username: string | null;
  roll_number: string | null;
  form_number: string | null;
  name: string | null;
  college_id: number | null;
  year_id: number | null;
  section_id: number | null;
  status: string;
  roster_id: string | null;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  joined_at: string;
  created_at: string;
  college?: { name: string };
  year?: { name: string };
  section?: { name: string };
}
