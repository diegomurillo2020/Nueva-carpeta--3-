import type { Metadata } from "next";
import { BarChart3, Building2, Check, FileText, LockKeyhole, MessageCircle, Vote, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "ConvoAssemble — Smart Digital Voting for HOAs",
  description: "Real-time digital voting and automated meeting minutes for condominiums and homeowner associations.",
};

const FEATURES = [
  { icon: Zap, title: "Realtime Vote Tallies", text: "Every vote synced instantly across all admin screens via Supabase Realtime — no refresh needed." },
  { icon: LockKeyhole, title: "Fraud-Proof Voting", text: "Database-level unique constraint prevents double voting. Row-Level Security isolates each tenant." },
  { icon: BarChart3, title: "Quorum Calculator", text: "Configurable quorum rules per organization — coefficient-based (alícuota) or headcount majority." },
  { icon: MessageCircle, title: "WhatsApp & Telegram", text: "Members vote via WhatsApp or Telegram messages. No app download required." },
  { icon: FileText, title: "Auto Meeting Minutes", text: "Structured transcript summaries generated automatically from motion results." },
  { icon: Building2, title: "Multi-Tenant SaaS", text: "Manage multiple condominiums from a single platform with full data isolation." },
];

export default function HomePage() {
  return (
    <div className="container">
      {/* ── Hero ── */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-label">
          Now in Beta - Task 3 / 5 Complete
        </div>
        <h1 className="hero-title" id="hero-title">
          Smart Voting for<br />Modern Communities
        </h1>
        <p className="hero-sub">
          ConvoAssemble brings digital governance to condominiums and HOAs.
          Cast votes via web, WhatsApp, or Telegram — tallied live with Supabase Realtime.
        </p>
        <div className="hero-actions">
          <a href="/admin" className="btn btn-primary btn-xl" id="btn-go-dashboard">
            <Vote size={18} /> Open Dashboard
          </a>
          <a href="/admin/meetings/new" className="btn btn-secondary btn-xl" id="btn-create-meeting-hero">
            ＋ Create Meeting
          </a>
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section aria-labelledby="features-title" style={{ paddingBottom: "4rem" }}>
        <div className="text-center mb-8" style={{ marginBottom: "2.5rem" }}>
          <h2 id="features-title" style={{ fontSize:"1.625rem", fontWeight:800, letterSpacing:"-0.04em" }}>
            Everything you need for digital governance
          </h2>
          <p className="text-muted mt-2" style={{ maxWidth:480, margin:"0.5rem auto 0" }}>
            From anonymous ballots to live result charts — all secured at the database level.
          </p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="card card-hover feature-card">
              <div className="feature-icon"><f.icon size={22} /></div>
              <div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-text mt-2">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quick Status Card ── */}
      <section style={{ paddingBottom: "4rem" }}>
        <div className="card card-accent card-p-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 style={{ fontWeight:800, fontSize:"1.25rem", marginBottom:"0.375rem" }}>Build Progress</h2>
              <p className="text-sm text-muted">SDD Task execution — 3 of 5 complete</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              {[
                { label:"DB Schema",  done:true },
                { label:"Backend API",done:true },
                { label:"Realtime UI",done:true },
                { label:"WhatsApp",   done:false },
                { label:"Dashboard",  done:false },
              ].map((t) => (
                <span key={t.label} className={`badge ${t.done ? "badge-success" : "badge-draft"}`}>
                  {t.done && <Check size={13} />} {t.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
