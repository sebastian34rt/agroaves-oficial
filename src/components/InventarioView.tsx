import React, { useState, useEffect } from 'react';
import { Plus, Package, Calendar, DollarSign, X, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, query, where, onSnapshot, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../App';

interface InventarioItem {
  id: string;
  tipo: string;
  cantidad: number;
  costoTotal: number;
  fecha: Date;
}

export default function InventarioView() {
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    tipo: '',
    cantidad: '',
    costoTotal: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'Inventario'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems: InventarioItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedItems.push({ 
          id: doc.id, 
          ...data,
          fecha: data.fecha.toDate()
        } as InventarioItem);
      });
      // Sort by date descending
      fetchedItems.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      setItems(fetchedItems);
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'Inventario');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = () => {
    setFormData({ tipo: '', cantidad: '', costoTotal: '' });
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
      await addDoc(collection(db, 'Inventario'), {
        userId: auth.currentUser.uid,
        tipo: formData.tipo,
        cantidad: parseFloat(formData.cantidad) || 0,
        costoTotal: parseFloat(formData.costoTotal) || 0,
        fecha: new Date()
      });
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      handleCloseModal();
    } catch (err) {
      console.error("Error saving inventario:", err);
      setError("Hubo un error al registrar la compra. Verifica tu conexión.");
      handleFirestoreError(err, OperationType.CREATE, 'Inventario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deletingItemId !== null) {
      try {
        await deleteDoc(doc(db, 'Inventario', deletingItemId));
        setDeletingItemId(null);
      } catch (err) {
        console.error("Error deleting inventario:", err);
        handleFirestoreError(err, OperationType.DELETE, `Inventario/${deletingItemId}`);
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
          <h2 className="text-3xl font-serif font-bold text-stone-800">Inventario y Finanzas</h2>
          <p className="text-stone-500 mt-1">Registra tus compras de alimento y otros insumos.</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="flex items-center gap-2 bg-[#5A5A40] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#4a4a34] transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Registrar Compra
        </button>
      </div>

      {/* Grid de Inventario */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-400">
          <Loader2 className="w-10 h-10 animate-spin text-[#5A5A40] mb-4" />
          <p className="font-medium">Cargando inventario...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-16 text-center">
          <Package className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-stone-700 mb-2">Aún no tienes compras registradas</h3>
          <p className="text-stone-500 max-w-md mx-auto mb-6">
            Comienza a gestionar tu inventario registrando tu primera compra de alimento o insumos.
          </p>
          <button 
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 bg-white border border-stone-200 text-stone-700 px-6 py-3 rounded-xl font-medium hover:bg-stone-50 hover:text-[#5A5A40] hover:border-[#5A5A40]/30 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Registrar mi primera compra
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 text-sm">
                  <th className="p-4 font-medium">Fecha</th>
                  <th className="p-4 font-medium">Tipo de Insumo</th>
                  <th className="p-4 font-medium">Cantidad</th>
                  <th className="p-4 font-medium">Costo Total</th>
                  <th className="p-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="p-4 text-stone-600">
                      {item.fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4 font-medium text-stone-800">{item.tipo}</td>
                    <td className="p-4 text-stone-600">{item.cantidad} kg/unidades</td>
                    <td className="p-4 text-stone-800 font-medium">
                      ${item.costoTotal.toFixed(2)}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setDeletingItemId(item.id)}
                        className="text-stone-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors inline-flex"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                <h3 className="text-2xl font-serif font-semibold text-stone-800">Registrar Compra</h3>
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
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Tipo de Alimento/Insumo</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Ej. Maíz molido, Vitaminas" 
                    value={formData.tipo} 
                    onChange={e => setFormData({...formData, tipo: e.target.value})} 
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/20 transition-all" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Cantidad (kg/unidades)</label>
                  <input 
                    required 
                    type="number" 
                    min="0"
                    step="0.1"
                    placeholder="Ej. 100" 
                    value={formData.cantidad} 
                    onChange={e => setFormData({...formData, cantidad: e.target.value})} 
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/20 transition-all" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Costo Total (US$)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-stone-400" />
                    </div>
                    <input 
                      required 
                      type="number" 
                      min="0"
                      step="0.01"
                      placeholder="0.00" 
                      value={formData.costoTotal} 
                      onChange={e => setFormData({...formData, costoTotal: e.target.value})} 
                      className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/20 transition-all" 
                    />
                  </div>
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
                      <span>Guardar Compra</span>
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
            <span className="font-medium">Compra registrada con éxito</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
