/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { formatIsoDateLocal, type SiteVisitBooking } from "../../../shared/siteVisitSchedulerHelpers";
import {
  createInitialSiteVisitLocalState,
  parseReservedSlotsFromStorage,
  serializeReservedSlots,
  siteVisitLocalReducer,
  SITE_VISIT_STORAGE_KEY,
  type SiteVisitLocalState,
} from "../utils/siteVisitLocalStoreHelpers";

interface SiteVisitSlotContextValue {
  state: SiteVisitLocalState;
  setWidgetSelection: (widgetId: string, date: string, slotTime: string) => void;
  clearWidgetSelection: (widgetId: string) => void;
  reserveSlotAndNotify: (
    booking: Pick<
      SiteVisitBooking,
      "id" | "date" | "slotTime" | "slotLabel" | "locationName" | "visitorName"
    >,
    options?: { showToast?: boolean }
  ) => void;
  releaseSlot: (date: string, slotTime: string) => void;
  dismissToast: (toastId: string) => void;
}

const DEFAULT_CONTEXT: SiteVisitSlotContextValue = {
  state: createInitialSiteVisitLocalState(),
  setWidgetSelection: () => {},
  clearWidgetSelection: () => {},
  reserveSlotAndNotify: () => {},
  releaseSlot: () => {},
  dismissToast: () => {},
};

const SiteVisitSlotContext = createContext<SiteVisitSlotContextValue>(DEFAULT_CONTEXT);

function loadInitialState(): SiteVisitLocalState {
  if (typeof window === "undefined") {
    return createInitialSiteVisitLocalState();
  }
  try {
    const todayIso = formatIsoDateLocal(new Date());
    const raw = window.localStorage.getItem(SITE_VISIT_STORAGE_KEY);
    const hydrated = parseReservedSlotsFromStorage(raw, todayIso);
    return createInitialSiteVisitLocalState(hydrated);
  } catch {
    return createInitialSiteVisitLocalState();
  }
}

export function SiteVisitSlotProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(siteVisitLocalReducer, undefined, loadInitialState);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const todayIso = formatIsoDateLocal(new Date());
      window.localStorage.setItem(
        SITE_VISIT_STORAGE_KEY,
        serializeReservedSlots(state.reservedByKey, todayIso)
      );
    } catch {
      // Ignore storage quota or private browsing errors cleanly
    }
  }, [state.reservedByKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SITE_VISIT_STORAGE_KEY) return;
      const todayIso = formatIsoDateLocal(new Date());
      const hydrated = parseReservedSlotsFromStorage(e.newValue, todayIso);
      dispatch({ type: "HYDRATE_RESERVED", reservedByKey: hydrated });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setWidgetSelection = useCallback(
    (widgetId: string, date: string, slotTime: string) => {
      dispatch({ type: "SET_WIDGET_SELECTION", widgetId, date, slotTime });
    },
    []
  );

  const clearWidgetSelection = useCallback((widgetId: string) => {
    dispatch({ type: "CLEAR_WIDGET_SELECTION", widgetId });
  }, []);

  const reserveSlotAndNotify = useCallback(
    (
      booking: Pick<
        SiteVisitBooking,
        "id" | "date" | "slotTime" | "slotLabel" | "locationName" | "visitorName"
      >,
      options?: { showToast?: boolean }
    ) => {
      dispatch({
        type: "RESERVE_SLOT",
        booking,
        showToast: options?.showToast ?? true,
      });
    },
    []
  );

  const releaseSlot = useCallback((date: string, slotTime: string) => {
    dispatch({ type: "RELEASE_SLOT", date, slotTime });
  }, []);

  const dismissToast = useCallback((toastId: string) => {
    dispatch({ type: "DISMISS_TOAST", toastId });
  }, []);

  const value = useMemo<SiteVisitSlotContextValue>(
    () => ({
      state,
      setWidgetSelection,
      clearWidgetSelection,
      reserveSlotAndNotify,
      releaseSlot,
      dismissToast,
    }),
    [
      state,
      setWidgetSelection,
      clearWidgetSelection,
      reserveSlotAndNotify,
      releaseSlot,
      dismissToast,
    ]
  );

  return (
    <SiteVisitSlotContext.Provider value={value}>
      {children}
    </SiteVisitSlotContext.Provider>
  );
}

export function useSiteVisitSlots(): SiteVisitSlotContextValue {
  return useContext(SiteVisitSlotContext);
}
