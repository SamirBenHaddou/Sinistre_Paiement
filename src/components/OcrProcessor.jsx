import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileScan, Check, Banknote, Hash, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import imageCompression from 'browser-image-compression';
const OcrProcessor = ({
  claims,
  onIbanExtracted,
  onRemoveClaim
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const {
    toast
  } = useToast();
  const OCR_API_KEY = "K88328201688957";
  const extractIbanAndBic = text => {
    const ibanRegex = /[A-Z]{2}[0-9]{2}\s?([0-9]{4}\s?){4}[0-9]{3}([A-Z0-9]{2})?/g;
    const bicRegex = /([A-Z]{6}[A-Z0-9]{2,5})/g;
    const ibans = text.match(ibanRegex);
    const bics = text.match(bicRegex);
    return {
      iban: ibans ? ibans[0].replace(/\s/g, '') : null,
      bic: bics ? bics[0] : null
    };
  };
  const processFile = async file => {
    if (!file) return;
    setIsProcessing(true);
    setOcrResult(null);
    let processedFile = file;
    try {
      if (file.type.startsWith('image/')) {
        if (file.size > 1024 * 1024) {
          toast({
            title: "Compression en cours...",
            description: "L'image est lourde, nous la compressons."
          });
          processedFile = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true
          });
        }
      } else if (file.type === 'application/pdf' && file.size > 1024 * 1024) {
        toast({
          title: "Fichier PDF trop lourd",
          description: "Le PDF dépasse 1Mo. Veuillez le compresser manuellement.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('apikey', OCR_API_KEY);
      formData.append('language', 'fre');
      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.IsErroredOnProcessing) throw new Error(data.ErrorMessage.join(' '));
      const ocrText = data.ParsedResults[0].ParsedText;
      const {
        iban,
        bic
      } = extractIbanAndBic(ocrText);
      if (iban) {
        setOcrResult({
          iban,
          bic,
          text: ocrText
        });
        toast({
          title: "IBAN trouvé !",
          description: `IBAN: ${iban}`
        });
      } else {
        toast({
          title: "Aucun IBAN trouvé",
          description: "L'OCR n'a pas pu détecter d'IBAN.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur OCR",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  const handleDrop = useCallback(event => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files[0]) processFile(event.dataTransfer.files[0]);
  }, []);
  const handleDragOver = useCallback(event => event.preventDefault(), []);
  const handleDragEnter = useCallback(event => {
    event.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback(event => {
    event.preventDefault();
    setIsDragging(false);
  }, []);
  const handleAssociate = claimId => {
    if (ocrResult && claimId) {
      onIbanExtracted(claimId, ocrResult.iban, ocrResult.bic);
      toast({
        title: "Association réussie !",
        description: `L'IBAN a été associé au sinistre.`
      });
      setOcrResult(null);
    }
  };
  const handleRemove = claimId => {
    onRemoveClaim(claimId);
    toast({
      title: "Sinistre retiré",
      description: "Le sinistre a été retiré de la file d'attente IBAN."
    });
  };
  return <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="text-center lg:text-left">
          <h2 className="text-3xl font-bold text-white mb-2">Reconnaissance d'IBAN (OCR)</h2>
          <p className="text-purple-300">Glissez-déposez un fichier RIB (PDF, JPG, PNG).</p>
        </motion.div>
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.2
      }} className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 mt-8">
          <div onDrop={handleDrop} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-white/20 hover:border-white/40'}`}>
            <Upload className={`w-10 h-10 mb-3 transition-transform ${isDragging ? 'scale-110 text-purple-400' : 'text-purple-300'}`} />
            <p className={`mb-2 text-sm ${isDragging ? 'text-white' : 'text-purple-200'}`}><span className="font-semibold">Glissez-déposez</span> un fichier ici</p>
            <p className="text-xs text-purple-400">PDF, JPG, PNG (images compressées auto)</p>
          </div>
          {isProcessing && <div className="flex items-center justify-center space-x-2 mt-4 text-white"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div><span>Analyse OCR...</span></div>}
        </motion.div>
        {ocrResult && <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="bg-green-500/10 backdrop-blur-lg rounded-xl p-6 border border-green-500/20 mt-8">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-3"><FileScan className="text-green-400" />Résultat OCR</h3>
            <div><label className="block text-green-300 text-sm font-medium mb-1">IBAN Détecté</label><p className="text-white bg-white/5 px-4 py-2 rounded-lg font-mono">{ocrResult.iban}</p></div>
            {ocrResult.bic && <div className="mt-4"><label className="block text-green-300 text-sm font-medium mb-1">BIC Détecté</label><p className="text-white bg-white/5 px-4 py-2 rounded-lg font-mono">{ocrResult.bic}</p></div>}
          </motion.div>}
      </div>
      <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-4">Sinistres en attente d'IBAN</h3>
        {claims.length > 0 ? <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {claims.map(claim => <motion.div key={claim.id} layout initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} exit={{
          opacity: 0,
          x: 20
        }} className="bg-slate-800/50 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold text-white">{claim.beneficiary}</p>
                  <p className="text-sm text-slate-400 flex items-center gap-2"><Hash size={14} /> {claim.claimNumber}</p>
                  <p className="text-sm text-slate-400 flex items-center gap-2"><Banknote size={14} /> {claim.amount.toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR'
              })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => handleAssociate(claim.id)} disabled={!ocrResult || isProcessing} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white"><Check size={16} className="mr-2" /> Associer</Button>
                  <Button onClick={() => handleRemove(claim.id)} variant="destructive" size="sm"><XCircle size={16} /></Button>
                </div>
              </motion.div>)}
          </div> : <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-8">
            <Check className="w-12 h-12 mb-4 text-green-500" />
            <p className="font-semibold">Aucun sinistre en attente.</p>
            <p className="text-sm">Tous les sinistres ont un IBAN ou ont été traités.</p>
          </div>}
      </div>
    </div>;
};
export default OcrProcessor;