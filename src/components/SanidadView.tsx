import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2, AlertTriangle, Trash2, Activity, Syringe, Pill, HeartPulse, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../App';

interface Lote {
  id: string;
  nombre: string;
}

interface SanidadRecord {
  id: string;
  loteId: string;
  loteNombre: string;
  tipo: string;
  detalle: string;
  fecha: Date;
}

export default function SanidadView() {
  const [registros, setRegistros] = useState<SanidadRecord[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    loteId: '',
    tipo: 'Vacuna',
    detalle: '',
    fecha: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch Lotes
    const qLotes = query(
      collection(db, 'Lotes'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubLotes = onSnapshot(qLotes, (snapshot) => {
      const fetchedLotes: Lote[] = [];
      snapshot.forEach((doc) => {
        fetchedLotes.push({ id: doc.id, nombre: doc.data().nombre });
      });
      setLotes(fetchedLotes);
      if (fetchedLotes.length > 0 && !formData.loteId) {
        setFormData(prev => ({ ...prev, loteId: fetchedLotes[0].id }));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'Lotes');
    });

    // Fetch Sanidad Records
    const qSanidad = query(
      collection(db, 'Sanidad'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubSanidad = onSnapshot(qSanidad, (snapshot) => {
      const fetchedRecords: SanidadRecord[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedRecords.push({ 
          id: doc.id, 
          ...data,
          fecha: data.fecha.toDate()
        } as SanidadRecord);
      });
      // Sort by date descending
      fetchedRecords.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      setRegistros(fetchedRecords);
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'Sanidad');
      setIsLoading(false);
    });

    return () => {
      unsubLotes();
      unsubSanidad();
    };
  }, []);

  const handleOpenModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({ 
      loteId: lotes.length > 0 ? lotes[0].id : '', 
      tipo: 'Vacuna', 
      detalle: '', 
      fecha: today 
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    if (!formData.loteId) {
      setError("Debes seleccionar un lote.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const loteSeleccionado = lotes.find(l => l.id === formData.loteId);
      const [year, month, day] = formData.fecha.split('-').map(Number);
      const recordDate = new Date(year, month - 1, day);

      await addDoc(collection(db, 'Sanidad'), {
        userId: auth.currentUser.uid,
        loteId: formData.loteId,
        loteNombre: loteSeleccionado?.nombre || 'Desconocido',
        tipo: formData.tipo,
        detalle: formData.detalle,
        fecha: recordDate
      });
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      handleCloseModal();
    } catch (err) {
      console.error("Error saving sanidad record:", err);
      setError("Hubo un error al registrar el control médico. Verifica tu conexión.");
      handleFirestoreError(err, OperationType.CREATE, 'Sanidad');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deletingRecordId !== null) {
      try {
        await deleteDoc(doc(db, 'Sanidad', deletingRecordId));
        setDeletingRecordId(null);
      } catch (err) {
        console.error("Error deleting sanidad record:", err);
        handleFirestoreError(err, OperationType.DELETE, `Sanidad/${deletingRecordId}`);
      }
    }
  };

  const getTypeStyles = (tipo: string) => {
    switch (tipo) {
      case 'Vacuna':
        return { color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200', icon: Syringe };
      case 'Enfermedad':
        return { color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200', icon: HeartPulse };
      case 'Tratamiento':
        return { color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200', icon: Pill };
      case 'Vitaminas':
        return { color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-200', icon: ShieldCheck };
      default:
        return { color: 'text-stone-600', bg: 'bg-stone-100', border: 'border-stone-200', icon: Activity };
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
          <h2 className="text-3xl font-serif font-bold text-stone-800">Control Veterinario</h2>
          <p className="text-stone-500 mt-1">Registra vacunas, tratamientos y el historial médico de tus aves.</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="flex items-center gap-2 bg-[#5A5A40] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#4a4a34] transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nuevo Registro Médico
        </button>
      </div>

      {/* Historial de Sanidad */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-400">
          <Loader2 className="w-10 h-10 animate-spin text-[#5A5A40] mb-4" />
          <p className="font-medium">Cargando historial médico...</p>
        </div>
      ) : registros.length === 0 ? (
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-16 text-center">
          <Activity className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-stone-700 mb-2">Aún no tienes registros médicos</h3>
          <p className="text-stone-500 max-w-md mx-auto mb-6">
            Mantén un control estricto de la salud de tus aves registrando vacunas y tratamientos.
          </p>
          <button 
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 bg-white border border-stone-200 text-stone-700 px-6 py-3 rounded-xl font-medium hover:bg-stone-50 hover:text-[#5A5A40] hover:border-[#5A5A40]/30 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Añadir mi primer registro
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {registros.map((registro) => {
            const styles = getTypeStyles(registro.tipo);
            const Icon = styles.icon;

            return (
              <div key={registro.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-start sm:items-center gap-4">
                  <div className={`p-3 rounded-xl ${styles.bg} ${styles.color} shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${styles.bg} ${styles.color} ${styles.border}`}>
                        {registro.tipo}
                      </span>
                      <span className="text-sm text-stone-500 font-medium">
                        {registro.fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-stone-800">{registro.detalle}</h4>
                    <p className="text-stone-500 text-sm">Lote afectado: <span className="font-medium text-stone-700">{registro.loteNombre}</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => setDeletingRecordId(registro.id)}
                  className="text-stone-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors self-end sm:self-auto"
                  title="Eliminar registro"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
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
                <h3 className="text-2xl font-serif font-semibold text-stone-800">Nuevo Registro Médico</h3>
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
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Lote Afectado</label>
                  {lotes.length === 0 ? (
                    <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100">
                      No tienes lotes registrados. Debes crear un lote primero.
                    </div>
                  ) : (
                    <select 
                      required
                      value={formData.loteId}
                      onChange={e => setFormData({...formData, loteId: e.target.value})}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/20 transition-all appearance-none"
                    >
                      {lotes.map(lote => (
                        <option key={lote.id} value={lote.id}>{lote.nombre}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Tipo de Registro</label>
                  <select 
                    required
                    value={formData.tipo}
                    onChange={e => setFormData({...formData, tipo: e.target.value})}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/20 transition-all appearance-none"
                  >
                    <option value="Vacuna">Vacuna</option>
                    <option value="Enfermedad">Enfermedad</option>
                    <option value="Tratamiento">Tratamiento</option>
                    <option value="Vitaminas">Vitaminas</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Detalle / Producto</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Ej. Vacuna Newcastle, Antibiótico..." 
                    value={formData.detalle} 
                    onChange={e => setFormData({...formData, detalle: e.target.value})} 
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/20 transition-all" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Fecha</label>
                  <input 
                    required 
                    type="date" 
                    value={formData.fecha} 
                    onChange={e => setFormData({...formData, fecha: e.target.value})} 
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/20 transition-all" 
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={isSubmitting || lotes.length === 0}
                    className="w-full bg-[#5A5A40] text-white font-medium py-3.5 rounded-xl hover:bg-[#4a4a34] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <span>Guardar Registro</span>
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
            <span className="font-medium">Registro médico guardado</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
