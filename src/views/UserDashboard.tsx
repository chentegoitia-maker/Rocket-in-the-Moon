import React from 'react';
import { User, AppView } from '../types';
import { Layout, Wallet, Clock, Shield, Globe, ShoppingCart, User as UserIcon, History, Landmark, ArrowUpCircle, Menu } from 'lucide-react';

interface Props {
  user: User;
  setUser: (u: User) => void;
  cycleTime: number;
  insuranceTime: number;
  setView: (v: AppView) => void;
  setInsuranceTime: (t: number) => void;
  showAction: (msg: string, dur: number, type: 'success' | 'process') => void;
  onBuyInsurance: () => void;
}

const UserDashboard: React.FC<Props> = ({ user, cycleTime, insuranceTime, setView, onBuyInsurance }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 gap-6 overflow-y-auto no-scrollbar pb-24 bg-slate-950 text-slate-200">
      {/* HEADER: SALDO Y CICLO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass p-6 rounded-[2.5rem] border-cyan-500/20 flex items-center justify-between shadow-lg shadow-cyan-900/10">
          <div>
            <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">Suministro de Créditos</p>
            <h2 className="text-4xl font-black font-orbitron text-white">{user.saldo.toLocaleString()} <span className="text-sm text-cyan-500">BS</span></h2>
          </div>
          <div className="p-4 bg-cyan-500/10 rounded-3xl border border-cyan-500/30">
            <Wallet size={32} className="text-cyan-400" />
          </div>
        </div>

        <div className="glass p-6 rounded-[2.5rem] border-blue-500/20 flex items-center justify-between shadow-lg shadow-blue-900/10">
          <div>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Sincronización de Ciclo</p>
            <h2 className="text-4xl font-black font-orbitron text-white">{formatTime(cycleTime)}</h2>
          </div>
          <div className="p-4 bg-blue-500/10 rounded-3xl border border-blue-500/30">
            <Clock size={32} className="text-blue-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* ESTADO DE PROTECCIÓN */}
      <div className={`p-6 rounded-[2.5rem] border-2 transition-all flex items-center justify-between ${insuranceTime > 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]'}`}>
        <div className="flex items-center gap-4">
          <Shield size={40} className={insuranceTime > 0 ? 'text-green-400' : 'text-red-500 animate-bounce'} />
          <div>
            <h3 className="font-black font-orbitron text-white uppercase tracking-tighter">Escudo Orbital: {insuranceTime > 0 ? 'ACTIVO' : 'DESACTIVADO'}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase">{insuranceTime > 0 ? `Expira en: ${formatTime(insuranceTime)}` : 'Tu capital está expuesto a tormentas solares'}</p>
          </div>
        </div>
        {insuranceTime <= 0 && (
          <button onClick={onBuyInsurance} className="bg-white text-black font-black px-6 py-3 rounded-2xl hover:bg-cyan-400 transition-all uppercase text-xs tracking-widest">Activar Póliza</button>
        )}
      </div>

      {/* MENÚ PRINCIPAL (GRID) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
        {[
          { icon: Globe, label: 'Mundo', view: AppView.WORLD, color: 'text-cyan-400' },
          { icon: ShoppingCart, label: 'Mercado', view: AppView.MARKET, color: 'text-blue-400' },
          { icon: Landmark, label: 'Banca', view: AppView.BANKING, color: 'text-purple-400' },
          { icon: ArrowUpCircle, label: 'Retiros', view: AppView.WITHDRAW, color: 'text-orange-400' },
          { icon: History, label: 'Historial', view: AppView.HISTORY, color: 'text-emerald-400' },
          { icon: UserIcon, label: 'Perfil', view: AppView.PROFILE, color: 'text-slate-400' }
        ].map((item, i) => (
          <button 
            key={i} 
            onClick={() => setView(item.view)}
            className="glass p-6 rounded-[2.5rem] border-white/5 hover:border-cyan-500/40 hover:bg-white/5 transition-all flex flex-col items-center gap-3 group"
          >
            <item.icon size={32} className={`${item.color} group-hover:scale-110 transition-transform`} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default UserDashboard;
