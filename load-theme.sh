#!/bin/sh

set -e

TENANT_ID="${VITE_TENANT_ID:-${VITE_TENANT}}"
THEME_TARGET_DIR="/app/public/themes"

# Determine theme source directory with fallback
THEME_BASE_DIR="/app/plugins/${TENANT_ID}/themes"
if [ -f "$THEME_BASE_DIR/citizen/theme.yaml" ]; then
    THEME_SOURCE_DIR="$THEME_BASE_DIR/citizen"
elif [ -d "$THEME_BASE_DIR/citizen" ]; then
    THEME_SOURCE_DIR="$THEME_BASE_DIR/citizen"
elif [ -f "$THEME_BASE_DIR/default/theme.yaml" ]; then
    THEME_SOURCE_DIR="$THEME_BASE_DIR/default"
elif [ -d "$THEME_BASE_DIR/default" ]; then
    THEME_SOURCE_DIR="$THEME_BASE_DIR/default"
else
    THEME_SOURCE_DIR="$THEME_BASE_DIR/citizen"
fi

echo "🎨 Loading theme for tenant: $TENANT_ID"

# Create target theme directory
mkdir -p "$THEME_TARGET_DIR"

if [ ! -d "$THEME_SOURCE_DIR" ]; then
    echo "⚠️  Theme source directory not found: $THEME_SOURCE_DIR"
    echo "ℹ️  Creating default theme configuration..."

    # Create default theme config
    cat > "$THEME_TARGET_DIR/theme-config.json" << 'EOF'
{
  "metadata": {
    "name": "Default Theme",
    "organization": "MuniStream",
    "tenant_id": "default"
  },
  "colors": {
    "primary_main": "#1976d2",
    "secondary_main": "#dc004e",
    "background_default": "#ffffff",
    "background_paper": "#f5f5f5",
    "text_primary": "#000000",
    "text_secondary": "#666666"
  },
  "typography": {
    "font_family": "\"Roboto\", \"Helvetica\", \"Arial\", sans-serif"
  },
  "templates": {
    "enabled": false,
    "components": {},
    "layouts": {},
    "variables": {}
  }
}
EOF
    echo "✅ Created default theme configuration"
    exit 0
fi

echo "📂 Found theme directory: $THEME_SOURCE_DIR"

# Copy theme configuration
if [ -f "$THEME_SOURCE_DIR/theme.yaml" ]; then
    echo "🔧 Converting theme.yaml to theme-config.json..."

    # Use js-yaml CLI to convert YAML to JSON
    if js-yaml "$THEME_SOURCE_DIR/theme.yaml" > "$THEME_TARGET_DIR/theme-config.json.tmp" 2>/dev/null; then
        # Add citizen-specific metadata using node
        node -e "
            const fs = require('fs');
            const path = require('path');

            try {
                const themeConfig = JSON.parse(fs.readFileSync('$THEME_TARGET_DIR/theme-config.json.tmp', 'utf8'));

                // Ensure templates section exists
                if (!themeConfig.templates) {
                    themeConfig.templates = { enabled: false };
                }

                // Promote header/footer from components to top-level if not already there
                if (themeConfig.components?.header && !themeConfig.header) {
                    themeConfig.header = themeConfig.components.header;
                }
                if (themeConfig.components?.footer && !themeConfig.footer) {
                    themeConfig.footer = themeConfig.components.footer;
                }

                // Scan for HTML/CSS component overrides in theme directory
                const htmlOverrides = {};
                try {
                    const files = fs.readdirSync('$THEME_SOURCE_DIR');
                    files.forEach(f => {
                        const ext = path.extname(f);
                        const name = path.basename(f, ext);
                        if (ext === '.html' || ext === '.css') {
                            htmlOverrides[name] = true;
                        }
                    });
                } catch(e) {}
                themeConfig.html_overrides = htmlOverrides;

                fs.writeFileSync('$THEME_TARGET_DIR/theme-config.json', JSON.stringify(themeConfig, null, 2));
                console.log('✅ Theme configuration converted successfully');
                if (Object.keys(htmlOverrides).length > 0) {
                    console.log('📦 HTML/CSS overrides found:', Object.keys(htmlOverrides).join(', '));
                }
            } catch (error) {
                console.error('❌ Error processing theme:', error.message);
                process.exit(1);
            }
        "
        rm -f "$THEME_TARGET_DIR/theme-config.json.tmp"
    else
        echo "❌ Failed to convert YAML to JSON"
        exit 1
    fi
else
    echo "⚠️  No theme.yaml found, creating basic configuration"
    cat > "$THEME_TARGET_DIR/theme-config.json" << EOF
{
  "metadata": {
    "name": "Basic Theme",
    "organization": "MuniStream",
    "tenant_id": "$TENANT_ID"
  },
  "colors": {
    "primary_main": "#1976d2",
    "secondary_main": "#dc004e",
    "background_default": "#ffffff",
    "background_paper": "#f5f5f5"
  },
  "templates": {
    "enabled": false
  }
}
EOF
fi

# Process HTML templates and inject into built HTML
if [ -d "$THEME_SOURCE_DIR/templates" ]; then
    echo "📁 Processing HTML templates for injection..."

    # Create target templates directory
    mkdir -p "$THEME_TARGET_DIR/templates"
    cp -r "$THEME_SOURCE_DIR/templates"/* "$THEME_TARGET_DIR/templates/"

    # Process index.html to inject theme elements
    INDEX_FILE="/usr/share/nginx/html/index.html"
    if [ -f "$INDEX_FILE" ]; then
        echo "🔧 Injecting theme elements into index.html..."

        # Read theme configuration to get metadata
        THEME_CONFIG=$(cat "$THEME_TARGET_DIR/theme-config.json" 2>/dev/null || echo '{}')

        # Extract organization name and tenant info from theme config
        ORGANIZATION=$(echo "$THEME_CONFIG" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8')).metadata?.organization || 'MuniStream')")
        TENANT_NAME=$(echo "$THEME_CONFIG" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8')).metadata?.tenant_name || '$TENANT_ID')")

        # Create a backup
        cp "$INDEX_FILE" "$INDEX_FILE.backup"

        # Start building the new HTML
        cat > "$INDEX_FILE" << 'HTMLSTART'
<!doctype html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
HTMLSTART

        # Add favicon if exists
        if [ -f "$THEME_TARGET_DIR/templates/favicon.html" ]; then
            echo "    <!-- Theme Favicon -->" >> "$INDEX_FILE"
            cat "$THEME_TARGET_DIR/templates/favicon.html" >> "$INDEX_FILE"
        else
            echo '    <link rel="icon" type="image/svg+xml" href="/vite.svg" />' >> "$INDEX_FILE"
        fi

        # Add title
        echo "    <title>$ORGANIZATION - Portal Ciudadano</title>" >> "$INDEX_FILE"

        # Add custom head elements if exists
        if [ -f "$THEME_TARGET_DIR/templates/head.html" ]; then
            echo "    <!-- Theme Head Elements -->" >> "$INDEX_FILE"
            cat "$THEME_TARGET_DIR/templates/head.html" >> "$INDEX_FILE"
        fi

        # Add the built CSS and JS from the backup
        grep '<script\|<link.*stylesheet' "$INDEX_FILE.backup" >> "$INDEX_FILE"

        cat >> "$INDEX_FILE" << 'HEADEND'
</head>
<body>
HEADEND

        # Skip header injection - React components handle header rendering
        # Header templates are available for theme configuration but not injected into HTML
        if false && [ -f "$THEME_TARGET_DIR/templates/header.html" ]; then
            echo "    <!-- Theme Header -->" >> "$INDEX_FILE"

            # Process template variables before adding to HTML
            TEMP_HEADER="/tmp/processed_header.html"
            cp "$THEME_TARGET_DIR/templates/header.html" "$TEMP_HEADER"

            # Replace handlebars variables with actual theme values using the theme config
            node -e "
                const fs = require('fs');

                try {
                    const themeConfig = JSON.parse(fs.readFileSync('$THEME_TARGET_DIR/theme-config.json', 'utf8'));
                    let headerHtml = fs.readFileSync('$TEMP_HEADER', 'utf8');

                    // Helper function to get nested values
                    function getValue(obj, path) {
                        return path.split('.').reduce((curr, key) => curr && curr[key], obj) || '';
                    }

                    // Remove unsupported handlebars blocks and complex expressions
                    headerHtml = headerHtml.replace(/\\{\\{#each[^}]*\\}\\}[\\s\\S]*?\\{\\{\\/each\\}\\}/g, '');
                    headerHtml = headerHtml.replace(/\\{\\{#if[^}]*\\}\\}[\\s\\S]*?\\{\\{\\/if\\}\\}/g, '');
                    headerHtml = headerHtml.replace(/\\{\\{#unless[^}]*\\}\\}[\\s\\S]*?\\{\\{\\/unless\\}\\}/g, '');
                    headerHtml = headerHtml.replace(/\\{\\{else\\}\\}/g, '');
                    headerHtml = headerHtml.replace(/\\{\\{slot:[^}]+\\}\\}/g, '');

                    // Add default values for common variables
                    const defaults = {
                        'variables.app_name': 'PUENTE Catastral',
                        'variables.organization': 'Gobierno del Estado',
                        'variables.support_phone': '01-800-123-4567',
                        'user.authenticated': false,
                        'user.name': '',
                        'user.email': ''
                    };

                    // Merge defaults with theme config
                    Object.keys(defaults).forEach(key => {
                        if (!getValue(themeConfig, key)) {
                            const keys = key.split('.');
                            let obj = themeConfig;
                            for (let i = 0; i < keys.length - 1; i++) {
                                if (!obj[keys[i]]) obj[keys[i]] = {};
                                obj = obj[keys[i]];
                            }
                            obj[keys[keys.length - 1]] = defaults[key];
                        }
                    });

                    // Replace simple handlebars variables with actual values
                    headerHtml = headerHtml.replace(/\\{\\{([^}#/]+)\\}\\}/g, (match, path) => {
                        const cleanPath = path.trim();

                        // Skip helper functions
                        if (cleanPath.includes(' ')) return '';

                        const value = getValue(themeConfig, cleanPath);
                        return value || '';
                    });

                    fs.writeFileSync('$TEMP_HEADER', headerHtml);
                } catch (error) {
                    console.error('Error processing header template:', error.message);
                }
            "

            cat "$TEMP_HEADER" >> "$INDEX_FILE"
            rm -f "$TEMP_HEADER"
        fi

        # Add the root div
        echo '    <div id="root"></div>' >> "$INDEX_FILE"

        # Footer is rendered by the React Footer component, no HTML injection needed

        # Close body and html
        cat >> "$INDEX_FILE" << 'HTMLEND'
</body>
</html>
HTMLEND

        echo "✅ Theme elements injected successfully into index.html"

        # Update theme config to mark templates as processed
        node -e "
            const fs = require('fs');
            try {
                const config = JSON.parse(fs.readFileSync('$THEME_TARGET_DIR/theme-config.json', 'utf8'));
                if (!config.templates) config.templates = {};
                config.templates.enabled = true;
                config.templates.injected = true;
                fs.writeFileSync('$THEME_TARGET_DIR/theme-config.json', JSON.stringify(config, null, 2));
            } catch (error) {
                console.error('Error updating template config:', error.message);
            }
        "
    else
        echo "❌ index.html not found at $INDEX_FILE"
    fi
else
    echo "ℹ️  No templates directory found"
fi

# Copy HTML/CSS component overrides
COMPONENT_DST_DIR="$THEME_TARGET_DIR/components"
mkdir -p "$COMPONENT_DST_DIR"
COMPONENT_COUNT=0
for f in "$THEME_SOURCE_DIR"/*.html "$THEME_SOURCE_DIR"/*.css; do
    if [ -f "$f" ]; then
        cp "$f" "$COMPONENT_DST_DIR/"
        COMPONENT_COUNT=$((COMPONENT_COUNT + 1))
    fi
done
if [ "$COMPONENT_COUNT" -gt 0 ]; then
    echo "🧩 Copied $COMPONENT_COUNT HTML/CSS component override(s)"
else
    echo "ℹ️  No HTML/CSS component overrides found"
fi

# Copy assets if they exist
if [ -d "$THEME_SOURCE_DIR/assets" ]; then
    echo "🖼️  Copying theme assets..."
    mkdir -p "$THEME_TARGET_DIR/assets"
    cp -r "$THEME_SOURCE_DIR/assets"/. "$THEME_TARGET_DIR/assets/"
    echo "✅ Assets copied successfully"
else
    echo "ℹ️  No assets directory found"
fi

echo "🎨 Theme loading completed for $TENANT_ID"