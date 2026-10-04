import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

export interface PaymentConfig {
  provider: "PAYTECH" | "SIMULATED";
  dossier_fee_amount: number;
}

let cachedConfig: Promise<PaymentConfig> | null = null;

function loadPaymentConfig(): Promise<PaymentConfig> {
  if (!cachedConfig) {
    cachedConfig = (apiFetch("/payments/config/") as Promise<PaymentConfig>).catch(
      (error) => {
        cachedConfig = null;
        throw error;
      },
    );
  }
  return cachedConfig;
}

/** Prestataire de paiement actif et montant des frais de dossier (null tant que non chargé). */
export function usePaymentConfig(): PaymentConfig | null {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  useEffect(() => {
    let active = true;
    loadPaymentConfig()
      .then((value) => {
        if (active) setConfig(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return config;
}

/** On ne redirige l'utilisateur que vers la page de paiement officielle de PayTech. */
export function isPaytechUrl(url: unknown): url is string {
  return typeof url === "string" && url.startsWith("https://paytech.sn/");
}
