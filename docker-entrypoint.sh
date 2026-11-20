#!/bin/sh

# This script replaces environment variable placeholders in the built React app
# at container startup, allowing runtime configuration

echo "Configuring application with runtime environment variables..."

# Load theme if script exists and plugins are mounted
if [ -f "/app/load-theme.sh" ] && [ -d "/app/plugins" ]; then
    echo "🎨 Loading theme for tenant: ${VITE_TENANT_ID:-${VITE_TENANT}}"
    cd /app && ./load-theme.sh

    # Copy themes to nginx html directory if they exist
    if [ -d "/app/public/themes" ]; then
        echo "📁 Copying themes to nginx html directory..."
        mkdir -p /usr/share/nginx/html/themes
        cp -r /app/public/themes/* /usr/share/nginx/html/themes/
        echo "✅ Themes copied successfully"
    fi
else
    echo "ℹ️  No theme loading - script or plugins not found"
fi

# Function to replace placeholders in all JS files
replace_env_vars() {
    # Find all JS files in the dist directory
    for file in /usr/share/nginx/html/assets/*.js; do
        if [ -f "$file" ]; then
            echo "Processing $file..."

            # Replace placeholders with actual environment variable values
            # Use sed to replace in-place
            sed -i "s|__VITE_API_URL__|${VITE_API_URL}|g" "$file"
            sed -i "s|__VITE_API_BASE_URL__|${VITE_API_BASE_URL}|g" "$file"
            sed -i "s|__VITE_KEYCLOAK_URL__|${VITE_KEYCLOAK_URL}|g" "$file"
            sed -i "s|__VITE_KEYCLOAK_REALM__|${VITE_KEYCLOAK_REALM}|g" "$file"
            sed -i "s|__VITE_KEYCLOAK_CLIENT_ID__|${VITE_KEYCLOAK_CLIENT_ID}|g" "$file"
            sed -i "s|__VITE_TENANT__|${VITE_TENANT}|g" "$file"
            sed -i "s|__VITE_TENANT_ID__|${VITE_TENANT_ID}|g" "$file"
            sed -i "s|__VITE_TENANT_NAME__|${VITE_TENANT_NAME}|g" "$file"
            sed -i "s|__VITE_ORGANIZATION__|${VITE_ORGANIZATION}|g" "$file"
            sed -i "s|__VITE_APP_TITLE__|${VITE_APP_TITLE}|g" "$file"
            sed -i "s|__VITE_LANGUAGE__|${VITE_LANGUAGE}|g" "$file"
            sed -i "s|__VITE_ENABLE_NOTIFICATIONS__|${VITE_ENABLE_NOTIFICATIONS}|g" "$file"
            sed -i "s|__VITE_ENABLE_FILE_UPLOAD__|${VITE_ENABLE_FILE_UPLOAD}|g" "$file"
            sed -i "s|__VITE_MAX_FILE_SIZE__|${VITE_MAX_FILE_SIZE}|g" "$file"
            sed -i "s|__VITE_ALLOWED_FILE_TYPES__|${VITE_ALLOWED_FILE_TYPES}|g" "$file"
            sed -i "s|__VITE_LOGIN_HIDE_PASSWORD_WITH_IDP__|${VITE_LOGIN_HIDE_PASSWORD_WITH_IDP}|g" "$file"
        fi
    done
}

# Replace environment variables
replace_env_vars

# PWA manifest, per tenant: the `pwa` section of the theme when present,
# otherwise the tenant name from the environment. Icons are served from the
# theme assets (/themes/assets/...).
generate_manifest() {
    node -e "
        const fs = require('fs');
        let theme = {};
        try { theme = JSON.parse(fs.readFileSync('/usr/share/nginx/html/themes/theme-config.json', 'utf8')); } catch (e) {}
        const pwa = theme.pwa || {};
        const colors = theme.colors || {};
        const name = pwa.name || process.env.VITE_TENANT_NAME || 'Portal ciudadano';
        const icons = (pwa.icons || [])
            .filter((i) => fs.existsSync('/usr/share/nginx/html/themes/assets/' + i.src))
            .map((i) => ({ src: '/themes/assets/' + i.src, sizes: i.sizes, type: 'image/png', purpose: i.purpose || 'any' }));
        const manifest = {
            name,
            short_name: pwa.short_name || name,
            description: pwa.description || name,
            lang: 'es-MX',
            start_url: '/',
            scope: '/',
            display: 'standalone',
            theme_color: pwa.theme_color || colors.primary_dark || '#611232',
            background_color: pwa.background_color || colors.background_paper || '#ffffff',
            icons,
        };
        fs.writeFileSync('/usr/share/nginx/html/manifest.webmanifest', JSON.stringify(manifest, null, 2));
        console.log('PWA manifest written for ' + name + ' (' + icons.length + ' icons)');
    "
}
generate_manifest

echo "Configuration complete. Starting nginx..."

# Start nginx
exec nginx -g 'daemon off;'