export type ProjectCategory = 'All' | 'Data Visualization' | 'Web Development';

export interface Project {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  contributions: string[];
  tech: string[];
  category: Exclude<ProjectCategory, 'All'>;
  image: string;
  modalImage?: string;
  link?: string;
}

export const PROJECT_CATEGORIES: ProjectCategory[] = ['All', 'Data Visualization', 'Web Development'];

export const projects: Project[] = [
  {
    id: 'routly',
    title: 'Routly',
    subtitle: 'AI Infrastructure',
    description:
      'Carbon-aware LLM routing platform delivering sub-2s latency while optimizing for emissions, resiliency, and cost.',
    contributions: [
      'Architected multi-region inference fabric across AWS, GCP, RunPod, and HuggingFace.',
      'Integrated WattTime to dynamically shift workloads toward the greenest grid regions.',
      'Prototyped 3D joystick interface for balancing carbon, speed, performance, and spend.',
    ],
    tech: ['Next.js', 'tRPC', 'Redis', 'HuggingFace', 'vLLM', 'AWS', 'GCP'],
    category: 'Data Visualization',
    image: '/routlynew.png',
    modalImage: '/routly.jpg',
    link: 'https://routly-main.vercel.app/chat',
  },
  {
    id: 'somnology',
    title: 'Somnology',
    subtitle: 'Professional Work',
    description:
      'Clinical sleep apnea dashboard enabling clinicians to monitor CPAP compliance and expedite onboarding.',
    contributions: [
      'Delivered real-time compliance dashboards built with React, Redux, and streaming APIs.',
      'Orchestrated automated device data aggregation, reducing manual entry by 60%.',
      'Partnered with physicians to tune UX flows and boost pilot adoption by 45%.',
    ],
    tech: ['React', 'Redux', 'TypeScript', 'Node.js', 'Postgres'],
    category: 'Web Development',
    image: '/somnologynew.png',
    modalImage: '/somnology.png',
  },
  {
    id: 'zulily',
    title: 'Zulily',
    subtitle: 'Professional Work',
    description:
      'Vendor onboarding portal overhaul that cut time-to-list products by 150% and decreased bug density.',
    contributions: [
      'Led React/Redux refactor for the highest-traffic vendor workflows to slash on-call incidents 75%.',
      'Championed shared testing toolkit adoption, halving escaped defects.',
      'Coordinated cross-team rollout and training for new inventory tooling.',
    ],
    tech: ['React', 'Redux', 'SCSS', 'Jest'],
    category: 'Web Development',
    image: '/Zulily.png',
  },
  {
    id: 'layka',
    title: 'Layka',
    subtitle: 'FemTech SaaS',
    description:
      'Stealth-mode platform empowering women to navigate personalized wellness journeys and care plans.',
    contributions: [
      'Drove product discovery, brand identity, and full-stack development end to end.',
      'Wove together OAuth, local LLMs, and multi-tenant onboarding for secure collaboration.',
      'Crafted responsive mobile-first UI emphasizing clarity and trust.',
    ],
    tech: ['TypeScript', 'React', 'Vercel', 'tRPC', 'AWS'],
    category: 'Data Visualization',
    image: '/femtechnew.png',
    modalImage: '/femtech.png',
  },
  {
    id: 'syndio',
    title: 'Syndio Solutions',
    subtitle: 'Professional Work',
    description:
      'Pay equity analytics suite empowering enterprises to expose and resolve compensation gaps.',
    contributions: [
      'Implemented advanced visualizations for equity differentials and remediation scenarios.',
      'Collaborated with data science teams to prototype predictive pay-adjustment modeling.',
      'Shipped cross-functional UX enhancements to accelerate insights.',
    ],
    tech: ['React', 'Redux', 'Django', 'Postgres'],
    category: 'Data Visualization',
    image: '/syndio.png',
  },
  {
    id: 'montaia',
    title: 'Montaia Global',
    subtitle: 'View project',
    description:
      'Enterprise events and lodging platform orchestrating logistics for global summits and retreats.',
    contributions: [
      'Coordinated distributed team delivering React/Redux front end and Node/Parse backend.',
      'Implemented travel planning workflows and high-performance data grids.',
      'Championed TDD culture with Mocha and Chai.',
    ],
    tech: ['React', 'Redux', 'Node.js', 'MongoDB'],
    category: 'Web Development',
    image: '/montaia.png',
  },
];
