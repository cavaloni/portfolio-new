import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { Project, ProjectCategory } from '../data/projects';
import { projects as allProjects } from '../data/projects';

interface ProjectsProps {
  categories: ProjectCategory[];
  selectedCategory: ProjectCategory;
  onCategoryChange: (category: ProjectCategory) => void;
  projects: Project[];
  onOpenProject: (project: Project) => void;
}

const Projects = ({ categories, selectedCategory, onCategoryChange, projects, onOpenProject }: ProjectsProps) => {
  const categoryCounts = useMemo(() => {
    return allProjects.reduce<Record<ProjectCategory, number>>(
      (acc, project) => {
        acc.All += 1;
        acc[project.category] += 1;
        return acc;
      },
      {
        All: 0,
        'Data Visualization': 0,
        'Web Development': 0,
      },
    );
  }, []);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12">
      <div className="flex flex-col gap-6 text-slate-300">
        <div>
          <p className="text-xs uppercase tracking-[0.45em] text-slate-500">Portfolio</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[0.25em] text-white sm:text-5xl">My Work</h2>
        </div>
        <p className="max-w-3xl text-base leading-relaxed text-slate-400">
          Senior Software Engineer blending AI, frontend, and product systems. I build carbon-aware AI infrastructures,
          sleep-tech dashboards, and global SaaS platforms—always with an eye on empathy, performance, and innovation.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.35em] text-slate-400">
        <span className="text-slate-500">Filter by</span>
        <div className="flex flex-wrap gap-3">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryChange(category)}
              className={`rounded-full border px-4 py-2 transition-all ${
                selectedCategory === category
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:border-accent/40 hover:text-white'
              }`}
            >
              {category}{' '}
              <span className="text-slate-500">({categoryCounts[category] ?? 0})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {projects.map((project) => (
          <motion.article
            key={project.id}
            layout
            whileHover={{ y: -6 }}
            className="group cursor-pointer overflow-hidden rounded-3xl border border-white/5 bg-night-soft/70 shadow-glass transition"
            onClick={() => onOpenProject(project)}
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <img
                src={project.image}
                alt={project.title}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6 text-left">
                <span className="text-xs uppercase tracking-[0.45em] text-slate-400">{project.subtitle}</span>
                <h3 className="text-2xl font-semibold tracking-wide text-white">{project.title}</h3>
              </div>
              <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-night/60 text-white transition group-hover:border-accent group-hover:text-accent">
                <ArrowUpRight size={18} />
              </span>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-white/5 px-6 py-4">
              {project.tech.slice(0, 4).map((tech) => (
                <span key={tech} className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-400">
                  {tech}
                </span>
              ))}
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
};

export default Projects;
