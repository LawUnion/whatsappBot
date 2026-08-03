import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminRole } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user's admin info
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: admin } = await supabase
    .from("admins")
    .select("*, college:colleges(*)")
    .eq("id", user?.id)
    .single();

  // Fetch stats based on role
  const isSuperAdmin = admin?.role === AdminRole.SUPER_ADMIN;

  // Get counts
  const [
    { count: studentCount },
    { count: noticeCount },
    { count: eventCount },
    { count: internshipCount },
    { count: adminCount },
    { count: broadcastCount },
  ] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("notices").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("internships").select("*", { count: "exact", head: true }),
    supabase
      .from("admins")
      .select("*", { count: "exact", head: true })
      .eq("active", true),
    supabase.from("broadcasts").select("*", { count: "exact", head: true }),
  ]);

  // Fetch recent activity
  const { data: recentActivity } = await supabase
    .from("activity_logs")
    .select("*, admin:admins(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch college data
  const { data: colleges } = await supabase.from("colleges").select("*");

  const stats = isSuperAdmin
    ? [
        {
          title: "Total Students",
          value: studentCount || 0,
          icon: "👥",
          color: "indigo",
        },
        {
          title: "Active Admins",
          value: adminCount || 0,
          icon: "🔑",
          color: "emerald",
        },
        {
          title: "Broadcasts Sent",
          value: broadcastCount || 0,
          icon: "📢",
          color: "amber",
        },
        {
          title: "Internships",
          value: internshipCount || 0,
          icon: "💼",
          color: "rose",
        },
      ]
    : [
        {
          title: "Students in Scope",
          value: studentCount || 0,
          icon: "👥",
          color: "indigo",
        },
        {
          title: "Active Notices",
          value: noticeCount || 0,
          icon: "📌",
          color: "emerald",
        },
        {
          title: "Upcoming Events",
          value: eventCount || 0,
          icon: "🎭",
          color: "amber",
        },
        {
          title: "Internships",
          value: internshipCount || 0,
          icon: "💼",
          color: "rose",
        },
      ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            {isSuperAdmin ? "🏛️ Master Dashboard" : "Dashboard"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isSuperAdmin
              ? "Complete oversight of Faculty of Law operations"
              : "Overview of your scope"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {admin?.college?.name || "All Colleges"}
          </span>
          <Badge
            variant="outline"
            className="font-normal bg-white text-slate-600 border-slate-200"
          >
            {admin?.role?.replace(/_/g, " ") || "Admin"}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="bg-white border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-shadow"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-500 text-sm font-medium">
                  {stat.title}
                </span>
                <span className="text-slate-400 text-lg opacity-50">
                  {stat.icon}
                </span>
              </div>
              <p className="text-3xl font-semibold text-slate-900 tracking-tight">
                {stat.value.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Super Admin Only: Critical Monitor */}
      {isSuperAdmin && (
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-slate-900 text-white">
          <CardHeader className="pb-4 border-b border-slate-700/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Critical Monitor
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Bot Status */}
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <p className="text-sm font-medium">Bot Status</p>
                    <p className="text-xs text-slate-400">Telegram Webhook</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                  <span className="text-sm font-semibold text-emerald-400">
                    Online
                  </span>
                </div>
              </div>

              {/* Storage */}
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">💾</span>
                  <div>
                    <p className="text-sm font-medium">Storage Used</p>
                    <p className="text-xs text-slate-400">Supabase Storage</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">1.2 GB / 5 GB</span>
                    <span className="text-emerald-400">24%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full w-[24%] bg-emerald-400 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Active Users */}
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">👥</span>
                  <div>
                    <p className="text-sm font-medium">Active Today</p>
                    <p className="text-xs text-slate-400">Bot interactions</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-indigo-400">142</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-semibold text-slate-900">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentActivity && recentActivity.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 flex items-center gap-3 hover:bg-slate-50/50 transition-colors"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        log.module === "Broadcast"
                          ? "bg-amber-400"
                          : log.module === "Notices"
                            ? "bg-indigo-400"
                            : log.module === "Events"
                              ? "bg-emerald-400"
                              : "bg-slate-300"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {log.action}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {log.admin?.name || "System"} •{" "}
                        {new Date(log.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs text-slate-500 font-normal border-slate-200 bg-white"
                    >
                      {log.module}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-12">
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>

        {/* Faculty Structure */}
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-semibold text-slate-900">
              Faculty Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {(colleges || []).map((college) => (
                <div
                  key={college.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge className="bg-slate-900 text-white hover:bg-slate-800 text-[10px] h-5 px-1.5 rounded">
                      {college.code}
                    </Badge>
                    <p className="text-sm font-medium text-slate-900">
                      {college.name}
                    </p>
                  </div>
                </div>
              ))}
              {(!colleges || colleges.length === 0) && (
                <p className="text-sm text-slate-500 text-center py-8">
                  No colleges configured
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
