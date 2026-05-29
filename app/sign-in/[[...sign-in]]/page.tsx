import { SignIn } from "@clerk/nextjs"
import { Sparkles, Users, FileText } from "lucide-react"

const features = [
  {
    icon: Sparkles,
    title: "AI Architecture Generation",
    description:
      "Describe your system, AI maps it to nodes and edges on a live canvas.",
  },
  {
    icon: Users,
    title: "Real-time Collaboration",
    description:
      "Live cursors, presence indicators, and shared node editing across your team.",
  },
  {
    icon: FileText,
    title: "Instant Spec Generation",
    description:
      "Export a complete Markdown technical spec directly from the canvas graph.",
  },
]

export default function SignInPage() {
  return (
    <div className="flex min-h-screen bg-base font-sans">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col bg-surface border-r border-surface-border">
        <div className="flex flex-col flex-1 justify-between px-14 py-12">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-brand" />
            <span className="text-sm font-semibold text-copy-primary tracking-tight">
              Ghost AI
            </span>
          </div>

          {/* Main content */}
          <div>
            <h1 className="text-4xl font-bold text-copy-primary leading-tight mb-4">
              Design systems at the
              <br />
              speed of thought.
            </h1>
            <p className="text-copy-secondary mb-12 leading-relaxed">
              Describe your architecture in plain English. Ghost AI maps it to a
              shared canvas your whole team can refine in real time.
            </p>

            <div className="space-y-7">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-accent-dim flex items-center justify-center">
                    <f.icon className="h-4 w-4 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-copy-primary mb-0.5">
                      {f.title}
                    </p>
                    <p className="text-sm text-copy-muted leading-relaxed">
                      {f.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-copy-faint">
            © 2026 Ghost AI. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right panel — Clerk form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <SignIn />
      </div>
    </div>
  )
}
