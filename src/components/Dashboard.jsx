import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock, CheckCircle, TrendingUp, CreditCard } from 'lucide-react';

const Dashboard = ({ claims }) => {
  const stats = {
    total: claims.length,
    pendingIban: claims.filter(c => c.status === 'pending_iban').length,
    readyForPayment: claims.filter(c => c.status === 'ready_for_payment').length,
    paid: claims.filter(c => c.status === 'paid').length,
    totalAmount: claims.reduce((sum, claim) => sum + (claim.amount || 0), 0),
  };

  const statCards = [
    { title: 'Total Sinistres', value: stats.total, icon: FileText, color: 'from-blue-500 to-cyan-500' },
    { title: 'En Attente IBAN', value: stats.pendingIban, icon: Clock, color: 'from-yellow-500 to-orange-500' },
    { title: 'Prêts pour Paiement', value: stats.readyForPayment, icon: CreditCard, color: 'from-green-500 to-emerald-500' },
    { title: 'Payés', value: stats.paid, icon: CheckCircle, color: 'from-purple-500 to-pink-500' },
  ];

  const recentClaims = claims.filter(c => c.status !== 'paid').slice(-5).reverse();

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
        <p className="text-purple-300">Vue d'ensemble de votre activité.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-gradient-to-r ${stat.color} p-6 rounded-xl shadow-lg text-white`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">{stat.title}</p>
                <p className="text-3xl font-bold">{stat.value}</p>
              </div>
              <stat.icon className="w-10 h-10 opacity-70" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-3"><TrendingUp className="text-green-400" /> Montant Total des Sinistres</h3>
          <p className="text-4xl font-bold text-green-400 text-center">
            {stats.totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4">Sinistres Récents à Traiter</h3>
          <div className="space-y-3">
            {recentClaims.length > 0 ? (
              recentClaims.map((claim) => (
                <div key={claim.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{claim.claimNumber}</p>
                    <p className="text-purple-300 text-sm">{claim.beneficiary}</p>
                  </div>
                  <p className="text-green-400 font-semibold">
                    {claim.amount?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-purple-300 text-center py-4">Aucun sinistre en attente.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;