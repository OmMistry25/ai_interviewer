import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { GeneralApplyForm } from "./GeneralApplyForm";

type SearchParams = Promise<{ location?: string }>;

export const metadata = {
  title: "Join Our Network - Cliq",
  description: "Join the Cliq barista network and get matched to cafes near you.",
};

export default async function GeneralApplyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { location } = await searchParams;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-4">
          <Link
            href="/cafes/for-baristas"
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-sm text-emerald-500 font-medium mb-1">Cliq Network</p>
            <h1 className="text-2xl font-bold text-slate-100">Join Our Barista Network</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-5 gap-8">
          {/* Info Section */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <h2 className="text-lg font-semibold text-slate-100 mb-4">
                No openings in your area yet
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                We don&apos;t have a cafe partner in your location right now, but we&apos;re 
                growing fast! Join our network and we&apos;ll notify you when opportunities 
                open up near you.
              </p>
              
              {location && (
                <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/50 rounded-lg p-3">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span>{location}</span>
                </div>
              )}
            </Card>

            <Card>
              <h3 className="font-semibold text-slate-100 mb-3">What happens next?</h3>
              <ol className="space-y-3 text-sm text-slate-400">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <span>Submit your info and resume</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <span>Complete a quick AI interview (optional)</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  <span>Get notified when cafes near you join</span>
                </li>
              </ol>
            </Card>
          </div>

          {/* Form */}
          <div className="md:col-span-3">
            <Card>
              <h2 className="text-xl font-semibold text-slate-100 mb-6">Your Information</h2>
              <GeneralApplyForm defaultLocation={location} />
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

