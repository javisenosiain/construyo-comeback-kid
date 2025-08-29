import React from 'react';
import { SimpleCatalogueDisplay } from '@/components/SimpleCatalogueDisplay';

export const Catalogue = () => {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Service Catalogue Management</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Manage your services and products with CRM integration, pricing models, and client microsite integration.
        </p>
      </div>

      <SimpleCatalogueDisplay userId="demo-user" className="max-w-6xl mx-auto" />
    </div>
  );
};