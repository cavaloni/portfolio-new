import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ExternalLink, X } from 'lucide-react';
import type { Project } from '../data/projects';

interface ProjectModalProps {
  project: Project;
  onClose: () => void;
  onNavigate: (direction: 1 | -1) => void;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 20, scale: 0.98 },
};

const ProjectModal = ({ project, onClose, onNavigate }: ProjectModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowRight') {
        onNavigate(1);
      } else if (event.key === 'ArrowLeft') {
        onNavigate(-1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, onNavigate]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previouslyFocused?.focus();
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      role="presentation"
      onClick={onClose}
    >
      <motion.div
        ref={dialogRef}
        className="relative mx-4 grid max-h-[90vh] w-full max-w-5xl grid-cols-1 overflow-hidden rounded-[32px] border border-white/10 bg-night-soft/95 shadow-2xl shadow-black/40 focus:outline-none md:grid-cols-[1.1fr_1fr]"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${project.title} project details`}
      >
        <div className="relative hidden h-full w-full md:block">
          <img src={project.modalImage ?? project.image} alt={project.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto p-8 text-left sm:p-10">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-slate-200 transition hover:border-accent hover:text-accent"
            aria-label="Close project details"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-[0.4em] text-slate-400">{project.subtitle}</span>
            <h3 className="text-3xl font-semibold tracking-[0.2em] text-white">{project.title}</h3>
          </div>

          <p className="text-sm leading-relaxed text-slate-300">{project.description}</p>

          <div className="flex flex-col gap-4">
            <h4 className="text-xs uppercase tracking-[0.35em] text-slate-400">Key contributions</h4>
            <ul className="flex flex-col gap-3 text-sm leading-relaxed text-slate-200">
              {project.contributions.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-[6px] h-[6px] w-[6px] rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            {project.tech.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-400"
              >
                {tech}
              </span>
            ))}
          </div>

          {project.link ? (
            <a
              href={project.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-night transition hover:bg-accent-soft"
            >
              Visit Project <ExternalLink size={16} />
            </a>
          ) : null}

          <div className="mt-auto flex justify-between pt-4 text-xs uppercase tracking-[0.35em] text-slate-400">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 transition hover:border-accent hover:text-accent"
              onClick={() => onNavigate(-1)}
            >
              <ArrowLeft size={16} /> Previous
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 transition hover:border-accent hover:text-accent"
              onClick={() => onNavigate(1)}
            >
              Next <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProjectModal;
