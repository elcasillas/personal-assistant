import Image from "next/image";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = { title: "Login — Linda" };

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image
            src="/linda-logo.png"
            alt="Linda"
            width={180}
            height={60}
            className="mx-auto mb-4 object-contain"
            priority
          />
          <p className="text-slate-400 text-sm mt-1">Ed's Personal Assistant</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
