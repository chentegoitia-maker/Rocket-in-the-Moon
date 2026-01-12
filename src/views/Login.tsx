import React, { useState } from 'react';
import { RocketLogo } from '../components/RocketLogo';
import { Eye, EyeOff, User as UserIcon, Lock } from 'lucide-react';
import { store } from '../services/mockStore';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  onRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = store.getUsers().find(u => u.username === username && u.clave === password);
    if (user) {
      if (user.bloqueado) {
        setError('Usuario bloqueado por administración');
        return;
      }
      onLogin(user);
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-900 to-black">
      <RocketLogo size="lg" />
      <h1 className="text-4xl font-black font-orbitron mt-4 mb-2 bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent text-center max-w-xs">
        ROCKET IN THE MOON
      </h1>
      <p className="text-slate-400 mb-8 font-medium">ESTACIÓN ESPACIAL 3000</p>

      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        <div className="relative">
          <div className="absolute left-3 top-3 text-cyan-400">
            <UserIcon size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Nombre de Usuario" 
            className="w-full bg-slate-900/50 border border-cyan-400/30 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>

        <div className="relative">
          <div className="absolute left-3 top-3 text-cyan-400">
            <Lock size={20} />
          </div>
          <input 
            type={showPass ? "text" : "password"} 
            placeholder="Contraseña" 
            className="w-full bg-slate-900/50 border border-cyan-400/30 rounded-xl py-3 pl-12 pr-12 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button 
            type="button" 
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-3 text-cyan-400"
          >
            {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button 
          type="submit" 
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold font-orbitron py-4 rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-transform"
        >
          INICIAR MISIÓN
        </button>
      </form>

      <div className="mt-8 flex flex-col items-center gap-2">
        <p className="text-slate-500">¿No tienes cuenta?</p>
        <button onClick={onRegister} className="text-cyan-400 font-bold hover:underline">
          REGÍSTRATE AQUÍ
        </button>
      </div>
    </div>
  );
};

export default Login;
