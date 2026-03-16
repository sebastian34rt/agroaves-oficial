import React from 'react';
import { Check, Crown, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function PlanesView() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-5xl mx-auto pb-24"
    >
      {/* Header */}
      <div className="text-center mb-16">
        <h2 className="text-4xl font-serif font-bold text-stone-800 mb-4">Planes y Suscripciones</h2>
        <p className="text-stone-500 text-lg max-w-2xl mx-auto">
          Elige el plan que mejor se adapte a las necesidades de tu granja. Comienza gratis y mejora cuando estés listo para crecer.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
        {/* Plan Granjero (Gratis) */}
        <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm flex flex-col relative overflow-hidden h-full">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-stone-800 mb-2">Plan Granjero</h3>
            <p className="text-stone-500">Ideal para empezar y conocer la plataforma.</p>
          </div>
          
          <div className="mb-8">
            <span className="text-5xl font-bold text-stone-800">$0</span>
            <span className="text-stone-500 font-medium">/mes</span>
          </div>

          <ul className="space-y-4 mb-10 flex-1">
            <li className="flex items-start gap-3 text-stone-700">
              <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Gestión de hasta <strong>2 lotes</strong> de aves</span>
            </li>
            <li className="flex items-start gap-3 text-stone-700">
              <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Registro manual de postura diaria</span>
            </li>
            <li className="flex items-start gap-3 text-stone-700">
              <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Control básico de inventario</span>
            </li>
            <li className="flex items-start gap-3 text-stone-700">
              <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Soporte comunitario</span>
            </li>
          </ul>

          <button 
            disabled
            className="w-full bg-stone-100 text-stone-500 font-medium py-4 rounded-xl cursor-not-allowed border border-stone-200 mt-auto"
          >
            Tu plan actual
          </button>
        </div>

        {/* Plan Experto */}
        <div className="bg-[#5A5A40] rounded-3xl p-8 shadow-xl flex flex-col relative overflow-hidden transform md:-translate-y-4 border-2 border-[#D97736]/30 h-full">
          {/* Badge */}
          <div className="absolute top-0 right-0 bg-[#D97736] text-white text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-bl-xl">
            Recomendado
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Crown className="w-6 h-6 text-[#D97736]" />
              Plan Experto
            </h3>
            <p className="text-stone-300">Para granjas en crecimiento que buscan optimización.</p>
          </div>
          
          <div className="mb-8">
            <span className="text-5xl font-bold text-white">$4.99</span>
            <span className="text-stone-300 font-medium">/mes</span>
          </div>

          <ul className="space-y-4 mb-10 flex-1">
            <li className="flex items-start gap-3 text-stone-100">
              <Check className="w-5 h-5 text-[#D97736] shrink-0 mt-0.5" />
              <span>Gestión de <strong>lotes ilimitados</strong></span>
            </li>
            <li className="flex items-start gap-3 text-stone-100">
              <Check className="w-5 h-5 text-[#D97736] shrink-0 mt-0.5" />
              <span><strong>Incubadora Inteligente</strong> con predicciones</span>
            </li>
            <li className="flex items-start gap-3 text-stone-100">
              <Check className="w-5 h-5 text-[#D97736] shrink-0 mt-0.5" />
              <span>Módulo avanzado de <strong>Finanzas y Gastos</strong></span>
            </li>
            <li className="flex items-start gap-3 text-stone-100">
              <Check className="w-5 h-5 text-[#D97736] shrink-0 mt-0.5" />
              <span><strong>Control Veterinario</strong> y Sanidad</span>
            </li>
            <li className="flex items-start gap-3 text-stone-100">
              <Check className="w-5 h-5 text-[#D97736] shrink-0 mt-0.5" />
              <span>Soporte prioritario 24/7</span>
            </li>
          </ul>

          <a 
            href="https://wa.me/593993425798?text=Hola%20AgroAves,%20me%20interesa%20adquirir%20el%20Plan%20Experto%20para%20mi%20granja."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#D97736] text-white font-bold py-4 rounded-xl hover:bg-[#c2662b] transition-colors shadow-lg flex items-center justify-center gap-2 group mt-auto"
          >
            Mejorar a Experto
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        {/* Plan Corporativo */}
        <div className="bg-stone-900 rounded-3xl p-8 shadow-xl flex flex-col relative overflow-hidden h-full">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">Plan Corporativo</h3>
            <p className="text-stone-400">Para grandes operaciones y equipos de trabajo.</p>
          </div>
          
          <div className="mb-8">
            <span className="text-5xl font-bold text-white">$14.99</span>
            <span className="text-stone-400 font-medium">/mes</span>
          </div>

          <ul className="space-y-4 mb-10 flex-1">
            <li className="flex items-start gap-3 text-stone-300">
              <Check className="w-5 h-5 text-stone-500 shrink-0 mt-0.5" />
              <span>Todo lo del plan <strong>Experto</strong></span>
            </li>
            <li className="flex items-start gap-3 text-stone-300">
              <Check className="w-5 h-5 text-stone-500 shrink-0 mt-0.5" />
              <span><strong>Múltiples usuarios</strong> por granja</span>
            </li>
            <li className="flex items-start gap-3 text-stone-300">
              <Check className="w-5 h-5 text-stone-500 shrink-0 mt-0.5" />
              <span>Soporte técnico por <strong>WhatsApp</strong></span>
            </li>
            <li className="flex items-start gap-3 text-stone-300">
              <Check className="w-5 h-5 text-stone-500 shrink-0 mt-0.5" />
              <span><strong>Reportes automáticos</strong> al contador</span>
            </li>
          </ul>

          <a 
            href="https://wa.me/593993425798?text=Hola%20AgroAves,%20represento%20a%20una%20granja%20y%20me%20interesa%20el%20Plan%20Industrial."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-stone-800 text-white font-medium py-4 rounded-xl hover:bg-stone-700 transition-colors border border-stone-700 flex items-center justify-center text-center mt-auto"
          >
            Contactar Ventas
          </a>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="mt-16 text-center">
        <div className="flex items-center justify-center gap-2 text-stone-500 mb-4">
          <ShieldCheck className="w-5 h-5" />
          <span className="font-medium">Pagos seguros y encriptados</span>
        </div>
        <p className="text-sm text-stone-400">
          Cancela en cualquier momento. Sin compromisos a largo plazo.
        </p>
      </div>
    </motion.div>
  );
}
