import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { FiCalendar, FiCheckCircle, FiX } from "react-icons/fi";
import { useSiteVisitSlots } from "../Context/SiteVisitSlotContext";
import {
  BOOKING_TOAST_DURATION_MS,
  type BookingToastItem,
} from "../utils/siteVisitLocalStoreHelpers";

function SubtleBookingToastCard({
  toast,
  onDismiss,
}: {
  toast: BookingToastItem;
  onDismiss: (id: string) => void;
}) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => {
      onDismiss(toast.id);
    }, BOOKING_TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [paused, toast.id, onDismiss]);

  return (
    <motion.div
      layout
      role="status"
      aria-live="polite"
      data-testid="booking-confirmation-toast"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-auto relative overflow-hidden rounded-xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_14px_34px_-12px_rgba(15,23,42,0.22)] pl-3.5 pr-3 py-3 flex items-start gap-3"
    >
      {/* Subtle left emerald bar */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-emerald-500"
      />

      <div className="mt-0.5 text-emerald-600 shrink-0">
        <FiCheckCircle className="w-4 h-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-[#14171A] m-0 leading-tight">
            {toast.title}
          </p>
          <span className="text-[10px] font-semibold text-[#22577A] tabular-nums shrink-0">
            #{toast.bookingId}
          </span>
        </div>
        <p className="text-[11.5px] font-medium text-[#3B4451] m-0 mt-1 flex items-center gap-1.5 tabular-nums">
          <FiCalendar className="w-3 h-3 text-[#22577A] shrink-0" />
          <span className="truncate">{toast.description}</span>
        </p>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss confirmation notification"
        data-testid="booking-toast-dismiss"
        className="p-1 -mr-1 -mt-0.5 rounded-lg bg-transparent border-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors shrink-0"
      >
        <FiX className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export default function BookingToastContainer() {
  const { state, dismissToast } = useSiteVisitSlots();

  if (state.toasts.length === 0) return null;

  return (
    <MotionConfig reducedMotion="user">
      <div
        aria-label="Booking notifications"
        className="fixed top-20 right-4 sm:right-6 z-[1400] flex flex-col gap-2.5 w-[min(360px,calc(100vw-2rem))] pointer-events-none"
      >
        <AnimatePresence mode="popLayout">
          {state.toasts.map((toast) => (
            <SubtleBookingToastCard
              key={toast.id}
              toast={toast}
              onDismiss={dismissToast}
            />
          ))}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
