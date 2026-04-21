import React from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '../components/Layout/MainLayout';
import { ProfileContent } from '../components/ProfileContent';
import { getOverride } from '../overrides';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const TsxContent = getOverride('ProfileContent');
  return (
    <MainLayout
      headerProps={{
        variant: 'detail',
        showBackLink: true,
        backLinkTo: '/services',
        backLinkText: t('navigation.services', 'Servicios'),
      }}
    >
      {TsxContent ? <TsxContent /> : <ProfileContent />}
    </MainLayout>
  );
};

export default ProfilePage;
