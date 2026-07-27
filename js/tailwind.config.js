window.tailwind = window.tailwind || {};
window.tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            "colors": {
                "on-secondary": "#ffffff",
                "secondary": "#5e5e63",
                "inverse-on-surface": "#f3f0f2",
                "error-container": "#ffdad6",
                "on-tertiary-fixed": "#1a1c1f",
                "surface-container": "#f0edef",
                "on-primary-container": "#fcfbff",
                "on-error-container": "#93000a",
                "on-error": "#ffffff",
                "primary-fixed": "#d7e2ff",
                "outline": "#717785",
                "on-primary-fixed": "#001b3f",
                "surface-variant": "#e4e2e4",
                "on-tertiary": "#ffffff",
                "error": "#ba1a1a",
                "success": "#008A00",
                "success-container": "rgba(0, 138, 0, 0.1)",
                "warning": "#FF9F0A",
                "warning-container": "rgba(255, 159, 10, 0.1)",
                "surface": "#fcf8fb",
                "background": "#fcf8fb",
                "surface-container-high": "#eae7ea",
                "tertiary": "#5a5b60",
                "primary": "#0059b5",
                "tertiary-fixed": "#e2e2e7",
                "secondary-container": "#e0dfe4",
                "on-primary": "#ffffff",
                "surface-container-highest": "#e4e2e4",
                "on-tertiary-container": "#fcfbff",
                "outline-variant": "#c1c6d6",
                "inverse-primary": "#abc7ff",
                "surface-container-lowest": "#ffffff",
                "surface-container-low": "#f6f3f5",
                "on-tertiary-fixed-variant": "#45474b",
                "primary-fixed-dim": "#abc7ff",
                "secondary-fixed": "#e3e2e7",
                "tertiary-container": "#737478",
                "on-secondary-container": "#626267",
                "on-surface": "#1b1b1d",
                "secondary-fixed-dim": "#c7c6cb",
                "inverse-surface": "#303032",
                "tertiary-fixed-dim": "#c6c6cb",
                "on-background": "#1b1b1d",
                "on-surface-variant": "#414753",
                "on-secondary-fixed": "#1a1b1f",
                "on-primary-fixed-variant": "#00458f",
                "on-secondary-fixed-variant": "#46464b",
                "surface-dim": "#dcd9dc",
                "surface-bright": "#fcf8fb",
                "primary-container": "#0071e3",
                "surface-tint": "#005cbb"
            },
            "borderRadius": {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "full": "9999px",
                "card": "24px"
            },
            "spacing": {
                "gutter": "24px",
                "xxl": "48px",
                "xl": "32px",
                "base": "8px",
                "sm": "8px",
                "xs": "4px",
                "md": "16px",
                "xxxl": "64px",
                "lg": "24px",
                "container-padding": "32px"
            },
            "fontFamily": {
                "display": ["Inter", "sans-serif"],
                "caption": ["Inter", "sans-serif"],
                "body": ["Inter", "sans-serif"],
                "page-title": ["Inter", "sans-serif"],
                "body-bold": ["Inter", "sans-serif"],
                "section-title": ["Inter", "sans-serif"],
                "numeric-data": ["Inter", "sans-serif"],
                "card-title": ["Inter", "sans-serif"]
            },
            "fontSize": {
                "display": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "600" }],
                "caption": ["13px", { "lineHeight": "18px", "fontWeight": "500" }],
                "body": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
                "page-title": ["34px", { "lineHeight": "41px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
                "body-bold": ["16px", { "lineHeight": "24px", "fontWeight": "600" }],
                "section-title": ["24px", { "lineHeight": "30px", "fontWeight": "600" }],
                "numeric-data": ["16px", { "lineHeight": "24px", "fontWeight": "700" }],
                "card-title": ["18px", { "lineHeight": "24px", "fontWeight": "600" }]
            },
            "boxShadow": {
                "soft": "0 1px 2px rgba(0,0,0,0.02), 0 8px 16px rgba(0,0,0,0.04)"
            }
        }
    }
};
