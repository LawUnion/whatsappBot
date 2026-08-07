export interface RosterEntry {
  id: string;
  form_number: string | null;
  roll_number: string;
  name: string;
  college_id: number | null;
  year_id: number | null;
  section_id: number | null;
  section_name: string | null;
  email: string | null;
  phone: string | null;
  is_claimed: boolean;
  claimed_by: string | null;
  created_at: string;
  college?: { name: string };
  year?: { name: string };
  section?: { name: string };
  students?: { whatsapp_id: string | null; telegram_username: string | null };
}

export interface College {
  id: number;
  name: string;
  code: string;
}

export interface Year {
  id: number;
  name: string;
  college_id: number;
}

export interface Section {
  id: number;
  name: string;
  semester_id: number;
}
