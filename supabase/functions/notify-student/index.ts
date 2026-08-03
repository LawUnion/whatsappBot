// Edge Function to notify students of registration status changes
// Sends Telegram or WhatsApp messages when students are approved or rejected

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_API = 'https://api.telegram.org/bot';

interface NotifyRequest {
  telegramUserId?: number;
  whatsappId?: string;
  studentId?: string;
  action: 'approved' | 'rejected';
  reason?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { telegramUserId, whatsappId, studentId, action, reason }: NotifyRequest = await req.json();

    if ((!telegramUserId && !whatsappId && !studentId) || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: (telegramUserId or whatsappId or studentId), action' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // If studentId is passed, look up their telegram_user_id and whatsapp_id
    let targetTelegramId = telegramUserId;
    let targetWhatsAppId = whatsappId;

    if (studentId || (!targetTelegramId && !targetWhatsAppId)) {
      const { data: studentRecord } = await supabase
        .from('students')
        .select('telegram_user_id, whatsapp_id')
        .eq('id', studentId || '')
        .maybeSingle();

      if (studentRecord) {
        if (studentRecord.telegram_user_id) targetTelegramId = studentRecord.telegram_user_id;
        if (studentRecord.whatsapp_id) targetWhatsAppId = studentRecord.whatsapp_id;
      }
    }

    // Get bot credentials from bot_settings
    const { data: settings } = await supabase
      .from('bot_settings')
      .select('telegram_token, whatsapp_phone_number_id, whatsapp_access_token')
      .maybeSingle();

    const botToken = settings?.telegram_token || Deno.env.get('TELEGRAM_BOT_TOKEN');
    const waPhoneId = settings?.whatsapp_phone_number_id || Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const waToken = settings?.whatsapp_access_token || Deno.env.get('WHATSAPP_ACCESS_TOKEN');

    // Compose message based on action
    let message = '';
    let waMessage = '';

    if (action === 'approved') {
      message =
        '🎉 <b>Registration Approved!</b>\n\n' +
        'Great news! Your registration has been approved.\n\n' +
        'You now have full access to the Law Faculty Bot.\n' +
        'Use /start to access the menu and explore all features.\n\n' +
        '📚 <b>Available Features:</b>\n' +
        '• Class Schedule & Notes\n' +
        '• Important Notices\n' +
        '• Study Materials\n' +
        '• Events & Internships\n' +
        '• Societies & Seniors Connect\n\n' +
        'Welcome to the community! 🎓';

      waMessage =
        '🎉 *Registration Approved!*\n\nGreat news! Your registration has been approved.\nYou now have full access to the Law Faculty Bot.\nType /start or "Menu" to access all features:\n\n📚 *Available Features:*\n• Class Schedule & Notes\n• Important Notices\n• Study Materials\n• Events & Internships\n• Societies & Seniors Connect\n\nWelcome to the community! 🎓';
    } else if (action === 'rejected') {
      message =
        '❌ <b>Registration Not Approved</b>\n\n' +
        'We regret to inform you that your registration request was not approved.\n\n';
      if (reason) message += `<b>Reason:</b> ${reason}\n\n`;
      message +=
        'If you believe this is a mistake, please contact the university administrator.\n\n' +
        'You can try again with a different roll number using /register';

      waMessage =
        '❌ *Registration Not Approved*\n\nWe regret to inform you that your registration request was not approved.\n\n';
      if (reason) waMessage += `*Reason:* ${reason}\n\n`;
      waMessage +=
        'If you believe this is a mistake, please contact the university administrator.\nYou can try again with a different roll number using /register';
    }

    let telegramSuccess = false;
    let whatsappSuccess = false;

    // Send via Telegram if ID exists
    if (targetTelegramId && botToken) {
      const telegramUrl = `${TELEGRAM_API}${botToken}/sendMessage`;
      const telegramResponse = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetTelegramId,
          text: message,
          parse_mode: 'HTML'
        })
      });
      const result = await telegramResponse.json();
      telegramSuccess = result.ok;
      if (!telegramSuccess) console.error('Telegram API error:', result);
    }

    // Send via WhatsApp if ID exists
    if (targetWhatsAppId && waPhoneId && waToken) {
      const waUrl = `https://graph.facebook.com/v21.0/${waPhoneId}/messages`;
      
      let waPayload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: targetWhatsAppId,
      };

      if (action === 'approved') {
        waPayload.type = 'interactive';
        waPayload.interactive = {
          type: 'button',
          body: { text: waMessage },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: { id: 'menu', title: '📋 Main Menu' }
              }
            ]
          }
        };
      } else {
        waPayload.type = 'text';
        waPayload.text = { body: waMessage };
      }

      const waResponse = await fetch(waUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(waPayload)
      });
      const result = await waResponse.json();
      whatsappSuccess = waResponse.ok;
      if (!whatsappSuccess) console.error('WhatsApp API error:', result);
    }

    // Log the notification
    await supabase.from('activity_logs').insert({
      action: `Student ${action}`,
      module: 'students',
      scope: 'notification',
      metadata: { targetTelegramId, targetWhatsAppId, action, reason, telegramSuccess, whatsappSuccess }
    });

    return new Response(
      JSON.stringify({
        success: telegramSuccess || whatsappSuccess,
        telegramSuccess,
        whatsappSuccess,
        message: 'Notification processed'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('Error in notify-student function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});
