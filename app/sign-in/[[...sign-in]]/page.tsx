import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen bg-base">
      {/* Left panel — hidden on small screens */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 border-r border-surface-border">
        <div className="max-w-sm">
          <p className="text-xl font-semibold text-copy-primary mb-2">Ghost AI</p>
          <p className="text-copy-secondary mb-8">
            Describe a system. AI maps it. Collaborate and ship a spec.
          </p>
          <ul className="space-y-2 text-copy-muted text-sm">
            <li>Real-time collaborative architecture canvas</li>
            <li>AI-generated system designs from plain English</li>
            <li>Export as a Markdown technical specification</li>
          </ul>
        </div>
      </div>

      {/* Right panel — Clerk form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <SignIn />
      </div>
    </div>
  )
}
