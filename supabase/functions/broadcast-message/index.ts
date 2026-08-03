// Broadcast Message Edge Function
// Sends broadcast messages to students via Telegram and WhatsApp
// Can be invoked directly or by a scheduler for scheduled broadcasts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface Broadcast {
  id: string;
  message: string;
  target_level: 'FACULTY' | 'COLLEGE' | 'YEAR' | 'SECTION';
  college_id: number | null;
  year_id: number | null;
  section_id: number | null;
  scheduled_at: string | null;
  status: string;
}

// Send message to a Telegram user
async function sendTelegramMessage(chatId: number, text: string, token: string): Promise<boolean> {
  if (!token || !chatId) return false;
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        })
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

// Send message to a WhatsApp user
async function sendWhatsAppMessage(phone: string, text: string, phoneId: string, accessToken: string): Promise<boolean> {
  if (!phone || !phoneId || !accessToken) return false;
  try {
    const formattedText = text
      .replace(/<b>(.*?)<\/b>/g, "*$1*")
      .replace(/<i>(.*?)<\/i>/g, "_$1_");

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type: 'text',
          text: { body: formattedText }
        })
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

// Get target students based on broadcast scope
async function getTargetStudents(broadcast: Broadcast): Promise<{ telegramIds: number[]; whatsappIds: string[] }> {
  let query = supabase
    .from('students')
    .select('telegram_user_id, whatsapp_id')
    .eq('status', 'Active');

  switch (broadcast.target_level) {
    case 'SECTION':
      if (broadcast.section_id) {
        query = query.eq('section_id', broadcast.section_id);
      }
      break;
    case 'YEAR':
      if (broadcast.year_id) {
        query = query.eq('year_id', broadcast.year_id);
      }
      break;
    case 'COLLEGE':
      if (broadcast.college_id) {
        query = query.eq('college_id', broadcast.college_id);
      }
      break;
    case 'FACULTY':
      // All students - no additional filter
      break;
  }

  const { data: students } = await query;
  const telegramIds = (students?.map(s => s.telegram_user_id).filter(Boolean) || []) as number[];
  const whatsappIds = (students?.map(s => s.whatsapp_id).filter(Boolean) || []) as string[];

  return { telegramIds, whatsappIds };
}

// Process a single broadcast
async function processBroadcast(broadcast: Broadcast): Promise<{ success: number; failed: number }> {
  const { telegramIds, whatsappIds } = await getTargetStudents(broadcast);
  
  const { data: settings } = await supabase
    .from('bot_settings')
    .select('telegram_token, whatsapp_phone_number_id, whatsapp_access_token')
    .maybeSingle();

  const telegramToken = settings?.telegram_token || Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
  const waPhoneId = settings?.whatsapp_phone_number_id || Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '';
  const waToken = settings?.whatsapp_access_token || Deno.env.get('WHATSAPP_ACCESS_TOKEN') || '';

  let success = 0;
  let failed = 0;

  // 1. Send Telegram batches
  const BATCH_SIZE = 30;
  const BATCH_DELAY = 1000;

  for (let i = 0; i < telegramIds.length; i += BATCH_SIZE) {
    const batch = telegramIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(chatId => sendTelegramMessage(chatId, broadcast.message, telegramToken))
    );
    success += results.filter(r => r).length;
    failed += results.filter(r => !r).length;
    if (i + BATCH_SIZE < telegramIds.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }

  // 2. Send WhatsApp batches
  for (let i = 0; i < whatsappIds.length; i += BATCH_SIZE) {
    const batch = whatsappIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(phone => sendWhatsAppMessage(phone, broadcast.message, waPhoneId, waToken))
    );
    success += results.filter(r => r).length;
    failed += results.filter(r => !r).length;
    if (i + BATCH_SIZE < whatsappIds.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }

  // Update broadcast status
  const totalTargeted = telegramIds.length + whatsappIds.length;
  const status = totalTargeted === 0 ? 'Success' : (failed === 0 ? 'Success' : (success === 0 ? 'Failed' : 'Partial'));
  await supabase
    .from('broadcasts')
    .update({
      status,
      recipient_count: success,
      sent_at: new Date().toISOString()
    })
    .eq('id', broadcast.id);

  return { success, failed };
}

Deno.serve(async (req) => {
  try {
    const { broadcast_id, process_scheduled } = await req.json().catch(() => ({}));

    if (broadcast_id) {
      const { data: broadcast, error } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('id', broadcast_id)
        .single();

      if (error || !broadcast) {
        return new Response(JSON.stringify({ error: 'Broadcast not found' }), { status: 404 });
      }

      const result = await processBroadcast(broadcast);
      return new Response(JSON.stringify({ success: true, ...result }));
    }

    if (process_scheduled) {
      const now = new Date().toISOString();
      const { data: pendingBroadcasts } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('status', 'Pending')
        .not('scheduled_at', 'is', null)
        .lte('scheduled_at', now);

      if (!pendingBroadcasts || pendingBroadcasts.length === 0) {
        return new Response(JSON.stringify({ message: 'No broadcasts due' }));
      }

      const results = [];
      for (const broadcast of pendingBroadcasts) {
        const result = await processBroadcast(broadcast);
        results.push({ id: broadcast.id, ...result });
      }

      return new Response(JSON.stringify({ processed: results.length, results }));
    }

    return new Response(JSON.stringify({ error: 'Missing broadcast_id or process_scheduled' }), { status: 400 });

  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
