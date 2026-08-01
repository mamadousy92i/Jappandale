import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowUpRight,
  FolderOpen,
  Gift,
  Newspaper,
  Pencil,
  Plus,
  RefreshCw,
  Send,
} from "lucide-react";

import { ProgressBar } from "@/components/campaigns/CampaignCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatFcfa } from "@/lib/format";
import type { CampaignListItem, CampaignStatus } from "@/lib/types";

const statusBadgeClasses: Record<CampaignStatus, string> = {
  BROUILLON: "bg-black/[0.06] text-ink-secondary",
  EN_MODERATION: "bg-gold/15 text-gold-dark",
  PUBLIEE: "bg-emerald-100 text-emerald-700",
  REJETEE: "bg-red-100 text-red-700",
  SUSPENDUE: "bg-red-100 text-red-700",
  CLOTUREE: "bg-ink/85 text-surface",
};

function StatusBadge({ status }: { status: CampaignStatus }) {
  const { t } = useTranslation("account");
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${statusBadgeClasses[status]}`}
    >
      {t(`myCampaigns.status.${status}`)}
    </span>
  );
}

function CampaignRow({
  campaign,
  onReload,
}: {
  campaign: CampaignListItem;
  onReload: () => void;
}) {
  const { t } = useTranslation("account");
  const { authFetch } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  const canEdit = ["BROUILLON", "REJETEE", "SUSPENDUE"].includes(
    campaign.status,
  );
  const canSubmit = canEdit;
  const decisionReason =
    campaign.status === "REJETEE"
      ? campaign.moderation_note
      : campaign.status === "SUSPENDUE"
        ? campaign.suspension_note
        : "";

  const handleSubmit = async () => {
    setError(false);
    setSubmitting(true);
    try {
      await authFetch(`/campaigns/${campaign.slug}/submit/`, {
        method: "POST",
      });
      onReload();
    } catch {
      setError(true);
      setSubmitting(false);
    }
  };

  return (
    <li className="rounded-2xl border border-black/5 bg-surface-alt p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Vignette */}
        <div className="aspect-[16/10] w-full shrink-0 overflow-hidden rounded-xl bg-black/[0.06] sm:aspect-square sm:size-20">
          {campaign.cover_image ? (
            <img
              src={campaign.cover_image}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-gold/20 to-surface-alt">
              <FolderOpen
                aria-hidden="true"
                className="size-6 text-gold-dark/70"
              />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h3 className="font-heading text-base font-bold break-words text-ink">
              {campaign.title}
            </h3>
            <StatusBadge status={campaign.status} />
          </div>

          <div className="mt-3">
            <ProgressBar percent={campaign.progress_percent} />
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
              <span>
                <span className="font-bold text-ink">
                  {formatFcfa(campaign.collected_amount)}
                </span>{" "}
                <span className="text-xs text-ink-muted">
                  {t("myCampaigns.goalOf", { amount: formatFcfa(campaign.goal_amount) })}
                </span>
              </span>
              <span className="font-semibold text-gold-dark">
                {campaign.progress_percent}%
              </span>
            </div>
          </div>

          {decisionReason && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
                {campaign.status === "REJETEE"
                  ? t("myCampaigns.rejectionReason")
                  : t("myCampaigns.suspensionReason")}
              </p>
              <p className="mt-1.5 leading-relaxed">{decisionReason}</p>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {t("myCampaigns.submitError")}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {canEdit && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full border-black/10 font-medium text-ink transition-all hover:border-gold hover:bg-gold/10 hover:text-gold-dark"
              >
                <Link to={`/campagnes/${campaign.slug}/modifier`}>
                  <Pencil aria-hidden="true" className="size-3.5" />
                  {t("myCampaigns.edit")}
                </Link>
              </Button>
            )}
            {canEdit && campaign.campaign_type === "DON_CONTREPARTIE" && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full border-black/10 font-medium text-ink transition-all hover:border-gold hover:bg-gold/10 hover:text-gold-dark"
              >
                <Link to={`/campagnes/${campaign.slug}/contreparties`}>
                  <Gift aria-hidden="true" className="size-3.5" />
                  {t("myCampaigns.rewards")}
                </Link>
              </Button>
            )}
            {campaign.status === "PUBLIEE" && (
              <>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full border-black/10 font-medium text-ink transition-all hover:border-gold hover:bg-gold/10 hover:text-gold-dark"
                >
                  <Link to={`/campagnes/${campaign.slug}`}>
                    {t("myCampaigns.viewPage")}
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full border-black/10 font-medium text-ink transition-all hover:border-gold hover:bg-gold/10 hover:text-gold-dark"
                >
                  <Link to={`/campagnes/${campaign.slug}/actualites/nouvelle`}>
                    <Newspaper aria-hidden="true" className="size-3.5" />
                    {t("myCampaigns.publishUpdate")}
                  </Link>
                </Button>
              </>
            )}
            {canSubmit && (
              <Button
                size="sm"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                className="rounded-full bg-gold font-semibold text-ink shadow-sm shadow-gold/25 transition-all hover:bg-gold-light"
              >
                <Send aria-hidden="true" className="size-3.5" />
                {submitting
                  ? t("myCampaigns.submitting")
                  : campaign.status === "BROUILLON"
                    ? t("myCampaigns.submitDraft")
                    : t("myCampaigns.resubmit")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export function MyCampaigns() {
  const { t } = useTranslation("account");
  const { authFetch } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    authFetch("/campaigns/mine/")
      .then((data) => {
        setCampaigns(data as CampaignListItem[]);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="rounded-[20px] border border-black/5 bg-surface p-8 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.08)] sm:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-ink">
            {t("myCampaigns.title")}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {t("myCampaigns.subtitle")}
          </p>
        </div>
        <Button
          asChild
          className="h-11 shrink-0 rounded-full bg-gold px-6 font-semibold text-ink shadow-md shadow-gold/25 transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30"
        >
          <Link to="/campagnes/nouvelle">
            <Plus aria-hidden="true" className="size-4" />
            {t("myCampaigns.create")}
          </Link>
        </Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: 2 }, (_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-2xl bg-black/[0.05]"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-black/5 bg-surface-alt p-6">
            <p className="text-sm leading-relaxed text-ink-secondary">
              {t("myCampaigns.loadError")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              className="rounded-full border-black/10 font-medium text-ink transition-all hover:border-gold hover:bg-gold/10 hover:text-gold-dark"
            >
              <RefreshCw aria-hidden="true" className="size-3.5" />
              {t("myCampaigns.retry")}
            </Button>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-black/10 bg-surface-alt px-6 py-12 text-center">
            <span
              aria-hidden="true"
              className="flex size-12 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark"
            >
              <FolderOpen className="size-6" />
            </span>
            <p className="mt-4 font-heading text-lg font-bold text-ink">
              {t("myCampaigns.empty.title")}
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-secondary">
              {t("myCampaigns.empty.text")}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {campaigns.map((campaign) => (
              <CampaignRow
                key={campaign.id}
                campaign={campaign}
                onReload={load}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
