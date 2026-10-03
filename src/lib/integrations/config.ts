// Integration platform configurations
export const INTEGRATION_CONFIGS = {
    FACEBOOK_MARKETPLACE: {
        name: 'Facebook Marketplace',
        baseUrl: 'https://graph.facebook.com/v18.0',
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        webhookPath: '/api/integrations/facebook/webhook',
        scopes: ['pages_manage_metadata', 'pages_show_list', 'pages_messaging'],
    },
    WHATSAPP_BUSINESS: {
        name: 'WhatsApp Business API',
        baseUrl: 'https://graph.facebook.com/v18.0',
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        webhookPath: '/api/integrations/whatsapp/webhook',
        scopes: ['whatsapp_business_management', 'whatsapp_business_messaging'],
    },
    IKMAN_LK: {
        name: 'Ikman.lk',
        baseUrl: 'https://api.ikman.lk/v1',
        authUrl: null, // API key based
        webhookPath: '/api/integrations/ikman/webhook',
        scopes: [],
    },
    ARAMEX: {
        name: 'Aramex',
        baseUrl: 'https://api.aramex.com',
        authUrl: null, // Username/password based
        webhookPath: '/api/integrations/aramex/webhook',
        scopes: [],
    },
    DHL: {
        name: 'DHL',
        baseUrl: 'https://api.dhl.com',
        authUrl: null, // API key based
        webhookPath: '/api/integrations/dhl/webhook',
        scopes: [],
    },
    DOMEX: {
        name: 'Domex (Sri Lanka)',
        baseUrl: 'https://api.domex.lk',
        authUrl: null, // API key based
        webhookPath: '/api/integrations/domex/webhook',
        scopes: [],
    },
} as const;
