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
      `👋 *Welcome to Court Kachahri Bot!*\n\nTo access the bot, you need to verify your identity.\n\n📝 Please enter your *Form Number*:\n\n_Example: DUPG0000187_`,
      [{ id: "reset", title: "🔄 Reset / Restart" }]
    )
  );
}

export async function startProfileCompletion(fromPhone: string, student: any, customIntro?: string) {
  // Determine what's missing
  let nextStep = "awaiting_profile_college";
  let promptText = customIntro || `👋 *Profile Incomplete*\n\nWelcome back! Before you can continue, we need to update your profile details.`;

  if (!student.college_id) {
    nextStep = "awaiting_profile_college";
    const { data: colleges } = await supabase.from("colleges").select("*").order("id");
    const collegeList = colleges?.map((c) => `• ${c.code}: ${c.name}`).join("\n") || "• LC-1\n• LC-2\n• CLC";
    promptText += `\n\n📝 First, please enter the code of your college:\n\n${collegeList}\n\n_Type LC-1, LC-2, or CLC_`;
  } else if (!student.semester_id) {
    nextStep = "awaiting_profile_semester";
    promptText += `\n\n📝 Please enter your current *Semester* (Type a number from 1 to 6):`;
  } else if (!student.section_id) {
    nextStep = "awaiting_profile_section";
    promptText += `\n\n📝 Please enter your current *Section* (Example: A, B, C...):`;
  }

  // Create or update a session
  await supabase.from("registration_sessions").upsert(
    {
      whatsapp_id: fromPhone,
      telegram_first_name: student.name || student.whatsapp_name,
      step: nextStep,
      platform: "whatsapp",
      attempts: 0,
      updated_at: new Date().toISOString(),
      college_id: student.college_id,
      year_id: student.year_id,
      semester_id: student.semester_id,
      section_id: student.section_id,
    },
    { onConflict: "whatsapp_id" }
  );

  await sendWhatsAppMessage(
    fromPhone,
    "",
    buildWhatsAppQuickReplies(promptText)
  );
}

// Handles Registration Flow for new students or users in a registration session
export async function handleRegistrationFlow(fromPhone: string, contactName: string, text: string, textLower: string, existingSession?: any) {
  // Check if they want to reset or start
  if (textLower === "/start" || textLower === "start" || textLower === "hi" || textLower === "hello" || textLower === "hey" || textLower === "/reset" || textLower === "reset") {
    await resetAndStartRegistration(fromPhone, contactName);
    return;
  }

  // Use passed session if available, otherwise fetch
  let session = existingSession;
  if (!session) {
    const { data: fetchedSession } = await supabase
      .from("registration_sessions")
      .select("*")
      .eq("whatsapp_id", fromPhone)
      .maybeSingle();
    session = fetchedSession;
  }

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
      if (!newStudent.college_id || !newStudent.semester_id || !newStudent.section_id) {
        const customIntro = `🎉 *Registration Successful!*\n\nWelcome to Court Kachahri Bot, *${rosterEntry.name}*!\n\nTo serve you better and provide accurate timetables and materials, we need to quickly update your profile.`;
        await startProfileCompletion(fromPhone, newStudent, customIntro);
      } else {
        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(
            `🎉 *Registration Successful!*\n\nWelcome to Court Kachahri Bot, *${rosterEntry.name}*!\nYour account is active.`,
            [{ id: "menu", title: "📋 Main Menu" }]
          )
        );
        await showMainMenu(fromPhone, newStudent);
      }
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
      .update({ step: "awaiting_semester", college_id: college.id })
      .eq("id", session.id);

    await sendWhatsAppMessage(
      fromPhone,
      "",
      buildWhatsAppQuickReplies(
        `Selected: *${college.name}*\n\nNow, enter your *Semester* (Type a number from 1 to 6):`,
        [{ id: "reset", title: "🔄 Reset / Restart" }]
      )
    );
    return;
  }

  if (session && session.step === "awaiting_semester") {
    const semNumber = parseInt(text.trim());
    if (isNaN(semNumber) || semNumber < 1 || semNumber > 6) {
      await sendWhatsAppMessage(
        fromPhone,
        "",
        buildWhatsAppQuickReplies(`❌ Invalid semester. Please type a number between 1 and 6:`, [{ id: "reset", title: "🔄 Reset / Restart" }])
      );
      return;
    }

    // Map semester to year (1,2 -> year 1; 3,4 -> year 2; 5,6 -> year 3)
    const yearNumber = Math.ceil(semNumber / 2);

    const { data: yearObj } = await supabase
      .from("years")
      .select("*")
      .eq("college_id", session.college_id)
      .eq("year_number", yearNumber)
      .maybeSingle();
      
    // Find semester obj
    const { data: semObj } = await supabase
      .from("semesters")
      .select("*")
      .eq("year_id", yearObj?.id)
      .eq("semester_number", semNumber)
      .maybeSingle();

    const { error: updateError } = await supabase
      .from("registration_sessions")
      .update({ 
        step: "awaiting_section", 
        year_id: yearObj?.id || null,
        semester_id: semObj?.id || null 
      })
      .eq("id", session.id);

    if (updateError) {
      console.error("Failed to update session:", updateError);
      await sendWhatsAppMessage(fromPhone, "", buildWhatsAppQuickReplies(`❌ Internal Error: ${updateError.message}. Did you run the database migration?`));
      return;
    }

    await sendWhatsAppMessage(
      fromPhone,
      "",
      buildWhatsAppQuickReplies(`Semester ${semNumber} selected (mapped to Year ${yearNumber}).\n\nNow, enter your *Section* (Example: A, B, C...):`, [{ id: "reset", title: "🔄 Reset / Restart" }])
    );
    return;
  }

  if (session && session.step === "awaiting_section") {
    const sectionName = text.trim().toUpperCase();
    
    let { data: sectionObj } = await supabase
      .from("sections")
      .select("id")
      .eq("semester_id", session.semester_id)
      .eq("name", sectionName)
      .maybeSingle();

    if (!sectionObj && sectionName.length <= 5) {
      // Auto-create missing section to support flexible section names
      const { data: newSection } = await supabase
        .from("sections")
        .insert({ semester_id: session.semester_id, name: sectionName })
        .select("id")
        .maybeSingle();
      if (newSection) sectionObj = newSection;
    }

    if (!sectionObj) {
      await sendWhatsAppMessage(fromPhone, "", buildWhatsAppQuickReplies(`❌ Invalid section. Please enter a valid Section for this semester (Example: A, B, C...):`));
      return;
    }

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
        section_id: sectionObj?.id || null,
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

  // --- Profile Completion Flow ---

  if (session && session.step === "awaiting_profile_college") {
    const codeEntered = text.trim().toUpperCase();
    const { data: college } = await supabase.from("colleges").select("*").eq("code", codeEntered).maybeSingle();

    if (!college) {
      await sendWhatsAppMessage(fromPhone, "", buildWhatsAppQuickReplies(`❌ Invalid college code. Please type exactly *LC-1*, *LC-2*, or *CLC*:`));
      return;
    }

    await supabase.from("registration_sessions").update({ step: "awaiting_profile_semester", college_id: college.id }).eq("id", session.id);
    await sendWhatsAppMessage(fromPhone, "", buildWhatsAppQuickReplies(`Selected: *${college.name}*\n\nNow, enter your current *Semester* (Type a number from 1 to 6):`));
    return;
  }

  if (session && session.step === "awaiting_profile_semester") {
    const semNumber = parseInt(text.trim());
    if (isNaN(semNumber) || semNumber < 1 || semNumber > 6) {
      await sendWhatsAppMessage(fromPhone, "", buildWhatsAppQuickReplies(`❌ Invalid semester. Please type a number between 1 and 6:`));
      return;
    }

    const yearNumber = Math.ceil(semNumber / 2);
    const { data: yearObj } = await supabase.from("years").select("*").eq("college_id", session.college_id).eq("year_number", yearNumber).maybeSingle();
    const { data: semObj } = await supabase.from("semesters").select("*").eq("year_id", yearObj?.id).eq("semester_number", semNumber).maybeSingle();

    const { error: updateError } = await supabase.from("registration_sessions").update({ step: "awaiting_profile_section", year_id: yearObj?.id || null, semester_id: semObj?.id || null }).eq("id", session.id);
    
    if (updateError) {
      console.error("Failed to update session:", updateError);
      await sendWhatsAppMessage(fromPhone, "", buildWhatsAppQuickReplies(`❌ Internal Error: ${updateError.message}. Did you run the database migration?`));
      return;
    }

    await sendWhatsAppMessage(fromPhone, "", buildWhatsAppQuickReplies(`Semester ${semNumber} selected.\n\nFinally, enter your current *Section* (Example: A, B, C...):`));
    return;
  }

  if (session && session.step === "awaiting_profile_section") {
    const sectionName = text.trim().toUpperCase();
    
    let { data: sectionObj } = await supabase
      .from("sections")
      .select("id")
      .eq("semester_id", session.semester_id)
      .eq("name", sectionName)
      .maybeSingle();

    if (!sectionObj && sectionName.length <= 5) {
      // Auto-create missing section to support flexible section names
      const { data: newSection } = await supabase
        .from("sections")
        .insert({ semester_id: session.semester_id, name: sectionName })
        .select("id")
        .maybeSingle();
      if (newSection) sectionObj = newSection;
    }

    if (!sectionObj) {
      await sendWhatsAppMessage(fromPhone, "", buildWhatsAppQuickReplies(`❌ Invalid section. Please enter a valid Section for this semester (Example: A, B, C...):`));
      return;
    }

    // Update the actual student record
    const { data: studentRecord } = await supabase.from("students").select("id").eq("whatsapp_id", fromPhone).maybeSingle();
    
    if (studentRecord) {
      await supabase.from("students").update({
        college_id: session.college_id,
        year_id: typeof session.year_id === "number" ? session.year_id : null,
        semester_id: session.semester_id,
        section_id: sectionObj?.id || null,
      }).eq("id", studentRecord.id);
    }

    await supabase.from("registration_sessions").delete().eq("id", session.id);

    await sendWhatsAppMessage(
      fromPhone,
      "",
      buildWhatsAppQuickReplies(
        `✅ *Profile Updated Successfully!*\n\nThank you for completing your profile. You now have full access to the bot.`,
        [{ id: "menu", title: "📋 Main Menu" }]
      )
    );
    
    // Auto-show main menu after profile update
    const updatedStudent = { ...studentRecord, college_id: session.college_id, section_id: sectionObj?.id };
    await showMainMenu(fromPhone, updatedStudent);
    return;
  }

  // Fallback for unregistered users not in active session
  await sendWhatsAppMessage(
    fromPhone,
    "",
    buildWhatsAppQuickReplies(`❓ You are not registered yet.\n\nTap the button below or type /start to begin verification with your University Roll Number.`, [{ id: "reset", title: "🚀 Start Verification" }])
  );
}
