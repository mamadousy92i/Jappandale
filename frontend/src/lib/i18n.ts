import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import helpFr from "@/locales/fr/help.json"
import helpWo from "@/locales/wo/help.json"
import helpIt from "@/locales/it/help.json"
import helpEs from "@/locales/es/help.json"
import commonFr from "@/locales/fr/common.json"
import commonWo from "@/locales/wo/common.json"
import commonIt from "@/locales/it/common.json"
import commonEs from "@/locales/es/common.json"
import campaignsFr from "@/locales/fr/campaigns.json"
import campaignsWo from "@/locales/wo/campaigns.json"
import campaignsIt from "@/locales/it/campaigns.json"
import campaignsEs from "@/locales/es/campaigns.json"
import aboutFr from "@/locales/fr/about.json"
import aboutWo from "@/locales/wo/about.json"
import aboutIt from "@/locales/it/about.json"
import aboutEs from "@/locales/es/about.json"
import contactFr from "@/locales/fr/contact.json"
import contactWo from "@/locales/wo/contact.json"
import contactIt from "@/locales/it/contact.json"
import contactEs from "@/locales/es/contact.json"
import campaignDetailFr from "@/locales/fr/campaignDetail.json"
import campaignDetailWo from "@/locales/wo/campaignDetail.json"
import campaignDetailIt from "@/locales/it/campaignDetail.json"
import campaignDetailEs from "@/locales/es/campaignDetail.json"
import authFr from "@/locales/fr/auth.json"
import authWo from "@/locales/wo/auth.json"
import authIt from "@/locales/it/auth.json"
import authEs from "@/locales/es/auth.json"
import accountFr from "@/locales/fr/account.json"
import accountWo from "@/locales/wo/account.json"
import accountIt from "@/locales/it/account.json"
import accountEs from "@/locales/es/account.json"
import activityFr from "@/locales/fr/activity.json"
import activityWo from "@/locales/wo/activity.json"
import activityIt from "@/locales/it/activity.json"
import activityEs from "@/locales/es/activity.json"
import createCampaignFr from "@/locales/fr/createCampaign.json"
import createCampaignWo from "@/locales/wo/createCampaign.json"
import createCampaignIt from "@/locales/it/createCampaign.json"
import createCampaignEs from "@/locales/es/createCampaign.json"
import reportCampaignFr from "@/locales/fr/reportCampaign.json"
import reportCampaignWo from "@/locales/wo/reportCampaign.json"
import reportCampaignIt from "@/locales/it/reportCampaign.json"
import reportCampaignEs from "@/locales/es/reportCampaign.json"
import passportVerificationFr from "@/locales/fr/passportVerification.json"
import passportVerificationWo from "@/locales/wo/passportVerification.json"
import passportVerificationIt from "@/locales/it/passportVerification.json"
import passportVerificationEs from "@/locales/es/passportVerification.json"

export const SUPPORTED_LANGUAGES = ["fr", "wo", "it", "es"] as const
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
      it: { help: helpIt, common: commonIt, campaigns: campaignsIt, about: aboutIt, contact: contactIt, campaignDetail: campaignDetailIt, auth: authIt, account: accountIt, activity: activityIt, createCampaign: createCampaignIt, reportCampaign: reportCampaignIt, passportVerification: passportVerificationIt },
      es: { help: helpEs, common: commonEs, campaigns: campaignsEs, about: aboutEs, contact: contactEs, campaignDetail: campaignDetailEs, auth: authEs, account: accountEs, activity: activityEs, createCampaign: createCampaignEs, reportCampaign: reportCampaignEs, passportVerification: passportVerificationEs },
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
