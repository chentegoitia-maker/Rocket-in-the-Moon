import { User, PhenomenonType } from '../types';

export const store = {
    getUsers: () => [] as User[],
    updateUser: (u: User) => console.log('Usuario actualizado:', u.email),
    getPhenomenon: () => ({ 
        activo: false, 
        tipo: null as PhenomenonType | null, 
        danoPct: 0, 
        ciclosRestantes: 0, 
        showSiren: false 
    }),
    setPhenomenon: (p: any) => console.log('Cambio de clima espacial'),
    getEconomy: () => ({ 
        costoVida: 10, 
        precioPoliza: 50, 
        impuestoInactividad: 5, 
        impuestoNoInversion: 5, 
        dividendoAccionPct: 2, 
        certificados: {} as any 
    }),
    getMarket: () => [] as any[],
    addTransaction: (t: any) => console.log('Transacción:', t.tipo)
};
