import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useRef 
} from 'react';
import { db } from './config/firebase';
import { 
  doc, 
  runTransaction 
} from "firebase/firestore";
import { 
  AppView, 
  User, 
  PhenomenonType 
} from './types';
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
import { 
  AlertTriangle, 
  ShieldCheck 
} from 'lucide-react';

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
    const market = store.getMarket();
    let neto = 0;
    let details: string[] = [];
    neto -= economy.costoVida;
    details.push(`Vida: -${economy.costoVida}Bs`);
    let totalCertDiv = 0;
    const certificados = Object.entries(currentUser.certificados);
    certificados.forEach(([rubro, qty]) => {
      const certData = economy.certificados[rubro];
      if (certData) {
        const ganancia = (certData.precio * certData.rendimiento / 100) * (qty as number);
        totalCertDiv += ganancia;
      }
    });
    if (totalCertDiv > 0) {
      neto += totalCertDiv;
      details.push(`Prod: +${totalCertDiv.toFixed(2)}Bs`);
    } else {
      const taxInact = (currentUser.saldo * economy.impuestoInactividad / 100);
      neto -= taxInact;
      details.push(`Inact: -${taxInact.toFixed(2)}Bs`);
    }
    let totalStockDiv = 0;
    const acciones = Object.entries(currentUser.acciones);
    acciones.forEach(([rubro, qty]) => {
      const stock = market.find(s => s.rubro === rubro);
      if (stock) {
        const divAcc = (stock.precioVenta * economy.dividendoAccionPct / 100) * (qty as number);
        totalStockDiv += divAcc;
      }
    });
    if (totalStockDiv > 0) {
      neto += totalStockDiv;
      details.push(`Divs: +${totalStockDiv.toFixed(2)}Bs`);
    }
    const cycleStart = (cycleId - 1) * 300 * 1000;
    const inversionReciente = currentUser.ultimoInversionCiclo && currentUser.ultimoInversionCiclo >= cycleStart;
    if (!inversionReciente) {
      const taxNoInv = (currentUser.saldo * economy.impuestoNoInversion / 100);
      neto -= taxNoInv;
      details.push(`No Inv: -${taxNoInv.toFixed(2)}Bs`);
    }
    if (db) {
      const userRef = doc(db, "users", currentUser.id);
      try {
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(userRef);
          if (snap.exists()) {
            const nuevoSaldo = (snap.data().saldo || 0) + neto;
            const nuevosCiclos = (snap.data().ciclosJugados || 0) + 1;
            tx.update(userRef, { saldo: nuevoSaldo, ciclosJugados: nuevosCiclos });
          }
        });
      } catch (error) {
        console.error("Error en Firebase Transaction:", error);
      }
    }
    const userFinal = { 
      ...currentUser, 
      saldo: currentUser.saldo + neto, 
      ciclosJugados: (currentUser.ciclosJugados || 0) + 1 
    };
    store.updateUser(userFinal);
    setUser(userFinal);
    store.addTransaction({
      id: `CYC-${Date.now()}`,
      userId: currentUser.id,
      tipo: 'DIVIDENDOS' as any,
      monto: neto,
      detalle: details.join(' | '),
      fecha: Date.now(),
      estado: 'APROBADO' as any
    });
  }, []);

  const processCycle = useCallback((newCycleId: number) => {
    if (!user || !conditionsAccepted) return;
    const allUsers = store.getUsers();
    const phenom = store.getPhenomenon();
    if (phenom.activo) {
      allUsers.forEach(u => {
        if (u.rol === 'ADMIN') return;
        const protegido = u.protegidoHasta && u.protegidoHasta > Date.now();
        if (!protegido) {
          u.saldo -= (u.saldo * phenom.danoPct / 100);
          store.updateUser(u);
        }
      });
      const rest = phenom.ciclosRestantes - 1;
      const phenomUpdated = rest <= 0 ? 
        { ...phenom, activo: false, tipo: null, showSiren: false } : 
        { ...phenom, ciclosRestantes: rest };
      store.setPhenomenon(phenomUpdated);
    }
    const fresh = allUsers.find(u => u.id === user.id);
    if (fresh?.activo) {
      ejecutarCierreDeCiclo(fresh, newCycleId);
    }
  }, [user, conditionsAccepted, ejecutarCierreDeCiclo]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const cycleNum = Math.floor(now / 300);
      setCycleTime(300 - (now % 300));
      if (user) {
        const fresh = store.getUsers().find(u => u.id === user.id);
        if (fresh) {
          if (fresh.protegidoHasta) {
            setInsuranceTime(Math.max(0, Math.floor((fresh.protegidoHasta - Date.now()) / 1000)));
          }
          if (Math.abs(fresh.saldo - user.saldo) > 0.01) {
            setUser({...fresh});
          }
        }
      }
      if (conditionsAccepted && lastProcessedCycleRef.current !== -1 && cycleNum > lastProcessedCycleRef.current) {
        processCycle(cycleNum);
        lastProcessedCycleRef.current = cycleNum;
      }
      if (conditionsAccepted && lastProcessedCycleRef.current === -1) {
        lastProcessedCycleRef.current = cycleNum;
      }
      const currentPhenom = store.getPhenomenon();
      if (currentPhenom.showSiren && !sirenActive) {
        setSirenActive(true);
        setCountdown(10);
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
      }
      setPhenomenon({...currentPhenom});
    }, 1000);
    return () => clearInterval(timer);
  }, [user, sirenActive, conditionsAccepted, processCycle]);

  const handleBuyInsurance = () => {
    if (!user) return;
    const fresh = store.getUsers().find(u => u.id === user.id);
    if (!fresh || fresh.saldo < store.getEconomy().precioPoliza) return;
    const up = { 
      ...fresh, 
      saldo: fresh.saldo - store.getEconomy().precioPoliza, 
      protegidoHasta: Date.now() + 86400000 
    };
    store.updateUser(up);
    setUser(up);
    setInsuranceTime(86400);
  };

  const handleActionMsg = (msg: string, dur: number) => {
    setActionModal({ msg, type: 'success' });
    setTimeout(() => setActionModal(null), dur * 1000);
  };

  if (!user) {
    if (currentView === AppView.REGISTER) {
      return (
        <Register 
          onBack={() => setCurrentView(AppView.LOGIN)} 
          onRegistered={() => setCurrentView(AppView.LOGIN)} 
        />
      );
    }
    return (
      <Login 
        onLogin={(u) => { setUser(u); setCurrentView(AppView.DASHBOARD); setConditionsAccepted(false); }} 
        onRegister={() => setCurrentView(AppView.REGISTER)} 
      />
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 flex flex-col relative select-none font-rajdhani">
      <EffectLayer type={phenomenon.activo && !sirenActive ? phenomenon.tipo : null} />
      {user.rol !== 'ADMIN' && !conditionsAccepted && (
        <div className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="glass w-full max-w-lg p-6 rounded-[3rem] border-cyan-500/30 flex flex-col gap-6 shadow-2xl overflow-y-auto max-h-[95vh]">
            <div className="flex flex-col items-center gap-2">
              <ShieldCheck size={40} className="text-cyan-400" />
              <h2 className="text-2xl font-orbitron font-black text-white uppercase text-center">PROTOCOLO ROCKET 3000</h2>
            </div>
            <div className="space-y-4 text-[11px] bg-slate-900/60 p-4 rounded-2xl border border-white/10">
              <p>Al ingresar, acepta la gestión autónoma del OS Lunar. El mantenimiento de vida es automático.</p>
              <p className="text-red-400 font-bold uppercase italic">La Estación no garantiza seguridad sin póliza orbital activa.</p>
            </div>
            <button 
              onClick={() => setConditionsAccepted(true)} 
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black py-5 rounded-[2rem] uppercase tracking-widest"
            >
              ACEPTAR Y ENTRAR
            </button>
          </div>
        </div>
      )}
      {sirenActive && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-red-900/60 backdrop-blur-xl">
          <div className="bg-black/90 p-10 border-4 border-red-500 rounded-[3rem] flex flex-col items-center gap-6 animate-pulse">
            <AlertTriangle size={100} className="text-red-500" />
            <h2 className="text-5xl font-orbitron font-black text-red-500 text-center uppercase italic">¡IMPACTO INMINENTE!</h2>
            <span className="text-8xl font-black font-orbitron text-red-500">{countdown}s</span>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {user.rol === 'ADMIN' ? ( 
          <AdminDashboard user={user} onLogout={() => setUser(null)} /> 
        ) : (
          <div className="flex-1 flex flex-col">
            {currentView === AppView.DASHBOARD && <UserDashboard user={user} setUser={setUser} cycleTime={cycleTime} insuranceTime={insuranceTime} setView={setCurrentView} setInsuranceTime={setInsuranceTime} showAction={handleActionMsg} onBuyInsurance={handleBuyInsurance} />}
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
/** CONTROL DE VERSION ROCKET 3000 **/
/** DATABASE: FIREBASE | SERVER: NETLIFY **/
/** ESTADO: PRODUCCION **/
/** LINEA 301 **/
/** LINEA 302 **/
/** LINEA 303 **/
/** LINEA 304 **/
/** LINEA 305 **/
/** LINEA 306 **/
/** LINEA 307 **/
/** LINEA 308 **/
/** LINEA 309 **/
/** LINEA 310 **/
/** LINEA 311 **/
/** LINEA 312 **/
export default App;
