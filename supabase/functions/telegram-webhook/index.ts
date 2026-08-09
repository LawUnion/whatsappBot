// Grammy.dev Telegram Bot - Webhook Handler
// Runs in Supabase Edge Function (Deno runtime)

import {
  Bot,
  GrammyError,
  webhookCallback,
  InlineKeyboard,
  Keyboard,
} from "https://esm.sh/grammy@1.21.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Bot admin contact info
const BOT_ADMIN_CONTACT = "9939137776";

// Initialize Grammy bot
const bot = new Bot(Deno.env.get("TELEGRAM_BOT_TOKEN") || "");

// Initialize Supabase client with service role (bypass RLS)
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Registration steps - line by line flow
const REGISTRATION_STEPS = {
  AWAITING_ROLL_NUMBER: "awaiting_roll_number",
  CONFIRMING_DETAILS: "confirming_details",
  // New steps for manual registration (roll number not in roster)
  AWAITING_NAME: "awaiting_name",
  AWAITING_COLLEGE: "awaiting_college",
  AWAITING_YEAR: "awaiting_year",
  AWAITING_SECTION: "awaiting_section",
  CONFIRMING_MANUAL_DETAILS: "confirming_manual_details",
  COMPLETED: "completed",
};

// Handle /start command
bot.command("start", async (ctx) => {
  const telegramUserId = ctx.from?.id;
  const telegramUsername = ctx.from?.username;
  const firstName = ctx.from?.first_name;
  const lastName = ctx.from?.last_name;

  if (!telegramUserId) {
    await ctx.reply("Unable to identify user.");
    return;
  }
  await ctx.replyWithChatAction("typing").catch(() => {});

  // Check if session is blocked
  const { data: currentSession } = await supabase
    .from("registration_sessions")
    .select("step, updated_at, attempts")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();

  if (currentSession?.step === "blocked") {
    const blockTime = new Date(currentSession.updated_at).getTime();
    const timeRemaining = (15 * 60 * 1000) - (Date.now() - blockTime);
    if (timeRemaining > 0) {
      const minutes = Math.ceil(timeRemaining / 60000);
      await ctx.reply(`🚫 <b>Account Temporarily Locked</b>\n\nToo many attempts. Please try again in ${minutes} minutes.`, { parse_mode: "HTML" });
      return;
    }
  }

  // Check if student exists in database - first do a simple check
  const { data: studentBasic } = await supabase
    .from("students")
    .select("id, status, name, roll_number, college_id, section_id, roster_id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();

  // If student exists, fetch full details with joins
  let student = studentBasic;
  if (studentBasic) {
    const { data: studentFull } = await supabase
      .from("students")
      .select(
        "*, college:colleges(name), section:sections(name), roster:student_roster(section_name)",
      )
      .eq("id", studentBasic.id)
      .single();

    if (studentFull) {
      student = studentFull;
    }
  }

  if (student) {
    // Student exists - check their status
    if (student.status === "Pending") {
      await ctx.reply(
        "⏳ <b>Registration Pending</b>\n\n" +
          "Your registration is awaiting admin approval.\n" +
          "You will be notified once approved.\n\n" +
          "📋 <b>Your Details:</b>\n" +
          `• Name: ${student.name}\n` +
          `• Roll No: ${student.roll_number}\n` +
          `• College: ${student.college?.name || "N/A"}`,
        { parse_mode: "HTML" },
      );
      return;
    }

    if (student.status === "Blocked") {
      await ctx.reply(
        "🚫 <b>Access Blocked</b>\n\n" +
          "Your account has been blocked. Please contact the administrator for assistance.",
        { parse_mode: "HTML" },
      );
      return;
    }

    if (student.status === "Rejected") {
      await ctx.reply(
        "❌ <b>Registration Not Approved</b>\n\n" +
          "We regret to inform you that your registration request was not approved.\n" +
          (student.rejection_reason
            ? `Reason: ${student.rejection_reason}\n\n`
            : "\n") +
          `If you believe this is a mistake, please contact the bot administrators at <b>${BOT_ADMIN_CONTACT}</b>.\n\n` +
          "You can try again with a different roll number using /register",
        { parse_mode: "HTML" },
      );
      return;
    }

    // Active student - show menu
    const { data: buttons } = await supabase
      .from("bot_buttons")
      .select("*")
      .eq("active", true)
      .order("row_order", { ascending: true })
      .order("button_order", { ascending: true });

    if (!buttons || buttons.length === 0) {
      await ctx.reply(`Welcome ${student.name}!`);
      return;
    }

    const keyboard = buildKeyboard(buttons);

    // Get section name from section table or roster's section_name
    const sectionName =
      student.section?.name || student.roster?.section_name || "N/A";

    await ctx.reply(
      `👋 Welcome back, <b>${student.name}</b>!\n\n` +
        `🏫 <b>College:</b> ${student.college?.name || "N/A"}\n` +
        `📚 <b>Section:</b> ${sectionName}\n\n` +
        `Use the menu below to navigate:`,
      {
        parse_mode: "HTML",
        reply_markup: keyboard,
      },
    );
    return;
  }

  // New user - start registration flow
  // Create or update registration session
  await supabase.from("registration_sessions").upsert(
    {
      telegram_user_id: telegramUserId,
      telegram_username: telegramUsername,
      telegram_first_name: firstName,
      telegram_last_name: lastName,
      step: REGISTRATION_STEPS.AWAITING_ROLL_NUMBER,
      attempts: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "telegram_user_id" },
  );

  await ctx.reply(
    "👋 <b>Welcome to Court Kachahri Bot!</b>\n\n" +
      "To access the bot, you need to verify your identity.\n\n" +
      "📝 Please enter your <b>University Roll Number</b>:\n\n" +
      "<i>Example: 123456</i>",
    { parse_mode: "HTML" },
  );
});

// Handle /register command - for re-registration after rejection
bot.command("register", async (ctx) => {
  const telegramUserId = ctx.from?.id;
  const telegramUsername = ctx.from?.username;
  const firstName = ctx.from?.first_name;
  const lastName = ctx.from?.last_name;

  if (!telegramUserId) {
    await ctx.reply("Unable to identify user.");
    return;
  }
  await ctx.replyWithChatAction("typing").catch(() => {});

  // Check if session is blocked
  const { data: currentSession } = await supabase
    .from("registration_sessions")
    .select("step, updated_at, attempts")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();

  if (currentSession?.step === "blocked") {
    const blockTime = new Date(currentSession.updated_at).getTime();
    const timeRemaining = (15 * 60 * 1000) - (Date.now() - blockTime);
    if (timeRemaining > 0) {
      const minutes = Math.ceil(timeRemaining / 60000);
      await ctx.reply(`🚫 <b>Account Temporarily Locked</b>\n\nToo many attempts. Please try again in ${minutes} minutes.`, { parse_mode: "HTML" });
      return;
    }
  }

  const newAttempts = (currentSession?.attempts || 0) + 1;
  if (newAttempts >= 5) {
    await supabase.from("registration_sessions").upsert(
      {
        telegram_user_id: telegramUserId,
        step: "blocked",
        attempts: newAttempts,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "telegram_user_id" }
    );
    await ctx.reply(`🚫 <b>Maximum Attempts Reached</b>\n\nYou have restarted registration too many times. Your account is locked for 15 minutes to prevent spam.`, { parse_mode: "HTML" });
    return;
  }

  // Check if already registered and active
  const { data: student } = await supabase
    .from("students")
    .select("status")
    .eq("telegram_user_id", telegramUserId)
    .single();

  if (student && student.status === "Active") {
    await ctx.reply(
      "✅ You are already registered! Use /start to access the menu.",
    );
    return;
  }

  if (student && student.status === "Pending") {
    await ctx.reply(
      "⏳ Your registration is already pending approval. Please wait for admin approval.",
    );
    return;
  }

  // Delete any existing rejected registration for this user
  if (student && student.status === "Rejected") {
    await supabase
      .from("students")
      .delete()
      .eq("telegram_user_id", telegramUserId);
  }

  // Create registration session
  await supabase.from("registration_sessions").upsert(
    {
      telegram_user_id: telegramUserId,
      telegram_username: telegramUsername,
      telegram_first_name: firstName,
      telegram_last_name: lastName,
      step: REGISTRATION_STEPS.AWAITING_ROLL_NUMBER,
      roll_number: null,
      roster_id: null,
      attempts: newAttempts,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "telegram_user_id" },
  );

  await ctx.reply(
    "📝 <b>New Registration</b>\n\n" +
      "Please enter your <b>University Roll Number</b>:\n\n" +
      "<i>Example: 123456</i>",
    { parse_mode: "HTML" },
  );
});

// Handle text messages (button clicks, registration flow, and support messages)
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  const telegramUserId = ctx.from?.id;

  if (!telegramUserId) return;
  await ctx.replyWithChatAction("typing").catch(() => {});

  // Check if user is in registration flow
  const { data: session } = await supabase
    .from("registration_sessions")
    .select("*")
    .eq("telegram_user_id", telegramUserId)
    .single();

  if (session && session.step !== REGISTRATION_STEPS.COMPLETED) {
    await handleRegistrationFlow(ctx, session, text);
    return;
  }

  // Check if this is a reply to accommodation or support prompt (force_reply)
  if (ctx.message.reply_to_message) {
    const replyText = ctx.message.reply_to_message.text;

    // Accommodation help reply
    if (replyText?.includes("Describe your accommodation issue")) {
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("telegram_user_id", telegramUserId)
        .single();

      if (student) {
        await supabase.from("accommodation_requests").insert({
          student_id: student.id,
          telegram_user_id: telegramUserId,
          message: text,
          status: "Open",
        });

        const { data: buttons } = await supabase
          .from("bot_buttons")
          .select("*")
          .eq("active", true)
          .order("row_order", { ascending: true })
          .order("button_order", { ascending: true });

        const keyboard = buildKeyboard(buttons || []);

        await ctx.reply(
          "✅ <b>Request Received!</b>\n\n" +
            "Your accommodation help request has been sent to our team. " +
            "We will reply to you here in the bot.\n\n" +
            '📝 <i>You said:</i> "' +
            text.substring(0, 100) +
            (text.length > 100 ? '..."' : '"'),
          {
            parse_mode: "HTML",
            reply_markup: keyboard,
          },
        );
      }
      return;
    }

    if (replyText?.includes("Type your message below")) {
      // This is a support message - save it
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("telegram_user_id", telegramUserId)
        .single();

      if (student) {
        const { error } = await supabase.from("support_messages").insert({
          student_id: student.id,
          message: text,
          read: false,
        });

        if (!error) {
          // Get buttons to show keyboard again
          const { data: buttons } = await supabase
            .from("bot_buttons")
            .select("*")
            .eq("active", true)
            .order("row_order", { ascending: true })
            .order("button_order", { ascending: true });

          const keyboard = buildKeyboard(buttons || []);

          await ctx.reply(
            "✅ <b>Message Received!</b>\n\n" +
              "Your message has been sent to the admin team. " +
              "We will get back to you soon.\n\n" +
              '📝 <i>You said:</i> "' +
              text.substring(0, 100) +
              (text.length > 100 ? '..."' : '"'),
            {
              parse_mode: "HTML",
              reply_markup: keyboard,
            },
          );
        } else {
          await ctx.reply("❌ Failed to send message. Please try again.");
        }
      }
      return;
    }
  }

  // Check if student is registered and active
  const { data: student } = await supabase
    .from("students")
    .select("id, status")
    .eq("telegram_user_id", telegramUserId)
    .single();

  if (!student || student.status !== "Active") {
    await ctx.reply(
      "❓ You are not registered yet.\n\n" +
        "Use /start to begin registration.",
      { parse_mode: "HTML" },
    );
    return;
  }

  // Fetch all active buttons and find matching one
  // Keyboard sends text as "icon label", so we need to match against that
  const { data: buttons } = await supabase
    .from("bot_buttons")
    .select("*")
    .eq("active", true);

  // Try exact match first (with icon), then try label-only match
  let button = buttons?.find((btn) => `${btn.icon} ${btn.label}` === text);

  if (!button) {
    // Try matching just the label (case-insensitive)
    const textLower = text.toLowerCase().trim();
    button = buttons?.find(
      (btn) =>
        btn.label.toLowerCase() === textLower ||
        `${btn.icon} ${btn.label}`.toLowerCase() === textLower,
    );
  }

  if (!button) {
    // Only treat as support message if it looks like a real message
    // (not a button label attempt or navigation text)
    const commonNavigationTexts = [
      "back",
      "menu",
      "home",
      "start",
      "help",
      "societies",
      "events",
      "notices",
      "schedule",
      "notes",
      "internships",
      "support",
      "seniors",
      "study materials",
    ];

    const isNavigationAttempt = commonNavigationTexts.some((nav) =>
      text.toLowerCase().includes(nav),
    );

    // Get buttons to show keyboard
    const keyboard = buildKeyboard(buttons || []);

    if (isNavigationAttempt) {
      // User is trying to navigate - show menu instead of saving as support
      await ctx.reply(
        "🔘 Please use the menu buttons below to navigate.\n\n" +
          "<i>Tap a button to access that feature.</i>",
        {
          parse_mode: "HTML",
          reply_markup: keyboard,
        },
      );
    } else {
      // Genuine support message - save it
      await supabase.from("support_messages").insert({
        student_id: student.id,
        message: text,
        read: false,
      });

      await ctx.reply(
        "💬 Your message has been forwarded to the support team!\n\n" +
          "Use the menu buttons to navigate, or type another message for support.",
        {
          parse_mode: "HTML",
          reply_markup: keyboard,
        },
      );
    }
    return;
  }

  // Handle different action types
  switch (button.action_type) {
    case "MODULE":
      await handleModule(ctx, button.action_value, telegramUserId);
      break;

    case "URL":
      await ctx.reply(`🔗 Click here: ${button.action_value}`, {
        parse_mode: "HTML",
      });
      break;

    case "TEXT":
      await ctx.reply(button.action_value);
      break;
  }
});

// Handle registration flow - LINE BY LINE
async function handleRegistrationFlow(ctx: any, session: any, text: string) {
  const telegramUserId = ctx.from?.id;

  // STEP 1: Awaiting Roll Number
  if (session.step === REGISTRATION_STEPS.AWAITING_ROLL_NUMBER) {
    const rollNumber = text.trim().toUpperCase();

    // Check if roll number exists in roster
    const { data: rosterEntry, error: rosterError } = await supabase
      .from("student_roster")
      .select("*, college:colleges(id, name), year:years(id, name)")
      .eq("roll_number", rollNumber)
      .single();

    if (rosterError || !rosterEntry) {
      // Roll number NOT in roster - start manual line-by-line collection
      await supabase
        .from("registration_sessions")
        .update({
          step: REGISTRATION_STEPS.AWAITING_NAME,
          roll_number: rollNumber,
          roster_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("telegram_user_id", telegramUserId);

      await ctx.reply(
        "⚠️ <b>Roll Number Not Found in Roster</b>\n\n" +
          `Roll number "<b>${rollNumber}</b>" is not in our pre-approved list.\n\n` +
          "No problem! You can still register. We'll need a few more details.\n" +
          "Your account will need admin approval.\n\n" +
          "📝 <b>Step 1/4:</b> Please enter your <b>Full Name</b>:",
        { parse_mode: "HTML" },
      );
      return;
    }

    // Check if roll number is already claimed
    if (rosterEntry.is_claimed) {
      await ctx.reply(
        "⚠️ <b>Roll Number Already Registered</b>\n\n" +
          "This roll number has already been used for registration.\n\n" +
          "If this is your roll number and you did not register, please contact the administrator.\n\n" +
          "Or enter a different roll number:",
        { parse_mode: "HTML" },
      );
      return;
    }

    // Valid roll number found in roster - update session and ask for confirmation
    await supabase
      .from("registration_sessions")
      .update({
        step: REGISTRATION_STEPS.CONFIRMING_DETAILS,
        roll_number: rollNumber,
        roster_id: rosterEntry.id,
        updated_at: new Date().toISOString(),
      })
      .eq("telegram_user_id", telegramUserId);

    await ctx.reply(
      "✅ <b>Roll Number Verified!</b>\n\n" +
        "📋 <b>Your details from roster:</b>\n\n" +
        `• <b>Name:</b> ${rosterEntry.name}\n` +
        `• <b>Roll No:</b> ${rosterEntry.roll_number}\n` +
        `• <b>College:</b> ${rosterEntry.college?.name || "N/A"}\n` +
        `• <b>Year:</b> ${rosterEntry.year?.name || "N/A"}\n` +
        `• <b>Section:</b> ${rosterEntry.section_name || "N/A"}\n\n` +
        "Is this information correct?\n\n" +
        "Reply <b>YES</b> to confirm or <b>NO</b> to try a different roll number.",
      { parse_mode: "HTML" },
    );
    return;
  }

  // STEP 2 (roster found): Confirming Details
  if (session.step === REGISTRATION_STEPS.CONFIRMING_DETAILS) {
    const response = text.trim().toUpperCase();

    if (response === "YES" || response === "Y" || response === "CONFIRM") {
      // ROSTER-BASED: Auto-approve
      const { data: rosterEntry } = await supabase
        .from("student_roster")
        .select("*")
        .eq("id", session.roster_id)
        .single();

      if (!rosterEntry) {
        await ctx.reply(
          "❌ Error: Roster entry not found. Please try again with /start",
        );
        return;
      }

      // Check again if not claimed (race condition protection)
      if (rosterEntry.is_claimed) {
        await ctx.reply(
          "⚠️ <b>Registration Failed</b>\n\n" +
            "This roll number was just claimed by another user.\n\n" +
            "Please contact the administrator if this is your roll number.",
          { parse_mode: "HTML" },
        );
        return;
      }

      // Get section_id - either from roster or look it up from section_name
      let sectionId = rosterEntry.section_id;
      if (!sectionId && rosterEntry.section_name && rosterEntry.year_id) {
        // Look up section_id from section_name and year_id
        const { data: sectionData } = await supabase
          .from("sections")
          .select("id, semester:semesters!inner(year_id)")
          .eq("name", rosterEntry.section_name)
          .eq("semester.year_id", rosterEntry.year_id)
          .limit(1)
          .single();

        if (sectionData) {
          sectionId = sectionData.id;

          // Also update the roster entry with the found section_id
          await supabase
            .from("student_roster")
            .update({ section_id: sectionId })
            .eq("id", rosterEntry.id);
        }
      }

      // Create student record with Active status (AUTO-APPROVED)
      const { data: newStudent, error: studentError } = await supabase
        .from("students")
        .insert({
          telegram_user_id: telegramUserId,
          telegram_username: session.telegram_username,
          roll_number: rosterEntry.roll_number,
          name: rosterEntry.name,
          college_id: rosterEntry.college_id,
          year_id: rosterEntry.year_id,
          section_id: sectionId,
          roster_id: rosterEntry.id,
          status: "Active", // AUTO-APPROVED for roster students
        })
        .select()
        .single();

      if (studentError) {
        console.error("Error creating student:", studentError);
        await ctx.reply(
          "❌ <b>Registration Error</b>\n\n" +
            "Failed to create your registration. Please try again or contact admin.",
          { parse_mode: "HTML" },
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

      // Mark session as completed
      await supabase
        .from("registration_sessions")
        .update({
          step: REGISTRATION_STEPS.COMPLETED,
          updated_at: new Date().toISOString(),
        })
        .eq("telegram_user_id", telegramUserId);

      await ctx.reply(
        "🎉 <b>Registration Successful!</b>\n\n" +
          "Your account has been verified and activated.\n\n" +
          "📋 <b>Your Details:</b>\n" +
          `• Name: ${rosterEntry.name}\n` +
          `• Roll No: ${rosterEntry.roll_number}\n\n` +
          "✅ You now have full access to the bot.\n\n" +
          "<i>Use /start to access the menu.</i>",
        { parse_mode: "HTML" },
      );
      return;
    }

    if (response === "NO" || response === "N") {
      // Reset to roll number entry
      await supabase
        .from("registration_sessions")
        .update({
          step: REGISTRATION_STEPS.AWAITING_ROLL_NUMBER,
          roll_number: null,
          roster_id: null,
          attempts: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("telegram_user_id", telegramUserId);

      await ctx.reply(
        "📝 <b>Let's try again</b>\n\n" +
          "Please enter your correct <b>University Roll Number</b>:\n\n" +
          "<i>Example: 123456</i>",
        { parse_mode: "HTML" },
      );
      return;
    }

    // Invalid response
    await ctx.reply(
      "❓ Please reply with <b>YES</b> to confirm or <b>NO</b> to try a different roll number.",
      { parse_mode: "HTML" },
    );
    return;
  }

  // MANUAL REGISTRATION STEPS (roll number not in roster)

  // STEP 2 (manual): Awaiting Name
  if (session.step === REGISTRATION_STEPS.AWAITING_NAME) {
    const name = text.trim();

    if (name.length < 2) {
      await ctx.reply(
        "❌ Please enter a valid name (at least 2 characters).\n\n" +
          "📝 Enter your <b>Full Name</b>:",
        { parse_mode: "HTML" },
      );
      return;
    }

    // Fetch colleges for selection
    const { data: colleges } = await supabase
      .from("colleges")
      .select("id, name, code")
      .order("name");

    if (!colleges || colleges.length === 0) {
      await ctx.reply("❌ Error: No colleges found. Please contact admin.");
      return;
    }

    // Store name and move to college selection
    await supabase
      .from("registration_sessions")
      .update({
        step: REGISTRATION_STEPS.AWAITING_COLLEGE,
        name: name,
        updated_at: new Date().toISOString(),
      })
      .eq("telegram_user_id", telegramUserId);

    // Build college options message
    let collegeOptions = "";
    colleges.forEach((c, i) => {
      collegeOptions += `<b>${i + 1}.</b> ${c.name} (${c.code})\n`;
    });

    await ctx.reply(
      `✅ Name: <b>${name}</b>\n\n` +
        "📝 <b>Step 2/4:</b> Select your <b>College</b>\n\n" +
        collegeOptions +
        "\nReply with the number (1, 2, or 3):",
      { parse_mode: "HTML" },
    );
    return;
  }

  // STEP 3 (manual): Awaiting College Selection
  if (session.step === REGISTRATION_STEPS.AWAITING_COLLEGE) {
    const selection = text.trim();

    // Fetch colleges
    const { data: colleges } = await supabase
      .from("colleges")
      .select("id, name, code")
      .order("name");

    if (!colleges) {
      await ctx.reply("❌ Error fetching colleges. Please try again.");
      return;
    }

    // Parse selection (by number or name)
    let selectedCollege = null;
    const num = parseInt(selection);
    if (!isNaN(num) && num >= 1 && num <= colleges.length) {
      selectedCollege = colleges[num - 1];
    } else {
      // Try matching by name or code
      selectedCollege = colleges.find(
        (c) =>
          c.code.toLowerCase() === selection.toLowerCase() ||
          c.name.toLowerCase().includes(selection.toLowerCase()),
      );
    }

    if (!selectedCollege) {
      let collegeOptions = "";
      colleges.forEach((c, i) => {
        collegeOptions += `<b>${i + 1}.</b> ${c.name} (${c.code})\n`;
      });

      await ctx.reply(
        "❌ Invalid selection. Please choose a valid college.\n\n" +
          collegeOptions +
          "\nReply with the number (1, 2, or 3):",
        { parse_mode: "HTML" },
      );
      return;
    }

    // Fetch years for selected college
    const { data: years } = await supabase
      .from("years")
      .select("id, name, year_number")
      .eq("college_id", selectedCollege.id)
      .order("year_number");

    if (!years || years.length === 0) {
      await ctx.reply(
        "❌ No years found for this college. Please contact admin.",
      );
      return;
    }

    // Store college and move to year selection
    await supabase
      .from("registration_sessions")
      .update({
        step: REGISTRATION_STEPS.AWAITING_YEAR,
        college_id: selectedCollege.id,
        updated_at: new Date().toISOString(),
      })
      .eq("telegram_user_id", telegramUserId);

    // Build year options message
    let yearOptions = "";
    years.forEach((y, i) => {
      yearOptions += `<b>${i + 1}.</b> ${y.name}\n`;
    });

    await ctx.reply(
      `✅ College: <b>${selectedCollege.name}</b>\n\n` +
        "📝 <b>Step 3/4:</b> Select your <b>Year</b>\n\n" +
        yearOptions +
        "\nReply with the number:",
      { parse_mode: "HTML" },
    );
    return;
  }

  // STEP 4 (manual): Awaiting Year Selection
  if (session.step === REGISTRATION_STEPS.AWAITING_YEAR) {
    const selection = text.trim();

    // Fetch years for the selected college
    const { data: years } = await supabase
      .from("years")
      .select("id, name, year_number")
      .eq("college_id", session.college_id)
      .order("year_number");

    if (!years) {
      await ctx.reply("❌ Error fetching years. Please try again.");
      return;
    }

    // Parse selection
    let selectedYear = null;
    const num = parseInt(selection);
    if (!isNaN(num) && num >= 1 && num <= years.length) {
      selectedYear = years[num - 1];
    } else {
      // Try matching by name
      selectedYear = years.find((y) =>
        y.name.toLowerCase().includes(selection.toLowerCase()),
      );
    }

    if (!selectedYear) {
      let yearOptions = "";
      years.forEach((y, i) => {
        yearOptions += `<b>${i + 1}.</b> ${y.name}\n`;
      });

      await ctx.reply(
        "❌ Invalid selection. Please choose a valid year.\n\n" +
          yearOptions +
          "\nReply with the number:",
        { parse_mode: "HTML" },
      );
      return;
    }

    // Fetch sections for selected year (via semesters)
    const { data: sections } = await supabase
      .from("sections")
      .select("id, name, semester:semesters!inner(year_id)")
      .eq("semester.year_id", selectedYear.id);

    // Deduplicate sections by name
    const uniqueSections: any[] = [];
    const seenNames = new Set<string>();
    sections?.forEach((s) => {
      if (!seenNames.has(s.name)) {
        seenNames.add(s.name);
        uniqueSections.push(s);
      }
    });

    if (uniqueSections.length === 0) {
      await ctx.reply(
        "❌ No sections found for this year. Please contact admin.",
      );
      return;
    }

    // Store year and move to section selection
    await supabase
      .from("registration_sessions")
      .update({
        step: REGISTRATION_STEPS.AWAITING_SECTION,
        year_id: selectedYear.id,
        updated_at: new Date().toISOString(),
      })
      .eq("telegram_user_id", telegramUserId);

    // Build section options message
    let sectionOptions = "";
    uniqueSections.forEach((s, i) => {
      sectionOptions += `<b>${i + 1}.</b> Section ${s.name}\n`;
    });

    await ctx.reply(
      `✅ Year: <b>${selectedYear.name}</b>\n\n` +
        "📝 <b>Step 4/4:</b> Select your <b>Section</b>\n\n" +
        sectionOptions +
        "\nReply with the number:",
      { parse_mode: "HTML" },
    );
    return;
  }

  // STEP 5 (manual): Awaiting Section Selection
  if (session.step === REGISTRATION_STEPS.AWAITING_SECTION) {
    const selection = text.trim();

    // Fetch sections for the selected year
    const { data: sections } = await supabase
      .from("sections")
      .select("id, name, semester:semesters!inner(year_id)")
      .eq("semester.year_id", session.year_id);

    // Deduplicate sections by name
    const uniqueSections: any[] = [];
    const seenNames = new Set<string>();
    sections?.forEach((s) => {
      if (!seenNames.has(s.name)) {
        seenNames.add(s.name);
        uniqueSections.push(s);
      }
    });

    if (!uniqueSections.length) {
      await ctx.reply("❌ Error fetching sections. Please try again.");
      return;
    }

    // Parse selection
    let selectedSection = null;
    const num = parseInt(selection);
    if (!isNaN(num) && num >= 1 && num <= uniqueSections.length) {
      selectedSection = uniqueSections[num - 1];
    } else {
      // Try matching by name
      selectedSection = uniqueSections.find(
        (s) =>
          s.name.toLowerCase() === selection.toLowerCase() ||
          `section ${s.name}`.toLowerCase() === selection.toLowerCase(),
      );
    }

    if (!selectedSection) {
      let sectionOptions = "";
      uniqueSections.forEach((s, i) => {
        sectionOptions += `<b>${i + 1}.</b> Section ${s.name}\n`;
      });

      await ctx.reply(
        "❌ Invalid selection. Please choose a valid section.\n\n" +
          sectionOptions +
          "\nReply with the number:",
        { parse_mode: "HTML" },
      );
      return;
    }

    // Fetch college and year names for confirmation
    const { data: college } = await supabase
      .from("colleges")
      .select("name")
      .eq("id", session.college_id)
      .single();

    const { data: year } = await supabase
      .from("years")
      .select("name")
      .eq("id", session.year_id)
      .single();

    // Store section and move to confirmation
    await supabase
      .from("registration_sessions")
      .update({
        step: REGISTRATION_STEPS.CONFIRMING_MANUAL_DETAILS,
        section_id: selectedSection.id,
        updated_at: new Date().toISOString(),
      })
      .eq("telegram_user_id", telegramUserId);

    await ctx.reply(
      "📋 <b>Please confirm your details:</b>\n\n" +
        `• <b>Roll No:</b> ${session.roll_number}\n` +
        `• <b>Name:</b> ${session.name}\n` +
        `• <b>College:</b> ${college?.name || "N/A"}\n` +
        `• <b>Year:</b> ${year?.name || "N/A"}\n` +
        `• <b>Section:</b> ${selectedSection.name}\n\n` +
        "Is this information correct?\n\n" +
        "Reply <b>YES</b> to submit for admin approval or <b>NO</b> to start over.",
      { parse_mode: "HTML" },
    );
    return;
  }

  // STEP 6 (manual): Confirming Manual Details
  if (session.step === REGISTRATION_STEPS.CONFIRMING_MANUAL_DETAILS) {
    const response = text.trim().toUpperCase();

    if (response === "YES" || response === "Y" || response === "CONFIRM") {
      // Create student record with Pending status
      // Use BigInt string to ensure telegram_user_id is stored correctly
      const { data: newStudent, error: studentError } = await supabase
        .from("students")
        .insert({
          telegram_user_id: telegramUserId,
          telegram_username: session.telegram_username,
          roll_number: session.roll_number,
          name: session.name,
          college_id: session.college_id,
          year_id: session.year_id,
          section_id: session.section_id,
          status: "Pending", // PENDING for manual registration
        })
        .select("id")
        .single();

      if (studentError || !newStudent) {
        console.error("Error creating student:", studentError);
        await ctx.reply(
          "❌ <b>Registration Error</b>\n\n" +
            "Failed to create your registration. Please try again or contact admin.\n\n" +
            `<i>Error: ${studentError?.message || "Unknown error"}</i>`,
          { parse_mode: "HTML" },
        );
        return;
      }

      // Mark session as completed
      await supabase
        .from("registration_sessions")
        .update({
          step: REGISTRATION_STEPS.COMPLETED,
          updated_at: new Date().toISOString(),
        })
        .eq("telegram_user_id", telegramUserId);

      await ctx.reply(
        "📝 <b>Registration Submitted!</b>\n\n" +
          "Your registration has been submitted for admin approval.\n\n" +
          "📋 <b>Your Details:</b>\n" +
          `• Roll No: ${session.roll_number}\n` +
          `• Name: ${session.name}\n\n` +
          "⏳ <b>What's Next?</b>\n" +
          "An administrator will review and approve your registration.\n" +
          "You will be notified once approved.\n\n" +
          "<i>Use /start to check your registration status.</i>",
        { parse_mode: "HTML" },
      );
      return;
    }

    if (response === "NO" || response === "N") {
      // Reset to roll number entry
      await supabase
        .from("registration_sessions")
        .update({
          step: REGISTRATION_STEPS.AWAITING_ROLL_NUMBER,
          roll_number: null,
          roster_id: null,
          name: null,
          college_id: null,
          year_id: null,
          section_id: null,
          attempts: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("telegram_user_id", telegramUserId);

      await ctx.reply(
        "📝 <b>Let's start over</b>\n\n" +
          "Please enter your <b>University Roll Number</b>:\n\n" +
          "<i>Example: 123456</i>",
        { parse_mode: "HTML" },
      );
      return;
    }

    // Invalid response
    await ctx.reply(
      "❓ Please reply with <b>YES</b> to submit or <b>NO</b> to start over.",
      { parse_mode: "HTML" },
    );
  }
}

// Build keyboard from button array
function buildKeyboard(buttons: any[]) {
  const keyboard = new Keyboard();
  let lastRowOrder = -1;

  for (const btn of buttons) {
    if (btn.row_order !== lastRowOrder && lastRowOrder !== -1) {
      keyboard.row();
    }
    keyboard.text(`${btn.icon} ${btn.label}`);
    lastRowOrder = btn.row_order;
  }

  return keyboard.resized();
}

// Handle module actions
async function handleModule(
  ctx: any,
  moduleName: string,
  telegramUserId: number,
) {
  // Get student details
  const { data: student } = await supabase
    .from("students")
    .select(
      "*, college:colleges(name), year:years(name, year_number), section:sections(name)",
    )
    .eq("telegram_user_id", telegramUserId)
    .single();

  if (!student) {
    await ctx.reply("❌ Student not found. Please contact admin.");
    return;
  }

  switch (moduleName) {
    case "schedule":
      await handleSchedule(ctx, student);
      break;

    case "accommodation":
    case "notes":
      await handleAccommodation(ctx, student);
      break;

    case "notices":
      await handleNotices(ctx, student);
      break;

    case "study-materials":
      await handleStudyMaterials(ctx, student);
      break;

    case "events":
      await handleEvents(ctx, student);
      break;

    case "internships":
      await handleInternships(ctx, student);
      break;

    case "societies":
      await handleSocieties(ctx, student);
      break;

    case "support":
      await handleSupport(ctx, student);
      break;

    case "seniors":
    case "seniors-connect":
      await handleSeniors(ctx, student);
      break;

    default:
      await ctx.reply("🚧 This feature is coming soon!");
  }
}

// Module handlers
async function handleNotices(ctx: any, student: any) {
  const { data: allNotices } = await supabase
    .from("notices")
    .select("*")
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false })
    .limit(100);
    
  const notices = allNotices?.filter(n => {
    if (n.target_colleges && n.target_colleges.length > 0) {
      return n.target_colleges.includes(student.college_id);
    }
    return true;
  }).slice(0, 30) || [];

  // Further filter by section
  const filteredNotices =
    notices?.filter((notice: any) => {
      if (!notice.section_id) return true; // No section restriction
      return notice.section_id === student.section_id;
    }) || [];

  if (filteredNotices.length === 0) {
    await ctx.reply("📢 No notices available at the moment.");
    return;
  }

  // Show paginated list with inline keyboard
  const pageSize = 5;
  const totalPages = Math.ceil(filteredNotices.length / pageSize);
  const currentPage = 1;
  const startIdx = 0;
  const pageNotices = filteredNotices.slice(startIdx, startIdx + pageSize);

  let message = "📢 <b>Latest Notices:</b>\n\n";

  pageNotices.forEach((notice: any, idx: number) => {
    const num = startIdx + idx + 1;
    const urgentTag = notice.is_urgent ? "🔴 " : "";
    message += `<b>${num}. ${urgentTag}${notice.title}</b>\n`;
    if (notice.description) {
      message += `   ${notice.description.substring(0, 60)}${notice.description.length > 60 ? "..." : ""}\n`;
    }
    message += "\n";
  });

  if (filteredNotices.length > pageSize) {
    message += `\n📄 Page ${currentPage} of ${totalPages}`;
  }

  // Build inline keyboard for pagination and details
  const keyboard = new InlineKeyboard();

  // Add buttons for each notice to view details
  pageNotices.forEach((notice: any, idx: number) => {
    const num = startIdx + idx + 1;
    keyboard.text(`${num}. View`, `notice_detail_${notice.id}`);
    if ((idx + 1) % 3 === 0) keyboard.row();
  });

  if (pageNotices.length % 3 !== 0) keyboard.row();

  // Add pagination buttons if needed
  if (totalPages > 1) {
    if (currentPage < totalPages) {
      keyboard.text("Next ➡️", `notice_page_2`);
    }
  }

  await ctx.reply(message, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

// Handle notice pagination
async function handleNoticesPage(ctx: any, student: any, page: number) {
  await ctx.answerCallbackQuery();

  const { data: allNotices } = await supabase
    .from("notices")
    .select("*")
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false })
    .limit(100);
    
  const notices = allNotices?.filter(n => {
    if (n.target_colleges && n.target_colleges.length > 0) {
      return n.target_colleges.includes(student.college_id);
    }
    return true;
  }).slice(0, 30) || [];

  const filteredNotices =
    notices?.filter((notice: any) => {
      if (!notice.section_id) return true;
      return notice.section_id === student.section_id;
    }) || [];

  if (filteredNotices.length === 0) {
    await ctx.reply("📢 No notices available at the moment.");
    return;
  }

  const pageSize = 5;
  const totalPages = Math.ceil(filteredNotices.length / pageSize);
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pageNotices = filteredNotices.slice(startIdx, startIdx + pageSize);

  let message = "📢 <b>Latest Notices:</b>\n\n";

  pageNotices.forEach((notice: any, idx: number) => {
    const num = startIdx + idx + 1;
    const urgentTag = notice.is_urgent ? "🔴 " : "";
    message += `<b>${num}. ${urgentTag}${notice.title}</b>\n`;
    if (notice.description) {
      message += `   ${notice.description.substring(0, 60)}${notice.description.length > 60 ? "..." : ""}\n`;
    }
    message += "\n";
  });

  if (filteredNotices.length > pageSize) {
    message += `\n📄 Page ${currentPage} of ${totalPages}`;
  }

  const keyboard = new InlineKeyboard();

  pageNotices.forEach((notice: any, idx: number) => {
    const num = startIdx + idx + 1;
    keyboard.text(`${num}. View`, `notice_detail_${notice.id}`);
    if ((idx + 1) % 3 === 0) keyboard.row();
  });

  if (pageNotices.length % 3 !== 0) keyboard.row();

  // Pagination buttons
  if (totalPages > 1) {
    if (currentPage > 1) {
      keyboard.text("⬅️ Prev", `notice_page_${currentPage - 1}`);
    }
    if (currentPage < totalPages) {
      keyboard.text("Next ➡️", `notice_page_${currentPage + 1}`);
    }
  }

  await ctx.editMessageText(message, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

// Handle notice detail view
async function handleNoticeDetail(ctx: any, student: any, noticeId: string) {
  await ctx.answerCallbackQuery();

  const { data: notice } = await supabase
    .from("notices")
    .select("*")
    .eq("id", noticeId)
    .single();

  if (!notice) {
    await ctx.reply("❌ Notice not found.");
    return;
  }

  let message = notice.is_urgent ? "🔴 <b>URGENT</b>\n\n" : "";
  message += `📢 <b>${notice.title}</b>\n\n`;

  if (notice.description) {
    message += `${notice.description}\n`;
  }

  if (notice.file_url) {
    message += `\n📎 <a href="${notice.file_url}">View Attachment</a>`;
  }

  const keyboard = new InlineKeyboard().text(
    "⬅️ Back to Notices",
    "back_to_notices",
  );

  await ctx.editMessageText(message, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

async function handleEvents(ctx: any, student: any) {
  // Fetch event types
  const { data: eventTypes } = await supabase
    .from("event_types")
    .select("*")
    .order("name", { ascending: true });

  if (!eventTypes || eventTypes.length === 0) {
    await ctx.reply("🎭 No event categories available.");
    return;
  }

  // Build inline keyboard with event type buttons
  const keyboard = new InlineKeyboard();

  // Add "All Events" option first
  keyboard.text("📋 All Upcoming Events", "events_all").row();

  for (let i = 0; i < eventTypes.length; i++) {
    const icon = eventTypes[i].icon || "🎭";
    keyboard.text(
      `${icon} ${eventTypes[i].name}`,
      `events_type_${eventTypes[i].id}`,
    );
    // Add 2 buttons per row
    if (i % 2 === 1 || i === eventTypes.length - 1) {
      keyboard.row();
    }
  }

  await ctx.reply(
    "🎭 <b>Events</b>\n\n" +
      "Select an event category to view upcoming events:",
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    },
  );
}

async function handleInternships(ctx: any, student: any) {
  const { data: internships } = await supabase
    .from("internships")
    .select("*")
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false })
    .limit(20);

  // Filter by target_colleges and target_years
  const filteredInternships =
    internships?.filter((intern: any) => {
      if (intern.target_colleges && intern.target_colleges.length > 0) {
        if (!intern.target_colleges.includes(student.college_id)) return false;
      }
      if (intern.target_years && intern.target_years.length > 0) {
        // Get year_number from student's year_id
        if (student.year_id) {
          // year_number is typically 1, 2, or 3
          const yearNum = student.year?.name ? parseInt(student.year.name) : null;
          if (yearNum && !intern.target_years.includes(yearNum)) return false;
        }
      }
      return true;
    }) || [];

  if (filteredInternships.length === 0) {
    await ctx.reply("💼 No internship opportunities available.");
    return;
  }

  const pageSize = 5;
  const totalPages = Math.ceil(filteredInternships.length / pageSize);
  const currentPage = 1;
  const startIdx = 0;
  const pageInternships = filteredInternships.slice(
    startIdx,
    startIdx + pageSize,
  );

  let message = "💼 <b>Internship Opportunities:</b>\n\n";

  pageInternships.forEach((intern: any, idx: number) => {
    const num = startIdx + idx + 1;
    message += `<b>${num}. ${intern.title}</b>\n`;
    if (intern.info) {
      message += `   ${intern.info.substring(0, 60)}${intern.info.length > 60 ? "..." : ""}\n`;
    }
    message += "\n";
  });

  if (filteredInternships.length > pageSize) {
    message += `\n📄 Page ${currentPage} of ${totalPages}`;
  }

  // Build inline keyboard for pagination and details
  const keyboard = new InlineKeyboard();

  // Add buttons for each internship to view details
  pageInternships.forEach((intern: any, idx: number) => {
    const num = startIdx + idx + 1;
    keyboard.text(`${num}. Details`, `intern_detail_${intern.id}`);
    if ((idx + 1) % 3 === 0) keyboard.row();
  });

  if (pageInternships.length % 3 !== 0) keyboard.row();

  // Add pagination buttons if needed
  if (totalPages > 1) {
    if (currentPage < totalPages) {
      keyboard.text("Next ➡️", `intern_page_2`);
    }
  }

  await ctx.reply(message, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

// Handle internship pagination
async function handleInternshipsPage(ctx: any, student: any, page: number) {
  await ctx.answerCallbackQuery();

  const { data: internships } = await supabase
    .from("internships")
    .select("*")
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);

  const filteredInternships =
    internships?.filter((intern: any) => {
      if (intern.target_colleges && intern.target_colleges.length > 0) {
        if (!intern.target_colleges.includes(student.college_id)) return false;
      }
      if (intern.target_years && intern.target_years.length > 0) {
        const yearNum = student.year?.name ? parseInt(student.year.name) : null;
        if (yearNum && !intern.target_years.includes(yearNum)) return false;
      }
      return true;
    }) || [];

  if (filteredInternships.length === 0) {
    await ctx.reply("💼 No active internship opportunities.");
    return;
  }

  const pageSize = 5;
  const totalPages = Math.ceil(filteredInternships.length / pageSize);
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pageInternships = filteredInternships.slice(
    startIdx,
    startIdx + pageSize,
  );

  let message = "💼 <b>Internship Opportunities:</b>\n\n";

  pageInternships.forEach((intern: any, idx: number) => {
    const num = startIdx + idx + 1;
    message += `<b>${num}. ${intern.title}</b>\n`;
    if (intern.info) {
      message += `   ${intern.info.substring(0, 60)}${intern.info.length > 60 ? "..." : ""}\n`;
    }
    message += "\n";
  });

  if (filteredInternships.length > pageSize) {
    message += `\n📄 Page ${currentPage} of ${totalPages}`;
  }

  const keyboard = new InlineKeyboard();

  pageInternships.forEach((intern: any, idx: number) => {
    const num = startIdx + idx + 1;
    keyboard.text(`${num}. Details`, `intern_detail_${intern.id}`);
    if ((idx + 1) % 3 === 0) keyboard.row();
  });

  if (pageInternships.length % 3 !== 0) keyboard.row();

  if (totalPages > 1) {
    if (currentPage > 1) {
      keyboard.text("⬅️ Prev", `intern_page_${currentPage - 1}`);
    }
    if (currentPage < totalPages) {
      keyboard.text("Next ➡️", `intern_page_${currentPage + 1}`);
    }
  }

  await ctx.editMessageText(message, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

// Handle internship detail view
async function handleInternshipDetail(
  ctx: any,
  student: any,
  internId: string,
) {
  await ctx.answerCallbackQuery();

  const { data: intern } = await supabase
    .from("internships")
    .select("*")
    .eq("id", internId)
    .single();

  if (!intern) {
    await ctx.reply("❌ Internship not found.");
    return;
  }

  let message = `💼 <b>${intern.title}</b>\n\n`;

  if (intern.info) {
    message += `📝 <b>Details:</b>\n${intern.info}\n`;
  }

  if (intern.apply_url) {
    message += `\n🔗 <a href="${intern.apply_url}">Apply Here</a>`;
  }

  if (intern.file_url) {
    message += `\n📎 <a href="${intern.file_url}">View Attachment</a>`;
  }

  const keyboard = new InlineKeyboard().text(
    "⬅️ Back to List",
    "back_to_internships",
  );

  await ctx.editMessageText(message, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

async function handleStudyMaterials(ctx: any, student: any) {
  // Derive student's semesters from their year_number
  // Year 1 → Sem 1,2 | Year 2 → Sem 3,4 | Year 3 → Sem 5,6
  const yearNumber = student.year?.year_number;
  const studentSemesters = yearNumber
    ? [(yearNumber - 1) * 2 + 1, (yearNumber - 1) * 2 + 2]
    : null;

  let query = supabase
    .from("study_materials")
    .select("*")
    .eq("approval_status", "approved")
    .or(`college_id.is.null,college_id.eq.${student.college_id}`)
    .order("created_at", { ascending: false })
    .limit(20);

  // Filter by student's semesters if we know their year
  if (studentSemesters) {
    query = query.in("semester_num", studentSemesters);
  }

  const { data: materials } = await query;

  // Filter by target_colleges if set
  const filteredMaterials = materials
    ?.filter((mat: any) => {
      if (!mat.target_colleges || mat.target_colleges.length === 0) return true;
      return mat.target_colleges.includes(student.college_id);
    })
    ?.slice(0, 5);

  if (!filteredMaterials || filteredMaterials.length === 0) {
    await ctx.reply("📚 No study materials available yet.");
    return;
  }

  let message = "📚 <b>Study Materials:</b>\n\n";
  for (const mat of filteredMaterials) {
    const semesterInfo = mat.semester_num ? ` (Sem ${mat.semester_num})` : "";
    message += `📖 <b>${mat.subject}</b>${semesterInfo}\n`;
    if (mat.topic) {
      message += `   Topic: ${mat.topic}\n`;
    }
    if (mat.file_url) {
      message += `   📎 <a href="${mat.file_url}">Download</a>\n`;
    }
    message += "\n";
  }

  await ctx.reply(message, { parse_mode: "HTML" });
}

async function handleSchedule(ctx: any, student: any) {
  const today = new Date().toISOString().split("T")[0];

  // Try section_id first, then fall back to looking up section from roster
  let sectionId = student.section_id;

  if (!sectionId && student.roster_id) {
    // Try to find section from roster's section_name
    const { data: roster } = await supabase
      .from("student_roster")
      .select("section_name, year_id")
      .eq("id", student.roster_id)
      .single();

    if (roster?.section_name && roster?.year_id) {
      const { data: sectionData } = await supabase
        .from("sections")
        .select("id, semester:semesters!inner(year_id)")
        .eq("name", roster.section_name)
        .eq("semester.year_id", roster.year_id)
        .limit(1)
        .single();

      if (sectionData) {
        sectionId = sectionData.id;
        // Fix the student record for future queries
        await supabase
          .from("students")
          .update({ section_id: sectionId })
          .eq("id", student.id);
      }
    }
  }

  if (!sectionId) {
    await ctx.reply(
      "📅 Unable to find your section. Please contact admin to update your section assignment.",
    );
    return;
  }

  const { data: notes } = await supabase
    .from("schedule_notes")
    .select("*")
    .eq("section_id", sectionId)
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(5);

  if (!notes || notes.length === 0) {
    await ctx.reply("📅 No upcoming schedule notes for your section.");
    return;
  }

  let message = "📅 <b>Upcoming Schedule:</b>\n\n";
  for (const note of notes) {
    message += `📌 <b>${note.date}</b> - ${note.subject}\n`;
    if (note.topic) {
      message += `   Topic: ${note.topic}\n`;
    }
    message += "\n";
  }

  await ctx.reply(message, { parse_mode: "HTML" });
}

async function handleAccommodation(ctx: any, student: any) {
  await ctx.reply(
    "🏠 <b>Accommodation Help</b>\n\n" +
      "Need help with accommodation? Send your query below.\n\n" +
      "📸 You can send a <b>photo</b> or type a <b>message</b> describing your issue.\n\n" +
      "<i>Our team will review and reply to you here in the bot.</i>",
    {
      parse_mode: "HTML",
      reply_markup: {
        force_reply: true,
        selective: true,
        input_field_placeholder: "Describe your accommodation issue...",
      },
    },
  );
}

async function handleSocieties(ctx: any, student: any) {
  // Fetch societies for the student's college
  const { data: societies } = await supabase
    .from("societies")
    .select("*")
    .or(`college_id.is.null,college_id.eq.${student.college_id}`)
    .order("name", { ascending: true });

  if (!societies || societies.length === 0) {
    await ctx.reply("🏢 No societies found.");
    return;
  }

  // Build inline keyboard with society buttons
  const keyboard = new InlineKeyboard();

  for (let i = 0; i < societies.length; i++) {
    keyboard.text(societies[i].name, `society_${societies[i].id}`);
    // Add 2 buttons per row
    if (i % 2 === 1 || i === societies.length - 1) {
      keyboard.row();
    }
  }

  await ctx.reply(
    "🏢 <b>Faculty Societies</b>\n\n" +
      "Select a society to view its details and recent updates:",
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    },
  );
}

async function handleSupport(ctx: any, student: any) {
  await ctx.reply(
    "💬 <b>Message Us / Support</b>\n\n" +
      "Type your message below and we'll forward it to the admin team.\n\n" +
      "📝 <i>Your message will be visible to admins who can reply directly.</i>",
    {
      parse_mode: "HTML",
      reply_markup: {
        force_reply: true,
        selective: true,
        input_field_placeholder: "Type your question or issue here...",
      },
    },
  );
}

async function handleSeniors(ctx: any, student: any) {
  // Fetch community groups
  const { data: groups } = await supabase
    .from("community_groups")
    .select("*")
    .or(`college_id.is.null,college_id.eq.${student.college_id}`)
    .eq("active", true)
    .limit(5);

  let message = "🎓 <b>Seniors Connect</b>\n\n";
  message += "Connect with seniors for guidance on:\n";
  message += "• Internships & Placements\n";
  message += "• Exam Preparation\n";
  message += "• Moot Court Tips\n";
  message += "• Career Advice\n\n";

  if (groups && groups.length > 0) {
    message += "<b>📱 Community Groups:</b>\n";
    for (const group of groups) {
      const icon = group.platform === "telegram" ? "📲" : "💬";
      message += `${icon} <a href="${group.link}">${group.name}</a>\n`;
    }
  } else {
    message += "🔗 Contact the student council for mentorship opportunities.";
  }

  await ctx.reply(message, { parse_mode: "HTML" });
}

// Handle photo messages (for accommodation help)
bot.on("message:photo", async (ctx) => {
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;

  const { data: student } = await supabase
    .from("students")
    .select("id, status")
    .eq("telegram_user_id", telegramUserId)
    .single();

  if (!student || student.status !== "Active") return;

  // Get the largest photo
  const photos = ctx.message.photo;
  const photoFileId = photos[photos.length - 1].file_id;
  const caption = ctx.message.caption || "";

  // Save as accommodation request
  await supabase.from("accommodation_requests").insert({
    student_id: student.id,
    telegram_user_id: telegramUserId,
    message: caption || "Photo sent",
    photo_file_id: photoFileId,
    status: "Open",
  });

  const { data: buttons } = await supabase
    .from("bot_buttons")
    .select("*")
    .eq("active", true)
    .order("row_order", { ascending: true })
    .order("button_order", { ascending: true });

  const keyboard = buildKeyboard(buttons || []);

  await ctx.reply(
    "✅ <b>Photo Received!</b>\n\n" +
      "Your accommodation help request with photo has been sent to our team. " +
      "We will reply to you here in the bot.",
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    },
  );
});

// =====================================================
// CALLBACK QUERY HANDLERS (Inline Button Clicks)
// =====================================================

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const telegramUserId = ctx.from?.id;

  if (!telegramUserId) {
    await ctx.answerCallbackQuery({ text: "Error: User not found" });
    return;
  }

  // Get student details
  const { data: student } = await supabase
    .from("students")
    .select("*, college:colleges(name)")
    .eq("telegram_user_id", telegramUserId)
    .single();

  if (!student || student.status !== "Active") {
    await ctx.answerCallbackQuery({
      text: "Please register first using /start",
    });
    return;
  }

  // Handle society selection
  if (data.startsWith("society_")) {
    const societyId = data.replace("society_", "");
    await handleSocietyDetails(ctx, student, societyId);
    return;
  }

  // Handle event type selection
  if (data === "events_all") {
    await handleAllEvents(ctx, student);
    return;
  }

  if (data.startsWith("events_type_")) {
    const eventTypeId = data.replace("events_type_", "");
    await handleEventsByType(ctx, student, eventTypeId);
    return;
  }

  // Handle internship detail view
  if (data.startsWith("intern_detail_")) {
    const internId = data.replace("intern_detail_", "");
    await handleInternshipDetail(ctx, student, internId);
    return;
  }

  // Handle internship pagination
  if (data.startsWith("intern_page_")) {
    const page = parseInt(data.replace("intern_page_", ""));
    await handleInternshipsPage(ctx, student, page);
    return;
  }

  // Handle back to internships list
  if (data === "back_to_internships") {
    await handleInternshipsPage(ctx, student, 1);
    return;
  }

  // Handle notice detail view
  if (data.startsWith("notice_detail_")) {
    const noticeId = data.replace("notice_detail_", "");
    await handleNoticeDetail(ctx, student, noticeId);
    return;
  }

  // Handle notice pagination
  if (data.startsWith("notice_page_")) {
    const page = parseInt(data.replace("notice_page_", ""));
    await handleNoticesPage(ctx, student, page);
    return;
  }

  // Handle back to notices list
  if (data === "back_to_notices") {
    await handleNoticesPage(ctx, student, 1);
    return;
  }

  await ctx.answerCallbackQuery({ text: "Unknown action" });
});

// Handle society details
async function handleSocietyDetails(ctx: any, student: any, societyId: string) {
  await ctx.answerCallbackQuery();

  // Fetch society details
  const { data: society } = await supabase
    .from("societies")
    .select("*")
    .eq("id", societyId)
    .single();

  if (!society) {
    await ctx.reply("❌ Society not found.");
    return;
  }

  // Fetch recent posts from this society
  const { data: posts } = await supabase
    .from("society_posts")
    .select("*")
    .eq("society_id", societyId)
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false })
    .limit(5);

  let message = `🏢 <b>${society.name}</b>\n\n`;

  if (society.description) {
    message += `${society.description}\n\n`;
  }

  if (posts && posts.length > 0) {
    message += "📢 <b>Recent Updates:</b>\n\n";
    for (const post of posts) {
      message += `📌 <b>${post.title}</b>\n`;
      if (post.description) {
        message += `${post.description.substring(0, 150)}${post.description.length > 150 ? "..." : ""}\n`;
      }
      if (post.file_url) {
        message += `📎 <a href="${post.file_url}">View Attachment</a>\n`;
      }
      message += "\n";
    }
  } else {
    message += "📭 <i>No recent updates from this society.</i>\n";
  }

  // Add back button
  const keyboard = new InlineKeyboard().text(
    "⬅️ Back to Societies",
    "back_to_societies",
  );

  await ctx.reply(message, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

// Handle all events
async function handleAllEvents(ctx: any, student: any) {
  await ctx.answerCallbackQuery();

  const { data: events } = await supabase
    .from("events")
    .select("*, event_type:event_types(name, icon)")
    .eq("approval_status", "approved")
    .or(`college_id.is.null,college_id.eq.${student.college_id}`)
    .gte("event_date", new Date().toISOString().split("T")[0])
    .order("event_date", { ascending: true })
    .limit(10);

  if (!events || events.length === 0) {
    await ctx.reply("📭 No upcoming events at the moment.");
    return;
  }

  let message = "📋 <b>All Upcoming Events:</b>\n\n";
  for (const event of events) {
    const icon = event.event_type?.icon || "🎭";
    message += `${icon} <b>${event.title}</b>\n`;
    message += `📅 ${event.event_date}`;
    if (event.event_time) {
      message += ` at ${event.event_time}`;
    }
    message += "\n";
    if (event.location) {
      message += `📍 ${event.location}\n`;
    }
    if (event.description) {
      message += `${event.description.substring(0, 100)}${event.description.length > 100 ? "..." : ""}\n`;
    }
    if (event.file_url) {
      message += `🔗 <a href="${event.file_url}">Apply / View Details</a>\n`;
    }
    message += "\n";
  }

  // Add back button
  const allEventsKeyboard = new InlineKeyboard().text(
    "⬅️ Back to Categories",
    "back_to_events",
  );

  await ctx.reply(message, {
    parse_mode: "HTML",
    reply_markup: allEventsKeyboard,
  });
}

// Handle events by type
async function handleEventsByType(ctx: any, student: any, eventTypeId: string) {
  await ctx.answerCallbackQuery();

  // Fetch event type info
  const { data: eventType } = await supabase
    .from("event_types")
    .select("*")
    .eq("id", eventTypeId)
    .single();

  const { data: events } = await supabase
    .from("events")
    .select("*, event_type:event_types(name, icon)")
    .eq("event_type_id", eventTypeId)
    .eq("approval_status", "approved")
    .or(`college_id.is.null,college_id.eq.${student.college_id}`)
    .gte("event_date", new Date().toISOString().split("T")[0])
    .order("event_date", { ascending: true })
    .limit(10);

  const icon = eventType?.icon || "🎭";
  const typeName = eventType?.name || "Events";

  if (!events || events.length === 0) {
    const keyboard = new InlineKeyboard().text(
      "⬅️ Back to Categories",
      "back_to_events",
    );

    await ctx.reply(
      `${icon} <b>${typeName}</b>\n\n📭 No upcoming events in this category.`,
      { parse_mode: "HTML", reply_markup: keyboard },
    );
    return;
  }

  let message = `${icon} <b>${typeName}</b>\n\n`;
  for (const event of events) {
    message += `📌 <b>${event.title}</b>\n`;
    message += `📅 ${event.event_date}`;
    if (event.event_time) {
      message += ` at ${event.event_time}`;
    }
    message += "\n";
    if (event.location) {
      message += `📍 ${event.location}\n`;
    }
    if (event.description) {
      message += `${event.description.substring(0, 100)}${event.description.length > 100 ? "..." : ""}\n`;
    }
    if (event.file_url) {
      message += `🔗 <a href="${event.file_url}">Apply / View Details</a>\n`;
    }
    message += "\n";
  }

  // Add back button
  const keyboard = new InlineKeyboard().text(
    "⬅️ Back to Categories",
    "back_to_events",
  );

  await ctx.reply(message, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

// Handle back navigation
bot.callbackQuery("back_to_societies", async (ctx) => {
  await ctx.answerCallbackQuery();
  const telegramUserId = ctx.from?.id;

  const { data: student } = await supabase
    .from("students")
    .select("*, college:colleges(name)")
    .eq("telegram_user_id", telegramUserId)
    .single();

  if (student) {
    await handleSocieties(ctx, student);
  }
});

bot.callbackQuery("back_to_events", async (ctx) => {
  await ctx.answerCallbackQuery();
  const telegramUserId = ctx.from?.id;

  const { data: student } = await supabase
    .from("students")
    .select("*, college:colleges(name)")
    .eq("telegram_user_id", telegramUserId)
    .single();

  if (student) {
    await handleEvents(ctx, student);
  }
});

// Global error handler - gracefully handle errors like "chat not found"
bot.catch((err) => {
  const ctx = err.ctx;
  const e = err.error;

  if (
    e instanceof GrammyError &&
    e.error_code === 400 &&
    e.description.includes("chat not found")
  ) {
    // User hasn't started a conversation with this bot yet
    console.warn(
      `Chat not found for user ${ctx.from?.id} (@${ctx.from?.username}). ` +
        "They need to send /start to the new bot.",
    );
    return;
  }

  // Log all other errors
  console.error("Bot error:", e);
});

// Serve the webhook
const secretToken = Deno.env.get("TELEGRAM_SECRET_TOKEN");
Deno.serve(webhookCallback(bot, "std/http", { secretToken }));
