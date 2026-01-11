export enum AppView {
    LOGIN = 'LOGIN',
    REGISTER = 'REGISTER',
    DASHBOARD = 'DASHBOARD',
    WORLD = 'WORLD',
    MARKET = 'MARKET',
    ADMIN = 'ADMIN',
    PROFILE = 'PROFILE',
    HISTORY = 'HISTORY',
    BANKING = 'BANKING',
    WITHDRAW = 'WITHDRAW'
}

export enum PhenomenonType {
    SOLAR_STORM = 'SOLAR_STORM',
    ALIEN_ATTACK = 'ALIEN_ATTACK',
    METEOR_SHOWER = 'METEOR_SHOWER'
}

export interface User {
    id: string;
    email: string;
    rol: 'USER' | 'ADMIN';
    saldo: number;
    activo: boolean;
    ciclosJugados: number;
    ultimoInversionCiclo?: number;
    protegidoHasta?: number;
    certificados: Record<string, number>;
    acciones: Record<string, number>;
}
