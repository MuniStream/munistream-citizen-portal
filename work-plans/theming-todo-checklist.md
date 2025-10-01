# MuniStream Citizen Portal - Theming Implementation Checklist

## Phase 1: Theme Infrastructure Setup (8-10 hours → 3-4 hours with AI)

### Core Theme System
- [ ] Create `src/theme/` directory structure
- [ ] Create theme interface definitions (`ClientTheme`, `ThemeConfig`)
- [ ] Implement theme registry system
- [ ] Create dynamic theme loader with fallback mechanism
- [ ] Setup `ThemeProvider` wrapper in `App.tsx`
- [ ] Create theme context for component access
- [ ] Add theme switching utility functions

### Theme Selection Mechanism
- [ ] Implement environment-based theme selection (`VITE_CLIENT_THEME`)
- [ ] Create theme module resolver
- [ ] Add theme validation and error handling
- [ ] Setup fallback to base theme if client theme missing
- [ ] Create theme loading state management
- [ ] Add development-mode theme switching tools

## Phase 2: Base Theme Migration (6-8 hours → 2-3 hours with AI)

### Extract Current Design as Base Theme
- [ ] Create `src/theme/base/` directory structure
- [ ] Convert existing CSS colors to Material-UI theme variables
- [ ] Create base Material-UI theme configuration
- [ ] Extract typography settings to theme config
- [ ] Convert spacing and breakpoints to theme system
- [ ] Create base component style overrides

### Component Theming Infrastructure
- [ ] Create themeable component wrapper utilities
- [ ] Abstract layout components (`MainLayout`, `AuthLayout`)
- [ ] Create component override mechanism
- [ ] Setup style injection system for theme-specific CSS
- [ ] Implement asset loading per theme
- [ ] Create theme-aware routing system

### CSS Migration
- [ ] Convert `App.css` hardcoded colors to CSS custom properties
- [ ] Update component CSS to use theme variables
- [ ] Remove hardcoded colors from all CSS files
- [ ] Implement CSS-in-JS for dynamic styling
- [ ] Setup global CSS injection per theme
- [ ] Test visual parity with current design

## Phase 3: Client Theme Structure (4-6 hours → 2 hours with AI)

### Theme Development Framework
- [ ] Create client theme template structure
- [ ] Document theme development guidelines
- [ ] Create component override examples
- [ ] Setup asset management per theme (logos, icons, backgrounds)
- [ ] Create theme-specific environment variable loading
- [ ] Implement theme build validation

### Build System Integration
- [ ] Update Vite config for theme-based builds
- [ ] Create theme asset bundling system
- [ ] Implement environment variable injection per theme
- [ ] Setup theme-specific public folder management
- [ ] Create build scripts for different clients
- [ ] Add theme exclusion logic (build only selected theme)

### Development Tools
- [ ] Create theme development hot-reload support
- [ ] Add theme switching in development mode
- [ ] Create theme preview/testing utilities
- [ ] Setup theme validation warnings
- [ ] Create theme documentation generator

## Phase 4: Testing & Validation (3-4 hours → 1-2 hours with AI)

### Theme Testing Framework
- [ ] Setup Jest/Vitest tests for theme loading
- [ ] Create component rendering tests with different themes
- [ ] Add theme switching integration tests
- [ ] Test fallback behavior when theme missing
- [ ] Validate theme asset loading
- [ ] Test environment variable theme selection

### Visual Testing
- [ ] Setup Storybook with theme switching
- [ ] Create visual regression testing for themes
- [ ] Test responsive design across themes
- [ ] Validate accessibility compliance per theme
- [ ] Test theme performance (bundle size, load time)
- [ ] Cross-browser theme compatibility testing

### Documentation & Examples
- [ ] Create theme development documentation
- [ ] Document component override patterns
- [ ] Create client theme setup guide
- [ ] Document environment variable requirements
- [ ] Create troubleshooting guide
- [ ] Add theme switching examples for development

## Quality Assurance Checklist

### Functionality
- [ ] Base theme renders identically to current design
- [ ] Theme switching works without page reload
- [ ] All components support theme overrides
- [ ] Asset loading works for theme-specific resources
- [ ] Environment variables properly configure themes
- [ ] Build process excludes unused theme code

### Performance
- [ ] Theme loading adds < 100ms to initial load
- [ ] Bundle size increase < 20% for theme infrastructure
- [ ] Asset loading is optimized per theme
- [ ] No memory leaks during theme operations
- [ ] Tree shaking removes unused theme code

### Developer Experience
- [ ] Hot reload works with theme changes
- [ ] Clear error messages for theme issues
- [ ] Theme development is well documented
- [ ] Easy to create new client themes
- [ ] Theme validation catches common errors

### Production Readiness
- [ ] Theme builds are optimized for production
- [ ] Client-specific builds contain only relevant theme
- [ ] Asset URLs resolve correctly in production
- [ ] Environment variables work in deployment
- [ ] Theme fallbacks handle edge cases gracefully

## Deployment Preparation

### Repository Setup
- [ ] Ensure `.gitignore` excludes `work-plans/` folder
- [ ] Create client repository setup documentation
- [ ] Document fork/clone process for new clients
- [ ] Create client theme development starter template

### CI/CD Integration
- [ ] Document environment variables for deployment
- [ ] Create build scripts for different client themes
- [ ] Setup asset deployment pipeline
- [ ] Test deployment with different theme configurations
- [ ] Validate client isolation (no cross-theme code)

## Sign-off Criteria

- [ ] **Technical Lead Approval**: Theme architecture reviewed and approved
- [ ] **Design Approval**: Base theme matches current design exactly
- [ ] **Performance Approval**: No significant performance impact
- [ ] **Developer Approval**: Easy to create and maintain client themes
- [ ] **QA Approval**: All test cases pass across all themes
- [ ] **Deployment Approval**: Production build pipeline works correctly

## Estimated Timeline with AI Assistance
- **Total Time**: 21-28 hours → **8-11 hours with AI assistance**
- **Phase 1**: 3-4 hours
- **Phase 2**: 2-3 hours
- **Phase 3**: 2 hours
- **Phase 4**: 1-2 hours

## Next Actions After Completion
1. Create CONAPESCA theme implementation
2. Create Tesorería CDMX theme implementation
3. Update CI/CD pipeline for client-specific builds
4. Deploy to staging environments for validation
5. Production deployment of first client theme