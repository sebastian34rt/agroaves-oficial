import React, { useState, useEffect } from 'react';
import { User, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../App';

export default function PerfilView() {
  const [nombreGranja, setNombreGranja] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPerfil = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, 'Usuarios', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setNombreGranja(docSnap.data().nombreGranja || '');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'Usuarios');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPerfil();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'Usuarios', auth.currentUser.uid), {
        userId: auth.currentUser.uid,
        nombreGranja: nombreGranja
      }, { merge: true });
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'Usuarios');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl mx-auto pb-24"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-stone-800">Perfil de Granja</h2>
        <p className="text-stone-500 mt-1">Configura los detalles de tu cuenta y granja.</p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm">
        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-stone-100">
          <div className="bg-stone-100 p-4 rounded-full text-stone-500">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-800">Información de la Cuenta</h3>
            <p className="text-stone-500">{auth.currentUser?.email}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Nombre de la Granja</label>
              <input 
                type="text" 
                value={nombreGranja}
                onChange={(e) => setNombreGranja(e.target.value)}
                placeholder="Ej. Granja Don Sebas"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/20 transition-all"
              />
              <p className="text-xs text-stone-500 mt-2">Este nombre aparecerá en la cabecera del menú principal.</p>
            </div>

            <button 
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#5A5A40] text-white px-8 py-3.5 rounded-xl font-medium hover:bg-[#4a4a34] transition-colors disabled:opacity-70"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Actualizar Perfil
            </button>
          </form>
        )}
      </div>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 bg-stone-800 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-medium">Perfil actualizado correctamente</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
