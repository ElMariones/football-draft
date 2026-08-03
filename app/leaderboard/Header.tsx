'use client';

// The page title and subtitle. A client component purely so it can read the
// language the rest of the app is already using — the page itself is a server
// component and has no access to the store.
import Link from 'next/link';
import { useGameStore } from '@/store/gameStore';

const T = {
  back: { en: '← Back', es: '← Volver' },
  title: { en: 'Leaderboard', es: 'Tabla de clasificación' },
  careerSub: {
    en: 'Whole careers, ranked. No account needed — the name you give your player is the entry.',
    es: 'Carreras enteras, ordenadas. No hace falta cuenta: el nombre que le pones a tu jugador es la entrada.',
  },
  bothSub: {
    en: 'Draft XI ranks squads and campaigns, best run per player. Career mode ranks whole careers — no account needed, rolled seeds only.',
    es: 'Draft XI ordena plantillas y campañas, la mejor partida por jugador. Modo carrera ordena carreras enteras: sin cuenta y solo con semillas sorteadas.',
  },
} as const;

export default function LeaderboardHeader({ only }: { only?: 'draft' | 'career' }) {
  const language = useGameStore(s => s.language);
  const lang: 'en' | 'es' = language === 'en' ? 'en' : 'es';

  return (
    <div className="mb-6">
      <Link href="/" className="btn-ghost text-xs inline-block mb-3">{T.back[lang]}</Link>
      <h1 className="font-display text-3xl sm:text-4xl tracking-wide">{T.title[lang]}</h1>
      <p className="text-sm text-white/50 mt-1">
        {only === 'career' ? T.careerSub[lang] : T.bothSub[lang]}
      </p>
    </div>
  );
}
