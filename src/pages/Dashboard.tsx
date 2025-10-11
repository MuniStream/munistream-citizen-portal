import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <div className="logo-section">
              <h1 className="logo">{t('app.title')}</h1>
              <p className="tagline">{t('workflows.title')}</p>
            </div>
            
            <div className="user-section">
              <div className="user-info">
                <span className="user-name">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="user-email">{user?.email}</span>
                {!user?.emailVerified && (
                  <span className="verification-warning">
                    Email not verified
                  </span>
                )}
              </div>
              <button 
                className="btn-secondary"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="container">
          <section className="welcome-section">
            <h2>Welcome back, {user?.firstName}!</h2>
            <p>Access government services and track your applications</p>
          </section>

          <section className="services">
            <h3>Available Services</h3>
            <div className="service-grid">
              <div className="service-card">
                <h4>Building Permits</h4>
                <p>Apply for and track building permit applications</p>
                <button className="btn-primary">Apply Now</button>
              </div>
              
              <div className="service-card">
                <h4>Business License</h4>
                <p>Start your business license application</p>
                <button className="btn-primary">Apply Now</button>
              </div>
              
              <div className="service-card">
                <h4>Citizen Registration</h4>
                <p>Update your citizen registration information</p>
                <button className="btn-primary">Update</button>
              </div>
              
              <div className="service-card">
                <h4>Submit Complaint</h4>
                <p>Report issues or submit complaints</p>
                <button className="btn-primary">Submit</button>
              </div>
            </div>
          </section>

          <section className="my-applications">
            <h3>My Applications</h3>
            <div className="applications-list">
              <div className="application-card">
                <h4>No applications yet</h4>
                <p>Start your first application by selecting a service above.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};