import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold mb-6">
        Case Loom Console
      </p>
      <h1 className="font-display text-4xl md:text-6xl leading-tight text-paper max-w-3xl">
        Every verdict should remember the last one.
      </h1>
      <p className="mt-6 text-lg text-parchment/90 max-w-2xl leading-relaxed">
        CaseWeave is a GenLayer-powered court where disputes are judged against
        agreement text, evidence, and old similar cases. Each final verdict
        becomes reusable case memory for future agreements.
      </p>

      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/agreements/new"
          className="bg-gold text-ink font-mono text-sm px-5 py-3 rounded-sm hover:opacity-90 transition-opacity"
        >
          Create Agreement
        </Link>
        <Link
          href="/cases"
          className="border border-gold/60 text-gold font-mono text-sm px-5 py-3 rounded-sm hover:bg-gold/10 transition-colors"
        >
          Explore Case Memory
        </Link>
      </div>

      <div className="mt-24 grid md:grid-cols-2 gap-8 citation-line pt-12">
        <Section
          title="How it works"
          body="Parties draft an agreement, one accepts, and disputes are filed against its text. A precedent search surfaces old similar cases, then validators render a verdict that becomes new case memory."
        />
        <Section
          title="Why normal smart contracts fail here"
          body="Deterministic contracts can't interpret ambiguous language, weigh evidence quality, or judge whether two disputes are materially similar. CaseWeave uses GenLayer's non-deterministic validator consensus for judgment."
        />
        <Section
          title="What becomes precedent"
          body="Every finalized verdict creates a PrecedentCase: a fact pattern, legal issue, holding, and reasoning rule - plus how it treated the cases before it."
        />
        <Section
          title="Built for web3 agreements"
          body="Freelance work, DAO grants, agent-to-agent services, creator collaborations, bounties, vendor deals, and governance mandates all share the same memory layer."
        />
      </div>

      <div className="mt-16 border border-line/40 rounded-sm p-6 bg-charcoal/40">
        <p className="font-mono text-xs uppercase tracking-wide text-gold mb-3">
          Example dispute flow
        </p>
        <p className="text-sm text-parchment/90 leading-relaxed">
          A DAO agrees to pay a builder 1,000 GEN for a frontend prototype with
          wallet connection and public deployment. Wallet connection ships
          incomplete. An old case held that partial delivery deserves partial
          release - but validators distinguish it here because wallet
          connection was an explicit core acceptance condition, and a new
          holding is created for future disputes to confront.
        </p>
      </div>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="font-display text-xl text-paper mb-2">{title}</h2>
      <p className="text-sm text-parchment/80 leading-relaxed">{body}</p>
    </div>
  );
}
