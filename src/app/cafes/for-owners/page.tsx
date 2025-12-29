import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  Calendar,
  MessageSquare,
  Shield,
  Zap,
  ArrowRight
} from "lucide-react";

export const metadata = {
  title: "For Cafe Owners - Cliq",
  description: "Hire reliable baristas in hours, not weeks. Pre-screened candidates matched to your schedule.",
};

export default function ForCafeOwnersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/cafes" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-bold text-slate-100">Cliq</span>
          </Link>
          <Link href="/login">
            <Button variant="primary" size="sm">
              Get Early Access
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-sm font-medium mb-6">
          <Zap className="w-4 h-4" />
          For Cafe Owners & Managers
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-100 mb-6 leading-tight">
          Hire reliable baristas<br />in hours, not weeks.
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
          Stop wasting time on no-shows and schedule mismatches. 
          We pre-screen candidates so you only meet people who can actually work.
        </p>
        <Link href="/login">
          <Button variant="primary" size="lg" icon={<ArrowRight className="w-5 h-5" />}>
            Get Early Access — It&apos;s Free
          </Button>
        </Link>
      </section>

      {/* The Problem */}
      <section className="border-t border-slate-800/80 bg-slate-900/30 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-100 text-center mb-4">
            Hiring isn&apos;t your real problem.
          </h2>
          <p className="text-xl text-amber-500 text-center font-medium mb-12">
            Schedule fit and reliability are.
          </p>
          
          <Card className="max-w-2xl mx-auto">
            <p className="text-slate-300 leading-relaxed">
              Most applicants look fine on paper but can&apos;t work the shifts you actually need, 
              don&apos;t show up consistently, or require time you don&apos;t have to vet.
            </p>
            <p className="text-amber-500 font-semibold mt-4 text-lg">
              We fix that.
            </p>
          </Card>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-100 text-center mb-12">
            Our platform pre-screens baristas before they reach you
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 mb-1">Availability verified upfront</h3>
                <p className="text-slate-400 text-sm">We confirm their schedule before you ever see them</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 mb-1">AI interview for reliability</h3>
                <p className="text-slate-400 text-sm">Assess customer handling and communication skills</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 mb-1">Prior feedback collected</h3>
                <p className="text-slate-400 text-sm">References checked automatically</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 mb-1">Schedule-matched only</h3>
                <p className="text-slate-400 text-sm">Candidates only if their schedule fits your shifts</p>
              </div>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-lg text-slate-300">
              You don&apos;t browse resumes. You don&apos;t chase references.<br />
              <span className="text-amber-500 font-medium">You see only candidates who can actually work.</span>
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-slate-800/80 bg-slate-900/30 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-100 text-center mb-12">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold text-slate-100 mb-2">Tell us your shift needs</h3>
              <p className="text-sm text-slate-400">Morning, afternoon, weekends — whatever you need</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold text-slate-100 mb-2">We send 2–5 vetted baristas</h3>
              <p className="text-sm text-slate-400">Pre-screened and schedule-matched to your needs</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold text-slate-100 mb-2">Pick one and start</h3>
              <p className="text-sm text-slate-400">Time to hire: hours, not days</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Cafes Use Us */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-100 text-center mb-12">
            Why Cafes Use Cliq
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              "Fewer no-shows",
              "Faster hires",
              "Less time wasted interviewing the wrong people",
              "Built specifically for independent cafes",
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span className="text-slate-300">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-800/80 bg-gradient-to-b from-slate-900/50 to-slate-950 py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-100 mb-4">
            Looking to fill shifts this week?
          </h2>
          <p className="text-lg text-slate-400 mb-8">
            Get early access and your first match free.
          </p>
          <Link href="/login">
            <Button variant="primary" size="lg">
              Get Early Access
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
          <p className="text-sm text-slate-600">© 2025 Cliq</p>
          <Link href="/cafes" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            Back to Cafes
          </Link>
        </div>
      </footer>
    </div>
  );
}

