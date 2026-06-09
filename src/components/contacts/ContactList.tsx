"use client";

import { useEffect, useState } from "react";
import { Plus, AlertCircle, Mail, Phone, Building2 } from "lucide-react";
import type { Contact } from "@/lib/types";
import ContactForm from "./ContactForm";

export default function ContactList() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  async function fetchContacts() {
    try {
      setLoading(true);
      const res = await fetch("/api/contacts");
      if (!res.ok) throw new Error("Failed to fetch contacts");
      const data = await res.json();
      setContacts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContacts();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this contact?")) return;
    await fetch(`/api/contacts?id=${id}`, { method: "DELETE" });
    fetchContacts();
  }

  function handleEdit(contact: Contact) {
    setEditingContact(contact);
    setFormOpen(true);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditingContact(null);
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 p-4 bg-red-50 rounded-lg">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Contacts</h1>
          <p className="text-sm text-slate-500 mt-0.5">{contacts.length} contacts</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-slate-300 text-5xl mb-4">👤</div>
          <p className="text-slate-500 font-medium">No contacts yet</p>
          <p className="text-slate-400 text-sm mt-1">Add your first contact</p>
        </div>
      ) : (
        <div className="bg-white ring-1 ring-slate-200 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Company</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Email</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Phone</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {contacts
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((contact, i) => (
                  <tr
                    key={contact.id}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors group ${i < contacts.length - 1 ? "border-b border-slate-50" : ""}`}
                    onClick={() => handleEdit(contact)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{contact.name}</p>
                          {contact.title && (
                            <p className="text-xs text-slate-400">{contact.title}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {contact.company ? (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          {contact.company}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {contact.email ? (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          {contact.email}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {contact.phone ? (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          {contact.phone}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(contact.id); }}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <ContactForm
          contact={editingContact}
          onClose={handleCloseForm}
          onSuccess={() => { handleCloseForm(); fetchContacts(); }}
        />
      )}
    </div>
  );
}
