'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface CardSearchProps {
  locale: string;
  initialSearch?: string;
  initialStatus?: string;
}

export function CardSearch({ locale, initialSearch = '', initialStatus = 'all' }: CardSearchProps) {
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams?.toString() || '');
      
      if (search) {
        params.set('search', search);
      } else {
        params.delete('search');
      }
      
      if (status && status !== 'all') {
        params.set('status', status);
      } else {
        params.delete('status');
      }
      
      params.set('page', '1');
      
      router.push(`/${locale}/cards?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search, status, locale, router, searchParams]);

  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder={t('cards.search.placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 w-64"
        />
      </div>
      
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder={t('cards.filter.status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('cards.filter.all')}</SelectItem>
          <SelectItem value="active">{t('cards.filter.active')}</SelectItem>
          <SelectItem value="expired">{t('cards.filter.expired')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}