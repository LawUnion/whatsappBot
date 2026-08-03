// Edge Function to send support reply to students via Telegram or WhatsApp
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_API = 'https://api.telegram.org/bot';

interface ReplyRequest {
  telegramUserId?: number;
  whatsappId?: string;
  studentId?: string;
  replyText?: string;
  message?: string;
  originalMessage?: string;
  photoUrl?: string;
  videoUrl?: string;
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
    const { telegramUserId, whatsappId, studentId, replyText, message, originalMessage, photoUrl, videoUrl }: ReplyRequest = await req.json();

    const textContent = replyText || message || '';

    if ((!telegramUserId && !whatsappId && !studentId) || (!textContent && !photoUrl && !videoUrl)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: (telegramUserId or whatsappId or studentId) and content' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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

    const { data: settings } = await supabase
      .from('bot_settings')
      .select('telegram_token, whatsapp_phone_number_id, whatsapp_access_token')
      .maybeSingle();

    const botToken = settings?.telegram_token || Deno.env.get('TELEGRAM_BOT_TOKEN');
    const waPhoneId = settings?.whatsapp_phone_number_id || Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const waToken = settings?.whatsapp_access_token || Deno.env.get('WHATSAPP_ACCESS_TOKEN');

    // Compose message
    let composedMessage = '\u{1F4AC} <b>Support Reply</b>\n\n';
    let waComposedMessage = '💬 *Support Reply*\n\n';

    if (originalMessage) {
      composedMessage += `<i>Re: "${originalMessage.substring(0, 50)}${originalMessage.length > 50 ? '...' : ''}"</i>\n\n`;
      waComposedMessage += `_Re: "${originalMessage.substring(0, 50)}${originalMessage.length > 50 ? '...' : ''}"_\n\n`;
    }

    if (textContent) {
      composedMessage += textContent;
      waComposedMessage += textContent;
    }
    composedMessage += '\n\n<i>- Admin Team</i>';
    waComposedMessage += '\n\n_- Admin Team_';

    let telegramSuccess = false;
    let whatsappSuccess = false;

    // 1. Send via Telegram if available
    if (targetTelegramId && botToken) {
      let telegramMethod: string;
      let telegramBody: Record<string, unknown>;

      if (photoUrl) {
        telegramMethod = 'sendPhoto';
        telegramBody = { chat_id: targetTelegramId, photo: photoUrl, caption: composedMessage, parse_mode: 'HTML' };
      } else if (videoUrl) {
        telegramMethod = 'sendVideo';
        telegramBody = { chat_id: targetTelegramId, video: videoUrl, caption: composedMessage, parse_mode: 'HTML' };
      } else {
        telegramMethod = 'sendMessage';
        telegramBody = { chat_id: targetTelegramId, text: composedMessage, parse_mode: 'HTML' };
      }

      const telegramUrl = `${TELEGRAM_API}${botToken}/${telegramMethod}`;
      const telegramResponse = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telegramBody),
      });

      const telegramResult = await telegramResponse.json();
      telegramSuccess = telegramResponse.ok;
      if (!telegramSuccess) console.error('Telegram API error:', telegramResult);
    }

    // 2. Send via WhatsApp if available
    if (targetWhatsAppId && waPhoneId && waToken) {
      const waUrl = `https://graph.facebook.com/v21.0/${waPhoneId}/messages`;
      let payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: targetWhatsAppId,
      };

      if (photoUrl) {
        payload.type = 'image';
        payload.image = { link: photoUrl, caption: waComposedMessage };
      } else if (videoUrl) {
        payload.type = 'video';
        payload.video = { link: videoUrl, caption: waComposedMessage };
      } else {
        payload.type = 'text';
        payload.text = { body: waComposedMessage };
      }

      const waResponse = await fetch(waUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const result = await waResponse.json();
      whatsappSuccess = waResponse.ok;
      if (!whatsappSuccess) console.error('WhatsApp API error:', result);
    }

    return new Response(
      JSON.stringify({
        success: telegramSuccess || whatsappSuccess,
        telegramSuccess,
        whatsappSuccess,
        message: 'Support reply processed successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );

  } catch (error) {
    console.error('Error in send-support-reply function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
});
