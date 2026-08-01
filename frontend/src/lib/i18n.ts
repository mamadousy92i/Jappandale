import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import helpFr from "@/locales/fr/help.json"
import helpWo from "@/locales/wo/help.json"
import commonFr from "@/locales/fr/common.json"
import commonWo from "@/locales/wo/common.json"
import campaignsFr from "@/locales/fr/campaigns.json"
import campaignsWo from "@/locales/wo/campaigns.json"
import aboutFr from "@/locales/fr/about.json"
import aboutWo from "@/locales/wo/about.json"
import contactFr from "@/locales/fr/contact.json"
import contactWo from "@/locales/wo/contact.json"
import campaignDetailFr from "@/locales/fr/campaignDetail.json"
import campaignDetailWo from "@/locales/wo/campaignDetail.json"
import authFr from "@/locales/fr/auth.json"
import authWo from "@/locales/wo/auth.json"
import accountFr from "@/locales/fr/account.json"
import accountWo from "@/locales/wo/account.json"
import activityFr from "@/locales/fr/activity.json"
import activityWo from "@/locales/wo/activity.json"
import createCampaignFr from "@/locales/fr/createCampaign.json"
import createCampaignWo from "@/locales/wo/createCampaign.json"
import reportCampaignFr from "@/locales/fr/reportCampaign.json"
import reportCampaignWo from "@/locales/wo/reportCampaign.json"
import passportVerificationFr from "@/locales/fr/passportVerification.json"
import passportVerificationWo from "@/locales/wo/passportVerification.json"

export const SUPPORTED_LANGUAGES = ["fr", "wo"] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const STORAGE_KEY = "jappandale-langue"

function storedLanguage(): SupportedLanguage {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage) ? (stored as SupportedLanguage) : "fr"
  } catch {
    return "fr"
  }
}

void i18n
  .use(initReactI18next)
  .init({
    lng: storedLanguage(),
    fallbackLng: "fr",
    ns: ["help", "common", "campaigns", "about", "contact", "campaignDetail", "auth", "account", "activity", "createCampaign", "reportCampaign", "passportVerification"],
    defaultNS: "help",
    resources: {
      fr: { help: helpFr, common: commonFr, campaigns: campaignsFr, about: aboutFr, contact: contactFr, campaignDetail: campaignDetailFr, auth: authFr, account: accountFr, activity: activityFr, createCampaign: createCampaignFr, reportCampaign: reportCampaignFr, passportVerification: passportVerificationFr },
      wo: { help: helpWo, common: commonWo, campaigns: campaignsWo, about: aboutWo, contact: contactWo, campaignDetail: campaignDetailWo, auth: authWo, account: accountWo, activity: activityWo, createCampaign: createCampaignWo, reportCampaign: reportCampaignWo, passportVerification: passportVerificationWo },
    },
    interpolation: { escapeValue: false },
  })

i18n.on("languageChanged", (lng) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    // Le stockage local peut être bloqué (navigation privée, politique du navigateur).
  }
})

export default i18n
