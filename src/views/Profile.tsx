{/* En Profile.tsx */}
<div className="flex flex-col items-center py-8">
  <div className="relative">
    <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center border-4 border-slate-800">
      <User size={48} className="text-white" />
    </div>
    <div className="absolute bottom-0 right-0 bg-yellow-500 rounded-full p-1 border-2 border-slate-900">
      <Award size={16} className="text-black" />
    </div>
  </div>
  <h2 className="text-2xl font-black mt-4 uppercase tracking-tighter">
    {user.username} {/* Muestra "JOSE PRUEBA" o el nombre registrado */}
  </h2>
  <p className="text-yellow-500 text-[10px] font-bold tracking-widest uppercase">
    Rango: Teniente
  </p>
</div>
