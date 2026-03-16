import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, X, ArrowUpRight, ArrowDownRight, Calendar, Trash2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, query, where, orderBy, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';

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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
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
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: Date;
}

const CATEGORIES = {
  income: ['Venta de Huevos', 'Venta de Aves', 'Otros'],
  expense: ['Alimento', 'Veterinaria', 'Mantenimiento', 'Otros']
};

export default function FinanceView() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    category: 'Venta de Huevos',
    amount: '',
    description: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs: Transaction[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        txs.push({
          id: doc.id,
          type: data.type,
          category: data.category,
          amount: data.amount,
          description: data.description,
          date: data.date?.toDate() || new Date()
        });
      });
      
      txs.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setTransactions(txs);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      type: 'income',
      category: 'Venta de Huevos',
      amount: '',
      description: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'transactions'), {
        userId: auth.currentUser.uid,
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: serverTimestamp()
      });
      handleCloseModal();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    }
  };

  const handleDelete = async () => {
    if (transactionToDelete && auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'transactions', transactionToDelete));
        setTransactionToDelete(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `transactions/${transactionToDelete}`);
      }
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert("No hay transacciones para exportar.");
      return;
    }

    // Define CSV headers
    const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto'];
    
    // Format data rows
    const rows = transactions.map(t => {
      const dateStr = t.date.toLocaleDateString('es-ES');
      const typeStr = t.type === 'income' ? 'Ingreso' : 'Gasto';
      // Escape quotes in description and wrap in quotes to handle commas
      const descStr = `"${t.description.replace(/"/g, '""')}"`;
      return [dateStr, typeStr, t.category, descStr, t.amount.toString()];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create a Blob and trigger download with BOM for Excel UTF-8 support
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const today = new Date();
    const dateFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_AgroAves_${dateFormatted}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-5xl mx-auto"
    >
      {/* Panel Superior */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-stone-800 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#5A5A40]" />
            Finanzas
          </h2>
          <p className="text-stone-500 mt-1">
            Controla tus ingresos, gastos y balance general.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExportCSV}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-[#5A5A40] border-2 border-[#5A5A40] px-6 py-3 rounded-xl font-medium hover:bg-stone-50 transition-colors shadow-sm"
          >
            <Download className="w-5 h-5" />
            Exportar Historial
          </button>
          <button 
            onClick={handleOpenModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#5A5A40] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#4a4a34] transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Nueva Transacción
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-stone-500 font-medium">Ingresos Totales</h3>
          </div>
          <p className="text-3xl font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-100 p-3 rounded-xl text-red-600">
              <TrendingDown className="w-6 h-6" />
            </div>
            <h3 className="text-stone-500 font-medium">Gastos Totales</h3>
          </div>
          <p className="text-3xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-[#5A5A40]/10 p-3 rounded-xl text-[#5A5A40]">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-stone-500 font-medium">Balance Neto</h3>
          </div>
          <p className={`text-3xl font-bold ${netBalance >= 0 ? 'text-stone-800' : 'text-red-600'}`}>
            {formatCurrency(netBalance)}
          </p>
        </div>
      </div>

      {/* Historial de Transacciones */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
          <h3 className="text-lg font-semibold text-stone-800">Historial Reciente</h3>
        </div>
        
        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-stone-500 font-medium">No hay transacciones registradas.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="p-5 flex items-center justify-between hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${transaction.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {transaction.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-stone-800">{transaction.category}</p>
                    <p className="text-sm text-stone-500 mt-0.5">{transaction.description}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`font-bold text-lg ${transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-stone-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(transaction.date)}
                    </span>
                    <button 
                      onClick={() => setTransactionToDelete(transaction.id)}
                      className="text-stone-300 hover:text-red-500 transition-colors"
                      title="Eliminar transacción"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nueva Transacción */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                <h3 className="text-xl font-serif font-semibold text-stone-800 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#5A5A40]" />
                  Nueva Transacción
                </h3>
                <button 
                  onClick={handleCloseModal}
                  className="text-stone-400 hover:text-stone-600 transition-colors p-2 hover:bg-stone-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-5">
                  
                  {/* Tipo */}
                  <div className="flex gap-4">
                    <label className={`flex-1 cursor-pointer border rounded-xl p-4 text-center font-medium transition-all ${formData.type === 'income' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'}`}>
                      <input 
                        type="radio" 
                        name="type" 
                        value="income" 
                        className="hidden"
                        checked={formData.type === 'income'}
                        onChange={() => setFormData({...formData, type: 'income', category: CATEGORIES.income[0]})}
                      />
                      Ingreso
                    </label>
                    <label className={`flex-1 cursor-pointer border rounded-xl p-4 text-center font-medium transition-all ${formData.type === 'expense' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'}`}>
                      <input 
                        type="radio" 
                        name="type" 
                        value="expense" 
                        className="hidden"
                        checked={formData.type === 'expense'}
                        onChange={() => setFormData({...formData, type: 'expense', category: CATEGORIES.expense[0]})}
                      />
                      Gasto
                    </label>
                  </div>

                  {/* Categoría */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Categoría</label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all bg-white"
                    >
                      {CATEGORIES[formData.type].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Monto */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Monto ($)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-stone-500 font-medium">$</span>
                      </div>
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        className="w-full pl-8 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Descripción</label>
                    <input
                      type="text"
                      required
                      maxLength={50}
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
                      placeholder="Ej. Venta de 2 cubetas"
                    />
                  </div>

                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-3 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl bg-[#5A5A40] text-white font-medium hover:bg-[#4a4a34] transition-colors"
                  >
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
        {transactionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-serif font-semibold text-stone-800 mb-2">Eliminar Transacción</h3>
              <p className="text-stone-500 mb-8">¿Seguro que deseas eliminar este registro? Los totales se actualizarán automáticamente.</p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setTransactionToDelete(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
