import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Expertise from './components/Expertise';
import Projects from './components/Projects';
import ProjectModal from './components/ProjectModal';
import CallToAction from './components/CallToAction';
import Experience from './components/Experience';
import Footer from './components/Footer';
import FloatingActions from './components/FloatingActions';
import type { Project, ProjectCategory } from './data/projects';
import { PROJECT_CATEGORIES, projects } from './data/projects';

const App = () => {
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory>('All');
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const filteredProjects = useMemo(() => {
    if (selectedCategory === 'All') {
      return projects;
    }

    return projects.filter((project) => project.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="relative min-h-screen bg-night text-white">
      <div className="bg-noise" />
      <div className="blur-glow top-[-20%] left-[-10%] h-72 w-72 bg-accent/40" />
      <div className="blur-glow right-[3%] h-96 w-96 bg-highlight/30" />
      <Navbar />
      <main className="relative z-10 flex flex-col gap-32 px-6 pb-32 sm:px-10 lg:px-24">
        <section id="home" className="pt-28">
          <Hero onOpenProject={setActiveProject} />
        </section>
        <section id="expertise">
          <Expertise />
        </section>
        <section id="work">
          <Projects
            categories={PROJECT_CATEGORIES}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            projects={filteredProjects}
            onOpenProject={setActiveProject}
          />
        </section>
        <section id="experience" className="space-y-32">
          <Experience />
          <CallToAction />
        </section>
      </main>
      <Footer />
      <FloatingActions />
      <AnimatePresence>
        {activeProject ? (
          <ProjectModal
            project={activeProject}
            onClose={() => setActiveProject(null)}
            onNavigate={(direction: 1 | -1) => {
              const currentIndex = filteredProjects.findIndex((project) => project.id === activeProject.id);
              if (currentIndex === -1) return;

              const nextIndex = (currentIndex + direction + filteredProjects.length) % filteredProjects.length;
              setActiveProject(filteredProjects[nextIndex]);
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default App;
