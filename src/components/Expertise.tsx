import { Code2, LayoutPanelTop, BrainCircuit } from 'lucide-react';

const EXPERTISE_CARDS = [
  {
    title: 'Software Development',
    accent: 'Software',
    description:
      'Extensive experience in functional and OOP paradigms across Python, JavaScript, and TypeScript ecosystems.',
    icon: Code2,
  },
  {
    title: 'Frontend Dev. React, NextJS',
    accent: 'Frontend Dev.',
    description:
      'Passionate about UI/UX with 8+ years sculpting interfaces in HTML, CSS, React, and Next.js frameworks.',
    icon: LayoutPanelTop,
  },
  {
    title: 'AI and Cloud Engineering',
    accent: 'AI and Cloud',
    description:
      'Deploy anywhere: AWS, GCP, Fly.io, Runpod, Ollama, Qdrant, Pinecone, Supabase, Hasura, Postgres, Redis, Docker, Kubernetes.',
    icon: BrainCircuit,
  },
];

const Expertise = () => {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.45em] text-slate-400">My Expertise</p>
        <h2 className="mt-4 text-4xl font-semibold tracking-[0.25em] text-white sm:text-5xl">My Expertise</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {EXPERTISE_CARDS.map(({ title, accent, description, icon: Icon }) => (
          <article
            key={title}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-night-soft/70 p-8 shadow-glass transition hover:border-accent/60 hover:shadow-2xl hover:shadow-accent/10"
          >
            <div className="absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl transition-all group-hover:bg-accent/20" />
            <div className="relative flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-accent">
                  <Icon size={28} />
                </span>
                <h3 className="text-lg font-semibold text-white">
                  <span className="text-accent">{accent}</span>{' '}
                  {title.replace(accent, '').trim()}
                </h3>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-slate-300">{description}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Expertise;
