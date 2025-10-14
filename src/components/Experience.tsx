import { BriefcaseBusiness } from 'lucide-react';

interface ExperienceItem {
  company: string;
  role: string;
  period: string;
  location: string;
  highlights: string[];
}

const EXPERIENCES: ExperienceItem[] = [
  {
    company: 'Routly',
    role: 'Founding Engineer',
    period: 'May 2025 - Present',
    location: 'Remote',
    highlights: [
      'Built a carbon-aware LLM router reducing workload carbon intensity by ~40% with sub-2s latency.',
      'Designed multi-region AI infrastructure spanning AWS, GCP, RunPod, vLLM, and Redis.',
      'Shipped a 3D joystick-style interface to balance carbon, speed, performance, and cost.',
    ],
  },
  {
    company: 'Somnology',
    role: 'Lead Software Engineer',
    period: 'Jun 2024 - Feb 2025',
    location: 'San Francisco Bay Area',
    highlights: [
      'Led frontend development for a clinician dashboard improving patient onboarding time by 35%.',
      'Built real-time CPAP compliance charts in React/Redux.',
      'Automated multi-device data aggregation cutting manual entry and errors by 60%.',
    ],
  },
  {
    company: 'Stealth Mode SaaS',
    role: 'Founding Engineer',
    period: 'Jun 2023 - May 2024',
    location: 'Santa Cruz, CA',
    highlights: [
      'Designed a FemTech SaaS platform leveraging TypeScript, React, Vercel, and tRPC.',
      'Led product discovery, UX, branding, and go-to-market strategy.',
    ],
  },
  {
    company: 'Zulily',
    role: 'Software Engineer',
    period: 'Dec 2019 - Jul 2022',
    location: 'Greater Seattle Area',
    highlights: [
      'Shipped vendor onboarding enhancements cutting listing time by 150%.',
      'Championed testing standards adoption, reducing bug density by ~50%.',
      'Led React/Redux refactor reducing on-call burden by 75%.',
    ],
  },
  {
    company: 'Syndio',
    role: 'Software Engineer',
    period: 'Oct 2017 - Jul 2019',
    location: 'Santa Cruz, CA',
    highlights: [
      'Delivered complex UI for pay equity assessment tools with React/Redux.',
      'Collaborated on Python/Django backend and Postgres data flows.',
      'Supported UX design and comprehensive testing with Jest, Enzyme, and Cypress.',
    ],
  },
];

const Experience = () => {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-12">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.45em] text-slate-400">Experience</p>
        <h2 className="mt-4 text-4xl font-semibold tracking-[0.25em] text-white sm:text-5xl">Experience</h2>
      </div>
      <div className="relative flex flex-col gap-10 border-l border-white/10 pl-8">
        <span className="absolute -left-[13px] top-0 flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-accent">
          <BriefcaseBusiness size={20} />
        </span>
        {EXPERIENCES.map((item) => (
          <article key={item.company} className="relative rounded-3xl border border-white/10 bg-night-soft/70 p-8 shadow-glass">
            <span className="absolute -left-[33px] top-10 h-[18px] w-[18px] rounded-full border-2 border-night bg-accent" />
            <div className="flex flex-col gap-3 text-left">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold tracking-[0.2em] text-white">{item.company}</h3>
                  <p className="text-sm uppercase tracking-[0.3em] text-accent">{item.role}</p>
                </div>
                <div className="text-right text-xs uppercase tracking-[0.3em] text-slate-400">
                  <p>{item.period}</p>
                  <p>{item.location}</p>
                </div>
              </div>
              <ul className="flex flex-col gap-3 text-sm leading-relaxed text-slate-300">
                {item.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-3">
                    <span className="mt-[6px] h-[6px] w-[6px] rounded-full bg-accent" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Experience;
