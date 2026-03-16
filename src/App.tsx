import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Search, Bird, Leaf, ThermometerSun, Wheat, ShieldPlus, Lightbulb, Loader2, Calculator, History, ChevronRight, User, Mail, Lock, Star, Sprout, Award, LogOut, Check, Crown, AlertTriangle, Download, LayoutDashboard, Plus, Egg, Package, DollarSign, Stethoscope, Menu, Smartphone, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import GalponView from './components/GalponView';
import InventarioView from './components/InventarioView';
import IncubadoraView from './components/IncubadoraView';
import FinanceView from './components/FinanceView';
import DashboardView from './components/DashboardView';
import SanidadView from './components/SanidadView';
import PlanesView from './components/PlanesView';
import ReportesView from './components/ReportesView';
import PerfilView from './components/PerfilView';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export class ErrorBoundary extends React.Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center justify-center p-4 font-sans text-stone-800">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-red-100 text-center">
            <div className="bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-serif font-semibold text-stone-800 mb-4">Algo salió mal</h2>
            <p className="text-stone-600 mb-6">
              Ha ocurrido un error inesperado en la aplicación. Por favor, recarga la página.
            </p>
            <div className="bg-stone-50 p-4 rounded-xl text-left overflow-auto max-h-40 text-xs text-stone-500 mb-6">
              {this.state.error?.message}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-[#5A5A40] text-white rounded-xl py-3.5 font-medium hover:bg-[#4a4a34] transition-colors shadow-sm"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface BirdInfo {
  perfil: string;
  habitat: string;
  nutricion: string;
  gramosDiarios: number;
  salud: string;
  consejo: string;
}

interface HistoryItem {
  query: string;
  data: BirdInfo;
}

export default function App() {
  const [view, setView] = useState<'auth' | 'onboarding' | 'dashboard' | 'main' | 'galpon' | 'inventory' | 'incubator' | 'finance' | 'health' | 'planes' | 'reportes' | 'perfil'>('auth');
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [experienceLevel, setExperienceLevel] = useState<'Principiante' | 'Intermedio' | 'Experto'>('Intermedio');
  const [isPremium, setIsPremium] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [searchCount, setSearchCount] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [nombreGranja, setNombreGranja] = useState<string>('AgroAves');

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;
    let unsubscribeUsuarios: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      if (unsubscribeUsuarios) {
        unsubscribeUsuarios();
        unsubscribeUsuarios = null;
      }

      if (user) {
        // User is logged in, listen to their document
        const userDocRef = doc(db, 'users', user.uid);
        const usuariosDocRef = doc(db, 'Usuarios', user.uid);
        
        unsubscribeSnapshot = onSnapshot(userDocRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setExperienceLevel(data.experienceLevel);
            setIsPremium(data.isPremium);
            setUserName(data.name || '');
            
            if (view === 'auth' || view === 'onboarding') {
              setView('dashboard');
            }
          } else {
            // No document, user needs to complete onboarding
            setView('onboarding');
          }
        }, (error) => {
          if (auth.currentUser?.uid === user.uid) {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          }
        });

        unsubscribeUsuarios = onSnapshot(usuariosDocRef, (snapshot) => {
          if (snapshot.exists() && snapshot.data().nombreGranja) {
            setNombreGranja(snapshot.data().nombreGranja);
          } else {
            setNombreGranja('AgroAves');
          }
        }, (error) => {
          console.error("Error fetching nombreGranja", error);
        });

      } else {
        // User is logged out
        setView('auth');
        setExperienceLevel('Intermedio');
        setIsPremium(false);
        setUserName('');
        setNombreGranja('AgroAves');
      }
      setIsAuthReady(true);
    });

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
      if (unsubscribeUsuarios) {
        unsubscribeUsuarios();
      }
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('agroaves_search_date');
    if (savedDate === today) {
      setSearchCount(parseInt(localStorage.getItem('agroaves_search_count') || '0', 10));
    } else {
      localStorage.setItem('agroaves_search_date', today);
      localStorage.setItem('agroaves_search_count', '0');
      setSearchCount(0);
    }
  }, []);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BirdInfo | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [birdCount, setBirdCount] = useState<number>(1);
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    try {
      if (authMode === 'register') {
        await createUserWithEmailAndPassword(auth, email, password);
        setView('onboarding');
      } else if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (authMode === 'forgot_password') {
        await sendPasswordResetEmail(auth, email);
        setAuthSuccess('Se ha enviado un enlace de recuperación a tu correo.');
        setAuthMode('login');
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use' || err.message?.includes('email-already-in-use')) {
        setAuthError('Este correo ya está registrado.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.message?.includes('invalid-credential')) {
        setAuthError('Correo o contraseña incorrectos.');
      } else if (err.code === 'auth/weak-password' || err.message?.includes('weak-password')) {
        setAuthError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setAuthError(err.message || 'Ocurrió un error. Por favor, intenta de nuevo.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSelectExperience = async (level: 'Principiante' | 'Intermedio' | 'Experto') => {
    if (!auth.currentUser) return;
    
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        email: auth.currentUser.email,
        experienceLevel: level,
        isPremium: false,
        name: userName
      });
      setExperienceLevel(level);
      setView('dashboard');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const handleDownloadPDF = () => {
    if (!result) return;

    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(90, 90, 64); // #5A5A40
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('AgroAves', 14, 20);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Ficha Técnica y Calculadora de Raciones', 14, 30);

    // Title
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`Especie: ${query}`, 14, 55);

    let yPos = 65;

    const addSection = (title: string, content: string) => {
      // Check page break
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(90, 90, 64);
      doc.text(title, 14, yPos);
      yPos += 7;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const splitText = doc.splitTextToSize(content, 180);
      doc.text(splitText, 14, yPos);
      yPos += (splitText.length * 5) + 8;
    };

    addSection('1. Perfil del Ave', result.perfil);
    addSection('2. Hábitat y Clima', result.habitat);
    addSection('3. Nutrición Diaria', result.nutricion);

    // Calculator Results
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(217, 119, 54); // #D97736
    doc.text('Calculadora de Raciones Semanal', 14, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`Cantidad de aves: ${birdCount}`, 14, yPos);
    yPos += 6;
    doc.text(`Consumo estimado por ave: ${result.gramosDiarios}g diarios`, 14, yPos);
    yPos += 6;
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Total por semana: ${formatWeight(birdCount * result.gramosDiarios * 7)}`, 14, yPos);
    yPos += 12;

    addSection('4. Salud y Prevención', result.salud);
    
    // Consejo
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFillColor(254, 243, 199); // amber-50
    doc.setDrawColor(253, 230, 138); // amber-200
    
    // Calculate height for Consejo box
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const splitConsejo = doc.splitTextToSize(result.consejo, 174);
    const boxHeight = (splitConsejo.length * 5) + 15;
    
    doc.rect(14, yPos - 5, 182, boxHeight, 'FD');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14); // amber-900
    doc.text('5. El Consejo AgroAves', 18, yPos + 2);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(146, 64, 14);
    doc.text(splitConsejo, 18, yPos + 9);

    doc.save(`Ficha_AgroAves_${query.replace(/\s+/g, '_')}.pdf`);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const handleSearch = async (e?: React.FormEvent, searchQuery?: string) => {
    if (e) e.preventDefault();
    const q = searchQuery || query;
    if (!q.trim()) return;

    if (!isPremium && searchCount >= 3) {
      setShowLimitModal(true);
      return;
    }

    const existing = history.find(item => item.query.toLowerCase() === q.toLowerCase());
    if (existing) {
      setQuery(existing.query);
      setResult(existing.data);
      setBirdCount(1);
      setError('');
      
      if (!isPremium) {
        const newCount = searchCount + 1;
        setSearchCount(newCount);
        localStorage.setItem('agroaves_search_count', newCount.toString());
      }
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      let levelInstruction = "El usuario es INTERMEDIO. Da la información técnica estándar y directa.";
      if (experienceLevel === 'Principiante') {
        levelInstruction = "El usuario es PRINCIPIANTE. Usa un lenguaje muy sencillo, sin jerga complicada. Explica paso a paso conceptos básicos (como qué es una cama de viruta o por qué importa la temperatura) y da mucho ánimo.";
      } else if (experienceLevel === 'Experto') {
        levelInstruction = "El usuario es EXPERTO. Omite lo básico. Enfócate en datos de alto nivel como tasas de conversión alimenticia, parámetros de incubación exactos, prevención de enfermedades complejas y métricas de rentabilidad.";
      }

      const systemInstruction = `Eres el motor de conocimiento y asistencia de 'AgroAves', un software especializado para criadores. Tu objetivo es proporcionar información técnica, útil y precisa sobre cualquier especie de ave o animal que el usuario consulte, actuando como un veterinario y gestor experto. Responde en español.\n\nREGLA DE EXPERIENCIA:\n${levelInstruction}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: q,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              perfil: { type: Type.STRING, description: "Perfil del Ave: Propósito principal (postura, carne, ornamental o mascota)." },
              habitat: { type: Type.STRING, description: "Hábitat y Clima: Espacio requerido por ave, temperatura óptima y adaptación." },
              nutricion: { type: Type.STRING, description: "Nutrición Diaria: Tipo de alimento, gramos diarios recomendados y necesidades de hidratación." },
              gramosDiarios: { type: Type.NUMBER, description: "Cantidad estricta en gramos de alimento diario recomendado por ave (solo el número entero)." },
              salud: { type: Type.STRING, description: "Salud y Prevención: Enfermedades comunes a vigilar, cuidados específicos del plumaje o patas." },
              consejo: { type: Type.STRING, description: "El Consejo AgroAves: Un tip práctico y directo para el manejo diario que facilite la vida del criador." }
            },
            required: ["perfil", "habitat", "nutricion", "gramosDiarios", "salud", "consejo"]
          }
        }
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text) as BirdInfo;
        setResult(parsed);
        setHistory(prev => [{ query: q, data: parsed }, ...prev].slice(0, 10));
        setBirdCount(1);
        if (!searchQuery) setQuery(q);

        if (!isPremium) {
          const newCount = searchCount + 1;
          setSearchCount(newCount);
          localStorage.setItem('agroaves_search_count', newCount.toString());
        }
      } else {
        setError('No se pudo obtener información.');
      }
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al consultar el motor de AgroAves. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const formatWeight = (grams: number) => {
    if (isNaN(grams)) return '0 g';
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(2)} kg`;
    }
    return `${Math.round(grams)} g`;
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#5A5A40] animate-spin" />
      </div>
    );
  }

  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center justify-center p-4 font-sans text-stone-800 selection:bg-[#5A5A40] selection:text-white">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 md:p-10 rounded-3xl shadow-xl w-full max-w-md border border-stone-100">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-[#5A5A40] p-4 rounded-full text-white mb-4 shadow-md">
              <Bird className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-serif font-semibold text-[#5A5A40]">AgroAves</h1>
            <p className="text-stone-500 mt-2 text-center">
              {authMode === 'login' ? 'Ingresa a tu cuenta para continuar' : authMode === 'register' ? 'Crea tu cuenta y únete a la comunidad' : 'Recupera tu contraseña'}
            </p>
          </div>
          {authError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 text-center mb-4">
              {authError}
            </div>
          )}
          {authSuccess && (
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-sm border border-emerald-100 text-center mb-4">
              {authSuccess}
            </div>
          )}
          <form onSubmit={handleAuthSubmit} className="space-y-5">
            {authMode === 'register' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nombre completo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-5 w-5 text-stone-400" /></div>
                  <input 
                    type="text" 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] transition-colors" 
                    placeholder="Ej. Juan Pérez" 
                  />
                </div>
              </motion.div>
            )}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Correo electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-stone-400" /></div>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] transition-colors" 
                  placeholder="tu@correo.com" 
                />
              </div>
            </div>
            {authMode !== 'forgot_password' && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-stone-400" /></div>
                  <input 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] transition-colors" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>
            )}
            <button disabled={authLoading} type="submit" className="w-full bg-[#5A5A40] text-white rounded-xl py-3.5 font-medium hover:bg-[#4a4a34] transition-colors shadow-sm mt-4 flex items-center justify-center disabled:opacity-70">
              {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === 'login' ? 'Iniciar Sesión' : authMode === 'register' ? 'Registrarse' : 'Enviar enlace')}
            </button>
          </form>
          <div className="mt-8 text-center space-y-3">
            {authMode === 'login' && (
              <div>
                <button onClick={() => { setAuthMode('forgot_password'); setAuthError(''); setAuthSuccess(''); }} className="text-sm text-stone-500 hover:text-[#5A5A40] transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}
            <p className="text-stone-600 text-sm">
              {authMode === 'login' ? '¿No tienes una cuenta?' : authMode === 'register' ? '¿Ya tienes una cuenta?' : '¿Recordaste tu contraseña?'}
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); setAuthSuccess(''); }} className="ml-2 text-[#5A5A40] font-semibold hover:underline">
                {authMode === 'login' ? 'Regístrate aquí' : 'Inicia sesión'}
              </button>
            </p>
          </div>
        </motion.div>
        <div className="mt-8 text-xs font-medium text-[#5A5A40]/60 tracking-wide">
          Impulsado por Google Gemini
        </div>
      </div>
    );
  }

  if (view === 'onboarding') {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center justify-center p-4 font-sans text-stone-800 selection:bg-[#5A5A40] selection:text-white">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 md:p-12 rounded-3xl shadow-xl w-full max-w-3xl border border-stone-100 text-center">
          <div className="inline-flex items-center justify-center bg-amber-100 text-amber-600 p-4 rounded-full mb-6 shadow-sm">
            <Star className="w-10 h-10" />
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-[#5A5A40] mb-4">¡Bienvenido a AgroAves!</h2>
          <p className="text-stone-600 text-lg mb-10 max-w-xl mx-auto">
            Para personalizar tu experiencia y los consejos que te daremos, por favor responde una sola pregunta:
            <br/><br/>
            <span className="font-semibold text-stone-800 text-xl">¿Cuál es tu nivel de experiencia en la avicultura?</span>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button onClick={() => handleSelectExperience('Principiante')} className="flex flex-col items-center p-8 bg-stone-50 border-2 border-stone-200 rounded-2xl hover:border-emerald-600 hover:bg-emerald-50 transition-all group shadow-sm hover:shadow-md">
              <Sprout className="w-14 h-14 text-emerald-600 mb-4 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-xl text-stone-800 group-hover:text-emerald-800">Principiante</span>
              <span className="text-sm text-stone-500 mt-2">Estoy empezando o quiero aprender</span>
            </button>
            <button onClick={() => handleSelectExperience('Intermedio')} className="flex flex-col items-center p-8 bg-stone-50 border-2 border-stone-200 rounded-2xl hover:border-amber-500 hover:bg-amber-50 transition-all group shadow-sm hover:shadow-md">
              <Bird className="w-14 h-14 text-amber-500 mb-4 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-xl text-stone-800 group-hover:text-amber-800">Intermedio</span>
              <span className="text-sm text-stone-500 mt-2">Tengo algo de experiencia y aves</span>
            </button>
            <button onClick={() => handleSelectExperience('Experto')} className="flex flex-col items-center p-8 bg-stone-50 border-2 border-stone-200 rounded-2xl hover:border-[#5A5A40] hover:bg-[#f5f5f0] transition-all group shadow-sm hover:shadow-md">
              <Award className="w-14 h-14 text-[#5A5A40] mb-4 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-xl text-stone-800 group-hover:text-[#5A5A40]">Experto</span>
              <span className="text-sm text-stone-500 mt-2">Soy criador profesional o veterano</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f5f5f0] text-stone-800 font-sans selection:bg-[#5A5A40] selection:text-white">
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#5A5A40] text-[#f5f5f0] py-4 px-6 flex items-center justify-between z-20 shadow-md">
        <div className="flex items-center gap-3">
          <Bird className="w-6 h-6" />
          <h1 className="text-xl font-serif font-semibold tracking-wide">{nombreGranja}</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover:bg-[#4a4a34] rounded-lg transition-colors">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="md:hidden fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#5A5A40] text-[#f5f5f0] flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center gap-3 border-b border-[#6b6b4d]">
          <Bird className="w-8 h-8" />
          <h1 className="text-2xl font-serif font-semibold tracking-wide truncate" title={nombreGranja}>{nombreGranja}</h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto scrollbar-hide py-6 px-4 space-y-2">
          <button onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'dashboard' ? 'bg-[#4a4a34] text-white font-medium' : 'text-stone-300 hover:text-white hover:bg-[#4a4a34]/50'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span>Resumen</span>
          </button>
          <button onClick={() => { setView('main'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'main' ? 'bg-[#4a4a34] text-white font-medium' : 'text-stone-300 hover:text-white hover:bg-[#4a4a34]/50'}`}>
            <Search className="w-5 h-5" />
            <span>Buscador</span>
          </button>
          <button onClick={() => { setView('galpon'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'galpon' ? 'bg-[#4a4a34] text-white font-medium' : 'text-stone-300 hover:text-white hover:bg-[#4a4a34]/50'}`}>
            <Bird className="w-5 h-5" />
            <span>Mi Galpón</span>
          </button>
          <button onClick={() => { setView('inventory'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'inventory' ? 'bg-[#4a4a34] text-white font-medium' : 'text-stone-300 hover:text-white hover:bg-[#4a4a34]/50'}`}>
            <Package className="w-5 h-5" />
            <span>Inventario</span>
          </button>
          <button onClick={() => { setView('incubator'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'incubator' ? 'bg-[#4a4a34] text-white font-medium' : 'text-stone-300 hover:text-white hover:bg-[#4a4a34]/50'}`}>
            <ThermometerSun className="w-5 h-5" />
            <span>Incubadora</span>
          </button>
          <button onClick={() => { setView('finance'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'finance' ? 'bg-[#4a4a34] text-white font-medium' : 'text-stone-300 hover:text-white hover:bg-[#4a4a34]/50'}`}>
            <DollarSign className="w-5 h-5" />
            <span>Finanzas</span>
          </button>
          <button onClick={() => { setView('health'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'health' ? 'bg-[#4a4a34] text-white font-medium' : 'text-stone-300 hover:text-white hover:bg-[#4a4a34]/50'}`}>
            <Stethoscope className="w-5 h-5" />
            <span>Sanidad</span>
          </button>
          <button onClick={() => { setView('planes'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'planes' ? 'bg-[#4a4a34] text-white font-medium' : 'text-stone-300 hover:text-white hover:bg-[#4a4a34]/50'}`}>
            <Crown className="w-5 h-5" />
            <span>Suscripción</span>
          </button>
          <button onClick={() => { setView('reportes'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'reportes' ? 'bg-[#4a4a34] text-white font-medium' : 'text-stone-300 hover:text-white hover:bg-[#4a4a34]/50'}`}>
            <FileText className="w-5 h-5" />
            <span>Reportes</span>
          </button>
          <button onClick={() => { setView('perfil'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'perfil' ? 'bg-[#4a4a34] text-white font-medium' : 'text-stone-300 hover:text-white hover:bg-[#4a4a34]/50'}`}>
            <User className="w-5 h-5" />
            <span>Perfil</span>
          </button>
        </nav>

        <div className="p-4 border-t border-[#6b6b4d] space-y-2">
          {deferredPrompt && (
            <button onClick={handleInstallClick} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors bg-emerald-600 text-white hover:bg-emerald-500 shadow-md mb-2">
              <Smartphone className="w-5 h-5" />
              <span className="font-medium">📱 Instalar App</span>
            </button>
          )}
          <div className="px-4 py-2 mb-2">
            <span className="block text-xs text-[#f5f5f0]/60 uppercase tracking-wider mb-1">Modo</span>
            <span className="font-medium">{experienceLevel}</span>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-stone-300 hover:text-white hover:bg-red-500/20 hover:text-red-100">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Salir</span>
          </button>
          
          <div className="pt-4 text-center">
            <p className="text-xs text-stone-400/60 font-medium">v1.0 - Creado por Sebas</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 md:ml-64 pt-16 md:pt-0 transition-all duration-300 min-h-screen">
        {view === 'main' && (
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
          {/* Sidebar Historial */}
          <aside className="w-full md:w-72 shrink-0 order-2 md:order-1">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 sticky top-28">
            <h3 className="text-lg font-semibold text-stone-800 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-[#5A5A40]" />
              Últimas Consultas
            </h3>
            
            {history.length === 0 ? (
              <p className="text-stone-500 text-sm italic text-center py-4">No hay consultas recientes.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((item, idx) => (
                  <li key={idx}>
                    <button
                      onClick={() => handleSearch(undefined, item.query)}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-stone-50 transition-colors flex items-center justify-between group border border-transparent hover:border-stone-200"
                    >
                      <span className="font-medium text-stone-700 capitalize truncate pr-2">
                        {item.query}
                      </span>
                      <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[#5A5A40] transition-colors" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 order-1 md:order-2">
          <AnimatePresence>
            {showLimitModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-stone-100 text-center relative"
                >
                  <div className="bg-amber-100 text-amber-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Crown className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-serif font-semibold text-stone-800 mb-3">Límite Diario Alcanzado</h3>
                  <p className="text-stone-600 mb-8 text-lg">
                    ¡Has alcanzado tu límite diario de 3 consultas gratuitas! Mejora tu cuenta para seguir obteniendo la mejor asesoría avícola.
                  </p>
                  <button
                    onClick={() => {
                      setShowLimitModal(false);
                      setView('planes');
                    }}
                    className="w-full bg-[#5A5A40] text-white rounded-xl py-4 font-medium hover:bg-[#4a4a34] transition-colors shadow-md text-lg"
                  >
                    Ver Planes Premium
                  </button>
                  <button
                    onClick={() => setShowLimitModal(false)}
                    className="mt-4 text-stone-500 hover:text-stone-700 font-medium underline underline-offset-4"
                  >
                    Cerrar
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <div className="text-center mb-10">
            <h2 className="text-4xl md:text-5xl font-serif text-[#5A5A40] mb-4">Asistente Experto</h2>
            <p className="text-stone-600 max-w-xl mx-auto text-lg">
              Ingresa la especie de ave que crías. Nuestro motor te proporcionará una guía técnica y práctica al instante.
            </p>
          </div>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-10 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej. Gallina Sussex, Codorniz Japonesa..."
              className="w-full bg-white border-2 border-stone-200 rounded-full py-4 pl-6 pr-16 text-lg focus:outline-none focus:border-[#5A5A40] shadow-sm transition-colors"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-2 bottom-2 bg-[#5A5A40] text-white rounded-full p-3 hover:bg-[#4a4a34] disabled:opacity-50 transition-colors flex items-center justify-center w-12"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
            </button>
          </form>

          {error && (
            <div className="text-center text-red-600 bg-red-50 p-4 rounded-xl max-w-2xl mx-auto mb-8 border border-red-100">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={result.perfil} // Force re-animation on new result
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-3xl mx-auto border border-stone-100"
              >
                <div className="bg-[#5A5A40] text-white px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-2xl font-serif capitalize flex items-center gap-3">
                    <Bird className="w-7 h-7" />
                    {query}
                  </h3>
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-colors text-sm font-medium border border-white/20"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Ficha en PDF
                  </button>
                </div>
                
                <div className="p-6 md:p-10 space-y-8">
                  <Section icon={<Leaf className="w-6 h-6 text-[#5A5A40]" />} title="1. Perfil del Ave" content={result.perfil} />
                  <Section icon={<ThermometerSun className="w-6 h-6 text-[#D97736]" />} title="2. Hábitat y Clima" content={result.habitat} />
                  
                  <div className="space-y-6">
                    <Section icon={<Wheat className="w-6 h-6 text-amber-600" />} title="3. Nutrición Diaria" content={result.nutricion} />
                    
                    {/* Calculadora de Raciones */}
                    <div className="ml-0 md:ml-16 bg-stone-50 rounded-2xl p-5 border border-stone-200 shadow-sm">
                      <h4 className="text-md font-semibold text-stone-800 mb-4 flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-[#5A5A40]" />
                        Calculadora de Raciones Semanal
                      </h4>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="w-full sm:w-auto">
                          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Cant. de aves</label>
                          <input
                            type="number"
                            min="1"
                            value={birdCount}
                            onChange={(e) => setBirdCount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full sm:w-28 px-4 py-2.5 bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] text-lg font-medium"
                          />
                        </div>
                        <div className="w-full sm:flex-1 bg-white p-3 rounded-xl border border-stone-200 flex flex-col justify-center">
                          <span className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Total por semana</span>
                          <span className="text-2xl font-bold text-[#5A5A40]">
                            {formatWeight(birdCount * result.gramosDiarios * 7)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-stone-500 mt-3 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Basado en un consumo estimado de {result.gramosDiarios}g diarios por ave.
                      </p>
                    </div>
                  </div>

                  <Section icon={<ShieldPlus className="w-6 h-6 text-emerald-600" />} title="4. Salud y Prevención" content={result.salud} />
                  
                  <div className="bg-amber-50 rounded-2xl p-6 md:p-8 border border-amber-100 mt-8">
                    <div className="flex items-start gap-4">
                      <div className="bg-amber-100 p-3 rounded-full text-amber-600 shrink-0">
                        <Lightbulb className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold text-amber-900 mb-3">5. El Consejo AgroAves</h4>
                        <p className="text-amber-800 leading-relaxed text-lg">{result.consejo}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      )}

      {view === 'dashboard' && (
        <div className="max-w-6xl mx-auto px-4 py-8 w-full">
          <DashboardView setView={setView} userName={userName} setUserName={async (name) => {
            if (auth.currentUser) {
              try {
                await setDoc(doc(db, 'users', auth.currentUser.uid), { name }, { merge: true });
                setUserName(name);
              } catch (err) {
                console.error("Error updating name:", err);
              }
            }
          }} />
        </div>
      )}

      {view === 'galpon' && (
        <div className="max-w-6xl mx-auto px-4 py-8 w-full">
          <GalponView />
        </div>
      )}

      {view === 'inventory' && (
        <div className="max-w-6xl mx-auto px-4 py-8 w-full">
          <InventarioView />
        </div>
      )}

      {view === 'incubator' && (
        <div className="max-w-6xl mx-auto px-4 py-8 w-full">
          <IncubadoraView />
        </div>
      )}

      {view === 'finance' && (
        <div className="max-w-6xl mx-auto px-4 py-8 w-full">
          <FinanceView />
        </div>
      )}

      {view === 'health' && (
        <div className="max-w-6xl mx-auto px-4 py-8 w-full">
          <SanidadView />
        </div>
      )}

      {view === 'planes' && (
        <div className="max-w-6xl mx-auto px-4 py-8 w-full">
          <PlanesView />
        </div>
      )}

      {view === 'reportes' && (
        <div className="max-w-6xl mx-auto px-4 py-8 w-full">
          <ReportesView />
        </div>
      )}

      {view === 'perfil' && (
        <div className="max-w-6xl mx-auto px-4 py-8 w-full">
          <PerfilView />
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto py-8 text-center">
        <p className="text-xs font-medium text-[#5A5A40]/60 tracking-wide">
          Impulsado por Google Gemini
        </p>
      </footer>
      </main>
    </div>
  );
}

function Section({ icon, title, content }: { icon: React.ReactNode, title: string, content: string }) {
  return (
    <div className="flex items-start gap-4 md:gap-6">
      <div className="bg-stone-50 p-3 md:p-4 rounded-full shrink-0 border border-stone-100 shadow-sm">
        {icon}
      </div>
      <div>
        <h4 className="text-xl font-semibold text-stone-800 mb-2">{title}</h4>
        <p className="text-stone-600 leading-relaxed text-lg">{content}</p>
      </div>
    </div>
  );
}
