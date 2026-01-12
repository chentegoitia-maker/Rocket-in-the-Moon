import React, { useState } from 'react';
import { ChevronLeft, Eye, EyeOff, UserPlus, AlertCircle } from 'lucide-react';
import { store } from '../services/mockStore';

interface RegisterProps {
  onBack: () => void;
  onRegistered: () => void;
}

const Register: React.FC<RegisterProps> = ({ onBack, onRegistered }) => {
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    username: '',
    clave: '',
    cedula: '',
    telefono: '',
    correo: '',
    referido: ''
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const users = store.getUsers();
    const userExists = users.some(u => u.username.toLowerCase() === form.username.toLowerCase());
    
    if (userExists) {
      setError('EL ALIAS DE MISIÓN YA ESTÁ OCUPADO POR OTRO COLONO.');
      return;
    }

    const eco = store.getEconomy();
    // Se asegura de inicializar todas las propiedades requeridas por la interfaz User
    const newUser = {
      id: Date.now().toString(),
      ...form,
      referidos: [],
      saldo: eco.bonoBienvenida,
      activo: false,
      protegidoHasta: null,
      bloqueado: false,
      rol: 'USER' as const,
      certificados: {},
      acciones: {},
      ciclosJugados: 0
    };
    
    if (form.referido) {
      const commander = users.find(u => u.username.toLowerCase() === form.referido.toLowerCase());
      if (commander) {
        if (!commander.referidos) commander.referidos = [];
        commander.referidos.push(newUser.username);
        store.updateUser(commander);
      }
    }

    store.getUsers().push(newUser);
    
    if (eco.bonoBienvenida > 0) {
      store.addTransaction({
        id: `WELCOME-${Date.now()}`,
        userId: newUser.id,
        tipo: 'BONO',
        monto: eco.bonoBienvenida,
        detalle: 'Bono de Bienvenida: Iniciativa Rocket',
        fecha: Date.now(),
        estado: 'APROBADO'
      });
    }
    
    onRegistered();
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden bg-slate-950 font-rajdhani">
      <button onClick={onBack} className="self-start text-cyan-400 mb-6 flex items-center gap-2 font-bold uppercase text-xs active:scale-95 transition-all">
        <ChevronLeft size={20} /> ABORTAR ALISTAMIENTO
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-cyan-500/20 rounded-2xl text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
          <UserPlus size={28}/>
        </div>
        <div>
          <h1 className="text-2xl font-orbitron font-black text-cyan-400 uppercase tracking-tighter">NUEVO RECLUTA</h1>
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Inscripción en la Red de Colonización Lunar</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-4 pb-12">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
            <AlertCircle size={20} className="text-red-500 shrink-0" />
            <p className="text-[10px] text-red-500 font-black uppercase leading-tight">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-black ml-2">Nombre</label>
            <input required className="w-full bg-slate-900 border border-slate-700 p-4 rounded-2xl text-xs font-bold text-white uppercase outline-none focus:border-cyan-500 transition-colors" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-black ml-2">Apellido</label>
            <input required className="w-full bg-slate-900 border border-slate-700 p-4 rounded-2xl text-xs font-bold text-white uppercase outline-none focus:border-cyan-500 transition-colors" value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-slate-500 uppercase font-black ml-2">Alias de Misión</label>
          <input required className="w-full bg-slate-900 border border-slate-700 p-4 rounded-2xl text-xs font-bold text-white outline-none focus:border-cyan-500 transition-colors" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
        </div>

        <div className="space-y-1 relative">
          <label className="text-[10px] text-slate-500 uppercase font-black ml-2">Código de Acceso</label>
          <input required type={showPass ? "text" : "password"} className="w-full bg-slate-900 border border-slate-700 p-4 rounded-2xl text-xs font-bold text-white outline-none focus:border-cyan-500 transition-colors" value={form.clave} onChange={e => setForm({...form, clave: e.target.value})} />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-10 text-cyan-400 active:scale-90 transition-all">{showPass ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-black ml-2">ID Estelar</label>
            <input required placeholder="V-00.000.000" className="w-full bg-slate-900 border border-slate-700 p-4 rounded-2xl text-xs font-bold text-white outline-none focus:border-cyan-500 transition-colors" value={form.cedula} onChange={e => setForm({...form, cedula: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-black ml-2">Frecuencia Comms</label>
            <input required placeholder="+58" className="w-full bg-slate-900 border border-slate-700 p-4 rounded-2xl text-xs font-bold text-white outline-none focus:border-cyan-500 transition-colors" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-slate-500 uppercase font-black ml-2">Enlace de Datos (Correo)</label>
          <input required type="email" className="w-full bg-slate-900 border border-slate-700 p-4 rounded-2xl text-xs font-bold text-white outline-none focus:border-cyan-500 transition-colors" value={form.correo} onChange={e => setForm({...form, correo: e.target.value})} />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-cyan-400 uppercase font-black ml-2">Código de Comandante (Opcional)</label>
          <input className="w-full bg-cyan-500/5 border border-cyan-500/20 p-4 rounded-2xl text-xs font-bold text-white uppercase outline-none focus:border-cyan-400 transition-colors placeholder:text-slate-600" placeholder="Username de tu invitador" value={form.referido} onChange={e => setForm({...form, referido: e.target.value})} />
        </div>

        <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black font-orbitron py-5 rounded-[2rem] mt-6 shadow-xl shadow-cyan-500/20 active:scale-95 transition-all text-sm uppercase tracking-widest">
          INICIAR ALISTAMIENTO
        </button>
        
        <p className="text-[8px] text-slate-600 uppercase font-bold text-center italic mt-2">Al registrarte, aceptas los protocolos de la Estación Lunar 3000.</p>
      </form>
    </div>
  );
};

export default Register;
