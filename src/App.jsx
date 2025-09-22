import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';
import EmailProcessor from '@/components/EmailProcessor';
import ClaimsTable from '@/components/ClaimsTable';
import PaymentProcessor from '@/components/PaymentProcessor';
import Dashboard from '@/components/Dashboard';
import OcrProcessor from '@/components/OcrProcessor';

function App() {
  const [activeTab, setActiveTab] = useState('email');
  const [claims, setClaims] = useState(() => {
    const saved = localStorage.getItem('claims');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('claims', JSON.stringify(claims));
  }, [claims]);

  const addClaim = (claim) => {
    const newClaim = {
      ...claim,
      id: Date.now().toString(),
      status: 'pending_iban',
      createdAt: new Date().toISOString(),
      iban: null,
      bic: null,
      label: claim.beneficiary,
    };
    setClaims(prevClaims => [...prevClaims, newClaim]);
  };

  const addManualClaim = (claimData) => {
    const newClaim = {
      ...claimData,
      id: Date.now().toString(),
      status: claimData.iban ? 'ready_for_payment' : 'pending_iban',
      createdAt: new Date().toISOString(),
      bic: null, // BIC not in form, can be added later if needed
    };
    setClaims(prevClaims => [...prevClaims, newClaim]);
  };

  const updateClaimWithIban = (claimId, iban, bic) => {
    setClaims(prevClaims =>
      prevClaims.map(claim =>
        claim.id === claimId ? { ...claim, iban, bic, status: 'ready_for_payment' } : claim
      )
    );
  };

  const removeClaimFromIbanQueue = (claimId) => {
    setClaims(prevClaims => prevClaims.filter(claim => claim.id !== claimId));
  };

  const updateClaimsData = (updatedClaims) => {
    setClaims(prevClaims => 
      prevClaims.map(pc => {
        const updatedClaim = updatedClaims.find(uc => uc.id === pc.id);
        if (updatedClaim) {
          if (updatedClaim.iban && updatedClaim.status === 'pending_iban') {
            updatedClaim.status = 'ready_for_payment';
          }
          return updatedClaim;
        }
        return pc;
      })
    );
  };
  
  const markAsPaidAndClear = (paidClaimIds) => {
    setClaims(prevClaims =>
      prevClaims.map(claim =>
        paidClaimIds.includes(claim.id) ? { ...claim, status: 'paid' } : claim
      )
    );
  };

  const resetAllData = () => {
    setClaims([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <Helmet>
        <title>Gestion des Sinistres - Automatisation des Paiements</title>
        <meta name="description" content="Application de gestion des sinistres avec automatisation des paiements par email et OCR" />
      </Helmet>
      
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="container mx-auto px-4 py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {activeTab === 'dashboard' && (
            <Dashboard claims={claims} />
          )}
          
          {activeTab === 'email' && (
            <EmailProcessor onClaimAdded={addClaim} />
          )}

          {activeTab === 'ocr' && (
            <OcrProcessor 
              claims={claims.filter(c => c.status === 'pending_iban')} 
              onIbanExtracted={updateClaimWithIban}
              onRemoveClaim={removeClaimFromIbanQueue}
            />
          )}
          
          {activeTab === 'claims' && (
            <ClaimsTable claims={claims} />
          )}
          
          {activeTab === 'payments' && (
            <PaymentProcessor 
              claims={claims.filter(c => c.status !== 'paid')}
              onUpdate={updateClaimsData}
              onMarkAsPaid={markAsPaidAndClear}
              onReset={resetAllData}
              onAddManualClaim={addManualClaim}
            />
          )}
        </motion.div>
      </main>
      
      <Toaster />
    </div>
  );
}

export default App;