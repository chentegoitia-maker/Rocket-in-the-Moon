import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../config/firebase';
import { doc, updateDoc, increment } from "firebase/firestore";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowLeft, 
  Zap, 
  Fuel, 
  Shovel, 
  Home,
  BarChart3
} from 'lucide-react';

interface MarketViewProps {
  user: User;
  onBack: () => void;
  showAction: (msg: string, dur: number) => void;
}

const MarketView: React.FC<MarketViewProps> = ({ user, onBack, showAction }) => {
  // Simulamos datos del mercado (esto podría venir de una colección 'market' en Firebase)
  const [marketData] = useState([
    { id: 'luz', name: 'Energía Solar', price: 10.20, trend: 'up', icon: <Zap size={20}/> },
    { id: 'gas', name: 'Gas Helio-3', price: 15.45, trend: 'down', icon: <Fuel size={20}/> },
    { id: 'mineria', name: 'Minerales Raros', price: 42.10, trend: 'up', icon: <Shovel size={20}/> },
    { id: 'vivienda', name: 'Módulos Habit.', price: 120.00, trend: 'up', icon: <Home size={20}/> },
  ]);

  const handleBuy = async (assetId: string, price: number) => {
    if ((user.saldo || 0) < price) {
      showAction("Créditos insuficientes para esta adquisición", 3);
      return;
    }

    const userRef = doc(db, "users", user.id);
    try {
      await updateDoc(userRef, {
        saldo: increment(-price),
        [`acciones.${assetId}`]: increment(1)
      });
      showAction(`Activo ${assetId.toUpperCase()} adquirido con éxito`, 2);
    } catch (e) {
      console.error("Error en transacción de mercado", e);
    }
  };

  return (
    <div className="flex-1 p-6 bg-slate-950 overflow-y-auto font-rajdhani">
      {/* HEADER ESTILO AI STUDIO */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-slate-900 rounded-full text-cyan-500 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Mercado de Valores</h2>
          <p className="text-cyan-500 text-[10px] tracking-[0.2em] uppercase font-bold">Bolsa de Valores Lunar - Protocolos Activos</p>
        </div>
      </div>

      {/* TICKER DE PRECIOS (Similar al de tu Dashboard) */}
      <div className="flex gap-4 overflow-x-hidden mb-8 py-2 border-y border-slate-800 bg-slate-900/30 whitespace-nowrap">
        {marketData.map((item) => (
          <div key={item.id} className="flex items-center gap-2 px-4 border-r border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-bold">{item.id}</span>
            <span className="text-white font-mono text-sm">{item.price.toFixed(2)}</span>
            {item.trend === 'up' ? <TrendingUp size={12} className="text-emerald-500"/> : <TrendingDown size={12} className="text-rose-500"/>}
          </div>
        ))}
      </div>

      {/* LISTA DE ACTIVOS COMPRABLES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {marketData.map((asset) => (
          <div key={asset.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-cyan-500/50 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-800 rounded-xl text-cyan-400 group-hover:scale-110 transition-transform">
                  {asset.icon}
                </div>
                <div>
                  <h3 className="text-white font-bold uppercase tracking-tight">{asset.name}</h3>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Activo Clase A</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-white">{asset.price.toFixed(2)}<span className="text-[10px] text-cyan-500 ml-1">BS</span></p>
                <div className={`flex items-center justify-end gap-1 ${asset.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {asset.trend === 'up' ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                  <span className="text-[10px] font-bold">+2.4%</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => handleBuy(asset.id, asset.price)}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-3 rounded-xl transition-all uppercase text-xs tracking-widest shadow-lg shadow-cyan-600/10 active:scale-95"
            >
              Confirmar Adquisición
            </button>
          </div>
        ))}
      </div>

      {/* FOOTER INFORMATIVO */}
      <div className="mt-8 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-center gap-4">
        <BarChart3 className="text-blue-400" size={24} />
        <p className="text-slate-400 text-xs">
          <strong className="text-blue-400 uppercase mr-2">Aviso:</strong> 
          Toda inversión en la Estación Lunar conlleva riesgos de descompresión financiera. Opere bajo su propio riesgo.
        </p>
      </div>
    </div>
  );
};

export default MarketView;
