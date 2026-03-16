import React, { useState, useEffect } from 'react';
import { Egg, Package, ThermometerSun, DollarSign, Plus, ArrowRight, User, Sparkles, X, Activity, AlertTriangle, Lightbulb, TrendingUp, Bird } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { handleFirestoreError, OperationType } from '../App';

const mockProductionVsFeedData = [
  { month: 'Oct', loteA_huevos: 4000, loteB_huevos: 2400, loteC_huevos: 0, alimento_kg: 1200 },
  { month: 'Nov', loteA_huevos: 4200, loteB_huevos: 2600, loteC_huevos: 800, alimento_kg: 1350 },
  { month: 'Dic', loteA_huevos: 4100, loteB_huevos: 2800, loteC_huevos: 1500, alimento_kg: 1400 },
  { month: 'Ene', loteA_huevos: 3900, loteB_huevos: 2900, loteC_huevos: 2200, alimento_kg: 1500 },
  { month: 'Feb', loteA_huevos: 3700, loteB_huevos: 2850, loteC_huevos: 2800, alimento_kg: 1550 },
];

interface DashboardViewProps {
  setView: (view: any) => void;
  userName: string;
  setUserName: (name: string) => void;
}

export default function DashboardView({ setView, userName, setUserName }: DashboardViewProps) {
  const [dateStr, setDateStr] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState('');
  const [totalAlimento, setTotalAlimento] = useState<number>(0);
  const [totalGastos, setTotalGastos] = useState<number>(0);
  const [todayProduction, setTodayProduction] = useState<number>(0);
  const [totalAves, setTotalAves] = useState<number>(0);
  const [chartData, setChartData] = useState<{ name: string; huevos: number }[]>([]);
  const [nextHatch, setNextHatch] = useState<{ days: number, species: string } | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(false);

  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setDateStr(new Date().toLocaleDateString('es-ES', options));
  }, []);

  useEffect(() => {
    if (!userName) {
      setShowNameModal(true);
    } else {
      setShowNameModal(false);
    }
  }, [userName]);

  useEffect(() => {
    if (!auth.currentUser) return;

    // 1. Inventario (Compras y Gastos)
    const qInventario = query(
      collection(db, 'Inventario'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubInventario = onSnapshot(qInventario, (snapshot) => {
      let comprado = 0;
      let gastos = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        comprado += data.cantidad || 0;
        gastos += data.costoTotal || 0;
      });
      
      // We need to combine this with consumed feed. We'll use a local variable and update state in the RegistrosDiarios snapshot.
      // To avoid race conditions, we can store 'comprado' in a ref or just use state.
      // Let's use state for both and calculate in render, or calculate here if we have both.
      // Actually, let's just set state and calculate in render or a separate useEffect.
      setTotalGastos(gastos);
      // We will store just the bought amount in a temporary state or just update totalAlimento by combining.
    });

    // 2. Production Logs (Today & Chart & Consumed Feed)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const qProduction = query(
      collection(db, 'RegistrosDiarios'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubProduction = onSnapshot(qProduction, (snapshot) => {
      let todayTotal = 0;
      let consumido = 0;
      const todayStr = new Date().toDateString();
      
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const dataMap = new Map<string, number>();
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dataMap.set(days[d.getDay()], 0);
      }

      const sevenDaysAgoTime = sevenDaysAgo.getTime();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.fecha.toDate();
        
        consumido += data.alimento || 0;

        if (date.getTime() >= sevenDaysAgoTime) {
          if (date.toDateString() === todayStr) {
            todayTotal += data.huevos || 0;
          }
          
          const dayName = days[date.getDay()];
          dataMap.set(dayName, (dataMap.get(dayName) || 0) + (data.huevos || 0));
        }
      });

      setTodayProduction(todayTotal);
      setChartData(Array.from(dataMap, ([name, huevos]) => ({ name, huevos })));
      
      // We need to update totalAlimento. Let's use a combined approach.
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'RegistrosDiarios');
    });

    // 3. Combined Inventory Calculation
    // We will calculate totalAlimento by listening to both collections and updating a ref or state.
    // To keep it simple, we'll use a separate useEffect for the combined calculation.
    
    // 4. Incubation Cycles
    const qIncubation = query(
      collection(db, 'Incubadoras'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubIncubation = onSnapshot(qIncubation, (snapshot) => {
      let closestHatch: { days: number, species: string } | null = null;
      const now = new Date();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const startDate = data.fechaInicio.toDate();
        const hatchDate = new Date(startDate);
        const diasIncubacion = data.especie === 'Codornices' ? 17 : 21;
        hatchDate.setDate(hatchDate.getDate() + diasIncubacion);
        
        const diffTime = hatchDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0) {
          if (!closestHatch || diffDays < closestHatch.days) {
            closestHatch = { days: diffDays, species: data.especie };
          }
        }
      });
      setNextHatch(closestHatch);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'Incubadoras');
    });

    // 5. Total Aves
    const qFlocks = query(
      collection(db, 'Lotes'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubFlocks = onSnapshot(qFlocks, (snapshot) => {
      let total = 0;
      snapshot.forEach((doc) => {
        total += doc.data().cantidad || 0;
      });
      setTotalAves(total);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'Lotes');
    });

    return () => {
      unsubInventario();
      unsubProduction();
      unsubIncubation();
      unsubFlocks();
    };
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    let comprado = 0;
    let consumido = 0;

    const unsubInv = onSnapshot(query(collection(db, 'Inventario'), where('userId', '==', auth.currentUser.uid)), (snap) => {
      comprado = 0;
      snap.forEach(doc => comprado += doc.data().cantidad || 0);
      setTotalAlimento(comprado - consumido);
    });

    const unsubProd = onSnapshot(query(collection(db, 'RegistrosDiarios'), where('userId', '==', auth.currentUser.uid)), (snap) => {
      consumido = 0;
      snap.forEach(doc => consumido += doc.data().alimento || 0);
      setTotalAlimento(comprado - consumido);
    });

    return () => {
      unsubInv();
      unsubProd();
    };
  }, []);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      setUserName(tempName.trim());
      setShowNameModal(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleAnalyze = () => {
    setShowAiModal(true);
    setIsAiLoading(true);
    setAiResponse(false);
    
    // Simulate AI thinking
    setTimeout(() => {
      setIsAiLoading(false);
      setAiResponse(true);
    }, 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-6xl mx-auto relative pb-24"
    >
      {/* Widgets de Control */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Producción de Hoy */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-100 p-3 rounded-xl text-amber-600">
              <Egg className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-stone-500 font-medium text-sm mb-1">Hoy</h3>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-stone-800">{todayProduction}</p>
            <span className="text-sm text-stone-400 mb-1">huevos</span>
          </div>
        </div>

        {/* Total Aves */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
              <Bird className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-stone-500 font-medium text-sm mb-1">Total Aves</h3>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-stone-800">{totalAves}</p>
            <span className="text-sm text-stone-400 mb-1">aves</span>
          </div>
        </div>

        {/* Alerta de Bodega */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${totalAlimento <= 20 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
              <Package className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-stone-500 font-medium text-sm mb-1">Alimento</h3>
          <div className="flex items-end gap-2">
            <p className={`text-3xl font-bold ${totalAlimento <= 20 ? 'text-red-600' : 'text-emerald-600'}`}>
              {totalAlimento.toFixed(1)}
            </p>
            <span className="text-sm text-stone-400 mb-1">kg</span>
          </div>
        </div>

        {/* Caja Rápida */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-[#5A5A40]/10 p-3 rounded-xl text-[#5A5A40]">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-stone-500 font-medium text-sm mb-1">Finanzas (Gastos)</h3>
          <p className="text-3xl font-bold text-red-600">
            -{formatCurrency(totalGastos)}
          </p>
        </div>
      </div>

      {/* Gráfico de Producción */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 mb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-serif font-semibold text-stone-800">Producción de Huevos</h2>
            <p className="text-sm text-stone-500">Últimos 7 días</p>
          </div>
          <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            +12%
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHuevos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5A5A40" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#5A5A40" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#5A5A40', fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="huevos" stroke="#5A5A40" strokeWidth={3} fillOpacity={1} fill="url(#colorHuevos)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <div>
        <h2 className="text-xl font-serif font-semibold text-stone-800 mb-4">Accesos Rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button 
            onClick={() => setView('galpon')}
            className="flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-stone-200 hover:border-[#5A5A40] hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-stone-50 p-3 rounded-xl text-stone-600 group-hover:bg-[#5A5A40] group-hover:text-white transition-colors">
                <Egg className="w-6 h-6" />
              </div>
              <span className="font-medium text-stone-800">Registrar Postura</span>
            </div>
            <ArrowRight className="w-5 h-5 text-stone-300 group-hover:text-[#5A5A40] transition-colors" />
          </button>

          <button 
            onClick={() => setView('inventory')}
            className="flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-stone-200 hover:border-[#5A5A40] hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-stone-50 p-3 rounded-xl text-stone-600 group-hover:bg-[#5A5A40] group-hover:text-white transition-colors">
                <Package className="w-6 h-6" />
              </div>
              <span className="font-medium text-stone-800">Añadir Alimento</span>
            </div>
            <ArrowRight className="w-5 h-5 text-stone-300 group-hover:text-[#5A5A40] transition-colors" />
          </button>

          <button 
            onClick={() => setView('finance')}
            className="flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-stone-200 hover:border-[#5A5A40] hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-stone-50 p-3 rounded-xl text-stone-600 group-hover:bg-[#5A5A40] group-hover:text-white transition-colors">
                <DollarSign className="w-6 h-6" />
              </div>
              <span className="font-medium text-stone-800">Nueva Transacción</span>
            </div>
            <ArrowRight className="w-5 h-5 text-stone-300 group-hover:text-[#5A5A40] transition-colors" />
          </button>
        </div>
      </div>

      {/* Modal Onboarding Nombre */}
      <AnimatePresence>
        {showNameModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-stone-100 text-center relative"
            >
              <div className="bg-[#5A5A40]/10 text-[#5A5A40] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-serif font-semibold text-stone-800 mb-3">¡Bienvenido a AgroAves!</h3>
              <p className="text-stone-600 mb-8 text-lg">
                ¿Cómo te gustaría que te llamemos?
              </p>
              
              <form onSubmit={handleSaveName}>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={30}
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Tu nombre o apodo"
                  className="w-full px-4 py-4 rounded-xl border-2 border-stone-200 focus:ring-0 focus:border-[#5A5A40] outline-none transition-all text-center text-lg mb-6"
                />
                <button
                  type="submit"
                  disabled={!tempName.trim()}
                  className="w-full bg-[#5A5A40] text-white rounded-xl py-4 font-medium hover:bg-[#4a4a34] transition-colors shadow-md text-lg disabled:opacity-50"
                >
                  Guardar y Continuar
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal AI Assistant */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-100 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-stone-100 bg-gradient-to-r from-stone-50 to-amber-50/30 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-emerald-500 to-amber-500 p-2 rounded-xl text-white shadow-sm">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif font-semibold text-stone-800">Analista AgroAves AI</h3>
                    <p className="text-sm text-stone-500">Inteligencia Artificial para tu granja</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAiModal(false)}
                  className="text-stone-400 hover:text-stone-600 transition-colors p-2 hover:bg-stone-100 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-stone-50/30">
                {isAiLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="flex gap-2 mb-6">
                      <motion.div 
                        animate={{ y: [0, -10, 0] }} 
                        transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                        className="w-3 h-3 rounded-full bg-emerald-400"
                      />
                      <motion.div 
                        animate={{ y: [0, -10, 0] }} 
                        transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                        className="w-3 h-3 rounded-full bg-emerald-500"
                      />
                      <motion.div 
                        animate={{ y: [0, -10, 0] }} 
                        transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                        className="w-3 h-3 rounded-full bg-amber-400"
                      />
                    </div>
                    <p className="text-stone-500 font-medium animate-pulse text-lg">Analizando datos de Firestore...</p>
                    <p className="text-stone-400 text-sm mt-2">Revisando Postura, Inventario, Incubadora y Finanzas</p>
                  </div>
                ) : aiResponse ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <p className="text-lg text-stone-700 font-medium">
                      Hola {userName || 'Experto'}. He analizado tus datos recientes:
                    </p>

                    <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex gap-4 items-start">
                      <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600 shrink-0 mt-0.5">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-stone-800 mb-1">Producción</h4>
                        <p className="text-stone-600 leading-relaxed">La postura de tus codornices está estable. ¡Buen trabajo!</p>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm flex gap-4 items-start bg-amber-50/30">
                      <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600 shrink-0 mt-0.5">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-stone-800 mb-1">Inventario (Alerta Preventiva)</h4>
                        <p className="text-stone-600 leading-relaxed">Con el consumo actual, tu Balanceado Postura se agotará en 4 días. Te sugiero registrar una nueva compra pronto para no afectar la nutrición.</p>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex gap-4 items-start">
                      <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 shrink-0 mt-0.5">
                        <Lightbulb className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-stone-800 mb-1">Consejo</h4>
                        <p className="text-stone-600 leading-relaxed">Las temperaturas en la zona pueden subir este fin de semana, asegúrate de mantener agua fresca para las aves.</p>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </div>

              <div className="p-6 border-t border-stone-100 bg-white flex justify-end">
                <button
                  onClick={() => setShowAiModal(false)}
                  className="px-6 py-3 rounded-xl font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
