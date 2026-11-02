import type { GameState } from '../game/types';

interface MarketViewProps {
  state: GameState;
  onBack: () => void;
  onBuy: (listingId: string) => void;
  onSell: (fragmentId: string) => void;
  onUseFragment: (fragmentId: string) => void;
}

export default function MarketView({ state, onBack, onBuy, onSell, onUseFragment }: MarketViewProps) {
  return (
    <div className="min-h-screen pt-16 pb-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-bone mb-2">🏪 Mercato delle Anime</h2>
          <p className="text-sm text-mist italic">
            Un luogo dove si commercia destino, non solo oggetti.
          </p>
        </div>

        {/* Player Resources */}
        <div className="card-dark rounded-xl p-4 mb-6">
          <h3 className="text-sm font-bold text-bone mb-3">Le Tue Risorse</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-rust">{state.cenere}</div>
              <div className="text-[10px] text-mist">Cenere</div>
            </div>
            <div>
              <div className="text-lg font-bold text-resonance">{state.fragments}</div>
              <div className="text-[10px] text-mist">Frammenti Base</div>
            </div>
            <div>
              <div className="text-lg font-bold text-fate">{state.fateFragments.length}</div>
              <div className="text-[10px] text-mist">Frammenti di Fato</div>
            </div>
            <div>
              <div className="text-lg font-bold text-ember">{state.equipment.length}</div>
              <div className="text-[10px] text-mist">Equipaggiamento</div>
            </div>
          </div>
        </div>

        {/* Market Listings */}
        <div className="card-dark rounded-xl p-4 mb-6">
          <h3 className="text-sm font-bold text-bone mb-3">🛒 Disponibile sul Mercato</h3>
          {state.marketListings.length === 0 ? (
            <p className="text-xs text-mist italic text-center py-4">
              Il mercato è vuoto. Torna più tardi.
            </p>
          ) : (
            <div className="space-y-2">
              {state.marketListings.map(listing => {
                const item = listing.item;
                const isFragment = 'description' in item;
                return (
                <div key={listing.id} className="border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-bone">{item.name}</div>
                    <div className="text-xs text-mist">{isFragment ? item.description : `${item.type}`}</div>
                    {listing.seller === 'bot' && (
                      <div className="text-[10px] text-fate mt-1">🤖 Venditore: Mercante Ombra</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-rust">{listing.price} 💰</span>
                    <button
                      onClick={() => onBuy(listing.id)}
                      disabled={state.cenere < listing.price}
                      className="px-3 py-1 rounded border border-resonance/30 text-resonance text-xs hover:bg-resonance/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Compra
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Player Fragments */}
        {state.fateFragments.length > 0 && (
          <div className="card-dark rounded-xl p-4 mb-6">
            <h3 className="text-sm font-bold text-bone mb-3">💎 I Tuoi Frammenti di Fato</h3>
            <div className="space-y-2">
              {state.fateFragments.map(fragment => (
                <div key={fragment.id} className="border border-fate/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-fate">{fragment.name}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onUseFragment(fragment.id)}
                        className="px-2 py-1 rounded border border-resonance/30 text-resonance text-xs hover:bg-resonance/10"
                      >
                        Usa
                      </button>
                      <button
                        onClick={() => onSell(fragment.id)}
                        className="px-2 py-1 rounded border border-rust/30 text-rust text-xs hover:bg-rust/10"
                      >
                        Vendi ({fragment.value * 10} 💰)
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-bone/70">{fragment.description}</div>
                  {fragment.constraint && (
                    <div className="text-[10px] text-mist mt-1">
                      ⚠️ Vincolo: richiede Fardello "{fragment.constraint}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onBack}
          className="w-full py-3 rounded-lg border border-gray-700 text-mist hover:text-bone hover:border-ember/30 transition-colors text-sm"
        >
          ← Torna al Villaggio
        </button>
      </div>
    </div>
  );
}
