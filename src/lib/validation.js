/**
 * Valide un IBAN français selon la norme IBAN
 * @param {string} iban - L'IBAN à valider
 * @returns {boolean} - true si l'IBAN est valide, false sinon
 */
export function isValidIBAN(iban) {
  if (!iban) return false;

  // Nettoyer et mettre en majuscules
  iban = iban.replace(/\s/g, "").toUpperCase();

  // Vérifier la longueur (27 caractères pour IBAN français) et le préfixe FR
  if (iban.length !== 27 || !iban.startsWith("FR")) {
    return false;
  }

  // Réorganiser l'IBAN : mettre les 4 premiers caractères à la fin
  iban = iban.substring(4) + iban.substring(0, 4);

  // Convertir les lettres en nombres (A=10, B=11, ..., Z=35)
  let valeur = "";
  for (let i = 0; i < iban.length; i++) {
    const char = iban.charAt(i);
    if (char >= "A" && char <= "Z") {
      valeur += String(char.charCodeAt(0) - 55);
    } else if (/\d/.test(char)) {
      valeur += char;
    } else {
      return false;
    }
  }

  // Calculer le modulo 97 selon la norme IBAN
  let reste = BigInt(valeur.substring(0, 9)) % BigInt(97);
  for (let i = 9; i < valeur.length; i += 7) {
    reste =
      (reste * BigInt(10000000) + BigInt(valeur.substring(i, i + 7))) %
      BigInt(97);
  }

  return reste === BigInt(1);
}

/**
 * Valide un code BIC/SWIFT
 * @param {string} bic - Le code BIC à valider
 * @returns {boolean} - true si le BIC est valide, false sinon
 */
export function isValidBIC(bic) {
  if (!bic) return false;

  // Nettoyer et mettre en majuscules
  bic = bic.replace(/\s/g, "").toUpperCase();

  // Structure d'un code SWIFT/BIC :
  // 8 ou 11 caractères
  // Les 4 premiers : code banque (lettres uniquement)
  // Les 2 suivants : code pays (lettres uniquement)
  // Les 2 suivants : code lieu (lettres ou chiffres)
  // Les 3 derniers (facultatifs) : code agence (lettres ou chiffres)
  const bicRegex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

  return bicRegex.test(bic);
}

/**
 * Obtient un message d'erreur pour un IBAN invalide
 * @param {string} iban - L'IBAN
 * @returns {string|null} - Le message d'erreur ou null si valide
 */
export function getIBANErrorMessage(iban) {
  if (!iban) return null;

  iban = iban.replace(/\s/g, "").toUpperCase();

  if (!iban.startsWith("FR")) {
    return "L'IBAN doit commencer par 'FR'";
  }

  if (iban.length !== 27) {
    return `L'IBAN français doit contenir exactement 27 caractères (actuellement ${iban.length})`;
  }

  if (!isValidIBAN(iban)) {
    return "L'IBAN est invalide selon la norme IBAN";
  }

  return null;
}

/**
 * Obtient un message d'erreur pour un BIC invalide
 * @param {string} bic - Le BIC
 * @returns {string|null} - Le message d'erreur ou null si valide
 */
export function getBICErrorMessage(bic) {
  if (!bic) return null;

  bic = bic.replace(/\s/g, "").toUpperCase();

  if (bic.length !== 8 && bic.length !== 11) {
    return `Le code BIC doit contenir 8 ou 11 caractères (actuellement ${bic.length})`;
  }

  if (!isValidBIC(bic)) {
    return "Le code BIC est invalide. Format attendu : 4 lettres (banque) + 2 lettres (pays) + 2 caractères (lieu) + optionnel 3 caractères (agence)";
  }

  return null;
}
