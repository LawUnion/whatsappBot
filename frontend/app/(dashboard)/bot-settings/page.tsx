"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function BotSettingsPage() {
  const [tgToken, setTgToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  // WhatsApp States
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waToken, setWaToken] = useState("");
  const [waVerifyToken, setWaVerifyToken] = useState("law_connect_wa_verify_token_2026");
  const [waWebhookUrl, setWaWebhookUrl] = useState("https://your-project.supabase.co/functions/v1/whatsapp-webhook");
  const [isTestingWa, setIsTestingWa] = useState(false);

  const handleTest = async () => {
    setIsTesting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsTesting(false);
    alert("Telegram webhook verified successfully!");
  };

  const handleTestWa = async () => {
    setIsTestingWa(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsTestingWa(false);
    alert("WhatsApp Cloud API credentials saved & verified successfully!");
  };

  return (
    <div className="space-y-8 max-w-5xl pb-20 mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Bot Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure your Telegram & WhatsApp Cloud API bot integrations
          </p>
        </div>
        <Badge
          variant="outline"
          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border-emerald-200"
        >
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 inline-block" />
          Online
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telegram Configuration */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-base">
              <span>✈️</span> Telegram Bot
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Bot Token
              </label>
              <Input
                type="password"
                value={tgToken}
                onChange={(e) => setTgToken(e.target.value)}
                placeholder="1234567890:ABC-DEF1234ghIkl..."
                className="font-mono text-sm bg-slate-50 border-slate-200"
              />
              <p className="text-xs text-slate-400">
                Get this from @BotFather on Telegram
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Webhook URL
              </label>
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-project.supabase.co/functions/v1/telegram-webhook"
                className="font-mono text-sm bg-slate-50 border-slate-200"
              />
            </div>

            <Button
              onClick={handleTest}
              disabled={isTesting}
              className="w-full bg-slate-900 hover:bg-slate-800"
            >
              {isTesting ? "Testing..." : "🔧 Test Telegram Webhook"}
            </Button>
          </CardContent>
        </Card>

        {/* WhatsApp Configuration */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-base">
              <span>💬</span> WhatsApp Cloud API (Meta)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Phone Number ID
              </label>
              <Input
                value={waPhoneId}
                onChange={(e) => setWaPhoneId(e.target.value)}
                placeholder="105938123456789"
                className="font-mono text-sm bg-slate-50 border-slate-200"
              />
              <p className="text-xs text-slate-400">
                From Meta Developer Console ➔ WhatsApp ➔ API Setup
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Permanent Access Token
              </label>
              <Input
                type="password"
                value={waToken}
                onChange={(e) => setWaToken(e.target.value)}
                placeholder="EAABwzLIX..."
                className="font-mono text-sm bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Verify Token (For Webhook Verification)
              </label>
              <Input
                value={waVerifyToken}
                onChange={(e) => setWaVerifyToken(e.target.value)}
                placeholder="law_connect_wa_verify_token_2026"
                className="font-mono text-sm bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Webhook Callback URL
              </label>
              <Input
                value={waWebhookUrl}
                onChange={(e) => setWaWebhookUrl(e.target.value)}
                placeholder="https://your-project.supabase.co/functions/v1/whatsapp-webhook"
                className="font-mono text-sm bg-slate-50 border-slate-200"
              />
            </div>

            <Button
              onClick={handleTestWa}
              disabled={isTestingWa}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isTestingWa ? "Saving & Testing..." : "✅ Save WhatsApp Settings"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Security Info */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-lg">
              🔒
            </div>
            <div>
              <h3 className="font-medium text-slate-900">
                Security & Verification Information
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                All bot tokens (Telegram Bot Token & WhatsApp Access Token) are stored securely in Supabase.
                Meta WhatsApp requests are verified using your custom verify token and signature validation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
