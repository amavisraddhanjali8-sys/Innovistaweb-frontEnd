import { HashRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { MotionConfig, motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Home from "../pages/Home";
import Products from "../pages/Products";
import Blogs from "../pages/Blogs";
import Projects from "../pages/Projects";
import About from "../pages/About";
import News from "../pages/News";
import Resources from "../pages/Resources";
import Contact from "../pages/Contact";
import Footer from "../components/Footer";
import AdminLogin from "../pages/Adminpages/AdminLogin";
import AdminHome from "../pages/Adminpages/AdminHome";
import AdminRegister from "../pages/AdminRegisterForm";
import ManageAllAdmins from "../pages/Adminpages/ManageAllAdmins";
import DesignAdded from "../pages/DesignAdded";
import ViewAllDesigns from "../pages/ViewAllDesigns";
import CustomerManager from "../pages/CustomerManager";
import CustomerVerify from "../pages/CustomerVerify";
import OrdermanageAdmin from "../pages/Adminpages/OrdermanageAdmin";
import AdminFeedback from "../pages/Adminpages/AdminFeedback";
import Notification from "../pages/Adminpages/Notification";
import ProductDetails from "../pages/ProductDetails";
import TargetCursor from "../components/cursor/TragetCursor";
import AddProjects from "../pages/Adminpages/AddProjects";
import CategoryLanding from "../pages/CategoryLanding";
import ProductCategoriesAdmin from "../pages/Adminpages/ProductCategoriesAdmin";
import PageAdsAdmin from "../pages/Adminpages/PageAdsAdmin";
import PortalsAdmin from "../pages/Adminpages/PortalsAdmin";
import OrderCart from "../pages/OrderCart";
import Milestones from "../pages/Milestones";
import ScrollToTop from "../components/ScrollToTop";
import RequestQuotePage from "../pages/RequestQuotePage";
import EditVisionMission from "../pages/Adminpages/EditVisionMission";
import BlogsAdmin from "../pages/Adminpages/BlogsAdmin";
import ProfileLogin from "../pages/ProfileLogin";
import UserProfile from "../pages/UserProfile";
import NotFound from "../pages/NotFound";
import ChatbotAdmin from "../pages/Adminpages/ChatbotAdmin";
import FloatingChatbotWidget from "../components/FloatingChatbotWidget";
import { AuthProvider } from "./AuthContext";
import { SiteSettingsProvider } from "./SiteSettingsContext";
import { isAdminPortalPath } from "../utils/adminPortalHelpers";

function MainContent() {
  const location = useLocation();
  const isAuthPage =
    location.pathname === "/profile-login" ||
    location.pathname === "/admin-login";
  const isAdminPortal = isAdminPortalPath(location.pathname);

  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", width: "100%", overflowX: "clip" }}>
      {!isAdminPortal && <TargetCursor spinDuration={2} hideDefaultCursor={true} />}
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
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route path="/admin-home" element={<AdminHome />} />
              <Route path="/admin-register" element={<AdminRegister />} />
              <Route path="/ManageAllAdmins" element={<ManageAllAdmins />} />
              <Route path="/DesignAdded" element={<DesignAdded />} />
              <Route path="/ViewAllDesigns" element={<ViewAllDesigns />} />
              <Route path="/ProductCategoriesAdmin" element={<ProductCategoriesAdmin />} />
              <Route path="/PageAdsAdmin" element={<PageAdsAdmin />} />
              <Route path="/PortalsAdmin" element={<PortalsAdmin />} />
              <Route path="/CustomerManager" element={<CustomerManager />} />
              <Route path="/CustomerVerify" element={<CustomerVerify />} />
              <Route path="/OrdermanageAdmin" element={<OrdermanageAdmin />} />
              <Route path="/AdminFeedback" element={<AdminFeedback />} />
              <Route path="/Notification" element={<Notification />} />
              <Route path="/product-details" element={<ProductDetails />} />
              <Route path="/AddProjects" element={<AddProjects />} />
              <Route path="/DesignViwe" element={<CategoryLanding />} />
              <Route path="/OrderCart" element={<OrderCart />} />
              <Route path="/milestones" element={<Milestones />} />
              <Route path="/request-quote" element={<RequestQuotePage />} />
              <Route path="/EditVisionMission" element={<EditVisionMission />} />
              <Route path="/BlogsAdmin" element={<BlogsAdmin />} />
              <Route path="/ChatbotAdmin" element={<ChatbotAdmin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        </MotionConfig>
      </main>
      {!isAuthPage && !isAdminPortal && <Footer />}
      {!isAuthPage && !isAdminPortal && <FloatingChatbotWidget />}
    </div>
  );
}

function PageRoute() {
  return (
    <AuthProvider>
      <SiteSettingsProvider>
        <Router>
          <ScrollToTop />
          <MainContent />
        </Router>
      </SiteSettingsProvider>
    </AuthProvider>
  );
}

export default PageRoute;
