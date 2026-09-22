import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border bg-zinc-950/80 py-10 sm:py-12 text-center text-xs sm:text-sm text-zinc-500 px-4">
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* Redes Sociais */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Acompanhe nossas redes:
          </span>
          
          <div className="flex items-center gap-3">
            {/* Instagram */}
            <a
              href="https://www.instagram.com/propatchbr/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram ProPatch BR"
              className="group inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition-all duration-200 hover:border-pink-500/50 hover:bg-gradient-to-r hover:from-pink-950/30 hover:to-purple-950/30 hover:text-pink-300 hover:shadow-lg hover:shadow-pink-950/30 hover:-translate-y-0.5"
            >
              <svg 
                className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-pink-400" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
              <span>@propatchbr</span>
            </a>

            {/* YouTube */}
            <a
              href="https://www.youtube.com/@ProPatchBR"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Canal no YouTube ProPatch BR"
              className="group inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition-all duration-200 hover:border-red-500/50 hover:bg-red-950/30 hover:text-red-300 hover:shadow-lg hover:shadow-red-950/30 hover:-translate-y-0.5"
            >
              <svg 
                className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-red-400" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span>@ProPatchBR</span>
            </a>
          </div>
        </div>

        {/* Linha Divisória Sutil */}
        <div className="mx-auto max-w-xs border-t border-zinc-800/60" />

        {/* Copyright e Créditos */}
        <div className="space-y-1.5">
          <p>
            © 2026 ProPatch BR. Todos os direitos reservados. •{' '}
            <Link href="/licenca" className="underline underline-offset-4 hover:text-primary transition-colors">
              Licença MIT
            </Link>
          </p>
          <p>
            Desenvolvido por{' '}
            <span className="font-semibold text-zinc-300">Jeann Lucas</span>
            {' '}||{' '}
            <span className="text-zinc-400">CEO</span>{' '}
            <a
              href="https://bigdevz.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-zinc-300 hover:text-primary transition-colors underline underline-offset-4"
            >
              BigDev.Z - IT Consulting
            </a>
          </p>
          <p className="text-[11px] text-zinc-600 pt-1">
            Não afiliado à Konami. Projeto independente de modding e nostalgia gamer para PlayStation 2.
          </p>
        </div>

      </div>
    </footer>
  );
}

export default Footer;
