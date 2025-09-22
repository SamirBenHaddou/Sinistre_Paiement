import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mail, Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
const EmailProcessor = ({
  onClaimAdded
}) => {
  const [extractedData, setExtractedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const {
    toast
  } = useToast();
  const extractClaimInfo = subject => {
    const rchIndex = subject.indexOf('RCH');
    if (rchIndex === -1) {
      return null;
    }
    const relevantSubject = subject.substring(rchIndex);
    const parts = relevantSubject.split(' - ');
    if (parts.length < 5) {
      return null;
    }
    const claimNumber = parts[0].trim();
    const beneficiary = parts[1].trim();
    const type = parts[2].trim();
    const amountPart = parts[4].trim().replace(',', '.');
    const amount = parseFloat(amountPart);
    const managerMatch = relevantSubject.match(/Gestionnaire\s*:\s*([a-zA-Z\s]+)/i);
    const manager = managerMatch ? managerMatch[1].trim() : null;
    if (claimNumber.startsWith('RCH') && beneficiary && type && !isNaN(amount) && manager) {
      return {
        claimNumber,
        beneficiary,
        type,
        amount,
        manager
      };
    }
    return null;
  };
  const processSubject = subject => {
    if (!subject || !subject.trim()) {
      toast({
        title: "Erreur",
        description: "Le texte est vide.",
        variant: "destructive"
      });
      return;
    }
    setIsProcessing(true);
    setExtractedData(null);
    setTimeout(() => {
      const data = extractClaimInfo(subject);
      if (data) {
        setExtractedData(data);
        toast({
          title: "Extraction réussie",
          description: "Les informations ont été extraites avec succès."
        });
      } else {
        toast({
          title: "Extraction échouée",
          description: "Format non reconnu. Assurez-vous que le texte contient 'RCH...' et 'Gestionnaire : ...' et suit le format attendu.",
          variant: "destructive"
        });
      }
      setIsProcessing(false);
    }, 1000);
  };
  const handleCreateClaim = () => {
    if (extractedData) {
      onClaimAdded(extractedData);
      toast({
        title: "Sinistre créé",
        description: "Le sinistre a été ajouté avec succès."
      });
      setExtractedData(null);
    }
  };
  const handleDrop = useCallback(event => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const text = event.dataTransfer.getData('text/plain');
    if (text) {
      processSubject(text);
    }
  }, [processSubject]);
  const handleDragOver = useCallback(event => {
    event.preventDefault();
    event.stopPropagation();
  }, []);
  const handleDragEnter = useCallback(event => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback(event => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);
  return <div className="max-w-4xl mx-auto space-y-8">
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Traitement des Emails</h2>
        <p className="text-purple-300">Glissez-déposez l'email pour extraire les informations.</p>
      </motion.div>

      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.2
    }} className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
        <div className="flex items-center space-x-3 mb-6">
          <Mail className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-semibold text-white">Zone de Traitement</h3>
        </div>

        <div onDrop={handleDrop} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-white/20 hover:border-white/40'}`}>
          <div className="absolute flex flex-col items-center justify-center pt-5 pb-6 text-center">
            <Upload className={`w-10 h-10 mb-3 transition-transform ${isDragging ? 'scale-110 text-purple-400' : 'text-purple-300'}`} />
            <p className={`mb-2 text-sm ${isDragging ? 'text-white' : 'text-purple-200'}`}>
              <span className="font-semibold">Glissez-déposez</span> l'objet de l'email ici
            </p>
            <p className="text-xs text-purple-400">Le texte sera extrait automatiquement</p>
          </div>
        </div>
        {isProcessing && <div className="flex items-center justify-center space-x-2 mt-4 text-white">
             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
             <span>Traitement...</span>
           </div>}
      </motion.div>

      {extractedData && <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
          <div className="flex items-center space-x-3 mb-6">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <h3 className="text-xl font-semibold text-white">Informations Extraites</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">Numéro de Sinistre</label>
                <p className="text-white bg-white/5 px-4 py-2 rounded-lg">{extractedData.claimNumber}</p>
              </div>
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">Bénéficiaire</label>
                <p className="text-white bg-white/5 px-4 py-2 rounded-lg">{extractedData.beneficiary}</p>
              </div>
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">Gestionnaire</label>
                <p className="text-white bg-white/5 px-4 py-2 rounded-lg">{extractedData.manager}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">Montant</label>
                <p className="text-white bg-white/5 px-4 py-2 rounded-lg">
                  {extractedData.amount.toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR'
              })}
                </p>
              </div>
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">Type de Sinistre</label>
                <p className="text-white bg-white/5 px-4 py-2 rounded-lg">{extractedData.type}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <Button onClick={handleCreateClaim} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 rounded-lg font-semibold transition-all transform hover:scale-105">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Créer le Sinistre</span>
              </div>
            </Button>
          </div>
        </motion.div>}

      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.4
    }} className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-blue-400 mt-1" />
          <div>
            <h4 className="text-blue-300 font-semibold mb-2">Format d'Objet Attendu</h4>
            <p className="text-blue-200 text-sm">
              Pour une extraction optimale, le texte doit suivre ce format :<br />
              <code className="bg-blue-500/20 px-2 py-1 rounded text-blue-100 mt-1 inline-block text-xs">
                RCH... - BÉNÉFICIAIRE - Type - Virement - Montant - ... - Gestionnaire : NOM
              </code>
            </p>
          </div>
        </div>
      </motion.div>
    </div>;
};
export default EmailProcessor;