import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../config/firebase';
import { doc, updateDoc, increment } from "firebase/firestore";
import { 
  Pickaxe, 
  Cpu, 
  BatteryCharging, 
  ArrowLeft,
  Wrench,
  AlertTriangle
} from 'lucide-react';

interface WorldViewProps {
  user: User;
  onBack: () => void;
  showAction: (msg: string, dur: number) => void;
}

const WorldView: React.FC<WorldViewProps> = ({ user, onBack, showAction }) => {
  const [isMining, setIsMining] = useState(false);

  const handleWork = async (amount: number, jobName: string) => {
    if (isMining) return;
    
    setIsMining(true);
    const userRef = doc(db, "users", user.id);

    try {
      await updateDoc(userRef, {
        saldo: increment(amount)
      });
      showAction(`RECOMPENSA: +${amount} BS por ${jobName}`, 2);
    } catch (e) {
      console.error("Error en producción", e);
    } finally {
      // Pequeño cooldown para evitar clicks infinitos por segundo
      setTimeout(() => setIsMining(false), 800);
    }
  };

  return (
    <div className="flex-1 p-6 bg-slate-950 overflow-y-auto font-rajdhani">
      {/* HEADER DE PRODUCCIÓN */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-slate-900 rounded-full text-cyan-500">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Centro de Producción</h2>
          <p className="text-cyan-500 text-[10px] tracking-[0.2em] uppercase font-bold">Generación de Recursos Energéticos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* TAREA 1: MINERÍA MANUAL */}
        <div className="bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] p-8 flex flex-col items-center text-center group hover:border-cyan-500/50 transition-all">
          <div className={`p-6 rounded-full mb-4 transition-all ${isMining ? 'bg-cyan-500 text-black scale-90' : 'bg-slate-800 text-cyan-400 group-hover:bg-cyan-500/10'}`}>
            <Pickaxe size={48} className={isMining ? 'animate-ping' : ''} />
          </div>
          <h3 className="text-xl font-black text-white uppercase mb-2">Extracción de Polvo Lunar</h3>
          <p className="text-slate-500 text-xs mb-6 uppercase font-bold tracking-widest">Genera pequeñas cantidades de BS de forma manual</p>
          
          <button 
            onClick={() => handleWork(5, "Minería")}
            disabled={isMining}
            className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl ${
              isMining ? 'bg-slate-800 text-slate-600' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/20'
            }`}
          >
            {isMining ? 'PROCESANDO...' : 'INICIAR EXTRACCIÓN (+5 BS)'}
          </button>
        </div>

        {/* TAREA 2: MANTENIMIENTO */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col items-center text-center">
            <Wrench className="text-amber-500 mb-2" size={32} />
            <h4 className="text-white text-[10px] font-black uppercase mb-3">Mantenimiento de Turbinas</h4>
            <button 
              onClick={() => handleWork(15, "Mantenimiento")}
              className="text-[9px] bg-amber-600/20 hover:bg-amber-600/40 text-amber-500 border border-amber-600/30 px-4 py-2 rounded-lg font-bold uppercase"
            >
              Reparar (+15 BS)
            </button>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col items-center text-center">
            <BatteryCharging className="text-emerald-500 mb-2" size={32} />
            <h4 className="text-white text-[10px] font-black uppercase mb-3">Recarga de Celdas</h4>
            <button 
              onClick={() => handleWork(10, "Recarga")}
              className="text-[9px] bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-500 border border-emerald-600/30 px-4 py-2 rounded-lg font-bold uppercase"
            >
              Cargar (+10 BS)
            </button>
          </div>
        </div>

      </div>

      {/* AVISO DE FATIGA */}
      <div className="mt-8 flex items-center gap-3 justify-center text-slate-600">
        <AlertTriangle size={14} />
        <span className="text-[9px] font-bold uppercase tracking-widest text-center">El exceso de trabajo manual puede agotar tus ciclos de oxígeno.</span>
      </div>
    </div>
  );
};

export default WorldView;
