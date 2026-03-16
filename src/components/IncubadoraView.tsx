import React, { useState, useEffect } from 'react';
import { Plus, Egg, Calendar, X, Loader2, AlertTriangle, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../App';

interface Incubadora {
  id: string;
  especie: string;
  cantidadHuevos: number;
  fechaInicio: Date;
}

export default function IncubadoraView() {
  const [ciclos, setCiclos] = useState<Incubadora[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [deletingCicloId, setDeletingCicloId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    especie: 'Gallinas',
    cantidadHuevos: '',
    fechaInicio: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'Incubadoras'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCiclos: Incubadora[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedCiclos.push({ 
          id: doc.id, 
          ...data,
          fechaInicio: data.fechaInicio.toDate()
        } as Incubadora);
      });
      // Sort by start date descending
      fetchedCiclos.sort((a, b) => b.fechaInicio.getTime() - a.fechaInicio.getTime());
      setCiclos(fetchedCiclos);
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'Incubadoras');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = () => {
    // Default to today
    const today = new Date().toISOString().split('T')[0];
    setFormData({ especie: 'Gallinas', cantidadHuevos: '', fechaInicio: today });
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Parse the date string to a Date object at midnight local time
      const [year, month, day] = formData.fechaInicio.split('-').map(Number);
      const startDate = new Date(year, month - 1, day);

      await addDoc(collection(db, 'Incubadoras'), {
        userId: auth.currentUser.uid,
        especie: formData.especie,
        cantidadHuevos: parseInt(formData.cantidadHuevos) || 0,
        fechaInicio: startDate
      });
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      handleCloseModal();
    } catch (err) {
      console.error("Error saving incubadora:", err);
      setError("Hubo un error al registrar el ciclo. Verifica tu conexión.");
      handleFirestoreError(err, OperationType.CREATE, 'Incubadoras');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deletingCicloId !== null) {
      try {
        await deleteDoc(doc(db, 'Incubadoras', deletingCicloId));
        setDeletingCicloId(null);
      } catch (err) {
        console.error("Error deleting incubadora:", err);
        handleFirestoreError(err, OperationType.DELETE, `Incubadoras/${deletingCicloId}`);
      }
    }
  };

  const calculateHatchDate = (startDate: Date, especie: string) => {
    const daysToAdd = especie === 'Codornices' ? 17 : 21;
    const hatchDate = new Date(startDate);
    hatchDate.setDate(hatchDate.getDate() + daysToAdd);
    return hatchDate;
  };

  const getStatus = (hatchDate: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hatch = new Date(hatchDate);
    hatch.setHours(0, 0, 0, 0);

    const diffTime = hatch.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'Finalizado', color: 'bg-stone-100 text-stone-600', icon: CheckCircle2 };
    } else if (diffDays <= 3) {
      return { text: 'Próximo a nacer', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle };
    } else {
      return { text: 'En progreso', color: 'bg-emerald-100 text-emerald-700', icon: Clock };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-6xl mx-auto pb-24"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-serif font-bold text-stone-800">Incubadora Inteligente</h2>
          <p className="text-stone-500 mt-1">Gestiona tus ciclos de incubación y estima nacimientos.</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="flex items-center gap-2 bg-[#5A5A40] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#4a4a34] transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nuevo Ciclo
        </button>
      </div>

      {/* Grid de Ciclos */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-400">
          <Loader2 className="w-10 h-10 animate-spin text-[#5A5A40] mb-4" />
          <p className="font-medium">Cargando ciclos...</p>
        </div>
      ) : ciclos.length === 0 ? (
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-16 text-center">
          <Egg className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-stone-700 mb-2">Aún no tienes ciclos de incubación</h3>
          <p className="text-stone-500 max-w-md mx-auto mb-6">
            Comienza a gestionar tu incubadora registrando tu primer ciclo. Calcularemos automáticamente la fecha de eclosión.
          </p>
          <button 
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 bg-white border border-stone-200 text-stone-700 px-6 py-3 rounded-xl font-medium hover:bg-stone-50 hover:text-[#5A5A40] hover:border-[#5A5A40]/30 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Registrar mi primer ciclo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ciclos.map((ciclo) => {
            const hatchDate = calculateHatchDate(ciclo.fechaInicio, ciclo.especie);
            const status = getStatus(hatchDate);
            const StatusIcon = status.icon;

            return (
              <div key={ciclo.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md hover:border-[#5A5A40]/30 group relative">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-[#5A5A40]/10 p-3 rounded-2xl text-[#5A5A40]">
                      <Egg className="w-8 h-8" />
                    </div>
                    <button 
                      onClick={() => setDeletingCicloId(ciclo.id)}
                      className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Eliminar ciclo"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                
                <h3 className="text-xl font-bold text-stone-800 mb-1">{ciclo.especie}</h3>
                <p className="text-stone-500 text-sm mb-6">{ciclo.cantidadHuevos} huevos</p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-stone-600">
                      <Calendar className="w-4 h-4 text-stone-400" />
                      <span>Inicio</span>
                    </div>
                    <span className="font-medium text-stone-800">
                      {ciclo.fechaInicio.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-stone-600">
                      <Egg className="w-4 h-4 text-stone-400" />
                      <span>Eclosión Estimada</span>
                    </div>
                    <span className="font-bold text-[#5A5A40]">
                      {hatchDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm pt-4 border-t border-stone-100">
                    <div className="flex items-center gap-2 text-stone-600">
                      <StatusIcon className="w-4 h-4 text-stone-400" />
                      <span>Estado</span>
                    </div>
                    <span className={`font-medium px-2.5 py-1 rounded-full text-xs ${status.color}`}>
                      {status.text}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Modal Formulario */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-stone-100 relative"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-serif font-semibold text-stone-800">Nuevo Ciclo</h3>
                <button onClick={handleCloseModal} className="text-stone-400 hover:text-stone-600 transition-colors bg-stone-100 hover:bg-stone-200 p-2 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Especie</label>
                  <select 
                    required
                    value={formData.especie}
                    onChange={e => setFormData({...formData, especie: e.target.value})}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/20 transition-all appearance-none"
                  >
                    <option value="Gallinas">Gallinas (21 días)</option>
                    <option value="Codornices">Codornices (17 días)</option>
                    <option value="Ornamentales">Ornamentales (21 días)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Cantidad de Huevos</label>
                  <input 
                    required 
                    type="number" 
                    min="1"
                    placeholder="Ej. 50" 
                    value={formData.cantidadHuevos} 
                    onChange={e => setFormData({...formData, cantidadHuevos: e.target.value})} 
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/20 transition-all" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Fecha de Inicio</label>
                  <input 
                    required 
                    type="date" 
                    value={formData.fechaInicio} 
                    onChange={e => setFormData({...formData, fechaInicio: e.target.value})} 
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/20 transition-all" 
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-[#5A5A40] text-white font-medium py-3.5 rounded-xl hover:bg-[#4a4a34] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <span>Guardar Ciclo</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 bg-stone-800 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50"
          >
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <span className="font-medium">Ciclo registrado con éxito</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
