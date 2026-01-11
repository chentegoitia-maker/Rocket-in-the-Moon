import React, { useState } from 'react';
import { auth, db } from '../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface LoginProps {
  onLogin: (user: any) => void;
  onRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRealLogin = async () => {
    if (!email || !password) return alert("Por favor, ingresa tus credenciales.");
    
    try {
      // 1. Autenticar con Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 2. Traer los datos económicos del ciudadano
      const userDoc = await getDoc(doc(db, "users", uid));
      
      if (userDoc.exists()) {
        onLogin({ id: uid, ...userDoc.data() });
      } else {
        alert("Usuario autenticado pero sin datos de ciudadano.");
      }
    } catch (error) {
      alert("Error: Usuario o contraseña incorrectos.");
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 font-orbitron">
      <div className="max-w-md w-full bg-slate-900 p-10 rounded-[2.5rem] border border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.1)] flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-black text-cyan-400">ROCKET 3000</h1>
          <p className="text-[10px] text-slate-400 mt-2">ESTACIÓN LUNAR DE PRODUCCIÓN</p>
        </div>

        <div className="space-y-3">
          <input 
            type="email" 
            placeholder="EMAIL"
            className="w-full bg-black/50 border border-slate-800 rounded-xl p-4 text-sm focus:border-cyan-500 outline-none"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="CONTRASEÑA"
            className="w-full bg-black/50 border border-slate-800 rounded-xl p-4 text-sm focus:border-cyan-500 outline-none"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button 
          onClick={handleRealLogin}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-4 rounded-2xl transition-all shadow-lg shadow-cyan-500/20"
        >
          INGRESAR A LA ESTACIÓN
        </button>
        
        <button onClick={onRegister} className="text-xs text-slate-500 uppercase font-bold">
          Solicitar Nueva Ciudadanía
        </button>
      </div>
    </div>
  );
};

export default Login;
