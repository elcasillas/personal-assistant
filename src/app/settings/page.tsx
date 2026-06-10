import DashboardClient from "@/components/Dashboard";

export const metadata = { title: "Settings — Linda" };

export default function SettingsPage() {
  return <DashboardClient defaultSection="settings" />;
}
