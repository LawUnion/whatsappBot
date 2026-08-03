'use client';

import { Card, CardContent } from '@/components/ui/card';

export default function AdminMonitorPage() {
  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Admin Monitor</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor admin activities and performance</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            🔍
          </div>
          <h4 className="text-lg font-semibold text-slate-700">Coming Soon</h4>
          <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
            Admin monitoring dashboard will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
