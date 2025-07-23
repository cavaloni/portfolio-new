"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/icons";
import { useAuth } from "@/contexts/auth-context";
import { useUpdateProfile, useUpdatePreferences } from "@/hooks/use-auth";
import { toast } from "sonner";
import React from "react";
import { UserPreferences } from "@/types";

// Form validation schema for account settings
const accountFormSchema = z
  .object({
    currentPassword: z.string().min(8, {
      message: "Password must be at least 8 characters long",
    }),
    newPassword: z.string().min(8, {
      message: "Password must be at least 8 characters long",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type AccountFormValues = z.infer<typeof accountFormSchema>;

// Form validation schema for notification preferences
const notificationFormSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  marketingEmails: z.boolean(),
  securityAlerts: z.boolean(),
});

type NotificationFormValues = z.infer<typeof notificationFormSchema>;

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Account form
  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Notification form
  const notificationForm = useForm<NotificationFormValues>({
    defaultValues: {
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false,
      securityAlerts: true,
    },
    values: user?.preferences
      ? {
          emailNotifications: user.preferences.email_notifications ?? true,
          pushNotifications: user.preferences.push_notifications ?? true,
          marketingEmails: user.preferences.marketing_emails ?? false,
          securityAlerts: user.preferences.security_alerts ?? true,
        }
      : undefined,
  });

  const { mutate: updateProfile } = useUpdateProfile();
  const { mutate: updatePreferences, isPending: isUpdatingPreferences } =
    useUpdatePreferences();

  // Handle account form submission
  const onAccountSubmit = (data: AccountFormValues) => {
    // In a real app, you would update the password via an API call
    console.log("Updating password:", data);

    // Simulate API call
    setTimeout(() => {
      toast.success("Your password has been updated");

      // Reset form
      accountForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }, 1000);
  };

  // Handle notification preferences submission
  const onNotificationSubmit = (data: NotificationFormValues) => {
    const preferences: Partial<UserPreferences> = {
      email_notifications: data.emailNotifications,
      push_notifications: data.pushNotifications,
      marketing_emails: data.marketingEmails,
      security_alerts: data.securityAlerts,
    };

    updatePreferences(preferences, {
      onSuccess: () => {
        toast.success("Your notification preferences have been updated");
      },
      onError: (error: Error) => {
        console.error("Error updating preferences:", error);
        toast.error("Failed to update notification preferences");
      },
    });
  };

  // Handle carbon aware toggle
  const handleCarbonAwareToggle = (checked: boolean) => {
    updatePreferences(
      { carbon_aware: checked },
      {
        onSuccess: () => {
          toast.success("Carbon aware settings updated");
        },
        onError: (error: Error) => {
          console.error("Error updating carbon aware settings:", error);
          toast.error("Failed to update carbon aware settings");
        },
      },
    );
  };

  // Handle theme change
  const handleThemeChange = (theme: "light" | "dark" | "system") => {
    updatePreferences(
      { theme },
      {
        onSuccess: () => {
          toast.success("Theme updated successfully");
        },
        onError: (error: Error) => {
          console.error("Error updating theme:", error);
          toast.error("Failed to update theme");
        },
      },
    );
  };

  // Handle account deletion
  const handleDeleteAccount = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);

    // In a real app, you would call an API to delete the account
    console.log("Deleting account...");

    // Simulate API call
    setTimeout(() => {
      setIsDeleting(false);
      setShowDeleteConfirm(false);

      // Logout the user after account deletion
      logout();

      toast.success("Your account has been successfully deleted");

      // Redirect to home page
      router.push("/");
    }, 1500);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Appearance</h2>
              <p className="text-sm text-muted-foreground">
                Customize the appearance of the application.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <h3 className="font-medium">Theme</h3>
                  <p className="text-sm text-muted-foreground">
                    Select your preferred theme
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant={
                      user?.preferences?.theme === "light"
                        ? "default"
                        : "outline"
                    }
                    onClick={() => handleThemeChange("light")}
                    disabled={isUpdatingPreferences}
                  >
                    Light
                  </Button>
                  <Button
                    type="button"
                    variant={
                      user?.preferences?.theme === "dark"
                        ? "default"
                        : "outline"
                    }
                    onClick={() => handleThemeChange("dark")}
                    disabled={isUpdatingPreferences}
                  >
                    Dark
                  </Button>
                  <Button
                    type="button"
                    variant={
                      !user?.preferences?.theme ||
                      user?.preferences?.theme === "system"
                        ? "default"
                        : "outline"
                    }
                    onClick={() => handleThemeChange("system")}
                    disabled={isUpdatingPreferences}
                  >
                    System
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <h3 className="font-medium">Carbon Awareness</h3>
                  <p className="text-sm text-muted-foreground">
                    Enable to prioritize low-carbon models when available
                  </p>
                </div>
                <Switch
                  checked={user?.preferences?.carbon_aware ?? true}
                  onCheckedChange={handleCarbonAwareToggle}
                  disabled={isUpdatingPreferences}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Change Password</h2>
              <p className="text-sm text-muted-foreground">
                Update your password associated with your account.
              </p>
            </div>

            <form
              onSubmit={accountForm.handleSubmit(onAccountSubmit)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...accountForm.register("currentPassword")}
                />
                {accountForm.formState.errors.currentPassword && (
                  <p className="text-sm text-destructive">
                    {accountForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...accountForm.register("newPassword")}
                />
                {accountForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive">
                    {accountForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...accountForm.register("confirmPassword")}
                />
                {accountForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {accountForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="mt-4">
                Update Password
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)}>
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Email Notifications</h2>
                <p className="text-sm text-muted-foreground">
                  Configure how you receive email notifications.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h3 className="font-medium">Email Notifications</h3>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="email-notifications"
                        checked={notificationForm.watch("emailNotifications")}
                        onCheckedChange={(checked: boolean) => {
                          notificationForm.setValue(
                            "emailNotifications",
                            checked,
                          );
                        }}
                        disabled={isUpdatingPreferences}
                      />
                      <Label htmlFor="email-notifications">
                        Email notifications
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h3 className="font-medium">Marketing Emails</h3>
                    <p className="text-sm text-muted-foreground">
                      Receive marketing and promotional emails
                    </p>
                  </div>
                  <Switch
                    checked={notificationForm.watch("marketingEmails")}
                    onCheckedChange={(checked: boolean) => {
                      notificationForm.setValue("marketingEmails", checked);
                    }}
                    disabled={isUpdatingPreferences}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h3 className="font-medium">Security Alerts</h3>
                    <p className="text-sm text-muted-foreground">
                      Receive security alerts and important updates
                    </p>
                  </div>
                  <Switch
                    checked={notificationForm.watch("securityAlerts")}
                    onCheckedChange={(checked: boolean) => {
                      notificationForm.setValue("securityAlerts", checked);
                    }}
                    disabled={isUpdatingPreferences}
                  />
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-xl font-semibold">Push Notifications</h2>
                <p className="text-sm text-muted-foreground">
                  Configure push notifications on your device.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h3 className="font-medium">Push Notifications</h3>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="push-notifications"
                        checked={notificationForm.watch("pushNotifications")}
                        onCheckedChange={(checked: boolean) => {
                          notificationForm.setValue(
                            "pushNotifications",
                            checked,
                          );
                        }}
                        disabled={isUpdatingPreferences}
                      />
                      <Label htmlFor="push-notifications">
                        Push notifications
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isUpdatingPreferences}>
                  {isUpdatingPreferences && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        </TabsContent>

        {/* Danger Zone */}
        <TabsContent value="danger" className="space-y-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-destructive">
                Danger Zone
              </h2>
              <p className="text-sm text-muted-foreground">
                These actions are irreversible. Proceed with caution.
              </p>
            </div>

            <div className="space-y-4 rounded-lg border border-destructive/50 p-6">
              <div>
                <h3 className="font-medium">Delete Account</h3>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This
                  action cannot be undone.
                </p>
              </div>

              {showDeleteConfirm ? (
                <div className="mt-4 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete your account? This will
                    permanently delete all your data.
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Yes, delete my account"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="destructive"
                  className="mt-2"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  Delete Account
                </Button>
              )}
            </div>

            <div className="space-y-4 rounded-lg border border-amber-500/50 p-6">
              <div>
                <h3 className="font-medium">Export Data</h3>
                <p className="text-sm text-muted-foreground">
                  Download a copy of your personal data.
                </p>
              </div>

              <Button
                variant="outline"
                className="border-amber-500/50 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:hover:text-amber-300"
                onClick={() => {
                  // In a real app, this would generate and download a data export
                  toast.info(
                    "Your data export will be prepared and sent to your email",
                  );
                }}
              >
                <Icons.download className="mr-2 h-4 w-4" />
                Request Data Export
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
