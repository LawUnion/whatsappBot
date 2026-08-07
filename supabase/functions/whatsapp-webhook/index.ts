// Meta WhatsApp Cloud API Webhook Handler
// Runs in Supabase Edge Function (Deno runtime)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_ADMIN_CONTACT = "9939137776";

// Initialize Supabase client with service role (bypass RLS)
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Helper function to get WhatsApp configuration
async function getWhatsAppConfig() {
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
async function sendWhatsAppMessage(
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

// Build WhatsApp Interactive List Menu from bot_buttons
function buildWhatsAppMenu(buttons: any[], sectionTitle = "Choose an option") {
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
function buildWhatsAppQuickReplies(
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
async function verifySignature(req: Request, rawBody: string, appSecret: string): Promise<boolean> {
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

// Helper to reset and restart registration anytime
async function resetAndStartRegistration(fromPhone: string, contactName: string) {
  // Check if existing student and unclaim roster if any
  const { data: existing } = await supabase.from("students").select("id, roster_id").eq("whatsapp_id", fromPhone).maybeSingle();
  if (existing) {
    if (existing.roster_id) {
      await supabase.from("student_roster").update({ is_claimed: false, claimed_by: null, claimed_at: null }).eq("id", existing.roster_id);
    }
    await supabase.from("students").delete().eq("whatsapp_id", fromPhone);
  }

  // Upsert registration session to awaiting_roll_number
  await supabase.from("registration_sessions").upsert(
    {
      whatsapp_id: fromPhone,
      telegram_first_name: contactName,
      step: "awaiting_form_number",
      platform: "whatsapp",
      attempts: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "whatsapp_id" }
  );

  await sendWhatsAppMessage(
    fromPhone,
    "",
    buildWhatsAppQuickReplies(
      `👋 *Welcome to Law Faculty Bot!*\n\nTo access the bot, you need to verify your identity.\n\n📝 Please enter your *Form Number*:\n\n_Example: DUPG0000187_`,
      [{ id: "reset", title: "🔄 Reset / Restart" }]
    )
  );
}

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
  if (textLower === "/start" || textLower === "start" || textLower === "hi" || textLower === "hello" || textLower === "hey") {
    await resetAndStartRegistration(fromPhone, contactName);
    return;
  }

  // Check registration session
  const { data: session } = await supabase
    .from("registration_sessions")
    .select("*")
    .eq("whatsapp_id", fromPhone)
    .single();

  if (session && session.step === "awaiting_form_number") {
    const formNumber = text.trim().toUpperCase();
    if (formNumber.length < 5 || formNumber.length > 30) {
      await sendWhatsAppMessage(
        fromPhone,
        "",
        buildWhatsAppQuickReplies(`❌ Invalid form number format. Please enter a valid form number:`, [{ id: "reset", title: "🔄 Reset / Restart" }])
      );
      return;
    }

    // Check student_roster table by form_number
    const { data: rosterEntry } = await supabase
      .from("student_roster")
      .select("*")
      .eq("form_number", formNumber)
      .maybeSingle();

    if (rosterEntry) {
      if (rosterEntry.is_claimed) {
        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(
            `⚠️ *Form Number Already Registered*\n\nForm number *${formNumber}* has already been registered.\nIf this is your form number and you didn't register it, please contact support at *${BOT_ADMIN_CONTACT}*.`,
            [{ id: "reset", title: "🔄 Reset / Restart" }]
          )
        );
        return;
      }

      // Record found! Now ask for verification (Roll Number)
      await supabase
        .from("registration_sessions")
        .update({ step: "awaiting_verification_roll_number", form_number: formNumber })
        .eq("id", session.id);

      await sendWhatsAppMessage(
        fromPhone,
        "",
        buildWhatsAppQuickReplies(
          `✅ Found your details!\n\nTo prove you are the real owner of this Form Number, please enter your **Roll Number** (e.g. 264001):`,
          [{ id: "reset", title: "🔄 Reset / Restart" }]
        )
      );
      return;

    } else {
      // Form number not in roster -> start manual registration
      await supabase
        .from("registration_sessions")
        .update({ step: "awaiting_name", form_number: formNumber })
        .eq("id", session.id);

      await sendWhatsAppMessage(
        fromPhone,
        "",
        buildWhatsAppQuickReplies(
          `❓ Form number *${formNumber}* not found in our official list.\n\nDon't worry! You can complete manual registration.\n\n📝 First, please enter your *Full Name*:`,
          [{ id: "reset", title: "🔄 Reset / Restart" }]
        )
      );
      return;
    }
  }

  if (session && session.step === "awaiting_verification_roll_number") {
    const rollNumber = text.trim();
    
    // Fetch roster entry based on form_number stored in session
    const { data: rosterEntry } = await supabase
      .from("student_roster")
      .select("*")
      .eq("form_number", session.form_number)
      .maybeSingle();

    if (!rosterEntry) {
      await resetAndStartRegistration(fromPhone, contactName);
      return;
    }

    if (rosterEntry.roll_number !== rollNumber) {
      const newAttempts = (session.attempts || 0) + 1;
      
      if (newAttempts >= 3) {
        await supabase
          .from("registration_sessions")
          .update({ step: "blocked", attempts: newAttempts, updated_at: new Date().toISOString() })
          .eq("id", session.id);
          
        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`🚫 *Maximum Attempts Reached*\n\nYou have entered an incorrect Roll Number too many times. Your registration is locked for 15 minutes to protect the account owner's privacy.`)
        );
      } else {
        await supabase
          .from("registration_sessions")
          .update({ attempts: newAttempts, updated_at: new Date().toISOString() })
          .eq("id", session.id);
          
        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`❌ Incorrect Roll Number (Attempt ${newAttempts}/3).\n\nVerification failed. Please check your Roll Number and try again:`, [{ id: "reset", title: "🔄 Reset / Restart" }])
        );
      }
      return;
    }

    // Verification successful, register student
    const { data: newStudent, error: createError } = await supabase
      .from("students")
      .insert({
        whatsapp_id: fromPhone,
        whatsapp_name: contactName,
        form_number: session.form_number,
        roll_number: rosterEntry.roll_number,
        name: rosterEntry.name, // Using actual db column 'name' instead of 'student_name'
        college_id: rosterEntry.college_id,
        section_id: rosterEntry.section_id,
        roster_id: rosterEntry.id,
        status: rosterEntry.status || "Active",
      })
      .select("*, college:colleges(name)")
      .single();

    if (createError || !newStudent) {
      console.error("Error creating student:", createError);
      await sendWhatsAppMessage(
        fromPhone,
        "",
        buildWhatsAppQuickReplies(`❌ An error occurred during registration. Please try again.`, [{ id: "reset", title: "🔄 Reset / Restart" }])
      );
      return;
    }

    // Mark roster entry as claimed
    await supabase
      .from("student_roster")
      .update({
        is_claimed: true,
        claimed_by: newStudent.id,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", rosterEntry.id);

    await supabase
      .from("registration_sessions")
      .update({ step: "completed", roll_number: rollNumber })
      .eq("id", session.id);

    if (newStudent.status === "Pending") {
      await sendWhatsAppMessage(
        fromPhone,
        "",
        buildWhatsAppQuickReplies(
          `✅ *Registration Submitted!*\n\nYour details have been matched:\n• Name: *${rosterEntry.name}*\n• Form No: *${session.form_number}*\n\nYour registration is now pending admin approval. You will receive a message once approved.`,
          [{ id: "reset", title: "🔄 Reset / Restart" }]
        )
      );
    } else {
      await sendWhatsAppMessage(
        fromPhone,
        "",
        buildWhatsAppQuickReplies(
          `🎉 *Registration Successful!*\n\nWelcome to Law Connect, *${rosterEntry.name}*!\nYour account is active.`,
          [{ id: "menu", title: "📋 Main Menu" }]
        )
      );
      await showMainMenu(fromPhone, newStudent);
    }
    return;
  }

  if (session && session.step === "awaiting_name") {
    const fullName = text.trim();
    await supabase
      .from("registration_sessions")
      .update({ step: "awaiting_college", name: fullName })
      .eq("id", session.id);

    // Show colleges list
    const { data: colleges } = await supabase.from("colleges").select("*").order("id");
    const collegeList = colleges?.map((c) => `• ${c.code}: ${c.name}`).join("\n") || "• LC-1\n• LC-2\n• CLC";

    await sendWhatsAppMessage(
      fromPhone,
      "",
      buildWhatsAppQuickReplies(
        `Great, *${fullName}*!\n\nNow, type the code of your college:\n\n${collegeList}\n\n_Type LC-1, LC-2, or CLC_`,
        [{ id: "reset", title: "🔄 Reset / Restart" }]
      )
    );
    return;
  }

  if (session && session.step === "awaiting_college") {
    const codeEntered = text.trim().toUpperCase();
    const { data: college } = await supabase.from("colleges").select("*").eq("code", codeEntered).maybeSingle();

    if (!college) {
      await sendWhatsAppMessage(
        fromPhone,
        "",
        buildWhatsAppQuickReplies(
          `❌ Invalid college code. Please type exactly *LC-1*, *LC-2*, or *CLC*:`,
          [{ id: "reset", title: "🔄 Reset / Restart" }]
        )
      );
      return;
    }

    await supabase
      .from("registration_sessions")
      .update({ step: "awaiting_year", college_id: college.id })
      .eq("id", session.id);

    await sendWhatsAppMessage(
      fromPhone,
      "",
      buildWhatsAppQuickReplies(
        `Selected: *${college.name}*\n\nNow, enter your *Year of Study* (Type 1, 2, or 3):`,
        [{ id: "reset", title: "🔄 Reset / Restart" }]
      )
    );
    return;
  }

  if (session && session.step === "awaiting_year") {
    const yearNumber = parseInt(text.trim());
    if (isNaN(yearNumber) || yearNumber < 1 || yearNumber > 3) {
      await sendWhatsAppMessage(
        fromPhone,
        "",
        buildWhatsAppQuickReplies(`❌ Invalid year. Please type 1, 2, or 3:`, [{ id: "reset", title: "🔄 Reset / Restart" }])
      );
      return;
    }

    const { data: yearObj } = await supabase
      .from("years")
      .select("*")
      .eq("college_id", session.college_id)
      .eq("year_number", yearNumber)
      .maybeSingle();

    await supabase
      .from("registration_sessions")
      .update({ step: "awaiting_section", year_id: yearObj?.id || yearNumber })
      .eq("id", session.id);

    await sendWhatsAppMessage(
      fromPhone,
      "",
      buildWhatsAppQuickReplies(`Year ${yearNumber} selected.\n\nNow, enter your *Section* (Example: A, B, C...):`, [{ id: "reset", title: "🔄 Reset / Restart" }])
    );
    return;
  }

  if (session && session.step === "awaiting_section") {
    const sectionName = text.trim().toUpperCase();
    const { data: newStudent } = await supabase
      .from("students")
      .insert({
        whatsapp_id: fromPhone,
        whatsapp_name: contactName,
        form_number: session.form_number || session.roll_number,
        roll_number: session.roll_number,
        name: session.name || contactName,
        college_id: session.college_id,
        year_id: typeof session.year_id === "number" ? session.year_id : null,
        status: "Pending", // Manual registrations require admin approval
      })
      .select("*, college:colleges(name)")
      .single();

    await supabase.from("registration_sessions").update({ step: "completed" }).eq("id", session.id);

    await sendWhatsAppMessage(
      fromPhone,
      "",
      buildWhatsAppQuickReplies(
        `✅ *Manual Registration Submitted!*\n\nSince your form number was not in the roster, your registration is now *Pending Admin Approval*.\n\nYou will be notified via WhatsApp as soon as an admin approves your request!`,
        [{ id: "reset", title: "🔄 Reset / Restart" }]
      )
    );
    return;
  }

  // Fallback for unregistered users not in active session
  await sendWhatsAppMessage(
    fromPhone,
    "",
    buildWhatsAppQuickReplies(`❓ You are not registered yet.\n\nTap the button below or type /start to begin verification with your University Roll Number.`, [{ id: "reset", title: "🚀 Start Verification" }])
  );
}

// Show Main Menu using WhatsApp Interactive List
async function showMainMenu(fromPhone: string, student: any) {
  const { data: buttons } = await supabase
    .from("bot_buttons")
    .select("*")
    .eq("active", true)
    .order("row_order", { ascending: true })
    .order("button_order", { ascending: true });

  const sectionName = student.section?.name || student.roster?.section_name || "N/A";
  const welcomeText = `👋 Welcome, *${student.name}*!\n\n🏫 *College:* ${student.college?.name || "N/A"}\n📚 *Section:* ${sectionName}`;

  if (!buttons || buttons.length === 0) {
    await sendWhatsAppMessage(fromPhone, `${welcomeText}\n\nNo active menu items at the moment.`);
    return;
  }

  const interactiveMenu = buildWhatsAppMenu(buttons, "Explore Modules");
  await sendWhatsAppMessage(fromPhone, welcomeText, interactiveMenu);
}

// Handle Module Button Clicks
async function handleModuleClick(fromPhone: string, student: any, button: any) {
  if (button.action_type === "URL") {
    await sendWhatsAppMessage(
      fromPhone,
      `🔗 *${button.label}*\n\nClick the link below to open:\n${button.action_value}`
    );
    return;
  }

  if (button.action_type === "TEXT") {
    await sendWhatsAppMessage(fromPhone, `📝 *${button.label}*\n\n${button.action_value}`);
    return;
  }

  if (button.action_type === "MODULE") {
    const moduleName = button.action_value.toLowerCase();

    switch (moduleName) {
      case "notices": {
        const { data: notices } = await supabase
          .from("notices")
          .select("*, college:colleges(name)")
          .or(`college_id.is.null,college_id.eq.${student.college_id || 0}`)
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(5);

        if (!notices || notices.length === 0) {
          await sendWhatsAppMessage(
            fromPhone,
            "",
            buildWhatsAppQuickReplies(`📢 *Notices*\n\nNo recent notices found for your college.`)
          );
          return;
        }

        const noticeText = notices
          .map((n) => `📌 *${n.title}* ${n.pinned ? "⭐" : ""}\n📅 ${new Date(n.created_at).toLocaleDateString()}\n${n.content}\n`)
          .join("\n---\n\n");

        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`📢 *Latest Notices*\n\n${noticeText}`)
        );
        break;
      }

      case "events": {
        const { data: events } = await supabase
          .from("events")
          .select("*, event_type:event_types(name, icon)")
          .gte("event_date", new Date().toISOString())
          .order("event_date", { ascending: true })
          .limit(5);

        if (!events || events.length === 0) {
          await sendWhatsAppMessage(
            fromPhone,
            "",
            buildWhatsAppQuickReplies(`🎉 *Events*\n\nNo upcoming events scheduled right now.`)
          );
          return;
        }

        const eventText = events
          .map((e) => `🗓️ *${e.title}* (${e.event_type?.name || "Event"})\n📍 Venue: ${e.venue || "TBA"}\n📅 Date: ${new Date(e.event_date).toLocaleDateString()}\n`)
          .join("\n---\n\n");

        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`🎉 *Upcoming Events*\n\n${eventText}`)
        );
        break;
      }

      case "schedule": {
        const { data: timetables } = await supabase
          .from("class_timetables")
          .select("*")
          .eq("college_id", student.college_id || 0)
          .limit(3);

        if (!timetables || timetables.length === 0) {
          await sendWhatsAppMessage(
            fromPhone,
            "",
            buildWhatsAppQuickReplies(`⏰ *Class Timetable*\n\nNo specific timetable published for your section yet.`)
          );
          return;
        }

        const timetableText = timetables
          .map((t) => `📅 *${t.title}*\n🔗 View Timetable: ${t.file_url || "Contact Admin"}`)
          .join("\n\n");

        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`⏰ *Class Timetables*\n\n${timetableText}`)
        );
        break;
      }

      case "study-materials":
      case "study_materials": {
        const { data: materials } = await supabase
          .from("study_materials")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        if (!materials || materials.length === 0) {
          await sendWhatsAppMessage(
            fromPhone,
            "",
            buildWhatsAppQuickReplies(`📚 *Study Materials*\n\nNo study materials uploaded yet.`)
          );
          return;
        }

        const matText = materials
          .map((m) => `📖 *${m.title}* (${m.subject || "General"})\n🔗 Download: ${m.file_url}`)
          .join("\n---\n\n");

        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`📚 *Study Materials & Notes*\n\n${matText}`)
        );
        break;
      }

      case "societies": {
        const { data: societies } = await supabase
          .from("societies")
          .select("*")
          .eq("college_id", student.college_id || 0);

        if (!societies || societies.length === 0) {
          await sendWhatsAppMessage(
            fromPhone,
            "",
            buildWhatsAppQuickReplies(`🎭 *Societies*\n\nNo societies found for your college.`)
          );
          return;
        }

        const socText = societies.map((s) => `• *${s.name}*`).join("\n");
        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`🎭 *Societies in your College*\n\n${socText}`)
        );
        break;
      }

      case "internships":
      case "internship": {
        const { data: internships } = await supabase
          .from("internships")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        if (!internships || internships.length === 0) {
          await sendWhatsAppMessage(
            fromPhone,
            "",
            buildWhatsAppQuickReplies(`💼 *Internships*\n\nNo active internship opportunities right now.`)
          );
          return;
        }

        const internshipText = internships
          .map((i) => `💼 *${i.position}*\n🏢 Company: ${i.company_name}\n📅 Deadline: ${i.deadline ? new Date(i.deadline).toLocaleDateString() : "Rolling"}\n🔗 Apply: ${i.apply_url || "Check portal"}`)
          .join("\n---\n\n");

        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`💼 *Latest Internships*\n\n${internshipText}`)
        );
        break;
      }

      case "support": {
        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`💬 *Message Support / Help Desk*\n\nTo send a query to the bot administrators or help desk, simply reply to this chat with your question starting with *Help:* (e.g., _Help: I need assistance with ID card issue_).`, [{ id: "menu", title: "📋 Main Menu" }])
        );
        break;
      }

      case "accommodation": {
        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`🏠 *Accommodation Help*\n\nLooking for PG or Flats? We have a network of verified brokers and seniors.\n\nPlease type *Help: Accommodation* followed by your budget and preferences, and our team will get back to you.`, [{ id: "menu", title: "📋 Main Menu" }])
        );
        break;
      }

      case "seniors": {
        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`🎓 *Seniors Connect Hub*\n\nNeed mentorship or guidance? Our seniors are here to help.\n\nPlease type *Help: Senior Connect* with your specific query (e.g., moots, exams, internships).`, [{ id: "menu", title: "📋 Main Menu" }])
        );
        break;
      }

      default: {
        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`Module *${button.label}* is active. Please check the web portal for more details.`)
        );
        break;
      }
    }
  }
}
