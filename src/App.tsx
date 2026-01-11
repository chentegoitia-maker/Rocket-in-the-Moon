import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
// Se importa la instancia real de Firebase Firestore
import { db } from './config/firebase';
import { doc, runTransaction } from "firebase/firestore";
import { AppView, User, PhenomenonType } from './types';
import { store } from './services/mockStore';
import Login from './views/Login';
import Register from './views/Register';
import UserDashboard from './views/UserDashboard';
import WorldView from './views/WorldView';
import MarketView from './views/MarketView';
import AdminDashboard from './views/AdminDashboard';
import Profile from './views/Profile';
import HistoryView from './views/HistoryView';
import BankingView from './views/BankingView';
import WithdrawView from './views/WithdrawView';
import { EffectLayer } from './components/EffectLayer';
import { AlertTriangle, Check, Activity, Volume2, ShieldCheck, Zap, TrendingUp, AlertCircle, Scale, ShieldAlert, Info } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  const [cycleTime, setCycleTime] = useState(300); 
  const [insuranceTime, setInsuranceTime] = useState(0); 
  const [phenomenon, setPhenomenon] = useState(store.getPhenomenon());
  const [conditionsAccepted, setConditionsAccepted] = useState(false);
  const [actionModal, setActionModal] = useState<{msg: string, type: 'success' | 'process'} | null>(null);
  
  const [sirenActive, setSirenActive] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const sirenIntervalRef = useRef<number | null>(null);
  const lastProcessedCycleRef = useRef<number>(-1);

  const announce = useCallback(async (text: string, voiceName: string = 'Kore') => {
    if (isAnnouncing) return;
    setIsAnnouncing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        const bytes = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) { channelData[i] = dataInt16[i] / 32768.0; }
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start();
      }
    } catch (e) {
      console.error("TTS Error:", e);
    } finally {
        setTimeout(() => setIsAnnouncing(false), 5000);
    }
  }, [isAnnouncing]);
  
  const announcePhenomenon = useCallback((type: PhenomenonType) => {
    const names = {
      [PhenomenonType.SOLAR_STORM]: "Tormenta Solar",
      [PhenomenonType.ALIEN_ATTACK]: "Ataque Alienígena",
      [PhenomenonType.METEOR_SHOWER]: "Lluvia de Meteoritos"
    };
    const text = `Atención colonos. Se ha detectado una ${names[type]} aproximándose. El impacto ocurrirá al finalizar el ciclo. Activen su póliza de protección orbital de inmediato.`;
    announce(text);
  }, [announce]);
  
  const ejecutarCierreDeCiclo = useCallback(async (currentUser: User, cycleId: number) => {
    const economy = store.getEconomy();
    const market = store.getMarket();
    let neto = 0;
    let details: string[] = [];
    
    // --- 1. Cálculo Matemático ---
    neto -= economy.costoVida;
    details.push(`Vida: -${economy.costoVida}Bs`);

    let totalCertDiv = 0;
    const hasProduction = Object.values(currentUser.certificados).some(q => q > 0);
    if (hasProduction) {
      Object.entries(currentUser.certificados).forEach(([rubro, qty]) => {
        const certData = economy.certificados[rubro];
        if (certData) totalCertDiv += (certData.precio * certData.rendimiento / 100) * (qty as number);
      });
      if (totalCertDiv > 0) {
        neto += totalCertDiv;
        details.push(`Prod: +${totalCertDiv.toFixed(2)}Bs`);
      }
    } else {
      const tax = (currentUser.saldo * economy.impuestoInactividad / 100);
      neto -= tax;
      details.push(`Inact: -${tax.toFixed(2)}Bs`);
    }

    let totalStockDiv = 0;
    Object.entries(currentUser.acciones).forEach(([rubro, qty]) => {
      const stock = market.find(s => s.rubro === rubro);
      if (stock) totalStockDiv += (stock.precioVenta * economy.dividendoAccionPct / 100) * (qty as number);
    });
    if (totalStockDiv > 0) {
      neto += totalStockDiv;
      details.push(`Divs: +${totalStockDiv.toFixed(2)}Bs`);
    }

    const endedCycleStartTimeMs = (cycleId - 1) * 300 * 1000;
    const hasInvested = currentUser.ultimoInversionCiclo && currentUser.ultimoInversionCiclo >= endedCycleStartTimeMs;
    if (!hasInvested) {
      const tax = (currentUser.saldo * economy.impuestoNoInversion / 100);
      neto -= tax;
      details.push(`No Inv: -${tax.toFixed(2)}Bs`);
    }
    
    // --- 2. Voz del OS ---
    await announce(`Ciclo completado. Procesando dividendos e impuestos. Balance neto aplicado: ${neto.toFixed(2)} BS.`);

    // --- 3. Firebase Update (con fallback a mockStore) ---
    if (!db) {
      console.warn("Firebase (db) no está configurado. Usando mock store para el cierre de ciclo.");
      const finalUser = { ...currentUser, saldo: currentUser.saldo + neto, ciclosJugados: (currentUser.ciclosJugados || 0) + 1 };
      store.updateUser(finalUser);
      setUser(finalUser);
    } else {
      const userRef = doc(db, "users", currentUser.id);
      try {
        const finalSaldo = await runTransaction(db, async (transaction) => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists()) { throw "El documento del usuario no existe!"; }
          
          const currentSaldo = userDoc.data().saldo || 0;
          const newSaldo = currentSaldo + neto;
          const newCiclosJugados = (userDoc.data().ciclosJugados || 0) + 1;
          
          transaction.update(userRef, { saldo: newSaldo, ciclosJugados: newCiclosJugados });
          return newSaldo;
        });
        console.log("Transacción de Firebase exitosa!");
        setUser({ ...currentUser, saldo: finalSaldo, ciclosJugados: (currentUser.ciclosJugados || 0) + 1 });
      } catch (e) {
        console.error("Error en la transacción de Firebase:", e);
      }
    }

    store.addTransaction({
      id: `CYC-${Date.now()}`,
      userId: currentUser.id,
      tipo: 'DIVIDENDOS',
      monto: neto,
      detalle: details.join(' | '),
      fecha: Date.now(),
      estado: 'APROBADO'
    });
  }, [announce]);

  const processCycle = useCallback((newCycleId: number) => {
    if (!user || !conditionsAccepted) return;
    
    const allUsers = store.getUsers();
    const currentPhenom = store.getPhenomenon();
    
    if (currentPhenom.activo) {
      allUsers.forEach(u => {
        if (u.rol === 'ADMIN') return;
        const isProtected = u.protegidoHasta && u.protegidoHasta > Date.now();
        if (!isProtected) {
          const damage = (u.saldo * currentPhenom.danoPct / 100);
          u.saldo -= damage;
          store.addTransaction({
            id: `DANO-${Date.now()}-${u.id}`,
            userId: u.id,
            tipo: 'DANO_FENOMENO',
            monto: -damage,
            detalle: `Impacto ${currentPhenom.tipo}: Descuento del ${currentPhenom.danoPct}% por falta de póliza.`,
            fecha: Date.now(),
            estado: 'APROBADO'
          });
          store.updateUser(u);
        }
      });
      const remaining = currentPhenom.ciclosRestantes - 1;
      if (remaining <= 0) store.setPhenomenon({ ...currentPhenom, activo: false, tipo: null, showSiren: false });
      else store.setPhenomenon({ ...currentPhenom, ciclosRestantes: remaining });
    }

    const freshUser = allUsers.find(u => u.id === user.id);
    if (!freshUser || !freshUser.activo) return;

    ejecutarCierreDeCiclo(freshUser, newCycleId);
  }, [user, conditionsAccepted, ejecutarCierreDeCiclo]);

  useEffect(() => {
    const timer = setInterval(() => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const currentCycleNum = Math.floor(nowSeconds / 300);
      setCycleTime(300 - (nowSeconds % 300));

      if (user) {
        const fresh = store.getUsers().find(u => u.id === user.id);
        if (fresh) {
          if (fresh.protegidoHasta) {
            const rem = Math.max(0, Math.floor((fresh.protegidoHasta - Date.now()) / 1000));
            setInsuranceTime(rem);
          } else {
            setInsuranceTime(0);
          }
          if (Math.abs(fresh.saldo - user.saldo) > 0.01) {
            setUser({...fresh});
          }
        }
      }

      if (conditionsAccepted && lastProcessedCycleRef.current !== -1 && currentCycleNum > lastProcessedCycleRef.current) {
        processCycle(currentCycleNum);
        lastProcessedCycleRef.current = currentCycleNum;
      }
      if (conditionsAccepted && lastProcessedCycleRef.current === -1) lastProcessedCycleRef.current = currentCycleNum;

      const currentPhenom = store.getPhenomenon();
      if (currentPhenom.showSiren && !sirenActive) startSirenSequence(currentPhenom.tipo!);
      setPhenomenon({...currentPhenom});
    }, 1000);
    return () => clearInterval(timer);
  }, [user, sirenActive, conditionsAccepted, processCycle]);

  const startSirenSequence = (type: PhenomenonType) => {
    setSirenActive(true);
    setCountdown(10);
    announcePhenomenon(type);
    sirenIntervalRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(sirenIntervalRef.current!);
          setSirenActive(false);
          const current = store.getPhenomenon();
          store.setPhenomenon({ ...current, showSiren: false });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleBuyInsurance = () => {
    if (!user) return;
    const freshUser = store.getUsers().find(u => u.id === user.id);
    if (!freshUser) return;
    const eco = store.getEconomy();
    if (freshUser.saldo < eco.precioPoliza) {
      alert("Suministro de créditos insuficiente.");
      return;
    }
    const expiry = Date.now() + (24 * 60 * 60 * 1000);
    const updated = { ...freshUser, saldo: freshUser.saldo - eco.precioPoliza, protegidoHasta: expiry };
    store.updateUser(updated);
    setUser(updated);
    setInsuranceTime(86400);
    store.addTransaction({
      id: `POL-${Date.now()}`,
      userId: freshUser.id,
      tipo: 'POLIZA',
      monto: -eco.precioPoliza,
      detalle: 'Activación de Escudo Orbital Individual (24h)',
      fecha: Date.now(),
      estado: 'APROBADO'
    });
    handleActionMsg('PÓLIZA ACTIVADA POR 24 HORAS', 3, 'success');
  };

  const handleActionMsg = (msg: string, duration: number, type: 'success' | 'process' = 'success') => {
    setActionModal({ msg, type });
    setTimeout(() => setActionModal(null), duration * 1000);
  };

  const handleLogin = (u: User) => {
    setUser(u);
    setCurrentView(AppView.DASHBOARD);
    setConditionsAccepted(false); 
  };

  if (!user) {
    return currentView === AppView.REGISTER ? 
      <Register onBack={() => setCurrentView(AppView.LOGIN)} onRegistered={() => setCurrentView(AppView.LOGIN)} /> : 
      <Login onLogin={handleLogin} onRegister={() => setCurrentView(AppView.REGISTER)} />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 flex flex-col relative select-none font-rajdhani">
      <EffectLayer type={phenomenon.activo && !sirenActive ? phenomenon.tipo : null} />

      {user.rol !== 'ADMIN' && !conditionsAccepted && (
        <div className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in zoom-in duration-500">
          <div className="glass w-full max-w-lg p-6 rounded-[3rem] border-cyan-500/30 flex flex-col gap-6 shadow-[0_0_100px_rgba(34,211,238,0.2)] overflow-y-auto max-h-[95vh] no-scrollbar">
            <div className="flex flex-col items-center gap-2">
              <div className="p-4 bg-cyan-500/20 rounded-full border border-cyan-500/50">
                <ShieldCheck size={40} className="text-cyan-400" />
              </div>
              <h2 className="text-2xl font-orbitron font-black text-white uppercase tracking-tighter text-center leading-tight">PROTOCOLO DE LA COLONIA LUNAR</h2>
              <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Estación Espacial Rocket 3000</p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/10 space-y-2">
                <h3 className="text-xs font-black text-white uppercase flex items-center gap-2 border-b border-white/5 pb-2">
                  <Scale size={14} className="text-cyan-400"/> Marco Legal y Reglas
                </h3>
                <ul className="text-[10px] space-y-2 text-slate-300">
                  <li className="flex gap-2">
                    <Check size={12} className="text-green-500 shrink-0 mt-0.5"/>
                    <span><strong>MAYORÍA DE EDAD:</strong> Solo individuos mayores de 18 años pueden participar en la economía lunar. Al aceptar, confirma su mayoría de edad legal.</span>
                  </li>
                  <li className="flex gap-2">
                    <Check size={12} className="text-green-500 shrink-0 mt-0.5"/>
                    <span><strong>IDENTIDAD ÚNICA:</strong> El uso de múltiples cuentas para un mismo colono resultará en el bloqueo permanente de todos sus activos.</span>
                  </li>
                  <li className="flex gap-2">
                    <Check size={12} className="text-green-500 shrink-0 mt-0.5"/>
                    <span><strong>PRODUCCIÓN OBLIGATORIA:</strong> Es obligatorio adquirir al menos 1 Licencia (Certificado) para iniciar producción. La falta de producción genera el Impuesto de Inactividad por Ciclo.</span>
                  </li>
                  <li className="flex gap-2">
                    <Check size={12} className="text-green-500 shrink-0 mt-0.5"/>
                    <span><strong>INVERSIÓN POR CICLO:</strong> Es obligatorio comprar al menos 1 Certificado de Producción en cada ciclo. El incumplimiento genera la Multa por No Inversión de forma independiente y automática.</span>
                  </li>
                  <li className="flex gap-2">
                    <Check size={12} className="text-green-500 shrink-0 mt-0.5"/>
                    <span><span><strong>MULTAS INDEPENDIENTES:</strong> Todos los impuestos y multas (Inactividad, No Inversión, Costo de Vida) se aplican de forma separada por ciclo si no se cumplen los requisitos.</span></span>
                  </li>
                  <li className="flex gap-2">
                    <Check size={12} className="text-green-500 shrink-0 mt-0.5"/>
                    <span><strong>SEGURIDAD ESPACIAL:</strong> La administración no se responsabiliza por daños de fenómenos espaciales. La Póliza es responsabilidad individual de cada colono.</span>
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-cyan-500/5 p-4 rounded-2xl border border-cyan-500/20 space-y-2">
                  <h4 className="text-[9px] font-black text-cyan-400 uppercase flex items-center gap-2">
                    <Info size={12}/> Sugerencias
                  </h4>
                  <p className="text-[9px] leading-relaxed text-slate-400 uppercase">
                    Active los 16 rubros productivos para generar dividendos masivos y evitar multas por inactividad.
                  </p>
                </div>
                <div className="bg-orange-500/5 p-4 rounded-2xl border border-orange-500/20 space-y-2">
                  <h4 className="text-[9px] font-black text-orange-400 uppercase flex items-center gap-2">
                    <Zap size={12}/> Mantenimiento
                  </h4>
                  <p className="text-[9px] leading-relaxed text-slate-400 uppercase">
                    Su cuenta consume créditos mientras esté ACTIVA. Desactivarla reduce costos pero detiene su producción.
                  </p>
                </div>
              </div>

              <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20 flex items-center gap-4">
                <ShieldAlert size={24} className="text-red-500 shrink-0"/>
                <p className="text-[10px] text-red-400 font-bold uppercase italic">La Estación no garantiza la seguridad de sus activos ante impactos estelares si usted no posee póliza.</p>
              </div>
            </div>

            <button 
              onClick={() => setConditionsAccepted(true)} 
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black font-orbitron py-5 rounded-[2rem] shadow-xl shadow-cyan-500/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
            >
              ACEPTO PROTOCOLO Y REGLAS
            </button>
          </div>
        </div>
      )}

      {sirenActive && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-red-900/60 backdrop-blur-xl animate-in fade-in">
          <div className="bg-black/90 p-10 border-4 border-red-500 rounded-[3rem] flex flex-col items-center gap-6 animate-pulse shadow-[0_0_100px_rgba(239,68,68,0.7)]">
            <AlertTriangle size={100} className="text-red-500" />
            <div className="text-center space-y-2">
              <h2 className="text-5xl font-orbitron font-black text-red-500 uppercase tracking-tighter italic">¡IMPACTO INMINENTE!</h2>
              <p className="text-2xl font-bold text-white uppercase">{phenomenon.tipo?.replace('_', ' ')} DETECTADA</p>
            </div>
            <p className="text-center text-red-400 font-bold uppercase tracking-widest text-sm max-w-xs animate-bounce">
              ASEGURE SU PÓLIZA DE PROTECCIÓN DE INMEDIATO. EL DAÑO AFECTARÁ A TODOS LOS COLONOS SIN ESCUDO AL FINALIZAR EL CICLO.
            </p>
            <span className="text-8xl font-black font-orbitron text-red-500 drop-shadow-lg">{countdown}s</span>
          </div>
        </div>
      )}

      {actionModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6 animate-in fade-in">
          <div className={`glass p-8 rounded-[2rem] border-2 ${actionModal.type === 'success' ? 'border-cyan-500/50' : 'border-blue-500/50'} flex flex-col items-center gap-4 text-center max-w-xs shadow-2xl`}>
            {actionModal.type === 'success' ? <ShieldCheck size={48} className="text-cyan-400" /> : <Activity size={48} className="text-blue-400 animate-pulse" />}
            <p className="text-lg font-orbitron font-black text-white uppercase tracking-tighter leading-tight">{actionModal.msg}</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col relative overflow-hidden">
        {user.rol === 'ADMIN' ? (
          <AdminDashboard user={user} onLogout={() => setUser(null)} />
        ) : (
          <>
            {currentView === AppView.DASHBOARD && <UserDashboard user={user} setUser={setUser} cycleTime={cycleTime} insuranceTime={insuranceTime} setView={setCurrentView} setInsuranceTime={setInsuranceTime} showAction={handleActionMsg} onBuyInsurance={handleBuyInsurance} />}
            {currentView === AppView.WORLD && <WorldView user={user} onBack={() => setCurrentView(AppView.DASHBOARD)} showAction={handleActionMsg} />}
            {currentView === AppView.MARKET && <MarketView user={user} onBack={() => setCurrentView(AppView.DASHBOARD)} showAction={handleActionMsg} />}
            {currentView === AppView.PROFILE && <Profile user={user} onBack={() => setCurrentView(AppView.DASHBOARD)} showAction={handleActionMsg} onLogout={() => setUser(null)} />}
            {currentView === AppView.HISTORY && <HistoryView user={user} onBack={() => setCurrentView(AppView.DASHBOARD)} />}
            {currentView === AppView.BANKING && <BankingView user={user} onBack={() => setCurrentView(AppView.DASHBOARD)} showAction={handleActionMsg} />}
            {currentView === AppView.WITHDRAW && <WithdrawView user={user} onBack={() => setCurrentView(AppView.DASHBOARD)} showAction={handleActionMsg} />}
          </>
        )}
      </div>
    </div>
  );
};

export default App;

