import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { MainLayout } from '../components/Layout/MainLayout';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <MainLayout>
      <div className="dashboard">

      <main className="dashboard-main">
        <div className="container">
          <section className="welcome-section">
            <h2>{t('dashboardPage.welcomeBack', { name: user?.firstName })}</h2>
            <p>{t('dashboardPage.welcomeSubtitle')}</p>
          </section>

          <section className="services">
            <h3>{t('dashboardPage.availableServices')}</h3>
            <div className="service-grid">
              <div className="service-card">
                <h4>{t('dashboardPage.buildingPermitsTitle')}</h4>
                <p>{t('dashboardPage.buildingPermitsDesc')}</p>
                <button className="btn-primary">{t('dashboardPage.applyNow')}</button>
              </div>

              <div className="service-card">
                <h4>{t('dashboardPage.businessLicenseTitle')}</h4>
                <p>{t('dashboardPage.businessLicenseDesc')}</p>
                <button className="btn-primary">{t('dashboardPage.applyNow')}</button>
              </div>

              <div className="service-card">
                <h4>{t('dashboardPage.citizenRegistrationTitle')}</h4>
                <p>{t('dashboardPage.citizenRegistrationDesc')}</p>
                <button className="btn-primary">{t('dashboardPage.update')}</button>
              </div>

              <div className="service-card">
                <h4>{t('dashboardPage.submitComplaintTitle')}</h4>
                <p>{t('dashboardPage.submitComplaintDesc')}</p>
                <button className="btn-primary">{t('dashboardPage.submit')}</button>
              </div>
            </div>
          </section>

          <section className="my-applications">
            <h3>{t('dashboardPage.myApplications')}</h3>
            <div className="applications-list">
              <div className="application-card">
                <h4>{t('dashboardPage.noApplicationsTitle')}</h4>
                <p>{t('dashboardPage.noApplicationsDesc')}</p>
              </div>
            </div>
          </section>
        </div>
      </main>
      </div>
    </MainLayout>
  );
};