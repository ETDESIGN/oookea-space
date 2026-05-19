"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Bell, Palette, Save, Check, Loader2, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useTheme } from "@/lib/theme";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  // Notifications
  const [notifications, setNotifications] = useState({
    invoiceEmail: true,
    messageEmail: true,
    projectUpdate: false,
  });

  const profile = useQuery(
    api.projects.getUserById,
    user?.id ? { id: user.id as Id<"users"> } : "skip"
  );

  const updateProfile = useMutation(api.projects.updateProfile);
  const changePassword = useMutation(api.projects.changePassword);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setPhone(profile.phone ?? "");
      setCompany(profile.company ?? "");
      if ((profile as any).notifications) {
        setNotifications((profile as any).notifications);
      }
    }
  }, [profile]);

  if (profile === undefined && user?.id) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await updateProfile({
        id: user.id as Id<"users">,
        name,
        phone: phone || undefined,
        company: company || undefined,
        notifications,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError("");
    if (!user?.id) return;
    if (newPw !== confirmPw) { setPwError("Passwords don't match"); return; }
    if (newPw.length < 6) { setPwError("Password must be at least 6 characters"); return; }
    setPwSaving(true);
    try {
      await changePassword({ id: user.id as Id<"users">, currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2500);
    } catch (err: any) {
      setPwError(err?.message || "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  const isDark = theme === "dark";

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="mt-1 text-muted-foreground">Manage your account preferences.</p>
          </div>

          {/* Success Banner */}
          {saved && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
              <Check className="h-4 w-4" />
              Profile updated successfully!
            </div>
          )}

          {/* Profile */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile?.email ?? user?.email ?? ""} disabled className="border-border bg-background text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Contact your account manager to change your email.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your company name" className="border-border" />
              </div>
            </CardContent>
          </Card>

          {/* Password */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pwError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {pwError}
                </div>
              )}
              {pwSaved && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                  <Check className="h-4 w-4" />
                  Password updated successfully!
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="border-border" />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={pwSaving || !currentPw || !newPw} className="bg-primary hover:bg-primary/90">
                  {pwSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Changing…</> : "Change Password"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-primary" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Invoice emails</p>
                  <p className="text-xs text-muted-foreground">Get notified when a new invoice is sent</p>
                </div>
                <Checkbox
                  checked={notifications.invoiceEmail}
                  onCheckedChange={(c) => setNotifications({ ...notifications, invoiceEmail: !!c })}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Message emails</p>
                  <p className="text-xs text-muted-foreground">Get notified when you receive a new message</p>
                </div>
                <Checkbox
                  checked={notifications.messageEmail}
                  onCheckedChange={(c) => setNotifications({ ...notifications, messageEmail: !!c })}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Project updates</p>
                  <p className="text-xs text-muted-foreground">Get notified on project milestones and changes</p>
                </div>
                <Checkbox
                  checked={notifications.projectUpdate}
                  onCheckedChange={(c) => setNotifications({ ...notifications, projectUpdate: !!c })}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4 text-primary" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isDark ? "bg-primary" : "bg-border"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-card transition-transform ${
                      isDark ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 px-8"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : saved ? (
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
