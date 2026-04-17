import { createContext, useContext, useEffect, useState } from 'react';
import { databases, storage } from '../lib/appwrite';
import { Query } from 'appwrite';

const BrandingContext = createContext();

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider = ({ children }) => {
    const [branding, setBranding] = useState({
        platformName: 'Punto Tecnowork',
        tagline: 'Impresiones rápidas y fáciles',
        logoMain: '',
        logoLight: '',
        logoDark: '',
        colors: {
            primary: '#EB1C24',
            secondary: '#0093D8',
            accent: '#FFC905'
        }
    });
    const [loading, setLoading] = useState(true);

    const fetchBranding = async () => {
        try {
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const res = await databases.listDocuments(dbId, 'system_config', [
                Query.equal('type', 'branding')
            ]);
            
            if (res.documents.length > 0) {
                const configData = JSON.parse(res.documents[0].data);
                setBranding(prev => ({
                    ...prev,
                    ...configData,
                    colors: {
                        ...prev.colors,
                        ...(configData.colors || {})
                    }
                }));
            }
        } catch (error) {
            console.error("Error fetching branding:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranding();
    }, []);

    // Aplicar colores dinámicos al root
    useEffect(() => {
        if (branding.colors) {
            const root = document.documentElement;
            Object.entries(branding.colors).forEach(([key, value]) => {
                if (value) {
                    root.style.setProperty(`--color-brand-${key}`, value);
                }
            });
        }
    }, [branding.colors]);

    const getLogoUrl = (fileId) => {

        if (!fileId) return null;
        try {
            const bucketId = import.meta.env.VITE_STORAGE_BUCKET_ID || 'branding';
            return storage.getFilePreview(bucketId, fileId);
        } catch (error) {
            console.error("Error getting logo preview:", error);
            return null;
        }
    };

    const value = {
        ...branding,
        getLogoUrl,
        loading,
        refreshBranding: fetchBranding
    };

    return (
        <BrandingContext.Provider value={value}>
            {children}
        </BrandingContext.Provider>
    );
};
