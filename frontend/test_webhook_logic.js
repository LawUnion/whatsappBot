import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || "https://kigxckzomsspsxrybpxr.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: student } = await supabase.from('students').select('*').limit(1).single();
  console.log("Student:", student);

  const { data: notices } = await supabase.from('notices').select('*').limit(3);
  console.log("Notices:", notices);

  const filteredNotices = notices.filter(n => {
    if (n.target_colleges && n.target_colleges.length > 0) {
      return n.target_colleges.includes(student.college_id);
    }
    return true;
  });

  console.log("Filtered:", filteredNotices);
}

test().catch(console.error);
