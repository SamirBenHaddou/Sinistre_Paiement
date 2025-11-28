// OcrProcessor.jsx - Version corrigée avec détection IBAN améliorée
import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, FileScan, Check, Banknote, Hash, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import imageCompression from "browser-image-compression";

const OcrProcessor = ({ claims, onIbanExtracted, onRemoveClaim }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const { toast } = useToast();
  const OCR_API_KEY = "K88328201688957";
  const fileInputRef = React.useRef(null);

  // ------------------------
  // VALIDATION IBAN OFFICIELLE
  // ------------------------
  const validateIban = (iban) => {
    try {
      const cleaned = iban.replace(/\s/g, "").toUpperCase();
      if (cleaned.length < 15 || cleaned.length > 34) return false;

      const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
      const numeric = rearranged.replace(/[A-Z]/g, (c) => c.charCodeAt(0) - 55);
      return BigInt(numeric) % 97n === 1n;
    } catch (e) {
      console.error("Erreur validation IBAN:", e);
      return false;
    }
  };

  // ------------------------
  // CALCUL IBAN À PARTIR D'UN BBAN (FR)
  // ------------------------
  const computeIbanFromBban = (countryCode, bban) => {
    const cc = countryCode.toUpperCase();
    const rearranged = bban + cc + "00";
    const numeric = rearranged.replace(/[A-Z]/g, (c) => c.charCodeAt(0) - 55);
    const mod = BigInt(numeric) % 97n;
    const check = 98n - mod;
    const checkStr = check.toString().padStart(2, "0");
    return cc + checkStr + bban;
  };

  // ------------------------
  // EXTRACTION IBAN ET BIC (AMÉLIORÉE)
  // ------------------------
  const extractIbanAndBic = (text) => {
    if (!text || typeof text !== "string") return { iban: null, bic: null };

    console.log("=== DÉBUT EXTRACTION IBAN ===");
    console.log("Texte OCR brut:", text.substring(0, 500));

    const raw = text;
    const cleanedForSearch = raw
      .replace(/[\u00A0\r\n\t]/g, " ")
      .replace(/\s+/g, " ")
      .toUpperCase();

    let iban = null;
    let bic = null;

    // STRATÉGIE 1: Recherche IBAN complet avec format standard
    // FR + 2 chiffres + 23 caractères alphanumériques
    const ibanPatterns = [
      // IBAN avec espaces (format standard français)
      /FR\s*\d{2}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{3}/gi,
      // IBAN sans espaces
      /FR\d{25}/gi,
      // IBAN avec espaces variables
      /FR[\s\d]{27,50}/gi,
    ];

    for (const pattern of ibanPatterns) {
      const matches = cleanedForSearch.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`Pattern trouvé:`, matches);
        for (const match of matches) {
          const candidate = match.replace(/[^A-Z0-9]/g, "");
          console.log(
            `Candidat IBAN:`,
            candidate,
            `Longueur: ${candidate.length}`
          );

          if (candidate.length === 27) {
            const isValid = validateIban(candidate);
            console.log(`Validation ${candidate}:`, isValid);

            if (isValid) {
              iban = candidate;
              console.log("✓ IBAN validé:", iban);
              break;
            }
          }
        }
        if (iban) break;
      }
    }

    // STRATÉGIE 2: Recherche via les composants du RIB
    if (!iban) {
      console.log("Tentative extraction via composants RIB...");

      // Cherche "Code banque", "Code guichet", "Numéro de compte", "Clé RIB"
      const bankCodeMatch = text.match(/Code\s+banque\s*[:\s]*(\d{5})/i);
      const branchCodeMatch = text.match(/Code\s+guichet\s*[:\s]*(\d{5})/i);
      const accountMatch = text.match(
        /Num[eé]ro\s+de\s+compte\s*[:\s]*(\d{11})/i
      );
      const keyMatch = text.match(/Cl[eé]\s+RIB\s*[:\s]*(\d{2})/i);

      console.log("Recherche structurée:");
      console.log("- Code banque:", bankCodeMatch?.[1]);
      console.log("- Code guichet:", branchCodeMatch?.[1]);
      console.log("- Numéro compte:", accountMatch?.[1]);
      console.log("- Clé RIB:", keyMatch?.[1]);

      if (bankCodeMatch && branchCodeMatch && accountMatch && keyMatch) {
        const bank = bankCodeMatch[1];
        const branch = branchCodeMatch[1];
        const account = accountMatch[1];
        const key = keyMatch[1];
        const bban = bank + branch + account + key;

        console.log("BBAN construit:", bban, `(${bban.length} caractères)`);

        if (bban.length === 23) {
          try {
            const candidateIban = computeIbanFromBban("FR", bban);
            console.log("IBAN reconstruit:", candidateIban);

            const isValid = validateIban(candidateIban);
            console.log("Validation:", isValid);

            if (isValid) {
              iban = candidateIban;
              console.log("✓ IBAN validé (reconstruit):", iban);
            }
          } catch (e) {
            console.error("Erreur reconstruction IBAN:", e);
          }
        }
      }
    }

    // STRATÉGIE 3: Recherche de séquences numériques longues
    if (!iban) {
      console.log("Tentative via séquences numériques...");

      // Recherche 5 chiffres suivi de 5, suivi de 11, suivi de 2
      const ribPattern = /(\d{5})\s*(\d{5})\s*(\d{11})\s*(\d{2})/g;
      let match;
      while ((match = ribPattern.exec(raw)) !== null) {
        const [, bank, branch, account, key] = match;
        const bban = bank + branch + account + key;

        console.log(`RIB trouvé: ${bank} ${branch} ${account} ${key}`);

        if (bban.length === 23) {
          try {
            const candidateIban = computeIbanFromBban("FR", bban);
            if (validateIban(candidateIban)) {
              iban = candidateIban;
              console.log("✓ IBAN validé (pattern RIB):", iban);
              break;
            }
          } catch (e) {
            console.error("Erreur:", e);
          }
        }
      }
    }

    // BIC: laissé vide intentionnellement
    bic = null;

    console.log("=== FIN EXTRACTION ===");
    console.log("Résultat final - IBAN:", iban);

    return { iban, bic, ocrRaw: raw };
  };

  // ------------------------
  // PDF → IMAGE (PDF.js)
  // ------------------------
  const convertPdfToImage = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async function (e) {
        try {
          const pdfjsLib = window.pdfjsLib || (await loadPdfJs());

          const pdf = await pdfjsLib.getDocument({ data: e.target.result })
            .promise;
          const page = await pdf.getPage(1);

          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport }).promise;

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(
                  new File([blob], file.name.replace(".pdf", "_ocr.png"), {
                    type: "image/png",
                    lastModified: Date.now(),
                  })
                );
              } else reject(new Error("Impossible de convertir le PDF"));
            },
            "image/png",
            0.95
          );
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const loadPdfJs = async () => {
    if (window.pdfjsLib) return window.pdfjsLib;

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(window.pdfjsLib);
      };
      script.onerror = () => reject(new Error("Erreur chargement PDF.js"));
      document.head.appendChild(script);
    });
  };

  // ------------------------
  // Compression universelle
  // ------------------------
  const convertToCompressedImage = async (file) => {
    const maxSizeKB = 1024;

    if (file.type.startsWith("image/")) {
      if (file.size > maxSizeKB * 1024) {
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.9,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });

        return new File([compressed], file.name, {
          type: file.type,
          lastModified: Date.now(),
        });
      }

      return file;
    }

    if (file.type === "application/pdf") {
      const image = await convertPdfToImage(file);
      return image;
    }

    throw new Error("Format non supporté : utilisez PDF/JPG/PNG.");
  };

  // ------------------------
  // Traitement OCR
  // ------------------------
  const processFile = async (file) => {
    if (!file) return;

    setIsProcessing(true);
    setOcrResult(null);

    try {
      const processedFile = await convertToCompressedImage(file);

      const formData = new FormData();
      formData.append("file", processedFile);
      formData.append("apikey", OCR_API_KEY);
      formData.append("language", "fre");

      const response = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.IsErroredOnProcessing) throw new Error(data.ErrorMessage);

      const ocrText = data.ParsedResults[0].ParsedText || "";

      const { iban, bic, ocrRaw } = extractIbanAndBic(ocrText);

      if (iban && validateIban(iban)) {
        setOcrResult({ iban, bic, text: ocrText });
        toast({
          title: "✓ IBAN trouvé et validé",
          description: iban,
          className: "bg-green-600 text-white",
        });
      } else {
        setOcrResult({ iban: iban || null, bic: bic || null, text: ocrText });
        toast({
          title: "⚠ Aucun IBAN valide détecté",
          description: "Vérifiez le texte OCR dans les résultats ci-dessous",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erreur OCR:", error);
      toast({
        title: "Erreur OCR",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ------------------------
  // Drag & Drop
  // ------------------------
  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    try {
      const file = event.dataTransfer.files?.[0];
      if (file) processFile(file);
    } catch (e) {
      console.error(e);
      toast({
        title: "Erreur drop",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  // ------------------------
  // Associer IBAN à sinistre
  // ------------------------
  const handleAssociate = (id) => {
    if (ocrResult && ocrResult.iban && validateIban(ocrResult.iban)) {
      onIbanExtracted(id, ocrResult.iban, ocrResult.bic);
      setOcrResult(null);
      toast({ title: "✓ IBAN associé avec succès" });
    } else {
      toast({
        title: "Impossible d'associer",
        description: "L'IBAN détecté n'est pas valide",
        variant: "destructive",
      });
    }
  };

  const handleRemove = (id) => {
    onRemoveClaim(id);
    toast({ title: "Sinistre retiré" });
  };

  // ------------------------
  // RENDER UI
  // ------------------------

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-3xl font-bold text-white mb-2">
            Reconnaissance IBAN (OCR)
          </h2>
          <p className="text-purple-300">
            Glissez-déposez un RIB (PDF, JPG, PNG)
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 mt-8"
        >
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              isDragging
                ? "border-purple-500 bg-purple-500/10"
                : "border-white/20 hover:border-white/40"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => processFile(e.target.files[0])}
            />

            <Upload className="w-10 h-10 mb-3 text-purple-300" />
            <p className="text-sm text-purple-200">Glissez un fichier ici</p>
            <p className="text-xs text-purple-400">PDF, JPG, PNG</p>
          </div>

          {isProcessing && (
            <div className="flex items-center justify-center space-x-2 mt-4 text-white">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Analyse OCR en cours...</span>
            </div>
          )}
        </motion.div>

        {ocrResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`backdrop-blur-lg rounded-xl p-6 border mt-8 ${
              ocrResult.iban && validateIban(ocrResult.iban)
                ? "bg-green-500/10 border-green-500/20"
                : "bg-orange-500/10 border-orange-500/20"
            }`}
          >
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
              <FileScan
                className={
                  ocrResult.iban && validateIban(ocrResult.iban)
                    ? "text-green-400"
                    : "text-orange-400"
                }
              />
              Résultat OCR
            </h3>

            <div>
              <label
                className={`block text-sm font-medium mb-1 ${
                  ocrResult.iban && validateIban(ocrResult.iban)
                    ? "text-green-300"
                    : "text-orange-300"
                }`}
              >
                IBAN détecté{" "}
                {ocrResult.iban && validateIban(ocrResult.iban) ? "✓" : "⚠"}
              </label>
              <p className="text-white bg-white/5 px-4 py-2 rounded-lg font-mono text-sm">
                {ocrResult.iban || "Aucun IBAN valide trouvé"}
              </p>
            </div>

            <div className="mt-4">
              <label className="block text-slate-300 text-sm font-medium mb-1">
                Texte OCR (debug) - Consultez la console pour plus de détails
              </label>
              <pre className="max-h-40 overflow-y-auto text-xs bg-black/30 p-3 rounded text-white font-mono whitespace-pre-wrap">
                {ocrResult.text || "Aucun texte détecté"}
              </pre>
            </div>
          </motion.div>
        )}
      </div>

      <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-4">
          Sinistres en attente
        </h3>

        {claims.length > 0 ? (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {claims.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-slate-800/50 p-4 rounded-lg flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold text-white">{c.beneficiary}</p>
                  <p className="text-sm text-slate-400 flex items-center gap-2">
                    <Hash size={14} /> {c.claimNumber}
                  </p>
                  <p className="text-sm text-slate-400 flex items-center gap-2">
                    <Banknote size={14} />
                    {c.amount.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleAssociate(c.id)}
                    size="sm"
                    disabled={
                      !ocrResult ||
                      !ocrResult.iban ||
                      !validateIban(ocrResult.iban)
                    }
                    className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check size={16} className="mr-2" /> Associer
                  </Button>

                  <Button
                    onClick={() => handleRemove(c.id)}
                    variant="destructive"
                    size="sm"
                  >
                    <XCircle size={16} />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-400 p-8">
            <Check className="w-12 h-12 mb-4 mx-auto text-green-500" />
            <p>Aucun sinistre en attente</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OcrProcessor;
