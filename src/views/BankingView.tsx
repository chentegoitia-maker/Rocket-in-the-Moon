import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  runTransaction, 
  serverTimestamp,
  addDoc 
} from "firebase/firestore";
import { 
  ArrowLeft, 
  Send, 
  Search, 
  Landmark, 
  History,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface BankingViewProps {
  user: User;
  onBack: () => void;
  showAction: (msg: string, dur: number) => void;
}

const BankingView: React.FC<BankingViewProps> = ({ user, onBack, showAction }) => {
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const handleTransfer = async () => {
    if (amount <= 0) return alert("Ingresa un monto válido.");
    if (amount > (user.saldo || 0)) return alert("Saldo insuficiente.");
    if (recipientName.toLowerCase() === user.username?.toLowerCase()) return alert("No puedes enviarte dinero a ti mismo.");

    setLoading(true);
    try {
      // 1. Buscar al destinatario por su nombre de usuario
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", recipientName.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("El colono destinatario no existe.");
        setLoading(false);
        return;
      }

      const recipientDoc = querySnapshot.docs[0];
      const recipientId = recipientDoc.id;

      // 2. EJECUTAR TRANSACCIÓN BANCARIA (Atómica)
      await runTransaction(db, async (transaction) => {
        const senderRef = doc(db, "users", user.id);
        const receiverRef = doc(db, "users", recipientId);

        const senderSnap = await transaction.get(senderRef);
        if (!senderSnap.exists()) throw "El remitente no existe";
        
        const nuevoSaldoEmisor = senderSnap.data().saldo - amount;
        if (nuevoSaldoEmisor < 0) throw "Saldo insuficiente detectado";

        // Actualizar saldos
        transaction.update(senderRef, { saldo: nuevoSaldoEmisor });
        transaction.update(receiverRef, { saldo: (recipientDoc.data().saldo || 0) + amount });

        // Registrar el historial
        const historyRef = collection(db, "transfers");
        await addDoc(historyRef, {
          from: user.username,
          to: recipientName,
          amount: amount,
          timestamp: serverTimestamp()
        });
      });

      showAction(`TRANSFERENCIA EXITOSA: ${amount} BS enviados a ${recipientName}`, 3);
      setRecipientName('');
      setAmount(0);
    } catch (e) {
      console.error(e);
      alert("Fallo en el enlace bancario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 bg-slate-950 overflow-y-auto font-rajdhani">
      {/* HEADER BANCARIO */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-slate-900 rounded-full text-cyan-500">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Banco de la Estación</h2>
          <p className="text-cyan-500 text-[10px] tracking-[0.2em] uppercase font-bold">Transferencias Seguras Inter-Coloniales</p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* TARJETA DE SALDO RÁPIDO */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-cyan-500/20 rounded-3xl p-6 shadow-xl">
          <p className="text-slate-400 text-xs uppercase font-bold mb-1">Tu Bóveda Actual</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{user.saldo?.toLocaleString()}</span>
            <span className="text-cyan-500 font-bold">BS</span>
          </div>
        </div>

        {/* FORMULARIO DE ENVÍO */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Send size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Enviar Créditos</span>
          </div>

          <div className="space-y-4">
            {/* Destinatario */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Nombre del Colono Destinatario"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-sm focus:border-cyan-500 outline-none transition-all text-white"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>

            {/* Monto */}
            <div className="relative">
              <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="number" 
                placeholder="Monto en BS"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-sm focus:border-cyan-500 outline-none transition-all text-white font-mono"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>

            <button 
              onClick={handleTransfer}
              disabled={loading}
              className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                loading ? 'bg-slate-800 text-slate-500' : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20'
              }`}
            >
              {loading ? 'AUTORIZANDO...' : (
                <>
                  <ShieldCheck size={20} />
                  EJECUTAR TRANSFERENCIA
                </>
              )}
            </button>
          </div>
        </div>

        {/* AVISO DE SEGURIDAD */}
        <div className="flex gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
          <AlertCircle className="text-amber-500 shrink-0" size={20} />
          <p className="text-[10px] text-slate-500 leading-relaxed uppercase">
            Las transferencias son irreversibles una vez confirmadas por el protocolo de red. Asegúrese de que el nombre del destinatario sea exacto.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BankingView;
