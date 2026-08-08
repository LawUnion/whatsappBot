import { supabase, sendWhatsAppMessage, buildWhatsAppMenu, buildWhatsAppQuickReplies } from "../utils.ts";

// Show Main Menu using WhatsApp Interactive List
export async function showMainMenu(fromPhone: string, student: any) {
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
export async function handleModuleClick(fromPhone: string, student: any, button: any) {
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
        const { data: allNotices } = await supabase
          .from("notices")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);
          
        const notices = allNotices?.filter(n => {
          if (n.target_colleges && n.target_colleges.length > 0) {
            return n.target_colleges.includes(student.college_id);
          }
          return true;
        }).slice(0, 5) || [];

        if (notices.length === 0) {
          await sendWhatsAppMessage(
            fromPhone,
            "",
            buildWhatsAppQuickReplies(`📢 *Notices*\n\nNo recent notices found for your college.`)
          );
          return;
        }

        const noticeText = notices
          .map((n) => `📌 *${n.title}*\n📅 ${new Date(n.created_at).toLocaleDateString()}\n${n.description ? n.description : "No additional description."}\n`)
          .join("\n---\n\n");

        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`📢 *Latest Notices*\n\n${noticeText}`)
        );
        break;
      }

      case "events": {
        const { data: allEvents } = await supabase
          .from("events")
          .select("*, event_type:event_types(name, icon)")
          .gte("event_date", new Date().toISOString())
          .order("event_date", { ascending: true })
          .limit(20);

        const events = allEvents?.filter(e => {
          if (e.target_colleges && e.target_colleges.length > 0) {
            return e.target_colleges.includes(student.college_id);
          }
          return true;
        }).slice(0, 5) || [];

        if (events.length === 0) {
          await sendWhatsAppMessage(
            fromPhone,
            "",
            buildWhatsAppQuickReplies(`🎉 *Events*\n\nNo upcoming events scheduled right now.`)
          );
          return;
        }

        const eventText = events
          .map((e) => `🗓️ *${e.title}* (${e.event_type?.name || "Event"})\n📍 Location: ${e.location || "TBA"}\n📅 Date: ${new Date(e.event_date).toLocaleDateString()}\n${e.description ? `📝 ${e.description}\n` : ""}`)
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
          .eq("section_id", student.section_id || 0)
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
          .map((t) => `📅 *${t.title}*\n${t.notes ? `📝 ${t.notes}\n` : ""}🔗 View Timetable: ${t.file_url || "Contact Admin"}`)
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
        const { data: allMaterials } = await supabase
          .from("study_materials")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);
          
        const materials = allMaterials?.filter(m => {
          if (m.target_colleges && m.target_colleges.length > 0) {
            return m.target_colleges.includes(student.college_id);
          }
          return true;
        }).slice(0, 5) || [];

        if (materials.length === 0) {
          await sendWhatsAppMessage(
            fromPhone,
            "",
            buildWhatsAppQuickReplies(`📚 *Study Materials*\n\nNo study materials uploaded yet.`)
          );
          return;
        }

        const matText = materials
          .map((m) => `📖 *${m.topic || m.subject}* (${m.subject || "General"})\n${m.description ? `📝 ${m.description}\n` : ""}🔗 Download: ${m.file_url || "N/A"}`)
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

        const socText = societies.map((s) => `• *${s.name}*${s.description ? `\n  ${s.description}` : ""}`).join("\n\n");
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
          .map((i) => `💼 *${i.title || "Internship Opportunity"}*\n🏢 Info: ${i.info ? i.info.substring(0, 100) + "..." : "No additional details"}\n🔗 Apply: ${i.apply_url || i.file_url || "Check portal"}`)
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
