const Footer = () => {
  return (
    <footer id="contact" className="relative z-10 border-t border-white/10 bg-night-soft/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 sm:px-10 lg:px-24">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-4 text-left">
            <h4 className="text-2xl font-semibold tracking-[0.2em] text-white">Let&apos;s collaborate</h4>
            <p className="max-w-lg text-sm leading-relaxed text-slate-300">
              I craft immersive digital experiences rooted in empathy, accessibility, and performance. Reach out if
              you&apos;re building the future of AI tooling, data platforms, or product systems.
            </p>
          </div>
          <div className="flex flex-col gap-4 text-sm uppercase tracking-[0.35em] text-slate-400">
            <a href="mailto:avalon.chad@gmail.com" className="transition hover:text-accent">
              avalon.chad@gmail.com
            </a>
            <a href="https://www.linkedin.com/in/chad-avalon" className="transition hover:text-accent" target="_blank" rel="noreferrer">
              linkedin.com/in/chad-avalon
            </a>
            <a href="https://dev.chadavalon.com" className="transition hover:text-accent" target="_blank" rel="noreferrer">
              dev.chadavalon.com
            </a>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[0.3em] text-slate-500">
          <span>© {new Date().getFullYear()} Chad Avalon. All rights reserved.</span>
          <span>Portland, Oregon, United States</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
