import React from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '../components/Layout/MainLayout';
import { InstanceDetailContent } from '../components/InstanceDetailContent';
import { getOverride } from '../overrides';

export const InstanceDetail: React.FC = () => {
  const { t } = useTranslation();
  const TsxContent = getOverride('InstanceDetailContent');
  return (
    <MainLayout headerProps={{ variant: 'detail', showBackLink: true, backLinkTo: '/applications', backLinkText: t('applications.title') }}>
      {TsxContent ? <TsxContent /> : <InstanceDetailContent />}
    </MainLayout>
  );
};

export default InstanceDetail;
