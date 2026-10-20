import { WorkOrder } from '../types.ts';

/**
 * Generates a self-contained single-file HTML document
 * containing the application logic, styles, and data
 * so it can be saved as index.html and opened directly in any browser.
 */
export function generateStandaloneHtml(currentOrders: WorkOrder[]): string {
  const serializedOrders = JSON.stringify(currentOrders, null, 2);

  return `<!doctype html>
<html lang="sv" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Jobbpaket & Leveranskontroll (Maximo / Medius)</title>
  <meta name="description" content="Industriellt planerings- och leveranskontrollsystem för underhållsplanering med Gate 1-5, materialspärr, LOTO, kitting och Medius-attestflöde." />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'system-ui', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          }
        }
      }
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <!-- Lucide icons via CDN -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @media print {
      body { background-color: #ffffff !important; color: #111827 !important; }
      .no-print { display: none !important; }
      .print-only { display: block !important; }
      .print-card { border: 1px solid #1f2937 !important; box-shadow: none !important; background: #ffffff !important; color: #000000 !important; }
    }
    @media screen {
      .print-only { display: none !important; }
    }
  </style>
</head>
<body class="bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen">
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect } = React;

    const INITIAL_DATA = ${serializedOrders};

    function App() {
      const [orders, setOrders] = useState(() => {
        try {
          const saved = localStorage.getItem('industrial_jobbpaket_orders_standalone');
          return saved ? JSON.parse(saved) : INITIAL_DATA;
        } catch {
          return INITIAL_DATA;
        }
      });

      const [selectedOrder, setSelectedOrder] = useState(null);
      const [gateFilter, setGateFilter] = useState('ALL');
      const [searchTerm, setSearchTerm] = useState('');
      const [levelFilter, setLevelFilter] = useState('ALL');
      const [theme, setTheme] = useState('dark');
      const [isPrintModal, setIsPrintModal] = useState(false);

      useEffect(() => {
        localStorage.setItem('industrial_jobbpaket_orders_standalone', JSON.stringify(orders));
      }, [orders]);

      useEffect(() => {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }, [theme]);

      const filteredOrders = orders.filter(o => {
        if (gateFilter !== 'ALL' && o.currentGate !== gateFilter) return false;
        if (levelFilter !== 'ALL' && o.level !== levelFilter) return false;
        if (searchTerm.trim()) {
          const s = searchTerm.toLowerCase();
          return o.id.toLowerCase().includes(s) || o.title.toLowerCase().includes(s) || o.position.toLowerCase().includes(s);
        }
        return true;
      });

      const handleUpdateOrder = (updated) => {
        setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
        if (selectedOrder && selectedOrder.id === updated.id) {
          setSelectedOrder(updated);
        }
      };

      const checkGate3 = (o) => {
        const mi = o.materialInspection;
        return mi.checkedAgainstDrawing && mi.transportUndamaged && mi.certificatesReceived && mi.physicallyKittedAndTagged && mi.shelfLocationConfirmed && mi.shelfLocation?.trim();
      };

      return (
        <div className="min-h-screen">
          {/* Header */}
          <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 sticky top-0 z-30 p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div>
                <h1 className="text-lg font-extrabold uppercase tracking-tight">Jobbpaket & Leveranskontroll</h1>
                <p className="text-xs text-zinc-500">Maximo EAM & Medius Flöde • Gate 1–5</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                  className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 text-xs font-semibold"
                >
                  {theme === 'dark' ? '☀️ Ljust Läge' : '🌙 Mörkt Läge'}
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('industrial_jobbpaket_orders_standalone');
                    setOrders(INITIAL_DATA);
                    setSelectedOrder(null);
                  }}
                  className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 text-xs"
                >
                  Återställ data
                </button>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
            {/* Gate Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map(g => {
                const count = orders.filter(o => o.currentGate === g).length;
                const isSelected = gateFilter === g;
                return (
                  <div
                    key={g}
                    onClick={() => setGateFilter(isSelected ? 'ALL' : g)}
                    className={\`p-3 rounded-xl border cursor-pointer transition-all \${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                    }\`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span>Gate {g}</span>
                      <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800">{count} AO</span>
                    </div>
                    <div className="text-xs font-bold mt-1">
                      {g === 1 && 'Nivåval'}
                      {g === 2 && 'Beredning'}
                      {g === 3 && 'SPÄRR: Material'}
                      {g === 4 && 'Utförande'}
                      {g === 5 && 'Slutbesiktning/Medius'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* List or Editor */}
            {selectedOrder ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b pb-4 dark:border-zinc-800">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold"
                    >
                      ← Tillbaka
                    </button>
                    <div>
                      <h2 className="text-lg font-bold font-mono">{selectedOrder.id}: {selectedOrder.title}</h2>
                      <p className="text-xs text-zinc-500">{selectedOrder.facility} ({selectedOrder.position}) • {selectedOrder.level}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold"
                  >
                    Skriv ut Kontrollblad
                  </button>
                </div>

                {/* Gate 3 Lock Warning & Checks */}
                <div className={\`p-4 rounded-xl border \${
                  selectedOrder.gate3Approved
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-900 dark:text-emerald-100'
                    : checkGate3(selectedOrder)
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300'
                    : 'bg-red-50 dark:bg-red-950/30 border-red-300 text-red-900 dark:text-red-100'
                }\`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm uppercase">
                        {selectedOrder.gate3Approved ? '✓ Gate 3 Godkänd & Klar' : checkGate3(selectedOrder) ? 'Gate 3 Redo att låsas' : 'SPÄRR AKTIV (Gate 3 Låst)'}
                      </h4>
                      <p className="text-xs">
                        {selectedOrder.gate3Approved ? 'Material och kittning är verifierat.' : 'Kan ej planeras eller låsas förrän alla materialkrav är ikryssade!'}
                      </p>
                    </div>
                    <div>
                      {selectedOrder.gate3Approved ? (
                        <button
                          onClick={() => handleUpdateOrder({ ...selectedOrder, gate3Approved: false, status: 'Blockerad', currentGate: 3 })}
                          className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-xs rounded font-semibold"
                        >
                          Lås upp Gate 3
                        </button>
                      ) : (
                        <button
                          disabled={!checkGate3(selectedOrder)}
                          onClick={() => handleUpdateOrder({ ...selectedOrder, gate3Approved: true, status: 'Klar', currentGate: 4 })}
                          className={\`px-4 py-2 text-xs font-bold rounded \${
                            checkGate3(selectedOrder)
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                              : 'bg-red-200 dark:bg-red-900 text-red-500 cursor-not-allowed'
                          }\`}
                        >
                          {checkGate3(selectedOrder) ? 'Godkänn för schemaläggning (Gate 3)' : 'SPÄRRAD: Godkänn för schemaläggning'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Checkpoints for Flik A */}
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-500">Checklista Flik A: Material & Kittning</h3>
                  {[
                    ['checkedAgainstDrawing', '1. Artikel kontrollerad mot ritning'],
                    ['transportUndamaged', '2. Transportskadefri okulärbesiktning'],
                    ['certificatesReceived', '3. Certifikat mottagna (3.1/CE)'],
                    ['physicallyKittedAndTagged', '4. Fysiskt kittad och märkt med AO-nummer'],
                    ['shelfLocationConfirmed', '5. Hyllplats angiven och bekräftad']
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center space-x-3 p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedOrder.materialInspection[key]}
                        onChange={(e) => {
                          const updated = {
                            ...selectedOrder,
                            materialInspection: { ...selectedOrder.materialInspection, [key]: e.target.checked }
                          };
                          handleUpdateOrder(updated);
                        }}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="text-xs font-medium">{label}</span>
                    </label>
                  ))}
                  <div className="pt-2">
                    <label className="text-xs font-semibold block mb-1">Hyllplats / Staging:</label>
                    <input
                      type="text"
                      value={selectedOrder.materialInspection.shelfLocation || ''}
                      onChange={(e) => {
                        const updated = {
                          ...selectedOrder,
                          materialInspection: { ...selectedOrder.materialInspection, shelfLocation: e.target.value.toUpperCase() }
                        };
                        handleUpdateOrder(updated);
                      }}
                      placeholder="t.ex. KITT-B14-02"
                      className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                {/* Checkpoints for Flik B */}
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-500">Checklista Flik B: Entreprenör & Tjänst (Medius)</h3>
                  {[
                    ['physicalInspectionDone', '1. Fysisk besiktning utförd & godkänd'],
                    ['guardsRestoredLotoRevoked', '2. Skydd återställda / LOTO formellt hävt'],
                    ['housekeepingApproved', '3. Städning & 5S godkänd'],
                    ['measurementProtocolsReceived', '4. Mätprotokoll & dokumentation mottagen'],
                    ['hoursAndMaterialReconciled', '5. Timmar & material avstämda för attest i Medius']
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center space-x-3 p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedOrder.serviceInspection[key]}
                        onChange={(e) => {
                          const updated = {
                            ...selectedOrder,
                            serviceInspection: { ...selectedOrder.serviceInspection, [key]: e.target.checked }
                          };
                          handleUpdateOrder(updated);
                        }}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="text-xs font-medium">{label}</span>
                    </label>
                  ))}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-xs font-semibold block mb-1">Medius PO-nummer:</label>
                      <input
                        type="text"
                        value={selectedOrder.serviceInspection.mediusPoNumber || ''}
                        onChange={(e) => {
                          const updated = {
                            ...selectedOrder,
                            serviceInspection: { ...selectedOrder.serviceInspection, mediusPoNumber: e.target.value }
                          };
                          handleUpdateOrder(updated);
                        }}
                        className="w-full px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">Maximo Status:</label>
                      <select
                        value={selectedOrder.serviceInspection.maximoStatusAfterInspection || 'TECO'}
                        onChange={(e) => {
                          const updated = {
                            ...selectedOrder,
                            serviceInspection: { ...selectedOrder.serviceInspection, maximoStatusAfterInspection: e.target.value }
                          };
                          handleUpdateOrder(updated);
                        }}
                        className="w-full px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
                      >
                        <option value="VÄNTAR">VÄNTAR</option>
                        <option value="PÅG">PÅG</option>
                        <option value="TECO">TECO</option>
                        <option value="AVSL">AVSL</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Work Orders Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map(order => {
                  const isBlocked = order.currentGate === 3 && !checkGate3(order);
                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-600 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-base">{order.id}</span>
                        <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full \${
                          order.status === 'Klar' ? 'bg-emerald-100 text-emerald-800' :
                          order.status === 'Blockerad' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }\`}>
                          {order.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm mb-1">{order.title}</h3>
                      <p className="text-xs text-zinc-500 mb-3">{order.facility} ({order.position})</p>
                      <div className="flex items-center justify-between text-xs pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <span className="font-mono text-blue-600 font-semibold">{order.level}</span>
                        <span className="font-mono font-bold text-zinc-600 dark:text-zinc-400">Gate {order.currentGate}/5</span>
                      </div>
                      {isBlocked && (
                        <div className="mt-2 text-[11px] p-2 rounded bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 font-bold">
                          SPÄRR: Materialkontroll saknas!
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>`;
}
