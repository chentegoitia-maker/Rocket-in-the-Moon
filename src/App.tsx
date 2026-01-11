import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
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
import { AlertTriangle, Check, Activity, ShieldCheck, Zap, Scale, ShieldAlert, Info } from 'lucide-react';

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

  // --- TTS & AI Engine (Vite Compatible) ---
  const announce = useCallback(async (text: string, voiceName: string = 'Kore') => {
    if (isAnnouncing) return;
    setIsAnnouncing(true);
    try {
      // Usamos import.meta.env para cumplir con el estándar de Vite/Netlify
      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      if (!API_KEY) throw new Error("API Key no configurada");

      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Nota: Si usas el modelo experimental de Audio de Gemini, asegúrate de tener la cuota activa
      const result = await model.generateContent(text);
      console.log("OS Voice Log:", result.response.text());
      
      // Implementación de fallback de audio nativo si la API de Google solo devuelve texto
      const msg = new SpeechSynthesisUtterance(text);
      msg.lang = 'es-ES';
      window.speechSynthesis.speak(msg);

    } catch (e) {
      console.error("TTS System Error:", e);
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
  
  // --- Lógica de Economía y Cierre de Ciclo ---
  const ejecutarCierreDeCiclo = useCallback(async (currentUser: User, cycleId: number) => {
    const economy = store.getEconomy();
    const market = store.getMarket();
    let neto = 0;
    let details: string[] = [];
    
    neto -= economy.costoVida;
    details.push(`Vida: -${economy.costoVida}Bs`);

    let totalCertDiv = 0;
    const hasProduction = Object.values(currentUser.certificados).some(q => (q as number) > 0);
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
    
    announce(`Ciclo completado. Balance neto aplicado: ${neto.toFixed(2)} BS.`);

    if (db) {
      const userRef = doc(db, "users", currentUser.id);
      try {
        await runTransaction(db, async (transaction) => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists()) return;
          const currentSaldo = userDoc.data().saldo || 0;
          transaction.update(userRef, { 
            saldo: currentSaldo + neto, 
            ciclosJugados: (userDoc.data().ciclosJugados || 0) + 1 
          });
        });
      } catch (e) { console.error("Firebase Sync Error:", e); }
    }

    const finalUser = { ...currentUser, saldo: currentUser.saldo + neto, ciclosJugados: (currentUser.ciclosJugados || 0) + 1 };
    store.updateUser(finalUser);
    setUser(finalUser);

    store.addTransaction({
      id: `CYC-${Date.now()}`,
      userId: currentUser.id,
      tipo: 'DIVIDENDOS' as any,
      monto: neto,
      detalle: details.join(' | '),
      fecha: Date.now(),
      estado: 'APROBADO' as any
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
          store.updateUser(u);
        }
      });
      const remaining = currentPhenom.ciclosRestantes - 1;
      if (remaining <= 0) store.setPhenomenon({ ...currentPhenom, activo: false, tipo: null, showSiren: false });
      else store.setPhenomenon({ ...currentPhenom, ciclosRestantes: remaining });
    }

    const freshUser = allUsers.find(u => u.id === user.id);
    if (freshUser && freshUser.activo) ejecutarCierreDeCiclo(freshUser, newCycleId);
  }, [user, conditionsAccepted, ejecutarCierreDeCiclo]);

  // --- Game Loop (1s) ---
  useEffect(() => {
    const timer = setInterval(() => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const currentCycleNum = Math.floor(nowSeconds / 300);
      setCycleTime(300 - (nowSeconds % 300));

      if (user) {
        const fresh = store.getUsers().find(u => u.id === user.id);
        if (fresh) {
          if (fresh.protegidoHasta) {
            setInsuranceTime(Math.max(0, Math.floor((fresh.protegidoHasta - Date.now()) / 1000)));
          }
          if (Math.abs(fresh.saldo - user.saldo) > 0.01) setUser({...fresh});
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
          store.setPhenomenon({ ...store.getPhenomenon(), showSiren: false });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleBuyInsurance = () => {
    if (!user) return;
    const freshUser = store.getUsers().find(u => u.id === user.id);
    if (!freshUser || freshUser.saldo < store.getEconomy().precioPoliza) {
      alert("Créditos insuficientes.");
      return;
    }
    const expiry = Date.now() + (24 * 60 * 60 * 1000);
    const updated = { ...freshUser, saldo: freshUser.saldo - store.getEconomy().precioPoliza, protegidoHasta: expiry };
    store.updateUser(updated);
    setUser(updated);
    setInsuranceTime(86400);
    handleActionMsg('PÓLIZA ACTIVADA POR 24 HORAS', 3, 'success');
  };

  const handleActionMsg = (msg: string, duration: number, type: 'success' | 'process' = 'success') => {
    setActionModal({ msg, type });
    setTimeout(() => setActionModal(null), duration * 1000);
  };

  if (!user) {
    return currentView === AppView.REGISTER ? 
      <Register onBack={() => setCurrentView(AppView.LOGIN)} onRegistered={() => setCurrentView(AppView.LOGIN)} /> : 
      <Login onLogin={(u) => { setUser(u); setCurrentView(AppView.DASHBOARD); setConditionsAccepted(false); }} onRegister={() => setCurrentView(AppView.REGISTER)} />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 flex flex-col relative select-none font-rajdhani">
      <EffectLayer type={phenomenon.activo && !sirenActive ? phenomenon.tipo : null} />

      {/* --- Modal: Protocolo Lunar --- */}
      {user.rol !== 'ADMIN' && !conditionsAccepted && (
        <div className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="glass w-full max-w-lg p-6 rounded-[3rem] border-cyan-500/30 flex flex-col gap-6 shadow-2xl overflow-y-auto max-h-[95vh] no-scrollbar">
            <div className="flex flex-col items-center gap-2">
              <div className="p-4 bg-cyan-500/20 rounded-full border border-cyan-500/50">
                <ShieldCheck size={40} className="text-cyan-400" />
              </div>
              <h2 className="text-2xl font-orbitron font-black text-white uppercase text-center">PROTOCOLO ROCKET 3000</h2>
            </div>
            
            <div className="space-y-4 text-[11px]">
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/10 space-y-2">
                <h3 className="text-xs font-black text-white uppercase flex items-center gap-2 border-b border-white/5 pb-2">
                  <Scale size={14} className="text-cyan-400"/> Marco Legal
                </h3>
                <p>Al ingresar, acepta la gestión autónoma de su saldo por parte del OS Lunar. El mantenimiento de vida y los impuestos de inactividad son automáticos por ciclo.</p>
              </div>
              <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20 flex items-center gap-4">
                <ShieldAlert size={24} className="text-red-500 shrink-0"/>
                <p className="text-red-400 font-bold uppercase italic">La Estación no garantiza seguridad sin póliza orbital activa.</p>
              </div>
            </div>

            <button onClick={() => setConditionsAccepted(true)} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black font-orbitron py-5 rounded-[2rem] active:scale-95 transition-all uppercase tracking-widest">
              ACEPTAR Y ENTRAR
            </button>
          </div>
        </div>
      )}

      {/* --- Alerta de Sirena --- */}
      {sirenActive && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-red-900/60 backdrop-blur-xl">
          <div className="bg-black/90 p-10 border-4 border-red-500 rounded-[3rem] flex flex-col items-center gap-6 animate-pulse">
            <AlertTriangle size={100} className="text-red-500" />
            <h2 className="text-5xl font-orbitron font-black text-red-500 text-center uppercase italic">¡IMPACTO INMINENTE!</h2>
            <span className="text-8xl font-black font-orbitron text-red-500">{countdown}s</span>
          </div>
        </div>
      )}

      {/* --- Vistas del Juego --- */}
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
