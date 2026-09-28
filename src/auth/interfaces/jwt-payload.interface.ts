import { Role } from '../../common/constants/roles.enum';
export interface JwtPayload { sub: number; email: string; rol: Role; }
