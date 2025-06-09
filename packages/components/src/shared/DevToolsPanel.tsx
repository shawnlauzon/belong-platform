import React, { useState } from 'react';
import { useBelongStore } from '@belongnetwork/core';
import { ChevronDown, ChevronRight, Database, Eye, EyeOff } from 'lucide-react';

interface DevToolsPanelProps {
  className?: string;
}

export function DevToolsPanel({ className = '' }: DevToolsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'state' | 'actions'>('state');
  const store = useBelongStore();

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  const handleFetchResources = () => {
    // Emit the event to fetch resources
    store.setResourcesLoading(true);
    // This would normally be triggered by a component, but we can manually trigger it for testing
    import('@belongnetwork/resource-services').then(({ fetchResources }) => {
      fetchResources();
    });
  };

  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'number') return value.toString();
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (typeof value === 'object') return `Object(${Object.keys(value).length} keys)`;
    return String(value);
  };

  const renderStateSection = (title: string, data: any) => {
    const [expanded, setExpanded] = useState(false);

    return (
      <div className="border border-gray-200 rounded-lg mb-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-3 py-2 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
        >
          <span className="font-medium text-sm">{title}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {typeof data === 'object' && data !== null ? Object.keys(data).length : 1} items
            </span>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </button>
        {expanded && (
          <div className="p-3 bg-white rounded-b-lg">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-40">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
          title="Open DevTools Panel"
        >
          <Database size={20} />
        </button>
      ) : (
        <div className="bg-white border border-gray-300 rounded-lg shadow-xl w-96 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Belong Store DevTools</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
              title="Close DevTools Panel"
            >
              <EyeOff size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('state')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'state'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              State
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'actions'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Actions
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-auto max-h-80">
            {activeTab === 'state' && (
              <div className="space-y-2">
                {renderStateSection('Auth', store.auth)}
                {renderStateSection('Resources', store.resources)}
                {renderStateSection('Communities', store.communities)}
                {renderStateSection('Users', store.users)}
                {renderStateSection('Thanks', store.thanks)}
                {renderStateSection('App', store.app)}
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600 mb-3">
                  Test store actions and events:
                </div>
                
                <button
                  onClick={handleFetchResources}
                  className="w-full px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded border border-blue-300 transition-colors"
                >
                  Fetch Resources
                </button>

                <button
                  onClick={() => store.setViewMode(store.app.viewMode === 'member' ? 'organizer' : 'member')}
                  className="w-full px-3 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-800 rounded border border-green-300 transition-colors"
                >
                  Toggle View Mode ({store.app.viewMode})
                </button>

                <div className="mt-4 p-3 bg-gray-50 rounded border">
                  <div className="text-xs text-gray-600 mb-2">Quick Stats:</div>
                  <div className="text-xs space-y-1">
                    <div>Resources: {store.resources.list.length}</div>
                    <div>Loading: {store.resources.isLoading ? 'Yes' : 'No'}</div>
                    <div>Error: {store.resources.error || 'None'}</div>
                    <div>Authenticated: {store.auth.isAuthenticated ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-xs text-gray-500">
            💡 Install Redux DevTools extension for advanced debugging
          </div>
        </div>
      )}
    </div>
  );
}