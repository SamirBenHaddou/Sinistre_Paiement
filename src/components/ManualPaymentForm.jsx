import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
const ManualPaymentForm = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    beneficiary: '',
    iban: '',
    amount: '',
    label: '',
    manager: '',
    claimNumber: '' // Keep for data consistency, even if not primary field
  });
  const {
    toast
  } = useToast();
  const handleChange = e => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = e => {
    e.preventDefault();
    if (!formData.beneficiary || !formData.amount || !formData.manager) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir Bénéficiaire, Montant et Gestionnaire.",
        variant: "destructive"
      });
      return;
    }
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      label: formData.label || formData.beneficiary,
      // Default label to beneficiary if empty
      claimNumber: formData.claimNumber || `MAN-${Date.now()}`
    });
    setFormData({
      beneficiary: '',
      iban: '',
      amount: '',
      label: '',
      manager: '',
      claimNumber: ''
    });
  };
  if (!isOpen) return null;
  return <motion.div initial={{
    opacity: 0
  }} animate={{
    opacity: 1
  }} exit={{
    opacity: 0
  }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <motion.div initial={{
      scale: 0.9,
      opacity: 0,
      y: -50
    }} animate={{
      scale: 1,
      opacity: 1,
      y: 0
    }} exit={{
      scale: 0.9,
      opacity: 0,
      y: -50
    }} className="bg-slate-800/80 backdrop-blur-lg rounded-xl p-8 border border-white/20 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">Ajouter un Paiement Manuel</h3>
          <Button onClick={onClose} variant="ghost" size="icon" className="text-purple-300 hover:text-white hover:bg-white/10">
            <XCircle className="w-6 h-6" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="beneficiary" className="block text-sm font-medium text-purple-300 mb-2">Bénéficiaire</label>
              <input type="text" name="beneficiary" id="beneficiary" value={formData.beneficiary} onChange={handleChange} className="w-full bg-slate-900/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:ring-purple-500 focus:border-purple-500" required />
            </div>
            <div>
              <label htmlFor="iban" className="block text-sm font-medium text-purple-300 mb-2">IBAN</label>
              <input type="text" name="iban" id="iban" value={formData.iban} onChange={handleChange} className="w-full bg-slate-900/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-purple-300 mb-2">Montant (€)</label>
              <input type="number" name="amount" id="amount" value={formData.amount} onChange={handleChange} className="w-full bg-slate-900/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:ring-purple-500 focus:border-purple-500" required />
            </div>
            <div>
              <label htmlFor="label" className="block text-sm font-medium text-purple-300 mb-2">Libellé (manuel)</label>
              <input type="text" name="label" id="label" value={formData.label} onChange={handleChange} placeholder={formData.beneficiary} className="w-full bg-slate-900/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label htmlFor="manager" className="block text-sm font-medium text-purple-300 mb-2">Gestionnaire</label>
              <input type="text" name="manager" id="manager" value={formData.manager} onChange={handleChange} className="w-full bg-slate-900/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:ring-purple-500 focus:border-purple-500" required />
            </div>
             <div>
              <label htmlFor="claimNumber" className="block text-sm font-medium text-purple-300 mb-2">N° Sinistre</label>
              <input type="text" name="claimNumber" id="claimNumber" value={formData.claimNumber} onChange={handleChange} className="w-full bg-slate-900/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:ring-purple-500 focus:border-purple-500" />
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20">Annuler</Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Ajouter le Paiement</Button>
          </div>
        </form>
      </motion.div>
    </motion.div>;
};
export default ManualPaymentForm;