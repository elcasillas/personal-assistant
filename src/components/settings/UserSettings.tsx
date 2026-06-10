"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import type { User } from "@/lib/types";
import { Plus, Trash2, KeyRound } from "lucide-react";

export default function UserSettings() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user" });
  const [createError, setCreateError] = useState("");
  const [pwUserId, setPwUserId] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  async function fetchUsers() {
    setUsersLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setUsersLoading(false);
  }

  useEffect(() => {
    if (user?.role === "admin") fetchUsers();
  }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    const data = await res.json();
    if (!res.ok) { setCreateError(data.error ?? "Failed to create user"); return; }
    setShowCreate(false);
    setNewUser({ name: "", email: "", password: "", role: "user" });
    fetchUsers();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete user ${name}?`)) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    fetchUsers();
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(""); setPwSuccess("");
    const res = await fetch(`/api/users/${pwUserId}/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPw }),
    });
    const data = await res.json();
    if (!res.ok) { setPwError(data.error ?? "Failed"); return; }
    setPwSuccess("Password updated.");
    setNewPw("");
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-32" />
      <div className="bg-white rounded-xl p-6 ring-1 ring-slate-200 space-y-3">
        <div className="h-4 bg-slate-200 rounded w-24" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-10 bg-slate-100 rounded" />
          <div className="h-10 bg-slate-100 rounded" />
        </div>
      </div>
    </div>
  );

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Profile */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-5">Settings</h1>
        <div className="bg-white ring-1 ring-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Your Profile</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Name</span><p className="font-medium text-slate-900 mt-0.5">{user.name}</p></div>
            <div><span className="text-slate-500">Email</span><p className="font-medium text-slate-900 mt-0.5">{user.email}</p></div>
            <div><span className="text-slate-500">Role</span><span className={`inline-block mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${user.role === "admin" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>{user.role}</span></div>
          </div>
        </div>
      </div>

      {/* Admin panel */}
      {user.role === "admin" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">User Management</h2>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>

          {/* Create user form */}
          {showCreate && (
            <div className="bg-white ring-1 ring-slate-200 rounded-xl p-6 shadow-sm mb-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">New User</h3>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Name</label>
                    <input required value={newUser.name} onChange={e => setNewUser(p => ({...p, name: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Email</label>
                    <input required type="email" value={newUser.email} onChange={e => setNewUser(p => ({...p, email: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Password</label>
                    <input required type="password" value={newUser.password} onChange={e => setNewUser(p => ({...p, password: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Role</label>
                    <select value={newUser.role} onChange={e => setNewUser(p => ({...p, role: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                {createError && <p className="text-red-600 text-xs">{createError}</p>}
                <div className="flex gap-2">
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Create</button>
                  <button type="button" onClick={() => { setShowCreate(false); setCreateError(""); }} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Users table */}
          <div className="bg-white ring-1 ring-slate-200 rounded-xl shadow-sm overflow-hidden">
            {usersLoading ? (
              <div className="p-6 text-sm text-slate-500">Loading users…</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                      <td className="px-4 py-3 text-slate-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => { setPwUserId(u.id); setNewPw(""); setPwError(""); setPwSuccess(""); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Change password">
                            <KeyRound className="w-4 h-4" />
                          </button>
                          {u.id !== user.id && (
                            <button onClick={() => handleDelete(u.id, u.name)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete user">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Password update modal */}
          {pwUserId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                <h3 className="text-base font-semibold text-slate-900 mb-4">Update Password</h3>
                <form onSubmit={handlePassword} className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">New password (min 8 chars)</label>
                    <input required type="password" value={newPw} onChange={e => setNewPw(e.target.value)} minLength={8} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  {pwError && <p className="text-red-600 text-xs">{pwError}</p>}
                  {pwSuccess && <p className="text-green-600 text-xs">{pwSuccess}</p>}
                  <div className="flex gap-2">
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Update</button>
                    <button type="button" onClick={() => { setPwUserId(null); setPwError(""); setPwSuccess(""); }} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
