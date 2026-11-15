/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import AxiosConfig from "./AxiosConfig";
import {
  DEFAULT_SITE_CONTACT_SETTINGS,
  normalizeSiteContactSettings,
  type SiteContactSettings,
} from "../../../shared/footerConsultationHelpers";

interface SiteSettingsContextValue {
  contactSettings: SiteContactSettings;
  loading: boolean;
  refreshContactSettings: () => Promise<void>;
  updateContactSettings: (
    next: Partial<SiteContactSettings>
  ) => Promise<SiteContactSettings>;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  contactSettings: DEFAULT_SITE_CONTACT_SETTINGS,
  loading: false,
  refreshContactSettings: async () => {},
  updateContactSettings: async (next) =>
    normalizeSiteContactSettings(next, DEFAULT_SITE_CONTACT_SETTINGS),
});

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [contactSettings, setContactSettings] = useState<SiteContactSettings>(
    DEFAULT_SITE_CONTACT_SETTINGS
  );
  const [loading, setLoading] = useState(false);

  const refreshContactSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await AxiosConfig.get<{ data?: Partial<SiteContactSettings> }>(
        "/api/site-settings"
      );
      if (res.data?.data) {
        setContactSettings(
          normalizeSiteContactSettings(res.data.data, DEFAULT_SITE_CONTACT_SETTINGS)
        );
      }
    } catch {
      // Keep default settings cleanly if offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshContactSettings();
  }, [refreshContactSettings]);

  const updateContactSettings = useCallback(
    async (next: Partial<SiteContactSettings>) => {
      const merged = normalizeSiteContactSettings(next, contactSettings);
      const res = await AxiosConfig.put<{ data?: Partial<SiteContactSettings> }>(
        "/api/site-settings",
        merged
      );
      const saved = normalizeSiteContactSettings(
        res.data?.data || merged,
        DEFAULT_SITE_CONTACT_SETTINGS
      );
      setContactSettings(saved);
      return saved;
    },
    [contactSettings]
  );

  return (
    <SiteSettingsContext.Provider
      value={{
        contactSettings,
        loading,
        refreshContactSettings,
        updateContactSettings,
      }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
