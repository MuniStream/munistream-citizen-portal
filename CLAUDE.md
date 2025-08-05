# CivicStream Citizen Portal Context

## Current Status (Last Updated: 2025-07-14)

### Project Overview
CivicStream Citizen Portal is the public-facing interface for citizens to access and interact with government workflows. Built with React 18, TypeScript, and Vite.

- **Repository**: https://github.com/paw-ml/civicstream-citizen-portal
- **Technology**: React 18 + TypeScript + Vite
- **Container**: Fully containerized with Docker

### Completed Features (2025-07-14)
1. ✅ Public workflow catalog browsing
2. ✅ Workflow detail pages with requirements
3. ✅ Workflow instance initiation
4. ✅ Comprehensive data collection forms with validation
5. ✅ Real-time workflow progress tracking
6. ✅ File upload support for documents
7. ✅ Internationalization (English/Spanish)
8. ✅ Responsive design for mobile and desktop
9. ✅ Integration with CivicStream backend APIs

### Key Components Implemented
- **DataCollectionForm**: Dynamic form rendering with validation
- **TrackingPage**: Workflow progress tracking with prominent form display
- **WorkflowStartPage**: Workflow initiation interface
- **LanguageSwitcher**: Multi-language support
- **WorkflowCatalog**: Public service browsing

### Current State
✅ COMPLETED: Full citizen data collection system
- Citizens can browse available workflows
- Citizens can start workflow instances
- Citizens can submit required data through dynamic forms
- Citizens can track progress in real-time
- Forms are prominently displayed when input is required
- Support for text, email, phone, file uploads, dropdowns, etc.

### Development Commands
```bash
# Citizen Portal
cd /Users/paw/Projects/CivicStream/civicstream-citizen-portal
docker-compose up

# Access
Frontend: http://localhost:5173
```

### Key Technical Decisions
- Vite for fast development and building
- React 18 with hooks and modern patterns
- TypeScript for type safety
- i18next for internationalization
- Custom CSS with design system consistency
- Docker containerization
- Public API integration (no authentication required)

### Workflow Integration
- **Backend API**: http://localhost:8000/api/v1
- **Public Endpoints**: No authentication required
- **Workflow Tracking**: Via instance IDs
- **Data Submission**: Direct API integration
- **File Uploads**: Handled via FormData

### User Experience
Citizens can:
1. Browse available government services
2. Start new workflow applications
3. Submit required information through guided forms
4. Upload necessary documents and photos
5. Track application progress in real-time
6. Receive updates when applications advance

### Development Standards
1. **Public Access** - No authentication required for citizen services
2. **Mobile First** - Responsive design for all screen sizes
3. **Accessibility** - WCAG compliant form designs
4. **Performance** - Fast loading and smooth interactions
5. **Error Handling** - Clear user feedback for all actions
6. **Form Validation** - Client-side validation with server confirmation
7. **File Support** - Handle document and photo uploads
8. **Multi-language** - Support Spanish and English
9. **Never Commit CLAUDE.md** - NEVER commit CLAUDE.md files to any repository

### Integration Points
- Consumes APIs from civicstream-workflow backend
- Supports Aquabilidad fishing industry workflows
- Real-time workflow status updates
- Seamless data collection and submission