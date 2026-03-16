import React, { useState } from 'react';
import { Download, FileText, Package, Activity, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../App';

export default function ReportesView() {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const downloadCSV = (csvContent: string, fileName: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportInventario = async () => {
    if (!auth.currentUser) return;
    setIsExporting('inventario');
    try {
      const q = query(collection(db, 'Inventario'), where('userId', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      
      let csv = 'Fecha,Tipo,Cantidad,Costo Total\n';
      snapshot.forEach(doc => {
        const data = doc.data();
        const fecha = data.fecha.toDate().toLocaleDateString('es-ES');
        csv += `"${fecha}","${data.tipo}","${data.cantidad}","${data.costoTotal}"\n`;
      });
      
      downloadCSV(csv, 'inventario.csv');
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'Inventario');
    } finally {
      setIsExporting(null);
    }
  };

  const exportProduccion = async () => {
    if (!auth.currentUser) return;
    setIsExporting('produccion');
    try {
      const q = query(collection(db, 'RegistrosDiarios'), where('userId', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      
      let csv = 'Fecha,Lote ID,Huevos,Bajas,Alimento (kg)\n';
      snapshot.forEach(doc => {
        const data = doc.data();
        const fecha = data.fecha.toDate().toLocaleDateString('es-ES');
        csv += `"${fecha}","${data.loteId}","${data.huevos}","${data.bajas}","${data.alimento}"\n`;
      });
      
      downloadCSV(csv, 'produccion.csv');
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'RegistrosDiarios');
    } finally {
      setIsExporting(null);
    }
  };

  const exportSanidad = async () => {
    if (!auth.currentUser) return;
    setIsExporting('sanidad');
    try {
      const q = query(collection(db, 'Sanidad'), where('userId', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      
      let csv = 'Fecha,Lote,Tipo,Detalle\n';
      snapshot.forEach(doc => {
        const data = doc.data();
        const fecha = data.fecha.toDate().toLocaleDateString('es-ES');
        csv += `"${fecha}","${data.loteNombre}","${data.tipo}","${data.detalle}"\n`;
      });
      
      downloadCSV(csv, 'historial_medico.csv');
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'Sanidad');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-5xl mx-auto pb-24"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-stone-800">Centro de Reportes</h2>
        <p className="text-stone-500 mt-1">Exporta los datos de tu granja para análisis externo.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
          <div className="bg-blue-100 p-5 rounded-2xl text-blue-600 mb-6">
            <Package className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-stone-800 mb-3">Inventario</h3>
          <p className="text-stone-500 text-sm mb-8 flex-1">Descarga el registro completo de compras de insumos y alimento.</p>
          <button 
            onClick={exportInventario}
            disabled={isExporting !== null}
            className="w-full flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium py-3.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {isExporting === 'inventario' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Exportar Inventario (CSV)
          </button>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
          <div className="bg-amber-100 p-5 rounded-2xl text-amber-600 mb-6">
            <FileText className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-stone-800 mb-3">Producción</h3>
          <p className="text-stone-500 text-sm mb-8 flex-1">Obtén los registros diarios de recolección de huevos y consumo.</p>
          <button 
            onClick={exportProduccion}
            disabled={isExporting !== null}
            className="w-full flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium py-3.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {isExporting === 'produccion' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Exportar Producción (CSV)
          </button>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
          <div className="bg-emerald-100 p-5 rounded-2xl text-emerald-600 mb-6">
            <Activity className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-stone-800 mb-3">Historial Médico</h3>
          <p className="text-stone-500 text-sm mb-8 flex-1">Exporta los registros de vacunas, enfermedades y tratamientos.</p>
          <button 
            onClick={exportSanidad}
            disabled={isExporting !== null}
            className="w-full flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium py-3.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {isExporting === 'sanidad' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Exportar Historial Médico (CSV)
          </button>
        </div>
      </div>
    </motion.div>
  );
}
