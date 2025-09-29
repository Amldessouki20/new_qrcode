'use client';

import { useTranslations } from 'next-intl';

export function PrintButton() {
  const t = useTranslations();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mt-8 text-center text-gray-600 print:hidden">
      <p className="mb-4">{t('cards.printCard')}</p>
      <button 
        onClick={handlePrint}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        {t('cards.printCard')}
      </button>
    </div>
  );
}