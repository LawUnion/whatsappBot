// Meta WhatsApp Cloud API Webhook Handler
// Runs in Supabase Edge Function (Deno runtime)

import { getWhatsAppConfig, verifySignature, supabase, sendWhatsAppMessage, buildWhatsAppQuickReplies, BOT_ADMIN_CONTACT } from "./utils.ts";
import { resetAndStartRegistration, handleRegistrationFlow } from "./handlers/registrationHandlers.ts";
import { showMainMenu, handleModuleClick } from "./handlers/moduleHandlers.ts";

// Serve webhook requests
Deno.serve(async (req) => {
  const url = new URL(req.url);

  // 1. Handle Webhook Verification (GET request from Meta Developer Console)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const config = await getWhatsAppConfig();

    if (mode === "subscribe" && token === config.verifyToken) {
      console.log("WhatsApp Webhook verified successfully.");
      return new Response(challenge, { status: 200 });
    } else {
      console.warn("WhatsApp Webhook verification failed. Token mismatch.");
      return new Response("Forbidden", { status: 403 });
    }
  }

  // 2. Handle Incoming Webhook Events (POST request from WhatsApp)
  if (req.method === "POST") {
    try {
      const rawBody = await req.text();
      const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");
      
      // Verify signature if APP_SECRET is configured
      if (appSecret) {
        if (!(await verifySignature(req, rawBody, appSecret))) {
          console.warn("WhatsApp Webhook signature verification failed.");
          return new Response("Unauthorized", { status: 401 });
        }
      }
      
      const body = JSON.parse(rawBody);

      if (body.object !== "whatsapp_business_account" || !body.entry) {
        return new Response("Not a WhatsApp event", { status: 404 });
      }

      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          const value = change.value;
          if (!value || !value.messages) continue;

          for (const message of value.messages) {
            const fromPhone = message.from; // e.g. "919876543210"
            const contactName = value.contacts?.[0]?.profile?.name || "Student";
            let text = "";

            if (message.type === "text") {
              text = message.text.body?.trim() || "";
            } else if (message.type === "interactive") {
              if (message.interactive.type === "button_reply") {
                text = message.interactive.button_reply.id || message.interactive.button_reply.title;
              } else if (message.interactive.type === "list_reply") {
                text = message.interactive.list_reply.id || message.interactive.list_reply.title;
              }
            }

            if (!text) continue;

            await processMessage(fromPhone, contactName, text);
          }
        }
      }

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("Error handling POST webhook:", err);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
});

// Main message processing logic
async function processMessage(fromPhone: string, contactName: string, text: string) {
  console.log(`Received WhatsApp message from ${fromPhone} (${contactName}): "${text}"`);
  const textLower = text.toLowerCase().trim();

  // Global Reset / Cancel check across any step or status
  if (
    textLower === "/reset" ||
    textLower === "reset" ||
    textLower === "/cancel" ||
    textLower === "cancel" ||
    textLower === "restart" ||
    textLower === "/restart" ||
    textLower === "🔄 reset / restart" ||
    textLower === "reset / restart" ||
    textLower === "/register" ||
    textLower === "register"
  ) {
    // Fetch current session to check if blocked
    const { data: currentSession } = await supabase
      .from("registration_sessions")
      .select("step, updated_at")
      .eq("whatsapp_id", fromPhone)
      .maybeSingle();

    if (currentSession?.step === "blocked") {
      const blockTime = new Date(currentSession.updated_at).getTime();
      const timeRemaining = (15 * 60 * 1000) - (Date.now() - blockTime);
      if (timeRemaining > 0) {
        const minutes = Math.ceil(timeRemaining / 60000);
        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`🚫 *Account Temporarily Locked*\n\nToo many failed attempts. Please try again in ${minutes} minutes.`)
        );
        return;
      }
    }
    
    await resetAndStartRegistration(fromPhone, contactName);
    return;
  }

  // Check if student exists in database
  const { data: studentBasic } = await supabase
    .from("students")
    .select("id, status, name, roll_number, college_id, section_id, roster_id")
    .eq("whatsapp_id", fromPhone)
    .maybeSingle();

  let student = studentBasic;
  if (studentBasic) {
    const { data: studentFull } = await supabase
      .from("students")
      .select("*, college:colleges(name), section:sections(name), roster:student_roster(section_name)")
      .eq("id", studentBasic.id)
      .single();

    if (studentFull) student = studentFull;
  }

  // Handle Registered Students
  if (student) {
    if (student.status === "Pending") {
      await sendWhatsAppMessage(
        fromPhone,
        `⏳ *Registration Pending*\n\nYour registration is awaiting admin approval.\nYou will be notified here once approved.\n\n📋 *Your Details:*\n• Name: ${student.name}\n• Roll No: ${student.roll_number}\n• College: ${student.college?.name || "N/A"}\n\n_To restart registration with a different roll number, type /reset_`
      );
      return;
    }

    if (student.status === "Blocked") {
      await sendWhatsAppMessage(
        fromPhone,
        `🚫 *Access Blocked*\n\nYour account has been blocked. Please contact the administrator for assistance.`
      );
      return;
    }

    if (student.status === "Rejected") {
      await sendWhatsAppMessage(
        fromPhone,
        `❌ *Registration Not Approved*\n\nWe regret to inform you that your registration request was not approved.\nIf you believe this is a mistake, please contact the bot administrators at *${BOT_ADMIN_CONTACT}*.\n\nYou can try again with a different roll number by typing /register`
      );
      return;
    }

    // Active Student - Handle Menu clicks or Navigation
    if (text === "/start" || textLower === "menu" || textLower === "hi" || textLower === "hello" || textLower.includes("main menu") || text === "menu") {
      await showMainMenu(fromPhone, student);
      return;
    }

    // Check if text matches a bot button label/icon
    const { data: buttons } = await supabase.from("bot_buttons").select("*").eq("active", true);
    const button = buttons?.find(
      (btn) =>
        btn.label.toLowerCase() === textLower ||
        `${btn.icon || ""} ${btn.label}`.toLowerCase().trim() === textLower
    );

    if (button) {
      await handleModuleClick(fromPhone, student, button);
      return;
    }

    // If student is sending support or accommodation text, or unknown text, show menu / support
    await showMainMenu(fromPhone, student);
    return;
  }

  // Handle Registration Flow (Student not found in students table)
  await handleRegistrationFlow(fromPhone, contactName, text, textLower);
}
