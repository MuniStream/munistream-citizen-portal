import React from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { CatalogContent } from '../components/CatalogContent/CatalogContent';
import { RnpaFirstBanner } from '../components/RnpaFirstBanner';
import { getOverride } from '../overrides';

export const PublicWorkflowCatalog: React.FC = () => {
  const TsxCatalogContent = getOverride('CatalogContent');

  return (
    <MainLayout headerProps={{ variant: 'catalog' }} showHero>
      <RnpaFirstBanner />
      {TsxCatalogContent ? <TsxCatalogContent /> : <CatalogContent />}
    </MainLayout>
  );
};
