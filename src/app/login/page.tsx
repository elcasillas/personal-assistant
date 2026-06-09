import LoginForm from "@/components/auth/LoginForm";

export const metadata = { title: "Login — Linda" };

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">L</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Linda</h1>
          <p className="text-slate-400 text-sm mt-1">Your Personal Assistant</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
