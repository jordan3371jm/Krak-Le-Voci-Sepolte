import { t as T } from './i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from './game/useGame';
import { BIOMES } from './game/data/enemies';
import { corruptedUI, toast } from './game/engine/state';
import { initAudio, setMood, setMusic, setMusicVolume, setSfx, sfx } from './game/audio';
import Intro from './components/Intro';
import { Icon, ICON_NAMES } from './components/icons';
import HUD, { Nav } from './components/HUD';
import Village, { PortalScreen } from './components/Village';
import { Codex, GuideBar, UnlockCard } from './components/Guide';
import Delve from './components/Delve';
import Combat from './components/Combat';
import Hero from './components/Hero';
import Compass from './components/Compass';
import Modals from './components/Modals';
import { TalkOverlay } from './components/Talk';
import { BG } from './components/art';
import { Companions, Ending, Factions, Journal, Legacy, Market, Settings } from './components/Screens';

export default function App() {
  const { state: s, act, replace, saveNow } = useGame();
  const [codex, setCodex] = useState(false);

  // ---------------- audio come sistema ----------------
  useEffect(() => { setMusic(s.settings.music); }, [s.settings.music]);
  useEffect(() => { setMusicVolume(s.settings.musicVolume ?? 0.55); }, [s.settings.musicVolume]);
  useEffect(() => { setSfx(s.settings.sfx); }, [s.settings.sfx]);
  useEffect(() => {
    const root = s.combat ? (s.combat.kind === 'boss' ? 41 : 49) : s.delve ? BIOMES[s.delve.biome].drone : 55;
    setMood({ scene: s.scene !== 'game' ? 'menu' : s.combat ? (s.combat.kind === 'boss' || s.combat.kind === 'shadow' || s.combat.kind === 'trial' ? 'boss' : 'combat') : s.delve ? 'delve' : 'village', root, corruption: s.corruption, fullscreen: s.fullscreen, intensity: s.combat ? 1 : s.delve ? 0.5 : 0.1, silent: s.dissonance >= 15 });
  }, [s.scene, s.combat?.kind, !!s.combat, s.delve?.biome, Math.round(s.corruption / 10), s.fullscreen, s.dissonance >= 15]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const unlock = () => initAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);
  const prev = useRef({ r: s.resonance, d: s.dissonance, p: s.promises.length });
  useEffect(() => {
    if (Math.floor(s.resonance) > Math.floor(prev.current.r)) sfx.resonance();
    if (Math.floor(s.dissonance) > Math.floor(prev.current.d)) sfx.dissonance();
    if (s.promises.length > prev.current.p) sfx.chain();
    prev.current = { r: s.resonance, d: s.dissonance, p: s.promises.length };
  }, [s.resonance, s.dissonance, s.promises.length]);

  // ---------------- fullscreen come rito ----------------
  const toggleFullscreen = useCallback(() => {
    initAudio();
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => act(d => { d.fullscreen = !d.fullscreen; toast(d, d.fullscreen ? T('👁️ Il Rito ha inizio (modalità immersiva)') : T('Distogli lo sguardo dalla valle.'), 'fate'); }));
    else document.exitFullscreen?.().catch(() => {});
  }, [act]);
  useEffect(() => {
    const on = () => {
      const fs = !!document.fullscreenElement;
      act(d => {
        d.fullscreen = fs;
        toast(d, fs ? T('👁️ Il Rito ha inizio. La valle respira. Ascolta i sussurri.') : T('Distogli lo sguardo dalla valle. Alcune verità svaniscono.'), 'fate');
      });
    };
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, [act]);

  // ---------------- notifiche ----------------
  const firstToast = s.toasts[0]?.id;
  useEffect(() => {
    if (firstToast === undefined) return;
    const t = window.setTimeout(() => act(d => { d.toasts = d.toasts.filter(x => x.id !== firstToast); }), s.toasts.length > 3 ? 1800 : 3500);
    return () => window.clearTimeout(t);
  }, [firstToast, act]); // eslint-disable-line react-hooks/exhaustive-deps

  if (typeof location !== 'undefined' && location.hash === '#icone') return (
    <div className="p-6 grid grid-cols-6 sm:grid-cols-10 gap-4">{ICON_NAMES.map(n => <div key={n} className="text-center text-[10px] text-mist"><Icon name={n} size={64} /><div>{n}</div></div>)}</div>
  );
  if (s.scene === 'intro') return <Intro state={s} act={act} />;
  if (s.scene === 'ending') return <Ending state={s} act={act} replace={replace} />;
  if (!s.fardello) return <PortalScreen act={act} />;

  const corrupt = corruptedUI(s) && !s.settings.reduceFx;
  return (
    <div className={`min-h-screen noise ${corrupt ? 'ui-corrupt' : ''} ${s.settings.reduceFx ? 'reduce-fx' : ''}`}>
      {(() => { const k = s.delve ? s.delve.biome : s.tab === 'villaggio' ? 'villaggio' : ''; return k && BG[k] ? <div aria-hidden className="fixed inset-0 -z-0 pointer-events-none bg-cover bg-center opacity-35" style={{ backgroundImage: `linear-gradient(to bottom, rgba(5,4,6,.55), rgba(5,4,6,.9)), url(${BG[k]})` }} /> : null; })()}
      {corrupt && <div className="vignette vignette-corrupt" />}
      {s.fullscreen && !s.settings.reduceFx && <div className="vignette vignette-rite" />}
      <div className="sticky top-0 z-30">
        <HUD state={s} act={act} onFullscreen={toggleFullscreen} onCodex={() => setCodex(true)} onSave={saveNow} />
        <Nav state={s} act={act} />
      </div>
      {!s.combat && <GuideBar state={s} act={act} />}
      <main className="relative z-10 max-w-6xl mx-auto px-3 sm:px-4 py-4 pb-16">
        {s.combat ? <Combat state={s} act={act} /> : (
          <>
            {s.tab === 'villaggio' && <Village state={s} act={act} />}
            {s.tab === 'discesa' && <Delve state={s} act={act} />}
            {s.tab === 'eroe' && <Hero state={s} act={act} />}
            {s.tab === 'bussola' && <Compass state={s} act={act} />}
            {s.tab === 'mercato' && <Market state={s} act={act} />}
            {s.tab === 'fazioni' && <Factions state={s} />}
            {s.tab === 'spedizioni' && <Companions state={s} act={act} />}
            {s.tab === 'diario' && <Journal state={s} act={act} />}
            {s.tab === 'eredita' && <Legacy state={s} act={act} />}
            {s.tab === 'opzioni' && <Settings state={s} act={act} replace={replace} saveNow={saveNow} onFullscreen={toggleFullscreen} />}
          </>
        )}
      </main>
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 z-50 w-[min(92vw,360px)] space-y-1 pointer-events-none">
        {s.toasts.slice(-4).map(t => (
          <div key={t.id} className={`animate-rise rounded-lg px-3 py-1.5 text-xs sm:text-sm shadow-lg border bg-black/90 ${t.kind === 'good' ? 'border-resonance/60 text-teal-100' : t.kind === 'bad' ? 'border-dissonance/60 text-red-100' : t.kind === 'fate' ? 'border-fate/60 text-purple-100' : 'border-ember/40 text-bone'}`}>{t.text}</div>
        ))}
      </div>
      <Modals state={s} act={act} />
      <TalkOverlay state={s} act={act} />
      {!s.modal && !s.combat && s.codexQueue.length > 0 && <UnlockCard state={s} act={act} />}
      {codex && <Codex state={s} onClose={() => setCodex(false)} />}
    </div>
  );
}
