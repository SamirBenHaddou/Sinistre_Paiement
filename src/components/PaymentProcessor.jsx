import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Download,
  Trash2,
  CheckCircle,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ManualPaymentForm from "@/components/ManualPaymentForm";
import * as XLSX from "xlsx";
import {
  isValidIBAN,
  isValidBIC,
  getIBANErrorMessage,
  getBICErrorMessage,
} from "@/lib/validation";
const PaymentProcessor = ({
  claims,
  onUpdate,
  onMarkAsPaid,
  onReset,
  onAddManualClaim,
}) => {
  const [paymentList, setPaymentList] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState({}); // Suivi des erreurs de validation
  const { toast } = useToast();
  useEffect(() => {
    setPaymentList(claims);
  }, [claims]);
  const handleInputChange = (id, field, value) => {
    const errorKey = `${id}-${field}`;

    // Validation IBAN
    if (field === "iban" && value) {
      const error = getIBANErrorMessage(value);
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        if (error) {
          newErrors[errorKey] = error;
        } else {
          delete newErrors[errorKey];
        }
        return newErrors;
      });

      if (error) {
        toast({
          title: "IBAN invalide",
          description: error,
          variant: "destructive",
        });
      }
    } else if (field === "iban" && !value) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }

    // Validation BIC
    if (field === "bic" && value) {
      const error = getBICErrorMessage(value);
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        if (error) {
          newErrors[errorKey] = error;
        } else {
          delete newErrors[errorKey];
        }
        return newErrors;
      });

      if (error) {
        toast({
          title: "Code BIC invalide",
          description: error,
          variant: "destructive",
        });
      }
    } else if (field === "bic" && !value) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }

    const newList = paymentList.map((item) =>
      item.id === id
        ? {
            ...item,
            [field]: value,
          }
        : item
    );
    setPaymentList(newList);
  };
  const handleSaveChanges = () => {
    onUpdate(paymentList);
    toast({
      title: "Modifications enregistrées",
      description: "Les informations de paiement ont été mises à jour.",
    });
  };
  const handleExportExcel = () => {
    const listToExport = paymentList.filter((p) => selectedIds.has(p.id));
    if (listToExport.length === 0) {
      toast({
        title: "Aucune ligne sélectionnée",
        description: "Veuillez sélectionner des paiements à exporter.",
        variant: "destructive",
      });
      return;
    }
    const headers = [
      "Nom Bénéficiaire",
      "IBAN",
      "BIC",
      "Montant",
      "Num Sinistre",
      "Libellé",
      "Gestionnaire",
    ];
    const rows = listToExport.map((p) => [
      p.beneficiary,
      p.iban || "",
      p.bic || "",
      p.amount,
      p.claimNumber,
      p.label || "",
      p.manager,
    ]);

    // Créer un classeur Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Ajuster la largeur des colonnes
    ws["!cols"] = [
      { wch: 25 }, // Bénéficiaire
      { wch: 27 }, // IBAN
      { wch: 12 }, // BIC
      { wch: 12 }, // Montant
      { wch: 15 }, // Num Sinistre
      { wch: 25 }, // Libellé
      { wch: 20 }, // Gestionnaire
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Paiements");

    // Télécharger le fichier
    XLSX.writeFile(
      wb,
      `paiements_${new Date().toISOString().split("T")[0]}.xlsx`
    );

    toast({
      title: "Exportation réussie",
      description: `${listToExport.length} lignes exportées en Excel.`,
    });
  };
  const handleMarkAsPaid = () => {
    if (selectedIds.size === 0) {
      toast({
        title: "Aucune ligne sélectionnée",
        description: "Veuillez sélectionner les paiements effectués.",
        variant: "destructive",
      });
      return;
    }
    onMarkAsPaid(Array.from(selectedIds));
    toast({
      title: "Paiements marqués comme effectués",
      description: `${selectedIds.size} sinistres mis à jour.`,
    });
    setSelectedIds(new Set());
  };
  const handleSelect = (id) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    setSelectedIds(newSelectedIds);
  };
  const handleSelectAll = () => {
    if (selectedIds.size === paymentList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paymentList.map((p) => p.id)));
    }
  };
  const handleManualClaimSubmit = (claimData) => {
    onAddManualClaim(claimData);
    toast({
      title: "Paiement ajouté",
      description: "Le paiement manuel a été ajouté à la liste.",
    });
    setIsManualFormOpen(false);
  };
  return (
    <div className="max-w-full mx-auto space-y-8">
      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold text-white mb-2">
          Fichier des Paiements
        </h2>
        <p className="text-purple-300">
          Modifiez, validez et exportez les paiements.
        </p>
      </motion.div>

      {paymentList.length === 0 && !isManualFormOpen ? (
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
          className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 text-center"
        >
          <CreditCard className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Aucun paiement à traiter
          </h3>
          <p className="text-purple-300 mb-4">
            Les sinistres payés n'apparaissent pas ici. Traitez des emails pour
            en ajouter.
          </p>
          <Button
            onClick={() => setIsManualFormOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Paiement Manuel
          </Button>
        </motion.div>
      ) : (
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
          className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
        >
          <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-3">
              <CreditCard className="text-green-400" />
              Paiements à traiter
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => setIsManualFormOpen(true)}
                variant="outline"
                className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter Manuel
              </Button>
              <Button
                onClick={handleExportExcel}
                variant="outline"
                className="border-blue-500/50 text-blue-300 hover:bg-blue-500/20"
              >
                <Download className="mr-2 h-4 w-4" /> Exporter Excel
              </Button>
              <Button onClick={onReset} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Tout Réinitialiser
              </Button>
              <Button
                onClick={handleSaveChanges}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Enregistrer
              </Button>
              <Button
                onClick={handleMarkAsPaid}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" /> Marquer comme Payé
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300 table-fixed">
              <thead className="text-xs text-white uppercase bg-white/5">
                <tr>
                  <th scope="col" className="p-4 w-12">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={
                        selectedIds.size === paymentList.length &&
                        paymentList.length > 0
                      }
                      className="form-checkbox h-4 w-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3 w-48">
                    Num Sinistre
                  </th>
                  <th scope="col" className="px-4 py-3 w-48">
                    Bénéficiaire
                  </th>
                  <th scope="col" className="px-4 py-3 w-72">
                    IBAN
                  </th>
                  <th scope="col" className="px-4 py-3 w-32">
                    Montant
                  </th>
                  <th scope="col" className="px-4 py-3 w-48">
                    Libellé (manuel)
                  </th>
                  <th scope="col" className="px-4 py-3 w-48">
                    Gestionnaire
                  </th>
                </tr>
              </thead>
              <tbody>
                {paymentList.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b border-white/10 transition-colors ${
                      selectedIds.has(p.id)
                        ? "bg-purple-500/20"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        onChange={() => handleSelect(p.id)}
                        checked={selectedIds.has(p.id)}
                        className="form-checkbox h-4 w-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={p.claimNumber}
                        onChange={(e) =>
                          handleInputChange(p.id, "claimNumber", e.target.value)
                        }
                        className="bg-transparent w-full focus:ring-purple-500 focus:border-purple-500 border-0 border-b-2 border-transparent focus:border-purple-400"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={p.beneficiary}
                        onChange={(e) =>
                          handleInputChange(p.id, "beneficiary", e.target.value)
                        }
                        className="bg-transparent w-full focus:ring-purple-500 focus:border-purple-500 border-0 border-b-2 border-transparent focus:border-purple-400"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={p.iban || ""}
                        onChange={(e) =>
                          handleInputChange(p.id, "iban", e.target.value)
                        }
                        className={`bg-transparent w-full focus:ring-purple-500 focus:border-purple-500 border-0 border-b-2 border-transparent focus:border-purple-400 ${
                          validationErrors[`${p.id}-iban`]
                            ? "bg-orange-500/20 border-b-2 border-orange-500"
                            : ""
                        }`}
                        title={
                          validationErrors[`${p.id}-iban`]
                            ? validationErrors[`${p.id}-iban`]
                            : ""
                        }
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={p.amount}
                        onChange={(e) =>
                          handleInputChange(
                            p.id,
                            "amount",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="bg-transparent w-full focus:ring-purple-500 focus:border-purple-500 border-0 border-b-2 border-transparent focus:border-purple-400"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={p.label || ""}
                        onChange={(e) =>
                          handleInputChange(p.id, "label", e.target.value)
                        }
                        className="bg-transparent w-full focus:ring-purple-500 focus:border-purple-500 border-0 border-b-2 border-transparent focus:border-purple-400"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={p.manager}
                        onChange={(e) =>
                          handleInputChange(p.id, "manager", e.target.value)
                        }
                        className="bg-transparent w-full focus:ring-purple-500 focus:border-purple-500 border-0 border-b-2 border-transparent focus:border-purple-400"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
      <ManualPaymentForm
        isOpen={isManualFormOpen}
        onClose={() => setIsManualFormOpen(false)}
        onSubmit={handleManualClaimSubmit}
      />
    </div>
  );
};
export default PaymentProcessor;
