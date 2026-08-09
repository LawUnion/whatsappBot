import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const BOT_ADMIN_CONTACT = "9939137776";

// Initialize Supabase client with service role (bypass RLS)
export const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Helper function to get WhatsApp configuration
export async function getWhatsAppConfig() {
  const { data: settings } = await supabase
    .from("bot_settings")
    .select("whatsapp_phone_number_id, whatsapp_access_token, whatsapp_verify_token")
    .maybeSingle();

  return {
    phoneNumberId: settings?.whatsapp_phone_number_id || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID"),
    accessToken: settings?.whatsapp_access_token || Deno.env.get("WHATSAPP_ACCESS_TOKEN"),
    verifyToken: settings?.whatsapp_verify_token || Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "law_connect_wa_verify_token_2026",
  };
}

// Helper function to send WhatsApp text/interactive message
export async function sendWhatsAppMessage(
  toPhone: string,
  text: string,
  interactive?: any
): Promise<boolean> {
  const config = await getWhatsAppConfig();
  if (!config.phoneNumberId || !config.accessToken) {
    console.error("WhatsApp configuration missing (phone_number_id or access_token)");
    return false;
  }

  const url = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`;
  let payload: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toPhone,
  };

  if (interactive) {
    payload.type = "interactive";
    payload.interactive = interactive;
  } else {
    payload.type = "text";
    // WhatsApp doesn't support HTML tags, convert common bold/italics or keep simple
    const formattedText = text
      .replace(/<b>(.*?)<\/b>/g, "*$1*")
      .replace(/<i>(.*?)<\/i>/g, "_$1_")
      .replace(/<code>(.*?)<\/code>/g, "`$1`");
    payload.text = { body: formattedText, preview_url: true };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("WhatsApp API Error:", JSON.stringify(result));
      return false;
    }
    return true;
  } catch (err) {
    console.error("Network error sending WhatsApp message:", err);
    return false;
  }
}

// Helper function to send WhatsApp media message (image/document)
export async function sendWhatsAppMedia(
  toPhone: string,
  mediaUrl: string,
  caption?: string
): Promise<boolean> {
  const config = await getWhatsAppConfig();
  if (!config.phoneNumberId || !config.accessToken) {
    console.error("WhatsApp configuration missing (phone_number_id or access_token)");
    return false;
  }

  // Determine media type based on extension in URL
  const isImage = mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i) != null;
  const mediaType = isImage ? "image" : "document";

  const url = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`;
  let payload: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toPhone,
    type: mediaType,
  };

  const formattedCaption = caption
    ? caption
        .replace(/<b>(.*?)<\/b>/g, "*$1*")
        .replace(/<i>(.*?)<\/i>/g, "_$1_")
        .replace(/<code>(.*?)<\/code>/g, "`$1`")
    : undefined;

  payload[mediaType] = {
    link: mediaUrl,
  };

  if (formattedCaption) {
    payload[mediaType].caption = formattedCaption;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error(`WhatsApp API ${mediaType} Error:`, JSON.stringify(result));
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Network error sending WhatsApp ${mediaType}:`, err);
    return false;
  }
}

// Build WhatsApp Interactive List Menu from bot_buttons
export function buildWhatsAppMenu(buttons: any[], sectionTitle = "Choose an option") {
  // WhatsApp lists support max 10 rows per section
  const rows = buttons.slice(0, 10).map((btn) => ({
    id: `${btn.icon || ""} ${btn.label}`.trim(),
    title: `${btn.icon ? btn.icon + " " : ""}${btn.label}`.substring(0, 24),
    description: btn.action_type === "URL" ? "Open Link / Resource" : `View ${btn.label}`.substring(0, 72),
  }));

  return {
    type: "list",
    header: {
      type: "text",
      text: "Law Faculty Menu",
    },
    body: {
      text: "Select a module below to explore class timetables, notices, study materials, societies, and more:",
    },
    footer: {
      text: "Law Connect Bot",
    },
    action: {
      button: "Main Menu",
      sections: [
        {
          title: sectionTitle.substring(0, 24),
          rows: rows,
        },
      ],
    },
  };
}

// Build WhatsApp Quick Reply Pill Buttons (`type: "button"`)
export function buildWhatsAppQuickReplies(
  bodyText: string,
  buttons: { id: string; title: string }[] = [{ id: "menu", title: "📋 Main Menu" }],
  headerText?: string
) {
  const formattedBody = bodyText
    .replace(/<b>(.*?)<\/b>/g, "*$1*")
    .replace(/<i>(.*?)<\/i>/g, "_$1_")
    .replace(/<code>(.*?)<\/code>/g, "`$1`");

  const interactive: any = {
    type: "button",
    body: { text: formattedBody.substring(0, 1024) },
    footer: { text: "Law Connect Bot" },
    action: {
      buttons: buttons.slice(0, 3).map((b) => ({
        type: "reply",
        reply: {
          id: b.id.substring(0, 256),
          title: b.title.substring(0, 20), // Max 20 chars allowed by WhatsApp
        },
      })),
    },
  };

  if (headerText) {
    interactive.header = { type: "text", text: headerText.substring(0, 60) };
  }

  return interactive;
}

// Helper to verify WhatsApp signature
export async function verifySignature(req: Request, rawBody: string, appSecret: string): Promise<boolean> {
  const signature = req.headers.get("x-hub-signature-256");
  if (!signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody)
  );

  const expectedSignature = "sha256=" + Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signature === expectedSignature;
}
