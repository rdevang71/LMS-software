import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, type User } from "@/lib/auth";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { deleteUploadedAsset, uploadToCloudinary } from "@/lib/cloudinary";

export const Route = createFileRoute("/dashboard/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const [preferences, setPreferences] = useState<Record<string, boolean | string>>(
    user?.preferences ?? {},
  );
  const [dark, setDark] = useState(false);
  const [photoProgress, setPhotoProgress] = useState<number | null>(null);
  useEffect(() => setDark(localStorage.getItem("theme") === "dark"), []);
  if (!user) return null;

  async function saveProfile() {
    try {
      const result = await apiRequest<{ user: User }>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ name, email, bio }),
      });
      updateUser(result.user);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profile update failed");
    }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) return toast.error("New passwords do not match");
    try {
      await apiRequest("/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Password update failed");
    }
  }

  async function updatePreferences(next: Record<string, boolean | string>) {
    setPreferences(next);
    try {
      const result = await apiRequest<{ user: User }>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ preferences: next }),
      });
      updateUser(result.user);
      toast.success("Preference saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Preference update failed");
    }
  }

  async function changePhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose a PNG or JPG image");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    let newPublicId = "";
    let persisted = false;
    try {
      setPhotoProgress(0);
      const uploaded = await uploadToCloudinary(file, "profile", setPhotoProgress);
      newPublicId = uploaded.publicId;
      const result = await apiRequest<{ user: User }>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ avatar: uploaded.url, avatarPublicId: uploaded.publicId }),
      });
      persisted = true;
      updateUser(result.user);
      toast.success("Profile photo updated");
    } catch (error) {
      if (newPublicId && !persisted)
        await deleteUploadedAsset(newPublicId, "profile").catch(() => undefined);
      toast.error(error instanceof Error ? error.message : "Photo update failed");
    } finally {
      setPhotoProgress(null);
    }
  }
  return (
    <div>
      <PageHeader title="Settings" description="Manage your profile, security, and preferences." />
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <input
                    ref={photoInput}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(event) => changePhoto(event.target.files?.[0])}
                  />
                  <Button variant="outline" size="sm" onClick={() => photoInput.current?.click()}>
                    {photoProgress === null ? "Change photo" : `Uploading ${photoProgress}%`}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Uploaded to Cloudinary · PNG or JPG up to 5MB
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Bio</Label>
                  <Input
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="Tell us about yourself"
                  />
                </div>
              </div>
              <Button className="bg-gradient-primary" onClick={saveProfile}>
                Save changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="security">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Current password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>New password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm new password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              <Button className="bg-gradient-primary" onClick={changePassword}>
                Update password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Notification preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                "Email digest",
                "Assignment reminders",
                "Quiz alerts",
                "Course updates",
                "Certificate earned",
              ].map((l) => {
                const key = l.toLowerCase().replaceAll(" ", "_");
                return (
                  <div
                    key={l}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm">{l}</p>
                      <p className="text-xs text-muted-foreground">
                        Receive notifications for this event
                      </p>
                    </div>
                    <Switch
                      checked={preferences[key] !== false}
                      onCheckedChange={(checked) =>
                        updatePreferences({ ...preferences, [key]: checked })
                      }
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="appearance">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium text-sm">Dark mode</p>
                  <p className="text-xs text-muted-foreground">
                    Use the theme toggle in the header
                  </p>
                </div>
                <Switch
                  checked={dark}
                  onCheckedChange={(checked) => {
                    setDark(checked);
                    localStorage.setItem("theme", checked ? "dark" : "light");
                    document.documentElement.classList.toggle("dark", checked);
                    window.dispatchEvent(new Event("theme-change"));
                    updatePreferences({ ...preferences, darkMode: checked });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select
                  value={String(preferences.language ?? "en")}
                  onValueChange={(language) => updatePreferences({ ...preferences, language })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="hi">हिन्दी</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
