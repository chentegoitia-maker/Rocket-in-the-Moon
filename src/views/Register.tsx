import React, { useState } from 'react';
import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { UserCircle, Lock, ShieldCheck } from 'lucide-react';

interface RegisterProps {
  onBack: () => void;
  onRegistered: () => void;
}

const Register: React.FC<RegisterProps> = ({ onBack, onRegistered }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !password) return alert("Completa los datos del nuevo colono.");
    if (password.length < 6) return alert("La contraseña debe tener al menos 6 caracteres.");
    
    setLoading(true);
    // TRUCO: Convertimos el nombre en el email interno para Firebase
    const internalEmail = `${username.toLowerCase().trim()}@rocket3000.com`;

    try {
      // 1. Crear en Firebase Auth
      const res = await createUserWithEmailAndPassword(auth, internalEmail, password);
      
      // 2. Crear el documento económico en Firestore
      await setDoc(doc(db, "users", res.user.uid), {
        username: username.trim(),
        email: internalEmail,
        rol: 'USER',
        saldo: 1000, // Bono de bienvenida
        activo: true,
        ciclosJugados: 0,
        certificados: {},
        acciones: {},
        createdAt: Date.now()
      });

      alert("¡CIUDADANÍA APROBADA! Bienvenido a la Estación.");
      onRegistered(); // Volver al Login
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        alert("Error: Este nombre de usuario ya está ocupado por otro colono.");
      } else {
        alert("Error en el registro galáctico. Intenta otro nombre.");
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white font-orbitron p-6">
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4 border border-cyan-500/30">
          <ShieldCheck className="text-cyan-400" size={40} />
        </div>
        <h1 className="text-2xl font-black text-cyan-400 tracking-tighter uppercase text-center">Registro de Ciudadanía</h1>
        <p className="text-[9px] tracking-[0.2em] text-slate-500 uppercase mt-1 text-center">Protocolo de ingreso a Rocket 3000</p>
      </div>

      <div className="max-w-md w-full space-y-4">
        {/* INPUT USUARIO */}
        <div className="relative group">
          <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50 group-focus-within:text-cyan-400 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Nuevo Nombre de Usuario"
            className="w-full bg-slate-900/50 border border-cyan-500/20 rounded-xl py-4 pl-12 pr-4 text-sm focus:border-cyan-500 focus:bg-slate-900 outline-none transition-all"
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        {/* INPUT CONTRASEÑA */}
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50 group-focus-within:text-cyan-400 transition-colors" size={20} />
          <input 
            type="password" 
            placeholder="Crea una Contraseña"
            className="w-full bg-slate-900/50 border border-cyan-500/20 rounded-xl py-4 pl-12 pr-4 text-sm focus:border-cyan-500 focus:bg-slate-900 outline-none transition-all"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button 
          onClick={handleRegister}
          disabled={loading}
          className={`w-full ${loading ? 'bg-slate-700' : 'bg-cyan-600 hover:bg-cyan-500'} text-white font-black py-4 rounded-xl transition-all uppercase tracking-widest shadow-lg shadow-cyan-600/20`}
        >
          {loading ? 'Procesando...' : 'Obtener Ciudadanía'}
        </button>

        <button 
          onClick={onBack}
          className="w-full text-slate-500 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors text-center"
        >
          Volver al acceso
        </button>
      </div>

      <p className="text-[8px] text-slate-600 mt-10 text-center uppercase">
        Al registrarte aceptas las leyes de producción lunar y el descuento de costo de vida por ciclo.
      </p>
    </div>
  );
};

export default Register;
