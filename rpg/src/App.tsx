import { t as T } from './i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from './game/useGame';
import { heroStats } from './game/engine/hero';
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
import { KrakWake } from './components/KrakWake';
import { gameReady, interstitial, platformMessage, setBanner, bannerSupported } from './game/platform';
import { hasTrack, playClip, playTrack } from './game/music';
import { setRecorded } from './game/audio';
import { BG } from './components/art';
import { Eyes, Fog, Particles, Whispers } from './components/Atmosphere';
import { Companions, Ending, Factions, Journal, Legacy, Market, Settings } from './components/Screens';

export default function App() {
  const { state: s, act, replace, saveNow } = useGame();
  const [codex, setCodex] = useState(false);
  const screenKey = s.combat ? 'c' : s.delve ? 'd' + (s.delve.room ? 'r' : '') : s.tab;
  const [fresh, setFresh] = useState(true);
  useEffect(() => { setFresh(true); const tm = window.setTimeout(() => setFresh(false), 750); return () => window.clearTimeout(tm); }, [screenKey]);

  // ---------------- piattaforma (Playgama Bridge) ----------------
  useEffect(() => { const id = window.setTimeout(gameReady, 300); return () => window.clearTimeout(id); }, []);
  const inDelve = !!s.delve;
  const delveBiome = s.delve?.biome;
  const wasDelve = useRef(inDelve);
  useEffect(() => {
    if (inDelve && !wasDelve.current) platformMessage('level_started', { world: delveBiome || '', level: String(s.delve?.floor || 1) });
    if (!inDelve && wasDelve.current) {
      platformMessage(s.lastReport?.good === false ? 'level_failed' : 'level_completed');
      interstitial('delve_end');
    }
    wasDelve.current = inDelve;
  }, [inDelve]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (s.scene === 'ending') interstitial('cycle_end'); }, [s.scene]);
  // pause naturali: il gioco offre un annuncio solo se il giocatore non sta combattendo, parlando o scegliendo;
  // è il Bridge a decidere se mostrarlo davvero (al massimo uno ogni 5 minuti, vedi la configurazione)
  const calm = s.scene === 'game' && !s.combat && !s.talk && !s.modal && (!s.delve || (s.delve.floorCleared && !s.delve.room?.bossChoice));
  const calmRef = useRef(calm); calmRef.current = calm;
  useEffect(() => { const id = window.setInterval(() => { if (calmRef.current && !document.hidden) interstitial('pause'); }, 30_000); return () => window.clearInterval(id); }, []);
  // banner in basso solo quando la scena è tranquilla e fuori dai dungeon
  const idle = s.scene !== 'game' || (!s.combat && !s.delve && !s.talk && !s.modal);
  useEffect(() => { setBanner(idle); }, [idle]);

  // ---------------- audio come sistema ----------------
  useEffect(() => { setMusic(s.settings.music); }, [s.settings.music]);
  useEffect(() => { setMusicVolume(s.settings.musicVolume ?? 0.55); }, [s.settings.musicVolume]);
  useEffect(() => { setSfx(s.settings.sfx); }, [s.settings.sfx]);
  useEffect(() => {
    const root = s.combat ? (s.combat.kind === 'boss' ? 41 : 49) : s.delve ? BIOMES[s.delve.biome].drone : 55;
    setMood({ scene: s.scene !== 'game' ? 'menu' : s.combat ? (s.combat.kind === 'boss' || s.combat.kind === 'shadow' || s.combat.kind === 'trial' ? 'boss' : 'combat') : s.delve ? 'delve' : 'village', root, corruption: s.corruption, fullscreen: s.fullscreen, intensity: s.combat ? 1 : s.delve ? 0.5 : 0.1, silent: s.dissonance >= 15 });
  }, [s.scene, s.combat?.kind, !!s.combat, s.delve?.biome, Math.round(s.corruption / 10), s.fullscreen, s.dissonance >= 15]); // eslint-disable-line react-hooks/exhaustive-deps
  // effetti registrati nei momenti chiave
  const phase = s.combat?.phase;
  useEffect(() => { if (phase === 'won') playClip('vittoria'); if (phase === 'lost') playClip('sconfitta'); }, [phase]);
  const lvl = useRef(s.hero.level);
  useEffect(() => { if (s.hero.level > lvl.current) playClip('livello'); lvl.current = s.hero.level; }, [s.hero.level]);
  const fard = useRef(s.fardello);
  useEffect(() => { if (s.fardello && !fard.current) playClip('fardello', 1); fard.current = s.fardello; }, [s.fardello]);
  const om = useRef(s.omens.length);
  useEffect(() => { if (s.omens.length > om.current) playClip('presagio'); om.current = s.omens.length; }, [s.omens.length]);
  const moods = s.companions.map(c => c.mood || '').join(',');
  const prevMoods = useRef(moods);
  useEffect(() => {
    const a = prevMoods.current.split(','), b = moods.split(',');
    b.forEach((m, i) => { if (m !== a[i]) { if (m === 'virtue') playClip('virtu'); if (m === 'broken') playClip('spezzato'); } });
    prevMoods.current = moods;
  }, [moods]);
  // colonna sonora registrata (se presente per la scena)
  const dark = s.corruption >= 60 || s.valley.eclipseUntil > Date.now();
  const track = s.flags.includes('krak_wake_pending') ? 'krak'
    : s.scene === 'intro' ? 'menu' : s.scene === 'ending' ? 'finale' : !s.fardello ? 'portale'
    : s.combat ? (s.combat.kind === 'worldboss' ? 'colosso' : ['boss', 'shadow', 'trial', 'hunter'].includes(s.combat.kind) ? 'boss' : 'combattimento')
    : s.delve ? s.delve.biome : s.tab === 'mercato' ? 'mercato' : dark ? 'villaggio_notte' : 'villaggio';
  useEffect(() => {
    const t = hasTrack(track) ? track : track === 'villaggio_notte' && hasTrack('villaggio') ? 'villaggio' : track === 'colosso' && hasTrack('boss') ? 'boss' : null;
    setRecorded(!!t); playTrack(t);
  }, [track]);
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
      {(() => { const k = s.delve ? s.delve.biome : s.tab === 'villaggio' ? 'villaggio' : ''; return k && BG[k] ? <div aria-hidden className="fixed inset-0 -z-0 pointer-events-none overflow-hidden"><div className="absolute inset-0 bg-cover bg-center opacity-40 kenburns" style={{ backgroundImage: `url(${BG[k]})` }} /><div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(5,4,6,.55), rgba(5,4,6,.92))' }} /></div> : null; })()}
      {!s.settings.reduceFx && <>
        <Particles mode={s.combat ? 'combat' : s.delve ? 'delve' : 'village'} tint={s.delve?.biome === 'paludi' ? '220,40,40' : s.delve?.biome === 'torre' ? '170,120,255' : s.delve?.biome === 'abisso' ? '120,200,255' : '255,140,60'} intensity={s.combat ? 0.7 : 1} />
        <Fog />
        {(s.delve || s.corruption > 20) && <Whispers every={s.delve ? 45 : 90} corruption={s.corruption} />}
        {s.delve && !s.combat && <Eyes every={35} />}
      </>}
      {(s.delve || s.combat) && s.hero.hp < heroStats(s).maxHp * 0.3 && !s.settings.reduceFx && <div className="vignette vignette-low" />}
      {corrupt && <div className="vignette vignette-corrupt" />}
      {s.fullscreen && !s.settings.reduceFx && <div className="vignette vignette-rite" />}
      <div className="sticky top-0 z-30">
        <HUD state={s} act={act} onFullscreen={toggleFullscreen} onCodex={() => setCodex(true)} onSave={saveNow} />
        <Nav state={s} act={act} />
      </div>
      {!s.combat && <GuideBar state={s} act={act} />}
      <main className={`${fresh ? "stagger-root" : ""} relative z-10 max-w-6xl mx-auto px-3 sm:px-4 py-4 ${bannerSupported() ? "pb-32" : "pb-16"}`}>
        {s.combat ? <Combat state={s} act={act} /> : (
          <>
            {s.tab === 'villaggio' && <Village state={s} act={act} />}
            {s.tab === 'discesa' && <Delve state={s} act={act} />}
            {s.tab === 'eroe' && <Hero state={s} act={act} />}
            {s.tab === 'bussola' && <Compass state={s} act={act} />}
            {s.tab === 'mercato' && <Market state={s} act={act} />}
            {s.tab === 'fazioni' && <Factions state={s} act={act} />}
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
      <KrakWake state={s} act={act} />
      {!s.modal && !s.combat && s.codexQueue.length > 0 && <UnlockCard state={s} act={act} />}
      {codex && <Codex state={s} onClose={() => setCodex(false)} />}
    </div>
  );
}
