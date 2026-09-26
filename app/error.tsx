'use client';

import { useEffect } from 'react';
import ErrorScreen from '@/components/ErrorScreen';
import { useLanguage } from '@/context/LanguageContext';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLanguage();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorScreen icon="⚠️" title={t('error_title')} message={t('error_message')} onRetry={reset} />;
}
