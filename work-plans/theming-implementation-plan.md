# MuniStream Citizen Portal - Multi-Tenant Theming Implementation Plan

## Overview
Transform the current Vite React application to support complete client-specific theming with full layout, component, and styling flexibility. Each client deployment will contain only their specific theme code plus the shared core functionality.

## Current State Analysis
- **Styling**: Pure CSS with hardcoded colors (#2c5aa0 primary blue)
- **Material-UI**: Present in package.json but not implemented for theming
- **Environment Variables**: Basic setup (VITE_API_URL, VITE_APP_NAME)
- **Assets**: Static logo and branding elements

## Target Architecture
- **Base Theme**: Current visual design preserved as default/fallback
- **Client-Specific Themes**: Complete theme implementations per client
- **Theme Switching**: Environment-driven theme selection
- **Full Flexibility**: Layout, components, styles can be completely different per client

## Implementation Phases

### Phase 1: Theme Infrastructure Setup
**Estimated Time**: 8-10 hours with AI assistance

#### 1.1 Core Theme System
- Create `src/theme/` directory structure
- Implement theme registry and loader
- Setup `ThemeProvider` in App.tsx
- Create base theme interface

#### 1.2 Theme Selection Mechanism
- Environment-based theme selection (`VITE_CLIENT_THEME`)
- Dynamic theme loading system
- Fallback to base theme if client theme missing

### Phase 2: Base Theme Migration
**Estimated Time**: 6-8 hours with AI assistance

#### 2.1 Extract Current Design as Base Theme
- Convert existing CSS to Material-UI theme
- Create base theme components
- Ensure current visual design is preserved

#### 2.2 Component Theming Infrastructure
- Themeable component wrappers
- Layout component abstraction
- Style override mechanisms

### Phase 3: Client Theme Structure
**Estimated Time**: 4-6 hours with AI assistance

#### 3.1 Theme Development Framework
- Client theme template structure
- Component override system
- Asset management per theme

#### 3.2 Build System Integration
- Theme-specific builds
- Asset bundling per client
- Environment variable integration

### Phase 4: Testing & Validation
**Estimated Time**: 3-4 hours with AI assistance

#### 4.1 Theme Testing Framework
- Multi-theme testing setup
- Component rendering validation
- Layout responsiveness testing

#### 4.2 Development Tools
- Theme development utilities
- Hot reload for theme changes
- Theme switching in development

## Technical Specifications

### Theme Structure per Client Repository
```
src/
├── theme/
│   ├── index.ts              # Theme registry
│   ├── base/                 # Base theme (current design)
│   │   ├── index.ts
│   │   ├── components/
│   │   ├── layouts/
│   │   └── styles/
│   └── conapesca/            # Client-specific theme (only in CONAPESCA repo)
│       ├── index.ts
│       ├── components/       # Client-specific component overrides
│       │   ├── Header.tsx
│       │   ├── Footer.tsx
│       │   ├── ServiceCard.tsx
│       │   └── AuthForm.tsx
│       ├── layouts/          # Client-specific layouts
│       │   ├── MainLayout.tsx
│       │   └── AuthLayout.tsx
│       ├── styles/           # Client-specific styles
│       │   ├── theme.ts      # Material-UI theme
│       │   ├── global.css    # Global CSS overrides
│       │   └── components.css
│       └── assets/           # Client-specific assets
│           ├── logo.png
│           ├── favicon.ico
│           └── background.jpg
```

### Theme Interface
```typescript
interface ClientTheme {
  name: string;
  config: {
    materialUI: Theme;
    globalCSS: string;
    assets: {
      logo: string;
      favicon: string;
      [key: string]: string;
    };
  };
  components: {
    Header?: React.ComponentType;
    Footer?: React.ComponentType;
    ServiceCard?: React.ComponentType;
    AuthForm?: React.ComponentType;
    [key: string]: React.ComponentType | undefined;
  };
  layouts: {
    Main?: React.ComponentType;
    Auth?: React.ComponentType;
    [key: string]: React.ComponentType | undefined;
  };
}
```

### Environment Variables
```env
# Theme Selection
VITE_CLIENT_THEME=conapesca  # conapesca | tesoreria-cdmx | base

# Client Configuration
VITE_APP_NAME=Portal CONAPESCA
VITE_CLIENT_ID=conapesca

# API Configuration
VITE_API_URL=https://api.conapesca.munistream.mx
VITE_KEYCLOAK_REALM=conapesca
```

### Theme Loader Implementation
```typescript
// src/theme/loader.ts
const themeModules = {
  base: () => import('./base'),
  conapesca: () => import('./conapesca'), // Only exists in CONAPESCA repo
};

export const loadTheme = async (themeName: string): Promise<ClientTheme> => {
  const loader = themeModules[themeName] || themeModules.base;
  const theme = await loader();
  return theme.default;
};
```

## Repository Strategy

### Core Repository (munistream-citizen-portal)
- Contains base theme only
- Theme infrastructure and loader
- Shared components and utilities
- No client-specific code

### Client Repositories (e.g., conapesca-citizen-portal)
- Fork/clone of core repository
- Contains only client-specific theme folder
- Client-specific environment configuration
- Client-specific assets and overrides

### Build Strategy
```bash
# Each client repo builds with their theme
VITE_CLIENT_THEME=conapesca npm run build  # Only conapesca theme included
VITE_CLIENT_THEME=tesoreria-cdmx npm run build  # Only tesoreria theme included
```

## Component Override Examples

### CONAPESCA Header (completely different)
```typescript
// src/theme/conapesca/components/Header.tsx
export const Header: React.FC = () => (
  <header className="conapesca-header maritime-theme">
    <div className="wave-pattern">
      <img src="/assets/conapesca-logo.png" alt="CONAPESCA" />
      <nav className="maritime-nav">
        {/* Completely different navigation structure */}
      </nav>
    </div>
  </header>
);
```

### Tesorería CDMX Header (government style)
```typescript
// src/theme/tesoreria-cdmx/components/Header.tsx
export const Header: React.FC = () => (
  <header className="gobierno-cdmx-header">
    <div className="gobierno-branding">
      <img src="/assets/cdmx-logo.png" alt="Tesorería CDMX" />
      <div className="gobierno-nav-menu">
        {/* Government-style menu */}
      </div>
    </div>
  </header>
);
```

## Development Workflow

### 1. Core Development
- Develop new features in base theme
- Ensure component override system works
- Maintain backward compatibility

### 2. Client Theme Development
- Create client-specific overrides
- Test theme switching
- Validate layout differences

### 3. Deployment
- Each client builds only their theme
- Environment variables configure runtime
- Assets bundled per client

## Success Criteria
- [ ] Complete layout flexibility per client
- [ ] Component-level overrides working
- [ ] Base theme preserved and functional
- [ ] Client repos contain only their theme
- [ ] Build system excludes unused themes
- [ ] Hot reload works for theme development
- [ ] Production builds optimized per client

## Risk Assessment

### High Risk
- **Build Complexity**: Multiple theme builds and asset management
  - *Mitigation*: Automated build scripts and clear documentation

- **Code Duplication**: Similar components across themes
  - *Mitigation*: Shared utilities and composition patterns

### Medium Risk
- **Theme Switching**: Runtime theme loading complexity
  - *Mitigation*: Build-time theme selection, not runtime switching

- **Asset Management**: Client-specific assets in builds
  - *Mitigation*: Theme-scoped asset folders and build optimization

## Next Steps
1. Review and approve this plan
2. Execute Phase 1: Core theme infrastructure
3. Execute Phase 2: Base theme migration
4. Create client theme development guide
5. Integration with CI/CD pipeline