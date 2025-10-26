import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <Header variant="default" />

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