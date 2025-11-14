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
    period: 'Jan 2025 - Present',
    location: 'Remote',
    highlights: [
      'Built carbon-aware LLM router with Node.js and WattTime API that lowered average workload carbon intensity by ~40% per session.',
      'Architected multi-region platform with AWS EC2/Lambda, Redis for session management, RunPod GPU instances, vLLM inference engine, and HuggingFace model integration.',
      'Next.js frontend with TypeScript, React hooks, and Vercel edge functions, implementing real-time model switching UI/UX and session persistence with Redis that improved user response latency by 25%.',
    ],
  },
  {
    company: 'Somnology',
    role: 'Lead Frontend Engineer',
    period: 'Jun 2023 - Feb 2025',
    location: 'Bay Area',
    highlights: [
      'Led development of a sleep apnea management dashboard for physicians using React/TypeScript/Node.js, integrating and aggregating data from 7 wearable device types (Fitbit, Oura, etc.) via REST APIs with Python/OpenRouter, implementing RAG for clinical data search.',
      'Built CPAP compliance charts in React/Redux that cut patient treatment onboarding time by 35%.',
      'Automated device data aggregation workflows with Python ETL pipelines, Node.js microservices, and MongoDB storage, reducing manual entry errors by over 60%.',
    ],
  },
  {
    company: 'Zulily',
    role: 'Software Engineer',
    period: 'Dec 2019 - Nov 2022',
    location: 'Seattle',
    highlights: [
      'Built vendor onboarding portal with React/Redux that reduced product listing time for vendors by 150%.',
      'Developed cross-functional infrastructure improvements with AWS (EC2, S3, CloudWatch) that enhanced logging and error reporting across 4 teams, reducing mean time to resolution by 30%.',
      'Led cross-team initiative to revive and standardize internal React component library, facilitating alignment meetings across 5 teams and achieving 70% adoption rate within 6 months.',
    ],
  },
  {
    company: 'Syndio',
    role: 'Software Engineer',
    period: 'Oct 2017 - Jun 2019',
    location: 'Santa Cruz',
    highlights: [
      'Implemented pay equity calculator that added ~$100K in new sales within the first three months.',
      'Built legal analytics dashboard with React/TypeScript frontend, Python/Django REST API, and MongoDB aggregation pipelines delivering 5 analytical views, cutting review time 40%.',
    ],
  },
  {
    company: 'Montaia Global',
    role: 'Frontend Developer (Contract)',
    period: 'Sep 2016 - May 2018',
    location: 'Santa Cruz',
    highlights: [
      'Built event and lodging management platform in React/Redux with Node.js/Express backend and MongoDB that increased event page hits by 300%.',
      'Designed frontend architecture that reduced component file size 3x and improved test coverage to 90%.',
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
