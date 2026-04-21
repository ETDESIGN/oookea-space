"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Bell, Palette, Globe, Save, Check, Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useTheme } from "@/lib/theme";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({
    invoiceEmail: true,
    messageEmail: true,
    projectUpdate: false,
  });

  const profile = useQuery(
    api.projects.getUserById,
    user?.id ? { id: user.id as Id<"users"> } : "skip"
  );

  const [name, setName] = useState(profile?.name ?? user?.name ?? "");
  const email = profile?.email ?? user?.email ?? "";

  // Sync name when profile loads
  if (profile && name !== profile.name && !saved) {
    setName(profile.name);
  }

  if (profile === undefined && user?.id) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#6366F1]" />
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isDark = theme === "dark";

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Settings</h1>
            <p className="mt-1 text-[#64748B]">Manage your account preferences.</p>
          </div>

          {/* Profile */}
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-[#6366F1]" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-[#E2E8F0]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="border-[#E2E8F0] bg-[#F8FAFC] text-[#94A3B8]"
                />
                <p className="text-xs text-[#94A3B8]">Contact your account manager to change your email.</p>
              </div>
            </CardContent>
          </Card>

          {/* Password */}
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-[#6366F1]" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  className="border-[#E2E8F0]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  className="border-[#E2E8F0]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  className="border-[#E2E8F0]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-[#6366F1]" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">Invoice emails</p>
                  <p className="text-xs text-[#64748B]">Get notified when a new invoice is sent</p>
                </div>
                <Checkbox
                  checked={notifications.invoiceEmail}
                  onCheckedChange={(c) => setNotifications({ ...notifications, invoiceEmail: !!c })}
                  className="data-[state=checked]:bg-[#6366F1] data-[state=checked]:border-[#6366F1]"
                />
              </div>
              <Separator className="bg-[#E2E8F0]" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">Message emails</p>
                  <p className="text-xs text-[#64748B]">Get notified when you receive a new message</p>
                </div>
                <Checkbox
                  checked={notifications.messageEmail}
                  onCheckedChange={(c) => setNotifications({ ...notifications, messageEmail: !!c })}
                  className="data-[state=checked]:bg-[#6366F1] data-[state=checked]:border-[#6366F1]"
                />
              </div>
              <Separator className="bg-[#E2E8F0]" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">Project updates</p>
                  <p className="text-xs text-[#64748B]">Get notified on project milestones and changes</p>
                </div>
                <Checkbox
                  checked={notifications.projectUpdate}
                  onCheckedChange={(c) => setNotifications({ ...notifications, projectUpdate: !!c })}
                  className="data-[state=checked]:bg-[#6366F1] data-[state=checked]:border-[#6366F1]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4 text-[#6366F1]" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">Dark Mode</p>
                  <p className="text-xs text-[#64748B]">Switch between light and dark theme</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isDark ? "bg-[#6366F1]" : "bg-[#E2E8F0]"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                      isDark ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Language */}
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4 text-[#6366F1]" />
                Language
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Display Language</Label>
                <select className="flex h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]">
                  <option>English</option>
                  <option>Français</option>
                  <option>中文</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              className="bg-[#6366F1] hover:bg-[#4F46E5] px-8"
            >
              {saved ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
