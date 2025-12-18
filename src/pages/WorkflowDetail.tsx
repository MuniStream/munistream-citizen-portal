import React from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '../components/Layout/MainLayout';
import { WorkflowDetailContent } from '../components/WorkflowDetailContent';
import { getOverride } from '../overrides';

export const WorkflowDetail: React.FC = () => {
  const { t } = useTranslation();
  const TsxContent = getOverride('WorkflowDetailContent');
  return (
    <MainLayout headerProps={{ variant: 'detail', showBackLink: true, backLinkTo: '/services', backLinkText: t('workflows.title') }}>
      {TsxContent ? <TsxContent /> : <WorkflowDetailContent />}
    </MainLayout>
  );
};

export default WorkflowDetail;
