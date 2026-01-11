import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from './config/firebase';
import { doc, runTransaction, onSnapshot } from "firebase/firestore"; // Añadido onSnapshot
import { AppView, User } from './types';
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
import { ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  const [cycleTime, setCycleTime] = useState(300);
  const [insuranceTime, setInsuranceTime] = useState(0);
  const [conditionsAccepted, setConditionsAccepted] = useState(false);
  const [actionModal, setActionModal] = useState<{msg: string, type: 'success' | 'process'} | null>(null);
  const lastProcessedCycleRef = useRef<number>(-1);

  // 1. ESCUCHA REAL DE FIREBASE (Sustituye al mockStore)
  useEffect(() => {
    if (!user?.id) return;

    // Esta función mantiene tu saldo actualizado en tiempo real
    const unsubscribe = onSnapshot(doc(db, "users", user.id), (docSnap) => {
      if (docSnap.exists()) {
        setUser(prev => ({ ...prev, ...docSnap.data() } as User));
      }
    }, (error) => {
      console.error("Error en conexión orbital:", error);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // 2. CIERRE DE CICLO SINCRONIZADO CON LA NUBE
  const ejecutarCierreDeCiclo = useCallback(async (userId: string) => {
    const costoVida = 50; // Valor base, puedes subirlo luego
    const userRef = doc(db, "users", userId);

    try {
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(userRef);
        if (!sfDoc.exists()) return;

        const nuevoSaldo = (sfDoc.data().saldo || 0) - costoVida;
        const nuevosCiclos = (sfDoc.data().ciclosJugados || 0) + 1;

        transaction.update(userRef, { 
          saldo: nuevoSaldo, 
          ciclosJugados: nuevosCiclos 
        });
      });
      console.log("Ciclo procesado en el servidor");
    } catch (e) {
      console.error("Fallo de comunicación en cierre de ciclo", e);
    }
  }, []);

  // 3. RELOJ MAESTRO DE LA ESTACIÓN
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      setCycleTime(300 - (now % 300));
      const cycleNum = Math.floor(now / 300);

      // Si el usuario está activo y cambió el ciclo, cobramos el costo de vida
      if (user && conditionsAccepted && lastProcessedCycleRef.current !== -1 && cycleNum > lastProcessedCycleRef.current) {
        ejecutarCierreDeCiclo(user.id);
      }
      lastProcessedCycleRef.current = cycleNum;
    }, 1000);
    return () => clearInterval(timer);
  }, [user, conditionsAccepted, ejecutarCierreDeCiclo]);

  const handleActionMsg = (msg: string, dur: number) => {
    setActionModal({ msg, type: 'success' });
    setTimeout(() => setActionModal(null), dur * 1000);
  };

  // VISTAS DE ACCESO (LOGIN/REGISTER)
  if (!user) {
    return currentView === AppView.REGISTER ? 
      <Register onBack={() => setCurrentView(AppView.LOGIN)} onRegistered={() => setCurrentView(AppView.LOGIN)} /> : 
      <Login onLogin={(u: any) => { setUser(u); setCurrentView(AppView.DASHBOARD); }} onRegister={() => setCurrentView(AppView.REGISTER)} />;
  }

  // INTERFAZ DE CIUDADANO
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 flex flex-col font-rajdhani">
      <EffectLayer type={null} />
      
      {!conditionsAccepted && user.rol !== 'ADMIN' && (
        <div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-md flex items-center justify-center">
          <div className="bg-slate-900 p-8 rounded-3xl border border-cyan-500/50 text-center max-w-md">
            <ShieldCheck size={50} className="mx-auto text-cyan-400 mb-4" />
            <h2 className="text-2xl font-orbitron mb-4 text-white">PROTOCOLO ROCKET</h2>
            <p className="text-slate-400 text-sm mb-6 uppercase tracking-widest">Sincronizando enlace neuronal con la base lunar...</p>
            <button onClick={() => setConditionsAccepted(true)} className="bg-cyan-500 text-black px-10 py-4 rounded-full font-black uppercase tracking-tighter hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20">ACTIVAR ENLACE</button>
          </div>
        </div>
      )}

      <div className="flex-1 relative overflow-hidden">
        {user.rol === 'ADMIN' ? <AdminDashboard user={user} onLogout={() => setUser(null)} /> : (
          <div className="flex-1 flex flex-col h-full">
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
      
      {actionModal && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-cyan-600 text-white px-6 py-3 rounded-full font-bold animate-bounce z-50">
          {actionModal.msg}
        </div>
      )}
    </div>
  );
};

export default App;
