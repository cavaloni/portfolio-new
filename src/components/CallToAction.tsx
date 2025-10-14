import { Mail, MessageCircle } from 'lucide-react';

const CallToAction = () => {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-8 rounded-[32px] border border-white/10 bg-gradient-to-br from-night-soft/80 via-night/90 to-night-soft/80 px-8 py-16 text-center shadow-glass sm:px-16">
      <h3 className="text-3xl font-semibold tracking-[0.2em] text-white sm:text-4xl">
        Available for select freelance opportunities
      </h3>
      <p className="mx-auto max-w-3xl text-sm leading-relaxed text-slate-300">
        Have an exciting project you need help with? Send me an email or contact me via instant message. I blend AI,
        front end craft, and product systems expertise to launch experiences that resonate.
      </p>
      <div className="flex flex-wrap justify-center gap-4 text-xs uppercase tracking-[0.35em]">
        <a
          href="mailto:avalon.chad@gmail.com"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-slate-200 transition hover:border-accent hover:text-accent"
        >
          <Mail size={16} /> Email Me
        </a>
        <a
          href="https://www.linkedin.com/in/chad-avalon"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-slate-200 transition hover:border-accent hover:text-accent"
        >
          <MessageCircle size={16} /> Connect on LinkedIn
        </a>
      </div>
    </section>
  );
};

export default CallToAction;
