import UserSettings from "@/components/settings/UserSettings";

export const metadata = { title: "Settings — Linda" };

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <UserSettings />
    </div>
  );
}
