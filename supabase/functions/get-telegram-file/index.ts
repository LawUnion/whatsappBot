// Edge Function to fetch Telegram file URL for viewing student attachments
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_API = 'https://api.telegram.org/bot';

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
    const { fileId } = await req.json();

    if (!fileId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: fileId' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Get bot token from bot_settings
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: settings } = await supabase
      .from('bot_settings')
      .select('telegram_token')
      .single();

    const botToken = settings?.telegram_token || Deno.env.get('TELEGRAM_BOT_TOKEN');

    if (!botToken) {
      return new Response(
        JSON.stringify({ error: 'Bot token not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Call Telegram getFile API
    const getFileUrl = `${TELEGRAM_API}${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`;
    const fileResponse = await fetch(getFileUrl);
    const fileResult = await fileResponse.json();

    if (!fileResult.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to get file from Telegram', details: fileResult }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const filePath = fileResult.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

    return new Response(
      JSON.stringify({ success: true, fileUrl, filePath }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );

  } catch (error) {
    console.error('Error in get-telegram-file function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
});
