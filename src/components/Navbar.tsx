import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { href: '#home', label: '// home' },
  { href: '#expertise', label: '// expertise' },
  { href: '#work', label: '// work' },
  { href: '#experience', label: '// experience' },
  { href: '#contact', label: '// contact' },
];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 transition-all duration-500 ${
        isScrolled ? 'backdrop-blur-lg bg-night/80 shadow-xl shadow-black/20' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-5 sm:px-10 lg:px-12">
        <a href="#home" className="text-xl font-semibold tracking-[0.25em] text-accent sm:text-2xl">
          ChadAvalon<span className="text-highlight">._</span>
        </a>
        <nav className="hidden items-center gap-8 text-xs uppercase tracking-[0.35em] text-slate-300 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative py-2 transition-colors hover:text-white"
            >
              {link.label}
              <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-accent transition-transform duration-300 hover:scale-x-100" />
            </a>
          ))}
        </nav>
        <button
          type="button"
          className="rounded-full border border-white/10 p-2 text-slate-200 transition hover:border-accent hover:text-white md:hidden"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? 'Close navigation' : 'Open navigation'}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      <div
        className={`md:hidden ${open ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'} grid transform border-t border-white/10 bg-night-soft px-6 shadow-xl transition-all duration-300`}
      >
        <nav className="overflow-hidden pb-6">
          <ul className="flex flex-col gap-4 text-sm uppercase tracking-[0.3em] text-slate-300">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block py-2 transition hover:text-white"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
