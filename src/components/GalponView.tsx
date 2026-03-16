import React, { useState, useEffect } from 'react';
import { Plus, Bird, Calendar, Hash, X, Activity, MoreVertical, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../App';

interface Lote {
  id: string;
  nombre: string;
  especie: string;
  cantidad: number;
  fechaIngreso: string;
  salud: string;
}

export default function GalponView() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegistroModalOpen, setIsRegistroModalOpen] = useState(false);
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [deletingLoteId, setDeletingLoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    nombre: '',
    especie: 'Gallinas',
    cantidad: '',
    fechaIngreso: ''
  });

  const [registroFormData, setRegistroFormData] = useState({
    huevos: '',
    bajas: '',
    alimento: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'Lotes'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLotes: Lote[] = [];
      snapshot.forEach((doc) => {
        fetchedLotes.push({ id: doc.id, ...doc.data() } as Lote);
      });
      setLotes(fetchedLotes);
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'Lotes');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = () => {
    setFormData({ nombre: '', especie: 'Gallinas', cantidad: '', fechaIngreso: '' });
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleOpenRegistroModal = (loteId: string) => {
    setSelectedLoteId(loteId);
    setRegistroFormData({ huevos: '', bajas: '', alimento: '' });
    setError(null);
    setIsRegistroModalOpen(true);
  };

  const handleCloseRegistroModal = () => {
    setIsRegistroModalOpen(false);
    setSelectedLoteId(null);
  };

  const handleRegistroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !selectedLoteId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, 'RegistrosDiarios'), {
        userId: auth.currentUser.uid,
        loteId: selectedLoteId,
        huevos: parseInt(registroFormData.huevos) || 0,
        bajas: parseInt(registroFormData.bajas) || 0,
        alimento: parseFloat(registroFormData.alimento) || 0,
        fecha: new Date()
      });
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      handleCloseRegistroModal();
    } catch (err) {
      console.error("Error saving registro:", err);
      setError("Hubo un error al guardar el registro. Verifica tu conexión.");
      handleFirestoreError(err, OperationType.CREATE, 'RegistrosDiarios');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, 'Lotes'), {
        userId: auth.currentUser.uid,
        nombre: formData.nombre,
        especie: formData.especie,
        cantidad: parseInt(formData.cantidad) || 0,
        fechaIngreso: formData.fechaIngreso,
        salud: 'Óptimo' // Default health status
      });
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      handleCloseModal();
    } catch (err) {
      console.error("Error saving lote:", err);
      setError("Hubo un error al guardar el lote. Verifica tu conexión.");
      handleFirestoreError(err, OperationType.CREATE, 'Lotes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deletingLoteId !== null) {
      try {
        await deleteDoc(doc(db, 'Lotes', deletingLoteId));
        setDeletingLoteId(null);
      } catch (err) {
        console.error("Error deleting lote:", err);
        handleFirestoreError(err, OperationType.DELETE, `Lotes/${deletingLoteId}`);
      }
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
          <h2 className="text-3xl font-serif font-bold text-stone-800">Mi Galpón</h2>
          <p className="text-stone-500 mt-1">Gestiona tus lotes de aves y su estado general.</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="flex items-center gap-2 bg-[#5A5A40] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#4a4a34] transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nuevo Lote de Aves
        </button>
      </div>

      {/* Grid de Lotes */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-400">
          <Loader2 className="w-10 h-10 animate-spin text-[#5A5A40] mb-4" />
          <p className="font-medium">Cargando tus lotes...</p>
        </div>
      ) : lotes.length === 0 ? (
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-16 text-center">
          <Bird className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-stone-700 mb-2">Aún no tienes lotes registrados</h3>
          <p className="text-stone-500 max-w-md mx-auto mb-6">
            Comienza a gestionar tu galpón añadiendo tu primer lote de aves. Podrás llevar un registro de su cantidad, especie y salud.
          </p>
          <button 
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 bg-white border border-stone-200 text-stone-700 px-6 py-3 rounded-xl font-medium hover:bg-stone-50 hover:text-[#5A5A40] hover:border-[#5A5A40]/30 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Registrar mi primer lote
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lotes.map((lote) => (
            <div key={lote.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md hover:border-[#5A5A40]/30 group relative">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-[#5A5A40]/10 p-3 rounded-2xl text-[#5A5A40]">
                    <Bird className="w-8 h-8" />
                  </div>
                  <button 
                    onClick={() => setDeletingLoteId(lote.id)}
                    className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    title="Eliminar lote"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              
              <h3 className="text-xl font-bold text-stone-800 mb-1">{lote.nombre}</h3>
              <p className="text-stone-500 text-sm mb-6">{lote.especie}</p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-stone-600">
                    <Hash className="w-4 h-4 text-stone-400" />
                    <span>Cantidad</span>
                  </div>
                  <span className="font-semibold text-stone-800">{lote.cantidad} aves</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-stone-600">
                    <Calendar className="w-4 h-4 text-stone-400" />
                    <span>Ingreso</span>
                  </div>
                  <span className="font-medium text-stone-800">{lote.fechaIngreso}</span>
                </div>

                <div className="flex items-center justify-between text-sm pt-4 border-t border-stone-100">
                  <div className="flex items-center gap-2 text-stone-600">
                    <Activity className="w-4 h-4 text-stone-400" />
                    <span>Salud</span>
                  </div>
                  <span className={`font-medium px-2.5 py-1 rounded-full text-xs ${
                    lote.salud === 'Óptimo' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {lote.salud}
                  </span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-100">
                <button
                  onClick={() => handleOpenRegistroModal(lote.id)}
                  className="w-full flex items-center justify-center gap-2 bg-stone-100 text-stone-700 px-4 py-2.5 rounded-xl font-medium hover:bg-stone-200 transition-colors text-sm"
                >
                  <span>📝 Registrar Hoy</span>
                </button>
              </div>
            </div>
          </div>
          ))}
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
                <h3 className="text-2xl font-serif font-semibold text-stone-800">Nuevo Lote</h3>
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
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Nombre del Lote</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Ej. Sedosas A" 
                    value={formData.nombre} 
                    onChange={e => setFormData({...formData, nombre: e.target.value})} 
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/20 transition-all" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Especie</label>
                  <select 
                    required
                    value={formData.especie}
                    onChange={e => setFormData({...formData, especie: e.target.value})}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/20 transition-all appearance-none"
                  >
                    <option value="Gallinas">Gallinas</option>
                    <option value="Codornices">Codornices</option>
                    <option value="Ornamentales">Ornamentales</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Cantidad Inicial</label>
                    <input 
                      required 
                      type="number" 
                      min="1" 
                      placeholder="Ej. 50"
                      value={formData.cantidad} 
                      onChange={e => setFormData({...formData, cantidad: e.target.value})} 
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/20 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Fecha de Ingreso</label>
                    <input 
                      required 
                      type="date" 
                      value={formData.fechaIngreso} 
                      onChange={e => setFormData({...formData, fechaIngreso: e.target.value})} 
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/20 transition-all" 
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-8 pt-6 border-t border-stone-100">
                  <button 
                    type="button" 
                    onClick={handleCloseModal} 
                    className="flex-1 px-4 py-3.5 rounded-xl font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3.5 rounded-xl font-medium text-white bg-[#5A5A40] hover:bg-[#4a4a34] transition-colors shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmar Eliminación */}
      <AnimatePresence>
        {deletingLoteId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-stone-100 text-center relative"
            >
              <div className="bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-serif font-semibold text-stone-800 mb-3">¿Eliminar lote?</h3>
              <p className="text-stone-600 mb-8">
                Esta acción no se puede deshacer. Se perderán todos los datos asociados a este lote.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingLoteId(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Registro Diario */}
      <AnimatePresence>
        {isRegistroModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-stone-100 relative"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-serif font-semibold text-stone-800">Registro Diario</h3>
                <button onClick={handleCloseRegistroModal} className="text-stone-400 hover:text-stone-600 transition-colors bg-stone-100 hover:bg-stone-200 p-2 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleRegistroSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Huevos Recolectados</label>
                  <input 
                    required 
                    type="number" 
                    min="0"
                    placeholder="Ej. 120" 
                    value={registroFormData.huevos} 
                    onChange={e => setRegistroFormData({...registroFormData, huevos: e.target.value})} 
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/20 transition-all" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Aves Muertas (Bajas)</label>
                  <input 
                    required 
                    type="number" 
                    min="0"
                    placeholder="Ej. 0" 
                    value={registroFormData.bajas} 
                    onChange={e => setRegistroFormData({...registroFormData, bajas: e.target.value})} 
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/20 transition-all" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Alimento Consumido (kg)</label>
                  <input 
                    required 
                    type="number" 
                    min="0"
                    step="0.1"
                    placeholder="Ej. 25.5" 
                    value={registroFormData.alimento} 
                    onChange={e => setRegistroFormData({...registroFormData, alimento: e.target.value})} 
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
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-stone-800 text-white px-6 py-3 rounded-full shadow-lg"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-medium">Lote guardado con éxito</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
