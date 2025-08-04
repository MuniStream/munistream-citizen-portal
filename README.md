# MuniStream Citizen Portal

Public-facing portal where citizens can initiate and track workflow instances for government services.

## Overview

The Citizen Portal is the primary interface for citizens to:
- Browse available government service workflows
- Initiate new workflow instances (e.g., permit applications, registrations)
- Track the progress of their submitted applications
- Upload required documents
- Receive notifications about status updates
- View completed certificates and permits

## Key Features

### 1. Workflow Catalog
- Browse all available workflows
- View workflow descriptions and requirements
- Check estimated processing times
- See required documents upfront

### 2. Instance Creation
- User-friendly forms for each workflow type
- Step-by-step guidance
- Document upload capabilities
- Real-time validation

### 3. Instance Tracking
- Dashboard showing all user's instances
- Real-time progress tracking
- Current step visibility
- Estimated completion times

### 4. Document Management
- Secure document upload
- Document verification status
- Digital wallet for certificates/permits
- Download capabilities

### 5. Notifications
- Email notifications for status changes
- In-app notification center
- SMS alerts for critical updates
- Push notifications (mobile)

## Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **UI Components**: Material-UI v6/v7
- **State Management**: React Query + Context API
- **Authentication**: JWT with refresh tokens
- **API Communication**: Axios
- **Real-time Updates**: WebSocket (when implemented)
- **Build Tool**: Vite
- **Testing**: Jest + React Testing Library
- **E2E Testing**: Cypress

## Architecture

This portal connects to the MuniStream backend API and provides:
- Public-facing UI (no admin features)
- Citizen-centric workflows
- Simplified interface for non-technical users
- Mobile-responsive design
- Accessibility compliance (WCAG 2.1 AA)

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Environment Variables

```
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_NAME=MuniStream
VITE_ENVIRONMENT=development
```

## Docker Support

```bash
# Development
docker-compose up

# Production build
docker build -t munistream-citizen-portal .
```

## Related Repositories

- [Backend API](https://github.com/MuniStream/munistream-workflow)
- [Admin Portal](https://github.com/MuniStream/munistream-admin-frontend)

## License

Private repository - All rights reserved