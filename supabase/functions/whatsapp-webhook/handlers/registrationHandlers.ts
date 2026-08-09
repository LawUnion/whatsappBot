import { supabase, sendWhatsAppMessage, buildWhatsAppQuickReplies, BOT_ADMIN_CONTACT } from "../utils.ts";
import { showMainMenu } from "./moduleHandlers.ts";

// Helper to reset and restart registration anytime
export async function resetAndStartRegistration(fromPhone: string, contactName: string) {
  // Check if existing student and unclaim roster if any
  const { data: existing } = await supabase.from("students").select("id, roster_id").eq("whatsapp_id", fromPhone).maybeSingle();
  if (existing) {
    if (existing.roster_id) {
      await supabase.from("student_roster").update({ is_claimed: false, claimed_by: null, claimed_at: null }).eq("id", existing.roster_id);
    }
    await supabase.from("students").delete().eq("whatsapp_id", fromPhone);
  }

  // Upsert registration session to awaiting_form_number
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

// Handles Registration Flow for new students or users in a registration session
export async function handleRegistrationFlow(fromPhone: string, contactName: string, text: string, textLower: string) {
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
    let final_section_id = rosterEntry.section_id;

    if (!final_section_id && rosterEntry.section_name && rosterEntry.year_id) {
      // Find the correct section_id by matching section_name and year_id
      const { data: matchedSection } = await supabase
        .from("sections")
        .select("id, semesters!inner(year_id)")
        .eq("name", rosterEntry.section_name.toUpperCase())
        .eq("semesters.year_id", rosterEntry.year_id)
        .maybeSingle();

      if (matchedSection) {
        final_section_id = matchedSection.id;
        
        // Also optionally update the roster to cache the section_id for the future
        await supabase
          .from("student_roster")
          .update({ section_id: final_section_id })
          .eq("id", rosterEntry.id);
      }
    }

    const { data: newStudent, error: createError } = await supabase
      .from("students")
      .insert({
        whatsapp_id: fromPhone,
        whatsapp_name: contactName,
        form_number: session.form_number,
        roll_number: rosterEntry.roll_number,
        name: rosterEntry.name, // Using actual db column 'name' instead of 'student_name'
        college_id: rosterEntry.college_id,
        section_id: final_section_id,
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
        phone: fromPhone,
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
