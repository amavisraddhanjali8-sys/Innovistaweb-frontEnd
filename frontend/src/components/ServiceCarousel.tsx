import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiEdit3 } from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import {
  DEFAULT_HOME_SERVICES_CMS,
  normalizeHomeServicesCms,
  type HomeServicesCmsPayload,
} from "../../../shared/homeServicesHelpers";
import ServiceComponent from "./ServiceComponent";
import MainHeading from "./MainHeading.tsx";

function ServiceCarousel() {
  const { user } = useAuth();
  const [cms, setCms] = useState<HomeServicesCmsPayload>(
    DEFAULT_HOME_SERVICES_CMS
  );

  useEffect(() => {
    let active = true;
    AxiosConfig.get<{ data?: Partial<HomeServicesCmsPayload> }>(
      "/api/home-services"
    )
      .then((res) => {
        if (!active || !res.data?.data) return;
        setCms(normalizeHomeServicesCms(res.data.data));
      })
      .catch(() => {
        // Keep built-in defaults
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleItems = cms.items.filter((item) => item.active !== false);
  const renderedItems = visibleItems.length > 0 ? visibleItems : cms.items;

  return (
    <section aria-label="What We Build For You" className="relative">
      <MainHeading heading={cms.heading} description={cms.subheading} />
      {user?.role === "admin" && (
        <div className="max-w-[1640px] mx-auto px-6 md:px-[70px] flex justify-end mb-2">
          <Link
            to="/admin-home?tab=services"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 hover:border-[#22577A] px-3 py-1.5 text-xs font-semibold text-[#22577A] no-underline shadow-xs transition-colors"
          >
            <FiEdit3 className="text-xs" />
            <span>Edit Services in Admin</span>
          </Link>
        </div>
      )}
      <ServiceComponent items={renderedItems} duration={cms.durationMs} />
    </section>
  );
}

export default ServiceCarousel;
