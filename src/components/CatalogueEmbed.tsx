import React, { useState, useEffect } from 'react';
import { SimpleCatalogueDisplay } from './SimpleCatalogueDisplay';

interface CatalogueEmbedProps {
  userId: string;
  micrositeId?: string;
  calendlyUrl?: string;
  theme?: 'light' | 'dark';
  primaryColor?: string;
  showCategories?: boolean;
  maxItems?: number;
  featuredOnly?: boolean;
}

/**
 * Embeddable catalogue component for client microsites
 * Usage example:
 * <CatalogueEmbed 
 *   userId="client789" 
 *   micrositeId="micro123"
 *   calendlyUrl="https://calendly.com/user/consultation"
 *   theme="light"
 *   primaryColor="#3B82F6"
 *   maxItems={6}
 * />
 */
export const CatalogueEmbed: React.FC<CatalogueEmbedProps> = ({
  userId,
  micrositeId,
  calendlyUrl,
  theme = 'light',
  primaryColor = '#3B82F6',
  showCategories = true,
  maxItems,
  featuredOnly = false
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Apply theme and custom styling
    const embedContainer = document.getElementById(`catalogue-embed-${userId}`);
    if (embedContainer) {
      embedContainer.style.setProperty('--primary-color', primaryColor);
      embedContainer.className = `catalogue-embed ${theme}`;
    }
    setIsLoaded(true);
  }, [userId, theme, primaryColor]);

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div 
      id={`catalogue-embed-${userId}`}
      className="catalogue-embed-container w-full"
      style={{
        '--primary-color': primaryColor
      } as React.CSSProperties}
    >
      <SimpleCatalogueDisplay
        userId={userId}
        micrositeId={micrositeId}
        calendlyUrl={calendlyUrl}
        showQuoteForm={true}
        className="embedded-catalogue"
        maxItems={maxItems}
        featuredOnly={featuredOnly}
      />
      
      <style>{`
        .catalogue-embed-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .catalogue-embed.light {
          background: #ffffff;
          color: #1f2937;
        }
        .catalogue-embed.dark {
          background: #1f2937;
          color: #f9fafb;
        }
        .embedded-catalogue button {
          background-color: var(--primary-color);
          border-color: var(--primary-color);
        }
        .embedded-catalogue button:hover {
          background-color: var(--primary-color);
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};