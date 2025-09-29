'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CardSelectionProps {
  cardIds: string[];
}

export function CardSelection({ cardIds }: CardSelectionProps) {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const t = useTranslations();

  useEffect(() => {
    const handleSelectAll = () => {
      const checkbox = document.querySelector('.select-all-checkbox') as HTMLInputElement;
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          const isChecked = (e.target as HTMLInputElement).checked;
          
          if (isChecked) {
            setSelectedCards(new Set(cardIds));
          } else {
            setSelectedCards(new Set());
          }
          
          // Update individual checkboxes
          document.querySelectorAll('.card-checkbox').forEach((cb) => {
            (cb as HTMLInputElement).checked = isChecked;
          });
        });
      }
    };

    const handleIndividualSelect = () => {
      document.querySelectorAll('.card-checkbox').forEach((checkbox) => {
        checkbox.addEventListener('change', (e) => {
          const cardId = (e.target as HTMLInputElement).dataset.cardId;
          const isChecked = (e.target as HTMLInputElement).checked;
          
          if (cardId) {
            setSelectedCards(prev => {
              const newSet = new Set(prev);
              if (isChecked) {
                newSet.add(cardId);
              } else {
                newSet.delete(cardId);
              }
              return newSet;
            });
          }
        });
      });
    };

    handleSelectAll();
    handleIndividualSelect();
  }, [cardIds]);

  useEffect(() => {
    // Update select all checkbox based on individual selections
    const selectAllCheckbox = document.querySelector('.select-all-checkbox') as HTMLInputElement;
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = selectedCards.size === cardIds.length && cardIds.length > 0;
      selectAllCheckbox.indeterminate = selectedCards.size > 0 && selectedCards.size < cardIds.length;
    }

    // Update selected count display
    const countElement = document.querySelector('.selected-count');
    if (countElement) {
      countElement.textContent = `${selectedCards.size} ${t('cards.selected')}`;
    }

    // Update print button state
    const printButton = document.querySelector('.print-selected-btn') as HTMLButtonElement;
    if (printButton) {
      printButton.disabled = selectedCards.size === 0;
    }
  }, [selectedCards, cardIds.length, t]);

  const handlePrintSelected = () => {
    if (selectedCards.size > 0) {
      const selectedArray = Array.from(selectedCards);
      
      // Filter out expired cards before printing
      const activeCardIds = selectedArray.filter(cardId => {
        const card = document.querySelector(`[data-card-id="${cardId}"]`);
        return card && card.getAttribute('data-card-active') === 'true';
      });
      
      if (activeCardIds.length === 0) {
        alert('لا توجد بطاقات نشطة محددة للطباعة');
        return;
      }
      
      if (activeCardIds.length !== selectedArray.length) {
        const expiredCount = selectedArray.length - activeCardIds.length;
        if (!confirm(`تم استبعاد ${expiredCount} بطاقة منتهية الصلاحية. هل تريد المتابعة بطباعة ${activeCardIds.length} بطاقة نشطة؟`)) {
          return;
        }
      }
      
      // Get current locale from URL
      const currentPath = window.location.pathname;
      const locale = currentPath.split('/')[1] || 'en';
      // Open print page with selected card IDs
      const printUrl = `/${locale}/cards/print-multiple?ids=${activeCardIds.join(',')}`;
      window.open(printUrl, '_blank');
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button 
        variant="outline" 
        size="sm"
        className="print-selected-btn"
        disabled={selectedCards.size === 0}
        onClick={handlePrintSelected}
      >
        <Printer className="h-4 w-4 mr-2" />
        {t('cards.actions.printSelected')}
      </Button>
      <span className="text-sm text-muted-foreground selected-count">
        {selectedCards.size} {t('cards.selected')}
      </span>
    </div>
  );
}