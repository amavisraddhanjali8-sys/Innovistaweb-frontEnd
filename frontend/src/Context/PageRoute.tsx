import { Suspense, lazy, type ReactNode } from "react";
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { App as AntdApp, ConfigProvider, Spin } from "antd";
import { MotionConfig, motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ScrollToTop from "../components/ScrollToTop";
import FloatingChatbotWidget from "../components/FloatingChatbotWidget";
import InnovistaLoader, { InnovistaSpinIndicator } from "../components/InnovistaLoader";
import Home from "../pages/Home";
import { AuthProvider, useAuth } from "./AuthContext";
import { SiteSettingsProvider } from "./SiteSettingsContext";
import { SiteVisitSlotProvider } from "./SiteVisitSlotContext";
import BookingToastContainer from "../components/BookingToastContainer";
import { isAdminPortalPath } from "../utils/adminPortalHelpers";

Spin.setDefaultIndicator(<InnovistaSpinIndicator />);

const Products = lazy(() => import("../pages/Products"));
const Blogs = lazy(() => import("../pages/Blogs"));
const Projects = lazy(() => import("../pages/Projects"));
const About = lazy(() => import("../pages/About"));
const News = lazy(() => import("../pages/News"));
const Resources = lazy(() => import("../pages/Resources"));
const Contact = lazy(() => import("../pages/Contact"));
const AdminLogin = lazy(() => import("../pages/Adminpages/AdminLogin"));
const AdminHome = lazy(() => import("../pages/Adminpages/AdminHome"));
const DesignAdded = lazy(() => import("../pages/DesignAdded"));
const ViewAllDesigns = lazy(() => import("../pages/ViewAllDesigns"));
const CustomerManager = lazy(() => import("../pages/CustomerManager"));
const CustomerVerify = lazy(() => import("../pages/CustomerVerify"));
const OrdermanageAdmin = lazy(() => import("../pages/Adminpages/OrdermanageAdmin"));
const AdminFeedback = lazy(() => import("../pages/Adminpages/AdminFeedback"));
const Notification = lazy(() => import("../pages/Adminpages/Notification"));
const ProductDetails = lazy(() => import("../pages/ProductDetails"));
const AddProjects = lazy(() => import("../pages/Adminpages/AddProjects"));
const CategoryLanding = lazy(() => import("../pages/CategoryLanding"));
const ProductCategoriesAdmin = lazy(() => import("../pages/Adminpages/ProductCategoriesAdmin"));
const PageAdsAdmin = lazy(() => import("../pages/Adminpages/PageAdsAdmin"));
const PortalsAdmin = lazy(() => import("../pages/Adminpages/PortalsAdmin"));
const OrderCart = lazy(() => import("../pages/OrderCart"));
const Milestones = lazy(() => import("../pages/Milestones"));
const RequestQuotePage = lazy(() => import("../pages/RequestQuotePage"));
const EditVisionMission = lazy(() => import("../pages/Adminpages/EditVisionMission"));
const BlogsAdmin = lazy(() => import("../pages/Adminpages/BlogsAdmin"));
const ProfileLogin = lazy(() => import("../pages/ProfileLogin"));
const UserProfile = lazy(() => import("../pages/UserProfile"));
const NotFound = lazy(() => import("../pages/NotFound"));
const ChatbotAdmin = lazy(() => import("../pages/Adminpages/ChatbotAdmin"));
const AdminSecurityAudit = lazy(() => import("../pages/Adminpages/AdminSecurityAudit"));

function RouteFallback() {
  return (
    <div
      className="flex-1 flex items-center justify-center min-h-[45vh] w-full"
      aria-busy="true"
      aria-label="Loading page"
    >
      <InnovistaLoader size="lg" />
    </div>
  );
}

function RequireAdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user || user.role !== "admin") {
    return <Navigate to="/admin-login" replace />;
  }
  return <>{children}</>;
}

function RequireAuthRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/profile-login" replace />;
  }
  return <>{children}</>;
}

function MainContent() {
  const location = useLocation();
  const isAuthPage =
    location.pathname === "/profile-login" ||
    location.pathname === "/admin-login";
  const isAdminPortal = isAdminPortalPath(location.pathname);

  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", width: "100%", overflowX: "clip" }}>
      {!isAdminPortal && <Navbar />}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", minWidth: 0 }}>
        <MotionConfig reducedMotion="user">
          <motion.div
            key={location.pathname}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", minWidth: 0 }}
          >
            <Suspense fallback={<RouteFallback />}>
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/category/:slug" element={<CategoryLanding />} />
                <Route path="/products/:designId" element={<ProductDetails />} />
                <Route path="/product/:designId" element={<ProductDetails />} />
                <Route path="/blogs" element={<Blogs />} />
                <Route path="/news" element={<News />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/profile-login" element={<ProfileLogin />} />
                <Route path="/profile" element={<RequireAuthRoute><UserProfile /></RequireAuthRoute>} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/admin-home" element={<RequireAdminRoute><AdminHome /></RequireAdminRoute>} />
                <Route path="/admin-register" element={<RequireAdminRoute><AdminHome defaultMode="register" /></RequireAdminRoute>} />
                <Route path="/ManageAllAdmins" element={<RequireAdminRoute><AdminHome defaultMode="team" /></RequireAdminRoute>} />
                <Route path="/DesignAdded" element={<RequireAdminRoute><DesignAdded /></RequireAdminRoute>} />
                <Route path="/ViewAllDesigns" element={<RequireAdminRoute><ViewAllDesigns /></RequireAdminRoute>} />
                <Route path="/ProductCategoriesAdmin" element={<RequireAdminRoute><ProductCategoriesAdmin /></RequireAdminRoute>} />
                <Route path="/PageAdsAdmin" element={<RequireAdminRoute><PageAdsAdmin /></RequireAdminRoute>} />
                <Route path="/PortalsAdmin" element={<RequireAdminRoute><PortalsAdmin /></RequireAdminRoute>} />
                <Route path="/CustomerManager" element={<RequireAdminRoute><CustomerManager /></RequireAdminRoute>} />
                <Route path="/CustomerVerify" element={<CustomerVerify />} />
                <Route path="/OrdermanageAdmin" element={<RequireAdminRoute><OrdermanageAdmin /></RequireAdminRoute>} />
                <Route path="/AdminFeedback" element={<RequireAdminRoute><AdminFeedback /></RequireAdminRoute>} />
                <Route path="/Notification" element={<RequireAdminRoute><Notification /></RequireAdminRoute>} />
                <Route path="/product-details" element={<ProductDetails />} />
                <Route path="/AddProjects" element={<RequireAdminRoute><AddProjects /></RequireAdminRoute>} />
                <Route path="/DesignViwe" element={<CategoryLanding />} />
                <Route path="/OrderCart" element={<OrderCart />} />
                <Route path="/milestones" element={<Milestones />} />
                <Route path="/request-quote" element={<RequestQuotePage />} />
                <Route path="/EditVisionMission" element={<RequireAdminRoute><EditVisionMission /></RequireAdminRoute>} />
                <Route path="/BlogsAdmin" element={<RequireAdminRoute><BlogsAdmin /></RequireAdminRoute>} />
                <Route path="/ChatbotAdmin" element={<RequireAdminRoute><ChatbotAdmin /></RequireAdminRoute>} />
                <Route path="/AdminSecurity" element={<RequireAdminRoute><AdminSecurityAudit /></RequireAdminRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </motion.div>
        </MotionConfig>
      </main>
      {!isAuthPage && !isAdminPortal && <Footer />}
      {!isAuthPage && !isAdminPortal && <FloatingChatbotWidget />}
      <BookingToastContainer />
    </div>
  );
}

function PageRoute() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#22577A",
          colorLink: "#3393B8",
          borderRadius: 10,
          fontFamily: "'Inter', system-ui, sans-serif",
        },
      }}
    >
      <AntdApp>
        <AuthProvider>
          <SiteSettingsProvider>
            <SiteVisitSlotProvider>
              <Router>
                <ScrollToTop />
                <MainContent />
              </Router>
            </SiteVisitSlotProvider>
          </SiteSettingsProvider>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

export default PageRoute;
