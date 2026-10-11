import crypto from 'crypto';

export interface AdminUser {
  id: string;
  username: string;
  role: 'admin';
}

interface Session {
  token: string;
  user: AdminUser;
  expiresAt: number;
}

class AuthService {
  private sessions: Map<string, Session> = new Map();
  private failedAttempts: Map<string, { count: number; lockUntil: number }> = new Map();

  // Configurações do Administrador via variáveis de ambiente
  private get adminUsername(): string {
    return process.env.ADMIN_USERNAME || 'admin';
  }

  private get adminPassword(): string {
    return process.env.ADMIN_PASSWORD || 'admin123';
  }

  private get secretKey(): string {
    return process.env.ADMIN_JWT_SECRET || 'wazzup_secret_key_development';
  }

  // Hash de senha criptográfica usando PBKDF2 com salt aleatório
  public hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  public verifyPassword(password: string, storedHash: string): boolean {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
  }

  // Login Seguro com bloqueio temporário após falhas consecutivas
  public login(username: string, password: string, clientIp = '127.0.0.1'): { success: boolean; token?: string; user?: AdminUser; error?: string } {
    const now = Date.now();
    const attempts = this.failedAttempts.get(clientIp);

    if (attempts && attempts.lockUntil > now) {
      const waitSeconds = Math.ceil((attempts.lockUntil - now) / 1000);
      return { success: false, error: `Muitas tentativas incorretas. Aguarde ${waitSeconds} segundos antes de tentar novamente.` };
    }

    const cleanUser = username.trim().toLowerCase();
    const expectedUser = this.adminUsername.trim().toLowerCase();

    // Verificação em tempo constante contra timing attacks
    const isUserValid = cleanUser.length === expectedUser.length &&
      crypto.timingSafeEqual(Buffer.from(cleanUser), Buffer.from(expectedUser));

    const isPassValid = password === this.adminPassword;

    if (!isUserValid || !isPassValid) {
      const current = attempts || { count: 0, lockUntil: 0 };
      current.count += 1;
      if (current.count >= 5) {
        current.lockUntil = now + 60000; // Bloqueio de 1 minuto
      }
      this.failedAttempts.set(clientIp, current);
      return { success: false, error: 'Credenciais de administrador inválidas.' };
    }

    // Sucesso no login: limpa contador de falhas
    this.failedAttempts.delete(clientIp);

    const user: AdminUser = {
      id: 'admin-1',
      username: this.adminUsername,
      role: 'admin',
    };

    // Gera token de sessão assinado
    const sessionId = crypto.randomBytes(32).toString('hex');
    const signature = crypto.createHmac('sha256', this.secretKey).update(sessionId).digest('hex');
    const token = `${sessionId}.${signature}`;

    const expiresAt = now + (24 * 60 * 60 * 1000); // 24 horas de validade

    this.sessions.set(token, {
      token,
      user,
      expiresAt,
    });

    return {
      success: true,
      token,
      user,
    };
  }

  // Validação de token de sessão
  public validateToken(token?: string): AdminUser | null {
    if (!token) return null;

    const session = this.sessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }

    const [sessionId, signature] = token.split('.');
    if (!sessionId || !signature) return null;

    const expectedSignature = crypto.createHmac('sha256', this.secretKey).update(sessionId).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      return null;
    }

    return session.user;
  }

  public logout(token: string): void {
    this.sessions.delete(token);
  }
}

export const authService = new AuthService();
