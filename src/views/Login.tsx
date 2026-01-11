import React, { useState } from 'react';
import { auth, db } from '../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { UserCircle, Lock, Eye } from 'lucide-react';

interface LoginProps {
  onLogin: (user: any) => void;
  onRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) return alert("Ingresa tus credenciales de misión.");
    
    // TRUCO: Convertimos el nombre de usuario en el email que Firebase espera
    const internalEmail = `${username.toLowerCase()}@rocket3000.com`;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, internalEmail, password);
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      
      if (userDoc.exists()) {
        onLogin({ id: userCredential.user.uid, ...userDoc.data() });
      }
    } catch (error) {
      alert("Error: Nombre de usuario o contraseña incorrectos.");
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white font-orbitron p-6">
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
          <span className="text-4xl">🚀</span>
        </div>
        <h1 className="text-3xl font-black text-cyan-400 tracking-tighter uppercase">ROCKET IN THE MOON</h1>
        <p className="text-[10px] tracking-[0.3em] text-slate-500 uppercase mt-1">ESTACIÓN ESPACIAL 3000</p>
      </div>

      <div className="max-w-md w-full space-y-4">
        {/* INPUT USUARIO */}
        <div className="relative group">
          <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50 group-focus-within:text-cyan-400 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Nombre de Usuario"
            className="w-full bg-slate-900/50 border border-cyan-500/20 rounded-xl py-4 pl-12 pr-4 text-sm focus:border-cyan-500 focus:bg-slate-900 outline-none transition-all"
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        {/* INPUT CONTRASEÑA */}
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50 group-focus-within:text-cyan-400 transition-colors" size={20} />
          <input 
            type={showPass ? "text" : "password"} 
            placeholder="Contraseña"
            className="w-full bg-slate-900/50 border border-cyan-500/20 rounded-xl py-4 pl-12 pr-12 text-sm focus:border-cyan-500 focus:bg-slate-900 outline-none transition-all"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            onClick={() => setShowPass(!showPass)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400"
          >
            <Eye size={18} />
          </button>
        </div>

        <button 
          onClick={handleLogin}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-4 rounded-xl transition-all uppercase tracking-widest shadow-lg shadow-cyan-500/20"
        >
          INICIAR MISIÓN
        </button>

        <div className="text-center pt-4">
          <p className="text-xs text-slate-500 mb-2 uppercase font-bold tracking-tighter">¿No tienes cuenta?</p>
          <button 
            onClick={onRegister}
            className="text-cyan-400 text-xs font-black uppercase tracking-widest hover:underline"
          >
            REGÍSTRATE AQUÍ
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
