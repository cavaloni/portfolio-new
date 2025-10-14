import { ChevronDown, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Project } from '../data/projects';
import { projects } from '../data/projects';

interface HeroProps {
  onOpenProject: (project: Project) => void;
}

const Hero = ({ onOpenProject }: HeroProps) => {
  const featureProject = projects[0];

  return (
    <div className="relative flex min-h-[70vh] flex-col justify-center overflow-hidden bg-gradient-to-b from-night-soft/80 via-night to-night-soft/90 py-24">
      <div className="absolute left-[-10%] top-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] h-96 w-96 rounded-full bg-highlight/15 blur-3xl" />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-16 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:px-12">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex flex-col items-start gap-8 text-left"
        >
          <div className="relative h-36 w-36 overflow-hidden rounded-3xl bg-night-soft shadow-xl shadow-black/30 sm:h-48 sm:w-48">
            <img src="/chad-profile.png" alt="Chad Avalon portrait" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-night via-transparent to-transparent" />
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-xs uppercase tracking-[0.45em] text-slate-400">Senior Software Engineer</span>
            <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl md:text-7xl">
              <span className="block">CHAD</span>
              <span className="block">AVALON</span>
            </h1>
            <p className="max-w-xl text-sm uppercase tracking-[0.35em] text-slate-400 sm:text-base">
              AI, FRONT END, &amp; PRODUCT SYSTEMS
            </p>
          </div>

          <motion.div
            className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('open-download-modal'))}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-indigo-500 sm:text-sm"
            >
              Download CV
            </button>
            <button
              type="button"
              onClick={() => onOpenProject(featureProject)}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-accent hover:text-accent sm:text-sm"
            >
              View Latest Work <ExternalLink size={16} />
            </button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className="relative h-[360px] sm:h-[440px] lg:h-[520px]"
        >
          <motion.div
            className="absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2"
            animate={{ rotate: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 16, ease: 'easeInOut' }}
          >
            <motion.div
              className="absolute h-56 w-56 -translate-x-12 -translate-y-12 rounded-3xl bg-gradient-to-br from-accent/25 to-accent/5"
              animate={{ y: [0, -18, 0] }}
              transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute h-56 w-56 translate-x-12 translate-y-8 rounded-3xl bg-gradient-to-br from-orange-500/40 to-orange-300/10"
              animate={{ y: [0, 18, 0] }}
              transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute right-0 top-0 h-20 w-20 translate-x-10 -translate-y-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 opacity-70 blur-2xl"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
            />
          </motion.div>

          <motion.div
            className="absolute inset-0"
            animate={{ rotate: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 20, ease: 'easeInOut' }}
          >
            <div className="absolute top-1/4 left-1/4 h-28 w-28 rounded-xl border border-accent/15" />
            <div className="absolute bottom-1/4 right-1/4 h-24 w-24 rounded-xl border border-accent/10 rotate-45" />
          </motion.div>
        </motion.div>
      </div>

      <button
        type="button"
        onClick={() => document.getElementById('expertise')?.scrollIntoView({ behavior: 'smooth' })}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 text-accent"
        aria-label="Scroll to expertise section"
      >
        <ChevronDown className="h-8 w-8 animate-bounce" />
      </button>
    </div>
  );
};

export default Hero;
