import { Route, Routes } from "react-router-dom"

import { RequireAuth } from "@/components/RequireAuth"
import { Layout } from "@/components/layout/Layout"
import AccountPage from "@/pages/AccountPage"
import CampaignDetailPage from "@/pages/CampaignDetailPage"
import CampaignsPage from "@/pages/CampaignsPage"
import CreateCampaignPage from "@/pages/CreateCampaignPage"
import HomePage from "@/pages/HomePage"
import LoginPage from "@/pages/LoginPage"
import RegisterPage from "@/pages/RegisterPage"

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/campagnes" element={<CampaignsPage />} />
        <Route
          path="/campagnes/nouvelle"
          element={
            <RequireAuth>
              <CreateCampaignPage />
            </RequireAuth>
          }
        />
        <Route path="/campagnes/:slug" element={<CampaignDetailPage />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/inscription" element={<RegisterPage />} />
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
  )
}

export default App
