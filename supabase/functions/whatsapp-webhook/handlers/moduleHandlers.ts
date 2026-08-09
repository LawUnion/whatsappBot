import { supabase, sendWhatsAppMessage, sendWhatsAppMedia, buildWhatsAppMenu, buildWhatsAppQuickReplies } from "../utils.ts";

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

        await sendWhatsAppMessage(fromPhone, `📢 *Latest Notices*`);
        
        for (const n of notices) {
          const text = `📌 *${n.title}*\n📅 ${new Date(n.created_at).toLocaleDateString()}\n\n${n.description ? n.description : ""}`;
          await sendWhatsAppMessage(fromPhone, text.trim());
        }

        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`Check out the notices above. What would you like to do next?`)
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

        await sendWhatsAppMessage(fromPhone, `🎉 *Upcoming Events*`);
        
        for (const e of events) {
          const text = `🗓️ *${e.title}* (${e.event_type?.name || "Event"})\n📍 Location: ${e.location || "TBA"}\n📅 Date: ${new Date(e.event_date).toLocaleDateString()}\n\n${e.description ? `${e.description}` : ""}`;
          await sendWhatsAppMessage(fromPhone, text.trim());
        }

        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`What would you like to do next?`)
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

        await sendWhatsAppMessage(fromPhone, `⏰ *Class Timetables*`);
        
        for (const t of timetables) {
          const text = `📅 *${t.title}*\n\n${t.notes ? `${t.notes}` : ""}`.trim();
          
          if (t.file_url) {
            await sendWhatsAppMedia(fromPhone, t.file_url, text);
            // Add a delay so the media message delivers before the next text message
            await new Promise((resolve) => setTimeout(resolve, 2500));
          } else {
            await sendWhatsAppMessage(fromPhone, text);
          }
        }

        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`What would you like to do next?`)
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

        await sendWhatsAppMessage(fromPhone, `📚 *Study Materials & Notes*`);
        
        for (const m of materials) {
          const text = `📖 *${m.topic || m.subject}* (${m.subject || "General"})\n\n${m.description ? `${m.description}` : ""}`.trim();
          
          if (m.file_url) {
            await sendWhatsAppMedia(fromPhone, m.file_url, text);
            await new Promise((resolve) => setTimeout(resolve, 2500));
          } else {
            await sendWhatsAppMessage(fromPhone, text);
          }
        }

        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`What would you like to do next?`)
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

        await sendWhatsAppMessage(fromPhone, `💼 *Latest Internships*`);
        
        for (const i of internships) {
          const text = `💼 *${i.title || "Internship Opportunity"}*\n🏢 Info: ${i.info ? i.info : "No additional details"}${i.apply_url ? `\n🔗 Apply: ${i.apply_url}` : ""}`;
          
          if (i.file_url) {
            await sendWhatsAppMedia(fromPhone, i.file_url, text.trim());
            await new Promise((resolve) => setTimeout(resolve, 2500));
          } else {
            await sendWhatsAppMessage(fromPhone, text.trim());
          }
        }

        await sendWhatsAppMessage(
          fromPhone,
          "",
          buildWhatsAppQuickReplies(`What would you like to do next?`)
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
