import React from 'react';
import { ProductCatalogueDisplay } from './ProductCatalogueDisplay';

/**
 * Microsite-specific Product Catalogue Component
 * 
 * This component is specifically designed for embedding in client microsites
 * with optimized performance, responsive design, and seamless CRM integration.
 * 
 * Features:
 * - Fast loading with lazy loading and optimized queries
 * - Responsive design that works on all devices
 * - Embedded lead capture forms with Calendly integration
 * - Automatic CRM sync (Construyo + external via Zapier)
 * - Analytics tracking for conversion optimization
 * - SEO-optimized with proper meta tags and structured data
 * 
 * Sample usage for client ID "client789":
 * <MicrositeProductCatalogue 
 *   clientId="client789"
 *   micrositeConfig={{
 *     calendlyUrl: "https://calendly.com/client789/consultation",
 *     zapierWebhook: "https://hooks.zapier.com/hooks/catch/12345/client789",
 *     branding: {
 *       primaryColor: "#3B82F6",
 *       logo: "https://client789.com/logo.png"
 *     }
 *   }}
 * />
 */

interface MicrositeConfig {
  calendlyUrl?: string;
  zapierWebhook?: string;
  branding?: {
    primaryColor?: string;
    logo?: string;
    companyName?: string;
  };
  analytics?: {
    enabled?: boolean;
    gtmId?: string;
  };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

interface MicrositeProductCatalogueProps {
  clientId: string;
  micrositeId?: string;
  micrositeConfig?: MicrositeConfig;
  displayOptions?: {
    showHeader?: boolean;
    maxItems?: number;
    featuredOnly?: boolean;
    enableSearch?: boolean;
    enableFilters?: boolean;
  };
  className?: string;
}

export const MicrositeProductCatalogue: React.FC<MicrositeProductCatalogueProps> = ({
  clientId,
  micrositeId,
  micrositeConfig = {},
  displayOptions = {},
  className = ""
}) => {
  const {
    showHeader = true,
    maxItems = 20,
    featuredOnly = false,
  } = displayOptions;

  // Apply custom branding if provided
  React.useEffect(() => {
    if (micrositeConfig.branding?.primaryColor) {
      document.documentElement.style.setProperty('--primary', micrositeConfig.branding.primaryColor);
    }
  }, [micrositeConfig.branding?.primaryColor]);

  // SEO optimization
  React.useEffect(() => {
    if (micrositeConfig.seo) {
      const { title, description, keywords } = micrositeConfig.seo;
      
      if (title) {
        document.title = title;
      }
      
      if (description) {
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
          metaDescription.setAttribute('content', description);
        }
      }
      
      if (keywords) {
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaKeywords) {
          metaKeywords.setAttribute('content', keywords.join(', '));
        }
      }
    }
  }, [micrositeConfig.seo]);

  return (
    <div className={`microsite-catalogue ${className}`}>
      {/* Microsite Header (if branding provided) */}
      {micrositeConfig.branding && showHeader && (
        <div className="microsite-header text-center py-8 mb-8 border-b">
          {micrositeConfig.branding.logo && (
            <img 
              src={micrositeConfig.branding.logo} 
              alt={micrositeConfig.branding.companyName || 'Company Logo'}
              className="h-16 mx-auto mb-4"
            />
          )}
          {micrositeConfig.branding.companyName && (
            <h1 className="text-3xl font-bold mb-2">
              {micrositeConfig.branding.companyName}
            </h1>
          )}
        </div>
      )}

      {/* Product Catalogue */}
      <ProductCatalogueDisplay
        clientId={clientId}
        micrositeId={micrositeId}
        calendlyUrl={micrositeConfig.calendlyUrl}
        zapierWebhook={micrositeConfig.zapierWebhook}
        showHeader={!micrositeConfig.branding && showHeader}
        maxItems={maxItems}
        featuredOnly={featuredOnly}
        enableAnalytics={micrositeConfig.analytics?.enabled !== false}
        className="microsite-catalogue-content"
      />

      {/* Structured Data for SEO */}
      <script 
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "provider": {
              "@type": "Organization",
              "name": micrositeConfig.branding?.companyName || "Construction Services",
              "logo": micrositeConfig.branding?.logo
            },
            "serviceType": "Construction Services",
            "areaServed": "UK",
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Construction Services Catalogue"
            }
          })
        }}
      />
    </div>
  );
};

/**
 * Sample implementation for client ID "client789":
 * 
 * const Client789MicrositeDemo = () => {
 *   const micrositeConfig = {
 *     calendlyUrl: "https://calendly.com/client789/consultation",
 *     zapierWebhook: "https://hooks.zapier.com/hooks/catch/12345/client789",
 *     branding: {
 *       primaryColor: "#3B82F6",
 *       logo: "https://client789.com/logo.png",
 *       companyName: "Client789 Construction Ltd"
 *     },
 *     analytics: {
 *       enabled: true,
 *       gtmId: "GTM-CLIENT789"
 *     },
 *     seo: {
 *       title: "Client789 Construction Services - Professional Building & Renovation",
 *       description: "Leading construction company offering kitchen renovations, extensions, and building services. Get your free quote today.",
 *       keywords: ["construction", "renovation", "kitchen", "extension", "building"]
 *     }
 *   };
 * 
 *   const displayOptions = {
 *     showHeader: true,
 *     maxItems: 12,
 *     featuredOnly: false,
 *     enableSearch: true,
 *     enableFilters: true
 *   };
 * 
 *   return (
 *     <div className="min-h-screen bg-background">
 *       <MicrositeProductCatalogue 
 *         clientId="client789"
 *         micrositeId="client789-microsite-uuid"
 *         micrositeConfig={micrositeConfig}
 *         displayOptions={displayOptions}
 *         className="container mx-auto px-4 py-8"
 *       />
 *     </div>
 *   );
 * };
 * 
 * export default Client789MicrositeDemo;
 */