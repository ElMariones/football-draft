'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useCareerStore } from '@/store/careerStore';
import { careerT } from '@/lib/career/i18n';
import CareerWizard from '@/components/career/CareerWizard';
import CareerHud from '@/components/career/CareerHud';
import CareerOffseason from '@/components/career/CareerOffseason';
import CareerTimeline from '@/components/career/CareerTimeline';
import CareerSummary from '@/components/career/CareerSummary';
import ArchetypePicker from '@/components/career/ArchetypePicker';
import PreseasonCards from '@/components/career/PreseasonCards';
import MomentModal from '@/components/career/MomentModal';
import LegacyPanel from '@/components/career/LegacyPanel';
import { NationalTeamPanel } from '@/components/career/NationalTeam';
import { AchievementToasts, AchievementsBook } from '@/components/career/Achievements';
import Celebration from '@/components/career/Celebration';
import MiniGame from '@/components/career/MiniGame';

export default function CareerPage() {
  const language = useGameStore(s => s.language);
  const setStoreLang = useGameStore(s => s.setLanguage);
  const {
    lang, phase, player, stages, trophies, offseason, year,
    celebrating, dismissCelebration,
    setLang, startCareer, reset, retireDecision,
  } = useCareerStore();

  useEffect(() => { setLang(language === 'en' ? 'en' : 'es'); }, [language, setLang]);

  // Jump back to the top whenever the game moves to a new beat. Doing this in
  // the "play season" click handler alone missed every other path — dismissing
  // a moment, the retire prompt, picking an archetype — and could also fire
  // before the new (shorter) content had rendered, leaving the window scrolled
  // past the end. Keying it on the year and phase covers all of them.
  useEffect(() => {
    if (phase === 'landing') return;
    const id = window.requestAnimationFrame(() =>
      window.scrollTo({ top: 0, behavior: 'smooth' }));
    return () => window.cancelAnimationFrame(id);
  }, [year, phase]);
  const t = careerT(lang);

  return (
    <main className="min-h-screen text-white px-3 sm:px-6 py-4 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-wc to-wc-dark text-black grid place-items-center font-display">⚽</span>
          <span className="font-display text-lg tracking-wide text-white/80 group-hover:text-white">{t.brand}</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStoreLang(language === 'en' ? 'es' : 'en')}
            className="btn-icon text-xs font-display tracking-widest"
            title="Switch language / Cambiar idioma"
          >
            {language === 'en' ? 'ES' : 'EN'}
          </button>
          <AchievementsBook lang={lang} />
          <Link href="/" className="btn-ghost text-sm">{t.exit}</Link>
        </div>
      </header>

      {phase === 'landing' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto text-center pt-8">
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-7xl mb-4">🏆</motion.div>
          <h1 className="font-display text-5xl sm:text-6xl leading-none mb-4">{t.heroTitle}</h1>
          <p className="text-white/60 mb-8">{t.heroDesc}</p>
          <button onClick={startCareer} className="btn-primary text-xl px-10">{t.start}</button>
        </motion.div>
      )}

      {phase === 'wizard' && <CareerWizard lang={lang} />}

      {phase === 'archetype' && <ArchetypePicker lang={lang} />}

      {(phase === 'career' || phase === 'moment' || phase === 'retire-decision') && player && (
        // Three rails: your card on the left, the actual decisions in the wide
        // middle, the timeline on the right. The side rails stick and scroll
        // internally so the season you are playing stays on screen.
        <div className="grid grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)_300px] gap-5 items-start">
          <div className="space-y-4 lg:sticky lg:top-4 order-2 lg:order-1">
            <CareerHud player={player} trophies={trophies} lang={lang} />
            <LegacyPanel lang={lang} />
            <NationalTeamPanel lang={lang} />
          </div>

          <div className="space-y-4 order-1 lg:order-2">
            {(phase === 'career' || phase === 'moment') && <PreseasonCards lang={lang} />}
            {(phase === 'career' || phase === 'moment') && <CareerOffseason lang={lang} />}
            {phase === 'retire-decision' && (
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="card p-5 text-center">
                <motion.div animate={{ rotate: [0, -8, 8, -4, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1 }} className="text-5xl mb-2">🥾</motion.div>
                <h3 className="font-display text-2xl mb-1">{t.retireQ}</h3>
                <p className="text-white/60 text-sm mb-4">{t.retireDesc}</p>
                <div className="flex gap-3 justify-center">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => retireDecision(true)} className="btn-ghost">{t.oneMoreYear}</motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => retireDecision(false)} className="btn-primary">{t.retire}</motion.button>
                </div>
              </motion.div>
            )}
          </div>
          <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] overflow-y-auto order-3">
            <CareerTimeline
              player={player} stages={stages} lang={lang}
              choosing={phase === 'career' && !!offseason && !offseason.chosenClubId}
            />
          </div>
          {phase === 'moment' && <MomentModal lang={lang} />}
        </div>
      )}

      {phase === 'summary' && player && (
        <CareerSummary player={player} stages={stages} trophies={trophies} lang={lang} onReplay={reset} />
      )}
      <MiniGame lang={lang} />
      <Celebration title={celebrating} lang={lang} onDone={dismissCelebration} />
      <AchievementToasts lang={lang} />
    </main>
  );
}
