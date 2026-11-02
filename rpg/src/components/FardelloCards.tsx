import { useState } from 'react';

interface FardelloData {
  name: string;
  origin: string;
  advantage: string;
  mechanicalCost: string;
  socialCost: string;
  resonance: string;
  echo: string;
  ascension: string[];
  shadow: string;
  fragment: string;
  color: string;
  icon: string;
}

const fardelli: FardelloData[] = [
  {
    name: 'Segnato dal Sacrificio',
    origin: 'Hai sacrificato un alleato per salvare altri.',
    advantage: '+danno contro nemici del Culto',
    mechanicalCost: 'Allucinazioni notturne, -10% salute max',
    socialCost: 'PNG diffidenti, alleati esitano',
    resonance: 'Si carica proteggendo alleati',
    echo: 'Eco del Sacrificio: danno pari alla salute persa',
    ascension: ['Martire della Valle', 'Giudice Silenzioso'],
    shadow: 'Il Martire Nero',
    fragment: 'Frammento del Patto Spezzato',
    color: '#c4421a',
    icon: '🩸',
  },
  {
    name: 'Debito di Sangue',
    origin: 'Hai stretto un patto con il Culto.',
    advantage: 'Accesso a rituali proibiti, visione notturna',
    mechanicalCost: 'Il Culto può reclamare favori in battaglia',
    socialCost: 'Bandito dai Guaritori, temuto dai Contadini',
    resonance: 'Si carica eseguendo rituali di sangue',
    echo: 'Eco del Sangue: cura sacrificando salute',
    ascension: ['Sacerdote del Vuoto', 'Parassita Sacro'],
    shadow: "L'Esattore",
    fragment: 'Frammento del Sigillo Rosso',
    color: '#8b1a1a',
    icon: '⛓️',
  },
  {
    name: 'Testimone Silenzioso',
    origin: 'Hai scelto di non intervenire quando avresti potuto.',
    advantage: 'Invisibilità aumentata, percezione migliorata',
    mechanicalCost: 'Non puoi usare abilità di gruppo',
    socialCost: 'Nessuna fazione si fida completamente',
    resonance: 'Si carica osservando senza agire',
    echo: "Eco del Silenzio: rivela segreti nascosti nell'area",
    ascension: ['Ombra Eterna', 'Cronista del Dolore'],
    shadow: 'Lo Specchio Vuoto',
    fragment: 'Frammento della Voce Perduta',
    color: '#a855f7',
    icon: '👁️',
  },
];

export default function FardelloCards() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
      {fardelli.map((f, i) => (
        <div
          key={f.name}
          onClick={() => setExpanded(expanded === i ? null : i)}
          className="card-dark rounded-xl p-5 cursor-pointer relative overflow-hidden group"
          style={{ borderColor: expanded === i ? f.color : undefined }}
        >
          {/* Background glow */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
            style={{ background: `radial-gradient(circle at center, ${f.color}, transparent)` }}
          />

          {/* Icon */}
          <div className="text-3xl mb-3">{f.icon}</div>

          {/* Name */}
          <h4 className="text-lg font-bold text-bone mb-1">{f.name}</h4>

          {/* Origin */}
          <p className="text-xs text-mist italic mb-3">{f.origin}</p>

          {/* Quick stats */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">▲</span>
              <span className="text-bone/80">{f.advantage}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">▼</span>
              <span className="text-bone/80">{f.mechanicalCost}</span>
            </div>
          </div>

          {/* Expanded content */}
          {expanded === i && (
            <div className="mt-4 pt-4 border-t border-gray-800 space-y-3 animate-slide-up">
              <div>
                <div className="text-xs font-semibold text-fate mb-1">Costo Sociale</div>
                <div className="text-xs text-bone/70">{f.socialCost}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-resonance mb-1">Risonanza</div>
                <div className="text-xs text-bone/70">{f.resonance}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-ember mb-1">Eco</div>
                <div className="text-xs text-bone/70">{f.echo}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-bone mb-1">Ascensioni</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {f.ascension.map(a => (
                    <span key={a} className="text-xs px-2 py-0.5 rounded-full border border-fate/30 text-fate/80">{a}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-dissonance mb-1">Ombra</div>
                <div className="text-xs text-bone/70">{f.shadow}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-rust mb-1">Frammento</div>
                <div className="text-xs text-bone/70">{f.fragment}</div>
              </div>
            </div>
          )}

          {/* Expand indicator */}
          <div className="absolute bottom-2 right-3 text-xs text-mist/50">
            {expanded === i ? '▲' : '▼'}
          </div>
        </div>
      ))}
    </div>
  );
}
