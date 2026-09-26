'use client';

import ErrorScreen from '@/components/ErrorScreen';
import { useLanguage } from '@/context/LanguageContext';

export default function NotFound() {
  const { t } = useLanguage();
  return <ErrorScreen icon="🧭" title={t('notfound_title')} message={t('notfound_message')} />;
}
