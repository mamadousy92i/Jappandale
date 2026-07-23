import { Navigate, Route, Routes } from "react-router-dom";

import { RequireAuth } from "@/components/RequireAuth";
import { RequireAdmin } from "@/components/RequireAdmin";
import { RequireVerifiedEmail } from "@/components/RequireVerifiedEmail";
import { Layout } from "@/components/layout/Layout";
import AccountPage from "@/pages/AccountPage";
import AboutPage from "@/pages/AboutPage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import CampaignDetailPage from "@/pages/CampaignDetailPage";
import CampaignsPage from "@/pages/CampaignsPage";
import CreateCampaignPage from "@/pages/CreateCampaignPage";
import CreateCampaignUpdatePage from "@/pages/CreateCampaignUpdatePage";
import ManageRewardsPage from "@/pages/ManageRewardsPage";
import ContributionPage from "@/pages/ContributionPage";
import ContactPage from "@/pages/ContactPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import HomePage from "@/pages/HomePage";
import { LegalNoticePage, PrivacyPage, TermsPage } from "@/pages/LegalPages";
import LoginPage from "@/pages/LoginPage";
import NotificationsPage from "@/pages/NotificationsPage";
import RegisterPage from "@/pages/RegisterPage";
import ReportCampaignPage from "@/pages/ReportCampaignPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import TrustPage from "@/pages/TrustPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/campagnes" element={<CampaignsPage />} />
        <Route path="/a-propos" element={<AboutPage />} />
        <Route
          path="/campagnes/nouvelle"
          element={
            <RequireAuth>
              <RequireVerifiedEmail>
                <CreateCampaignPage />
              </RequireVerifiedEmail>
            </RequireAuth>
          }
        />
        <Route
          path="/campagnes/:slug/modifier"
          element={
            <RequireAuth>
              <RequireVerifiedEmail>
                <CreateCampaignPage />
              </RequireVerifiedEmail>
            </RequireAuth>
          }
        />
        <Route path="/campagnes/:slug" element={<CampaignDetailPage />} />
        <Route
          path="/comment-ca-marche"
          element={<Navigate to="/#comment-ca-marche" replace />}
        />
        <Route path="/confiance" element={<TrustPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/mentions-legales" element={<LegalNoticePage />} />
        <Route path="/confidentialite" element={<PrivacyPage />} />
        <Route path="/conditions" element={<TermsPage />} />
        <Route
          path="/campagnes/:slug/actualites/nouvelle"
          element={
            <RequireAuth>
              <CreateCampaignUpdatePage />
            </RequireAuth>
          }
        />
        <Route
          path="/campagnes/:slug/contreparties"
          element={
            <RequireAuth>
              <RequireVerifiedEmail>
                <ManageRewardsPage />
              </RequireVerifiedEmail>
            </RequireAuth>
          }
        />
        <Route
          path="/campagnes/:slug/signaler"
          element={
            <RequireAuth>
              <RequireVerifiedEmail>
                <ReportCampaignPage />
              </RequireVerifiedEmail>
            </RequireAuth>
          }
        />
        <Route
          path="/campagnes/:slug/contribuer"
          element={
            <RequireAuth>
              <RequireVerifiedEmail>
                <ContributionPage />
              </RequireVerifiedEmail>
            </RequireAuth>
          }
        />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/mot-de-passe/oublie" element={<ForgotPasswordPage />} />
        <Route
          path="/mot-de-passe/reinitialiser/:uid/:token"
          element={<ResetPasswordPage />}
        />
        <Route path="/inscription" element={<RegisterPage />} />
        <Route
          path="/notifications"
          element={
            <RequireAuth>
              <NotificationsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/verifier-email"
          element={
            <RequireAuth>
              <VerifyEmailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/administration"
          element={
            <RequireAdmin>
              <AdminDashboardPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/compte"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
