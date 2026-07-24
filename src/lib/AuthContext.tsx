'use client';

import { createContext, useContext, ReactNode } from 'react';
import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react';

// 定义用户类型
type User = {
  id: string;
  email: string;
};

// 定义认证上下文类型（保持与原接口一致，避免改动页面）
type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 内部 Provider：从 NextAuth 会话派生认证状态
function InnerAuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const user: User | null = session?.user
    ? { id: session.user.id, email: session.user.email ?? '' }
    : null;

  const login = async (email: string, password: string) => {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.ok && !result.error) {
      return { success: true, message: '登录成功' };
    }
    return { success: false, message: '邮箱或密码不正确' };
  };

  const logout = () => {
    signOut({ callbackUrl: '/login' });
  };

  const value: AuthContextType = {
    user,
    loading: status === 'loading',
    login,
    logout,
    isAuthenticated: status === 'authenticated',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 对外的 AuthProvider：注入 NextAuth 的 SessionProvider
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <InnerAuthProvider>{children}</InnerAuthProvider>
    </SessionProvider>
  );
}

// 使用认证上下文的钩子
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return context;
}
