import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const EmailProcessor = ({ onClaimAdded }) => {
  const [extractedData, setExtractedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showTextArea, setShowTextArea] = useState(false);
  const [textInput, setTextInput] = useState("");
  const { toast } = useToast();

  const extractClaimInfo = (subject) => {
    const rchIndex = subject.indexOf("RCH");
    if (rchIndex === -1) return null;

    const relevantSubject = subject.substring(rchIndex);
    const parts = relevantSubject.split(" - ");
    if (parts.length < 3) return null;

    const claimNumber = parts[0].trim();

    // Nom du dossier (généralement deuxième champ)
    const dossierName = parts[1] ? parts[1].trim() : null;

    // Type (souvent 3e champ) et mode de paiement (souvent 4e)
    const type = parts[2] ? parts[2].trim() : null;
    const paymentMode = parts[3] ? parts[3].trim() : null;

    // Montant : chercher une partie composée uniquement de chiffres
    const amountIdx = parts.findIndex((p) => /^\s*\d+[\.,]?\d*\s*$/.test(p));
    const amountPart =
      amountIdx !== -1 ? parts[amountIdx].trim().replace(",", ".") : null;
    const amount = amountPart ? parseFloat(amountPart) : NaN;

    // Gestionnaire
    const managerMatch = relevantSubject.match(
      /Gestionnaire\s*:\s*([A-Za-zÀ-ÖØ-öø-ÿ0-9\-\s]+)/i
    );
    const manager = managerMatch ? managerMatch[1].trim() : null;

    // Bénéficiaire : privilégier 'Destinataire : X' ou 'Bénéficiaire : X' ailleurs dans le sujet
    let beneficiary = null;
    const destMatch = relevantSubject.match(
      /(?:Destinataire|B[eé]n[eé]ficiaire)\s*:\s*([^\-]+)(?:\-|$)/i
    );
    if (destMatch) {
      beneficiary = destMatch[1].trim();
    } else {
      // fallback heuristique : si parts[5] contient Destinataire
      if (
        parts[5] &&
        /(?:Destinataire|B[eé]n[eé]ficiaire)\s*:/i.test(parts[5])
      ) {
        const m = parts[5].match(
          /(?:Destinataire|B[eé]n[eé]ficiaire)\s*:\s*(.+)/i
        );
        if (m) beneficiary = m[1].trim();
      }
      if (!beneficiary) {
        // si parts contient un élément en majuscules et chiffres (ex AUDIO 76) on peut le prendre
        const possible = parts.find((p) => /^[A-Z0-9\s]{2,}$/.test(p.trim()));
        if (possible && possible !== dossierName) beneficiary = possible.trim();
      }
      if (!beneficiary) beneficiary = dossierName;
    }

    console.log("extractClaimInfo parts:", parts);
    console.log("parsed:", {
      claimNumber,
      dossierName,
      paymentMode,
      amount,
      beneficiary,
      manager,
      type,
    });

    // Validation minimale
    if (!claimNumber.startsWith("RCH")) return null;
    if (!beneficiary) return null;

    return {
      claimNumber,
      dossierName,
      paymentMode,
      amount,
      beneficiary,
      manager,
      type,
    };
  };

  const processSubject = useCallback(
    (subject) => {
      if (!subject || !subject.trim()) {
        toast({
          title: "Erreur",
          description: "Le texte est vide.",
          variant: "destructive",
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
            description: "Les informations ont été extraites avec succès.",
          });
        } else {
          toast({
            title: "Extraction échouée",
            description:
              "Format non reconnu. Assurez-vous que le texte contient 'RCH...' et 'Gestionnaire : ...' et suit le format attendu.",
            variant: "destructive",
          });
        }
        setIsProcessing(false);
      }, 1000);
    },
    [toast]
  );

  const handleCreateClaim = () => {
    if (extractedData) {
      onClaimAdded(extractedData);
      toast({
        title: "Sinistre créé",
        description: "Le sinistre a été ajouté avec succès.",
      });
      setExtractedData(null);
      setTextInput("");
      setShowTextArea(false);
    }
  };

  // Gestion du drag & drop optimisée pour toutes versions d'Outlook
  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      let text = null;

      try {
        // Méthode 1: Type spécifique maillistrow (versions anciennes d'Outlook)
        if (event.dataTransfer.types.includes("maillistrow")) {
          const mailData = event.dataTransfer.getData("maillistrow");
          if (mailData && mailData.trim()) {
            text = mailData.trim();
          }
        }

        // Méthode 2: Types standards
        if (!text) {
          const standardTypes = ["text/plain", "text/html", "text"];
          for (const type of standardTypes) {
            const data = event.dataTransfer.getData(type);
            if (data && data.trim()) {
              text = data.trim();
              break;
            }
          }
        }

        // Méthode 3: Tous les types disponibles
        if (!text && event.dataTransfer.types) {
          for (const type of event.dataTransfer.types) {
            const data = event.dataTransfer.getData(type);
            if (data && data.trim()) {
              text = data.trim();
              break;
            }
          }
        }

        // Traitement du texte
        if (text && text.trim()) {
          // Nettoyer le HTML si présent
          if (text.includes("<")) {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = text;
            text = tempDiv.textContent || tempDiv.innerText || "";
          }

          text = text.replace(/[\r\n\t]+/g, " ").trim();
          processSubject(text);
        } else {
          // Activer la zone de texte alternative
          setShowTextArea(true);
          toast({
            title: "Drag & Drop non compatible",
            description:
              "Utilisez la zone de texte qui vient d'apparaître pour coller l'objet de l'email.",
            variant: "destructive",
          });
        }
      } catch (error) {
        setShowTextArea(true);
        toast({
          title: "Erreur technique",
          description:
            "Utilisez la zone de texte pour saisir l'objet de l'email.",
          variant: "destructive",
        });
      }
    },
    [processSubject, toast]
  );

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    // Définir l'effet de drop pour améliorer la compatibilité
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragEnter = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    // Vérifier si on quitte vraiment la zone (pas un enfant)
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      processSubject(textInput.trim());
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold text-white mb-2">
          Traitement des Emails
        </h2>
        <p className="text-purple-300">
          Glissez-déposez l'email ou saisissez le texte manuellement.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Mail className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-semibold text-white">
            Zone de Traitement
          </h3>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            isDragging
              ? "border-purple-500 bg-purple-500/10"
              : "border-white/20 hover:border-white/40"
          }`}
        >
          <div className="absolute flex flex-col items-center justify-center pt-5 pb-6 text-center">
            <Upload
              className={`w-10 h-10 mb-3 transition-transform ${
                isDragging ? "scale-110 text-purple-400" : "text-purple-300"
              }`}
            />
            <p
              className={`mb-2 text-sm ${
                isDragging ? "text-white" : "text-purple-200"
              }`}
            >
              <span className="font-semibold">Glissez-déposez</span> l'objet de
              l'email ici
            </p>
            <p className="text-xs text-purple-400">
              Le texte sera extrait automatiquement
            </p>
            {!showTextArea && (
              <button
                onClick={() => setShowTextArea(true)}
                className="mt-3 text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Le drag & drop ne fonctionne pas ? Cliquez ici
              </button>
            )}
          </div>
        </div>

        {showTextArea && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-6 space-y-4"
          >
            <div className="flex items-center space-x-2">
              <Type className="w-5 h-5 text-blue-400" />
              <h4 className="text-lg font-medium text-white">
                Saisie Alternative
              </h4>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-blue-200 text-sm mb-3">
                <strong>Instructions :</strong> Sélectionnez l'objet de l'email
                dans Outlook, faites Ctrl+C pour copier, puis collez ici avec
                Ctrl+V.
              </p>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Collez l'objet de l'email ici..."
                className="w-full h-24 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-between items-center mt-3">
                <Button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg"
                >
                  Traiter le Texte
                </Button>
                <button
                  onClick={() => {
                    setShowTextArea(false);
                    setTextInput("");
                  }}
                  className="text-purple-300 hover:text-purple-200 text-sm"
                >
                  Masquer
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {isProcessing && (
          <div className="flex items-center justify-center space-x-2 mt-4 text-white">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Traitement...</span>
          </div>
        )}
      </motion.div>

      {extractedData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20"
        >
          <div className="flex items-center space-x-3 mb-6">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <h3 className="text-xl font-semibold text-white">
              Informations Extraites
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">
                  Numéro de Sinistre
                </label>
                <p className="text-white bg-white/5 px-4 py-2 rounded-lg">
                  {extractedData.claimNumber}
                </p>
              </div>
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">
                  Nom Dossier
                </label>
                <p className="text-white bg-white/5 px-4 py-2 rounded-lg">
                  {extractedData.dossierName}
                </p>
              </div>
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">
                  Bénéficiaire
                </label>
                <p className="text-white bg-white/5 px-4 py-2 rounded-lg">
                  {extractedData.beneficiary}
                </p>
              </div>
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">
                  Gestionnaire
                </label>
                <p className="text-white bg-white/5 px-4 py-2 rounded-lg">
                  {extractedData.manager}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">
                  Montant
                </label>
                <p className="text-white bg-white/5 px-4 py-2 rounded-lg">
                  {extractedData.amount.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </p>
              </div>
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">
                  Mode de paiement
                </label>
                <p className="text-white bg-white/5 px-4 py-2 rounded-lg">
                  {extractedData.paymentMode}
                </p>
              </div>
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">
                  Type de Sinistre
                </label>
                <p className="text-white bg-white/5 px-4 py-2 rounded-lg">
                  {extractedData.type}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <Button
              onClick={handleCreateClaim}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Créer le Sinistre</span>
              </div>
            </Button>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6"
      >
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-blue-400 mt-1" />
          <div>
            <h4 className="text-blue-300 font-semibold mb-2">
              Format d'Objet Attendu
            </h4>
            <p className="text-blue-200 text-sm">
              Pour une extraction optimale, le texte doit suivre ce format :
              <br />
              <code className="bg-blue-500/20 px-2 py-1 rounded text-blue-100 mt-1 inline-block text-xs">
                RCH... - BÉNÉFICIAIRE - Type - Virement - Montant - ... -
                Gestionnaire : NOM
              </code>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EmailProcessor;
