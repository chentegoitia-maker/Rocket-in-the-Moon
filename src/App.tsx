import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from './config/firebase';
import { doc, runTransaction } from "firebase/firestore";
import { AppView, User } from './types';
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
import { AlertTriangle, ShieldCheck } from 'lucide-react';

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
  const sirenIntervalRef = useRef<number | null>(null);
  const lastProcessedCycleRef = useRef<number>(-1);

  const ejecutarCierreDeCiclo = useCallback(async (currentUser: User, cycleId: number) => {
    const economy = store.getEconomy();
    let neto = -economy.costoVida;
    if (db) {
      const userRef = doc(db, "users", currentUser.id);
      try {
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(userRef);
          if (snap.exists()) {
            tx.update(userRef, { 
              saldo: (snap.data().saldo || 0) + neto, 
              ciclosJugados: (snap.data().ciclosJugados || 0) + 1 
            });
          }
        });
      } catch (e) { console.error("Firebase Error", e); }
    }
    const updated = { ...currentUser, saldo: currentUser.saldo + neto, ciclosJugados: (currentUser.ciclosJugados || 0) + 1 };
    store.updateUser(updated);
    setUser(updated);
  }, []);

  const processCycle = useCallback((newId: number) => {
    if (!user || !conditionsAccepted) return;
    const fresh = store.getUsers().find(u => u.id === user.id);
    if (fresh?.activo) ejecutarCierreDeCiclo(fresh, newId);
  }, [user, conditionsAccepted, ejecutarCierreDeCiclo]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      setCycleTime(300 - (now % 300));
      const cycleNum = Math.floor(now / 300);
      if (conditionsAccepted && lastProcessedCycleRef.current !== -1 && cycleNum > lastProcessedCycleRef.current) {
        processCycle(cycleNum);
      }
      lastProcessedCycleRef.current = cycleNum;
    }, 1000);
    return () => clearInterval(timer);
  }, [conditionsAccepted, processCycle]);

  const handleActionMsg = (msg: string, dur: number) => {
    setActionModal({ msg, type: 'success' });
    setTimeout(() => setActionModal(null), dur * 1000);
  };

  if (!user) {
    return currentView === AppView.REGISTER ? 
      <Register onBack={() => setCurrentView(AppView.LOGIN)} onRegistered={() => setCurrentView(AppView.LOGIN)} /> : 
      <Login onLogin={(u) => { setUser(u); setCurrentView(AppView.DASHBOARD); }} onRegister={() => setCurrentView(AppView.REGISTER)} />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 flex flex-col font-rajdhani">
      <EffectLayer type={phenomenon.activo ? phenomenon.tipo : null} />
      {!conditionsAccepted && user.rol !== 'ADMIN' && (
        <div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-md flex items-center justify-center">
          <div className="bg-slate-900 p-8 rounded-3xl border border-cyan-500/50 text-center max-w-md">
            <ShieldCheck size={50} className="mx-auto text-cyan-400 mb-4" />
            <h2 className="text-2xl font-orbitron mb-4">PROTOCOLO ROCKET</h2>
            <button onClick={() => setConditionsAccepted(true)} className="bg-cyan-500 text-black px-6 py-3 rounded-full font-bold">ENTRAR</button>
          </div>
        </div>
      )}
      <div className="flex-1 relative overflow-hidden">
        {user.rol === 'ADMIN' ? <AdminDashboard user={user} onLogout={() => setUser(null)} /> : (
          <div className="flex-1 flex flex-col">
            {currentView === AppView.DASHBOARD && <UserDashboard user={user} setUser={setUser} cycleTime={cycleTime} insuranceTime={insuranceTime} setView={setCurrentView} setInsuranceTime={setInsuranceTime} showAction={handleActionMsg} onBuyInsurance={() => {}} />}
            {currentView === AppView.WORLD && <WorldView user={user} onBack={() => setCurrentView(AppView.DASHBOARD)} showAction={handleActionMsg} />}
            {currentView === AppView.MARKET && <MarketView user={user} onBack={() => setCurrentView(AppView.DASHBOARD)} showAction={handleActionMsg} />}
            {currentView === AppView.PROFILE && <Profile user={user} onBack={() => setCurrentView(AppView.DASHBOARD)} showAction={handleActionMsg} onLogout={() => setUser(null)} />}
            {currentView === AppView.HISTORY && <HistoryView user={user} onBack={() => setCurrentView(AppView.DASHBOARD)} />}
            {currentView === AppView.BANKING && <BankingView user={user} onBack={() => setCurrentView(AppView.DASHBOARD)} showAction={handleActionMsg} />}
            {currentView === AppView.WITHDRAW && <WithdrawView user={user} onBack={() => setCurrentView(AppView.DASHBOARD)} showAction={handleActionMsg} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
