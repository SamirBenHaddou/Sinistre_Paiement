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

  const extractIbanAndBic = (text) => {
    const ibanRegex =
      /[A-Z]{2}[0-9]{2}\s?([0-9]{4}\s?){4}[0-9]{3}([A-Z0-9]{2})?/g;
    const bicRegex = /([A-Z]{6}[A-Z0-9]{2,5})/g;
    const ibans = text.match(ibanRegex);
    const bics = text.match(bicRegex);
    return {
      iban: ibans ? ibans[0].replace(/\s/g, "") : null,
      bic: bics ? bics[0] : null,
    };
  };

  // Conversion RÉELLE d'un PDF en image avec PDF.js
  const convertPdfToImage = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async function (e) {
        try {
          // Charger PDF.js depuis CDN
          const pdfjsLib = window.pdfjsLib || (await loadPdfJs());

          const pdf = await pdfjsLib.getDocument({ data: e.target.result })
            .promise;
          const page = await pdf.getPage(1); // Première page

          const scale = 2.0; // Haute résolution pour OCR
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };

          await page.render(renderContext).promise;

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const imageFile = new File(
                  [blob],
                  file.name.replace(".pdf", "_converted.png"),
                  {
                    type: "image/png",
                    lastModified: Date.now(),
                  }
                );
                resolve(imageFile);
              } else {
                reject(new Error("Impossible de convertir le PDF"));
              }
            },
            "image/png",
            0.95
          );
        } catch (error) {
          reject(new Error(`Erreur conversion PDF: ${error.message}`));
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // Charger PDF.js dynamiquement
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
      script.onerror = () => reject(new Error("Impossible de charger PDF.js"));
      document.head.appendChild(script);
    });
  };

  // Conversion universelle de tous les fichiers
  const convertToCompressedImage = async (file) => {
    const maxSizeKB = 1024; // 1MB

    if (file.type.startsWith("image/")) {
      // Pour les images : compression directe si nécessaire
      if (file.size > maxSizeKB * 1024) {
        toast({
          title: "Compression image en cours...",
          description: `Compression de ${(file.size / 1024 / 1024).toFixed(
            2
          )}MB`,
        });

        try {
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 0.9,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            initialQuality: 0.8,
          });

          // S'assurer que le fichier compressé garde la bonne extension
          const finalFile = new File(
            [compressedFile],
            file.name, // Garder le nom original
            {
              type: file.type, // Garder le type MIME original
              lastModified: Date.now(),
            }
          );

          toast({
            title: "Image compressée",
            description: `Taille réduite à ${(
              finalFile.size /
              1024 /
              1024
            ).toFixed(2)}MB`,
          });

          return finalFile;
        } catch (error) {
          toast({
            title: "Erreur compression image",
            description:
              "Impossible de compresser l'image. Envoi du fichier original.",
            variant: "destructive",
          });
          // En cas d'erreur de compression, on essaie d'envoyer le fichier original
          return file;
        }
      }

      // Image déjà assez petite, on la renvoie telle quelle
      return file;
    } else if (file.type === "application/pdf") {
      // Pour les PDFs : conversion RÉELLE en image
      toast({
        title: "Conversion PDF en cours...",
        description: `Extraction du contenu réel du PDF (${(
          file.size /
          1024 /
          1024
        ).toFixed(2)}MB)`,
      });

      try {
        const imageFile = await convertPdfToImage(file);

        // Compression de l'image extraite si nécessaire
        const finalFile =
          imageFile.size > maxSizeKB * 1024
            ? await imageCompression(imageFile, {
                maxSizeMB: 0.9,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                initialQuality: 0.8,
              })
            : imageFile;

        toast({
          title: "Conversion PDF réussie",
          description: `PDF converti en image ${(
            finalFile.size /
            1024 /
            1024
          ).toFixed(2)}MB avec contenu réel`,
        });

        return finalFile;
      } catch (error) {
        toast({
          title: "Erreur conversion PDF",
          description:
            "Impossible de convertir le PDF. Essayez avec une image ou capture d'écran.",
          variant: "destructive",
        });
        throw error;
      }
    } else {
      // Autres formats non supportés
      toast({
        title: "Format non supporté",
        description: "Veuillez utiliser un PDF, JPG ou PNG.",
        variant: "destructive",
      });
      throw new Error("Format de fichier non supporté");
    }
  };

  const processFile = async (file) => {
    if (!file) return;
    setIsProcessing(true);
    setOcrResult(null);

    try {
      // Conversion/compression universelle de TOUS les fichiers
      const processedFile = await convertToCompressedImage(file);

      const formData = new FormData();
      formData.append("file", processedFile);
      formData.append("apikey", OCR_API_KEY);
      formData.append("language", "fre");

      // Forcer le type de fichier pour éviter l'erreur E216
      formData.append("filetype", processedFile.type.split("/")[1] || "png");

      const response = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.IsErroredOnProcessing)
        throw new Error(data.ErrorMessage.join(" "));

      const ocrText = data.ParsedResults[0].ParsedText;
      const { iban, bic } = extractIbanAndBic(ocrText);

      if (iban) {
        setOcrResult({
          iban,
          bic,
          text: ocrText,
        });
        toast({
          title: "IBAN trouvé !",
          description: `IBAN: ${iban}`,
        });
      } else {
        toast({
          title: "Aucun IBAN trouvé",
          description: "L'OCR n'a pas pu détecter d'IBAN.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur OCR",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      try {
        // Méthode 1: Fichiers standards (fonctionne sur toutes versions)
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const file = event.dataTransfer.files[0];
          processFile(file);
          return;
        }

        // Méthode 2: Items API (plus moderne, pour compatibilité étendue)
        if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
          const item = event.dataTransfer.items[0];
          if (item.kind === "file") {
            const file = item.getAsFile();
            if (file) {
              processFile(file);
              return;
            }
          }
        }

        // Si aucune méthode ne fonctionne
        toast({
          title: "Drag & Drop non compatible",
          description:
            "Utilisez le bouton de sélection de fichier comme alternative.",
          variant: "destructive",
        });
      } catch (error) {
        toast({
          title: "Erreur technique",
          description:
            "Impossible de récupérer le fichier. Utilisez le bouton de sélection.",
          variant: "destructive",
        });
      }
    },
    [processFile, toast]
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

  const handleAssociate = (claimId) => {
    if (ocrResult && claimId) {
      onIbanExtracted(claimId, ocrResult.iban, ocrResult.bic);
      toast({
        title: "Association réussie !",
        description: `L'IBAN a été associé au sinistre.`,
      });
      setOcrResult(null);
    }
  };

  const handleRemove = (claimId) => {
    onRemoveClaim(claimId);
    toast({
      title: "Sinistre retiré",
      description: "Le sinistre a été retiré de la file d'attente IBAN.",
    });
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="text-center lg:text-left"
        >
          <h2 className="text-3xl font-bold text-white mb-2">
            Reconnaissance d'IBAN (OCR)
          </h2>
          <p className="text-purple-300">
            Glissez-déposez un fichier RIB (PDF, JPG, PNG). Extraction
            automatique du contenu réel des PDFs.
          </p>
        </motion.div>
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.2,
          }}
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
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
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
              <span className="font-semibold">Glissez-déposez</span> un fichier
              ici
            </p>
            <p className="text-xs text-purple-400 mb-2">
              PDF, JPG, PNG - Extraction du contenu réel des PDFs avec PDF.js
            </p>
            <p className="text-xs text-blue-300 font-semibold">
              ou cliquez pour sélectionner un fichier
            </p>
          </div>
          {isProcessing && (
            <div className="flex items-center justify-center space-x-2 mt-4 text-white">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Analyse OCR...</span>
            </div>
          )}
        </motion.div>
        {ocrResult && (
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="bg-green-500/10 backdrop-blur-lg rounded-xl p-6 border border-green-500/20 mt-8"
          >
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
              <FileScan className="text-green-400" />
              Résultat OCR
            </h3>
            <div>
              <label className="block text-green-300 text-sm font-medium mb-1">
                IBAN Détecté
              </label>
              <p className="text-white bg-white/5 px-4 py-2 rounded-lg font-mono">
                {ocrResult.iban}
              </p>
            </div>
            {ocrResult.bic && (
              <div className="mt-4">
                <label className="block text-green-300 text-sm font-medium mb-1">
                  BIC Détecté
                </label>
                <p className="text-white bg-white/5 px-4 py-2 rounded-lg font-mono">
                  {ocrResult.bic}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>
      <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-4">
          Sinistres en attente d'IBAN
        </h3>
        {claims.length > 0 ? (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {claims.map((claim) => (
              <motion.div
                key={claim.id}
                layout
                initial={{
                  opacity: 0,
                  x: -20,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                exit={{
                  opacity: 0,
                  x: 20,
                }}
                className="bg-slate-800/50 p-4 rounded-lg flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold text-white">
                    {claim.beneficiary}
                  </p>
                  <p className="text-sm text-slate-400 flex items-center gap-2">
                    <Hash size={14} /> {claim.claimNumber}
                  </p>
                  <p className="text-sm text-slate-400 flex items-center gap-2">
                    <Banknote size={14} />{" "}
                    {claim.amount.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleAssociate(claim.id)}
                    disabled={!ocrResult || isProcessing}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Check size={16} className="mr-2" /> Associer
                  </Button>
                  <Button
                    onClick={() => handleRemove(claim.id)}
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
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-8">
            <Check className="w-12 h-12 mb-4 text-green-500" />
            <p className="font-semibold">Aucun sinistre en attente.</p>
            <p className="text-sm">
              Tous les sinistres ont un IBAN ou ont été traités.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OcrProcessor;
