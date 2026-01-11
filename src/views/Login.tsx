import React from 'react';

interface LoginProps {
  onLogin: (user: any) => void;
  onRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister }) => {
  // Función para entrar directamente y probar el juego
  const handleDemoLogin = () => {
    onLogin({
      id: 'colono-001',
      email: 'admin@rocket3000.com',
      rol: 'USER',
      saldo: 1000,
      activo: true,
      ciclosJugados: 0,
      certificados: {},
      acciones: {}
    });
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 p-10 rounded-[2.5rem] border border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.1)] flex flex-col gap-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tighter uppercase text-cyan-400">ROCKET 3000</h1>
          <p className="text-[10px] tracking-[0.2em] text-slate-400 uppercase font-bold">Estación Lunar de Producción</p>
        </div>

        <div className="space-y-4 mt-4">
          <button 
            onClick={handleDemoLogin}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-4 rounded-2xl transition-all uppercase text-sm tracking-widest shadow-lg shadow-cyan-500/20"
          >
            Ingresar a la Estación
          </button>
          
          <button 
            onClick={onRegister}
            className="w-full bg-transparent border border-slate-700 hover:border-slate-500 text-slate-400 py-4 rounded-2xl transition-all uppercase text-[10px] tracking-widest font-bold"
          >
            Solicitar Nueva Ciudadanía
          </button>
        </div>

        <p className="text-[9px] text-center text-slate-500 uppercase mt-4">
          Al ingresar aceptas el protocolo de seguridad orbital de la colonia.
        </p>
      </div>
    </div>
  );
};

export default Login;
