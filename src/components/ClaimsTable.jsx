import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

const ClaimsTable = ({ claims }) => {
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const handleExportExcel = () => {
    // Si aucune sélection, exporter tous les sinistres
    const claimsToExport =
      selectedIds.size > 0
        ? claims.filter((c) => selectedIds.has(c.id))
        : claims;

    if (claimsToExport.length === 0) {
      return;
    }

    const headers = [
      "NOM BENEFICIAIRE",
      "IBAN",
      "BIC",
      "Montant",
      "Num Sinistre",
      "Libelle",
      "Banque",
      "Gestionnaire",
    ];

    const rows = claimsToExport.map((c) => [
      c.beneficiary,
      c.iban || "",
      c.bic || "",
      c.amount,
      c.claimNumber,
      c.label || "",
      c.type || "", // Utiliser "type" pour "Banque"
      c.manager,
    ]);

    // Créer un classeur Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Ajuster la largeur des colonnes
    ws["!cols"] = [
      { wch: 25 }, // NOM BENEFICIAIRE
      { wch: 27 }, // IBAN
      { wch: 12 }, // BIC
      { wch: 12 }, // Montant
      { wch: 15 }, // Num Sinistre
      { wch: 25 }, // Libelle
      { wch: 20 }, // Banque
      { wch: 20 }, // Gestionnaire
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Sinistres");

    // Télécharger le fichier
    XLSX.writeFile(
      wb,
      `sinistres_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.size === claims.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(claims.map((c) => c.id)));
    }
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

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending_iban":
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case "ready_for_payment":
        return <CreditCard className="w-4 h-4 text-blue-400" />;
      case "paid":
        return <CheckCircle className="w-4 h-4 text-purple-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending_iban":
        return "En attente IBAN";
      case "ready_for_payment":
        return "Prêt pour paiement";
      case "paid":
        return "Payé";
      default:
        return "En attente";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending_iban":
        return "bg-yellow-500/20 text-yellow-300";
      case "ready_for_payment":
        return "bg-blue-500/20 text-blue-300";
      case "paid":
        return "bg-purple-500/20 text-purple-300";
      default:
        return "bg-yellow-500/20 text-yellow-300";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold text-white mb-2">
          Historique des Sinistres
        </h2>
        <p className="text-purple-300">
          Visualisez tous vos sinistres, en attente et payés.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden"
      >
        {claims.length > 0 && (
          <div className="px-6 py-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                onChange={handleSelectAll}
                checked={
                  selectedIds.size === claims.length && claims.length > 0
                }
                className="form-checkbox h-4 w-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                title="Sélectionner tous les sinistres"
              />
              <span className="text-sm text-purple-300">
                {selectedIds.size > 0
                  ? `${selectedIds.size} sélectionné(s)`
                  : "Sélectionner"}
              </span>
            </div>
            <Button
              onClick={handleExportExcel}
              variant="outline"
              className="border-blue-500/50 text-blue-300 hover:bg-blue-500/20"
            >
              <Download className="mr-2 h-4 w-4" /> Exporter Excel
            </Button>
          </div>
        )}
        {claims.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Aucun sinistre
            </h3>
            <p className="text-purple-300">
              Commencez par traiter un email pour créer votre premier sinistre
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-purple-300 w-12">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={
                        selectedIds.size === claims.length && claims.length > 0
                      }
                      className="form-checkbox h-4 w-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-purple-300">
                    Num Sinistre
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-purple-300">
                    Bénéficiaire
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-purple-300">
                    Montant
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-purple-300">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-purple-300">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-purple-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {claims.map((claim, index) => (
                  <motion.tr
                    key={claim.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`hover:bg-white/5 transition-colors ${
                      selectedIds.has(claim.id) ? "bg-purple-500/20" : ""
                    }`}
                  >
                    <td className="px-6 py-4 w-12">
                      <input
                        type="checkbox"
                        onChange={() => handleSelect(claim.id)}
                        checked={selectedIds.has(claim.id)}
                        className="form-checkbox h-4 w-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                      />
                    </td>
                    <td className="px-6 py-4 text-white font-medium">
                      {claim.claimNumber}
                    </td>
                    <td className="px-6 py-4 text-white">
                      {claim.beneficiary}
                    </td>
                    <td className="px-6 py-4 text-green-400 font-semibold">
                      {claim.amount.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={`inline-flex items-center space-x-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          claim.status
                        )}`}
                      >
                        {getStatusIcon(claim.status)}
                        <span>{getStatusText(claim.status)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-purple-300 text-sm">
                      {new Date(claim.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        onClick={() => setSelectedClaim(claim)}
                        size="sm"
                        variant="outline"
                        className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {selectedClaim && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedClaim(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800/80 backdrop-blur-lg rounded-xl p-8 border border-white/20 max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">
                Détails du Sinistre
              </h3>
              <Button
                onClick={() => setSelectedClaim(null)}
                variant="ghost"
                size="icon"
                className="text-purple-300 hover:text-white hover:bg-white/10"
              >
                <XCircle className="w-6 h-6" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
              <div>
                <span className="text-purple-300">Num Sinistre:</span>{" "}
                {selectedClaim.claimNumber}
              </div>
              <div>
                <span className="text-purple-300">Bénéficiaire:</span>{" "}
                {selectedClaim.beneficiary}
              </div>
              <div>
                <span className="text-purple-300">Montant:</span>{" "}
                <span className="text-green-400">
                  {selectedClaim.amount.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </span>
              </div>
              <div>
                <span className="text-purple-300">Type:</span>{" "}
                {selectedClaim.type}
              </div>
              <div>
                <span className="text-purple-300">Gestionnaire:</span>{" "}
                {selectedClaim.manager}
              </div>
              <div>
                <span className="text-purple-300">IBAN:</span>{" "}
                {selectedClaim.iban || "Non fourni"}
              </div>
              <div>
                <span className="text-purple-300">BIC:</span>{" "}
                {selectedClaim.bic || "Non fourni"}
              </div>
              <div>
                <span className="text-purple-300">Date:</span>{" "}
                {new Date(selectedClaim.createdAt).toLocaleString("fr-FR")}
              </div>
              <div className="md:col-span-2">
                <span className="text-purple-300">Libellé:</span>{" "}
                {selectedClaim.label}
              </div>
              <div className="md:col-span-2">
                <span className="text-purple-300">Statut:</span>{" "}
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    selectedClaim.status
                  )}`}
                >
                  {getStatusText(selectedClaim.status)}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ClaimsTable;
