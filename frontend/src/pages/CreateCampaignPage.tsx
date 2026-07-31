import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ImagePlus,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { CampaignCategory, CampaignDetail, CampaignType } from "@/lib/types";

const campaignTypeValues: CampaignType[] = [
  "DON_LIBRE",
  "DON_CONTREPARTIE",
  "INVESTISSEMENT_PARTICIPATIF",
];

const categoryCodes: CampaignCategory[] = [
  "ARTISANAT",
  "COMMERCE",
  "AGRICULTURE",
  "EDUCATION",
  "SANTE",
  "TECHNOLOGIE",
  "CULTURE",
  "AUTRE",
];

const fieldNames = [
  "title",
  "summary",
  "description",
  "campaign_type",
  "expected_return_rate",
  "location",
  "beneficiaries",
  "funding_plan",
  "project_timeline",
  "category",
  "goal_amount",
  "deadline",
  "cover_image",
];

type FundingItem = { label: string; amount: string };
type TimelineItem = { step: string; period: string };

/** Date de demain au format YYYY-MM-DD (minimum autorisé pour l'échéance). */
function tomorrowIso(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMessage(value: unknown): string {
  if (Array.isArray(value)) return value.join(" ");
  return String(value);
}

function parseFundingPlan(value: string): FundingItem[] {
  const items = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...amountParts] = line.split("—");
      return {
        label: label.trim(),
        amount: amountParts.join("—").replace(/[^0-9]/g, ""),
      };
    });
  return items.length ? items : [{ label: "", amount: "" }];
}

function parseTimeline(value: string): TimelineItem[] {
  const items = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [step, ...periodParts] = line.split("—");
      return { step: step.trim(), period: periodParts.join("—").trim() };
    });
  return items.length ? items : [{ step: "", period: "" }];
}

/** Écran affiché quand l'utilisateur n'a pas le droit de créer une campagne. */
function AccessNotice({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards mx-auto mt-10 flex w-full max-w-lg flex-col items-center rounded-[20px] border border-black/5 bg-surface px-8 py-14 text-center shadow-[0_10px_40px_-12px_rgba(0,0,0,0.08)] delay-150 duration-700 motion-reduce:animate-none">
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark"
      >
        <ShieldCheck className="size-6" />
      </span>
      <p className="mt-5 font-heading text-xl font-bold text-ink">{title}</p>
      <div className="mt-3 text-sm leading-relaxed text-ink-secondary">
        {children}
      </div>
    </div>
  );
}

function CreateCampaignForm({ campaign }: { campaign?: CampaignDetail }) {
  const { t } = useTranslation("createCampaign");
  const { t: tCampaigns } = useTranslation("campaigns");
  const campaignTypeOptions = campaignTypeValues.map((value) => ({
    value,
    title: t(`types.${value}.title`),
    description: t(`types.${value}.description`),
  }));
  const categories = categoryCodes.map((code) => ({
    code,
    label: tCampaigns(`categories.${code}`),
  }));
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState(campaign?.title ?? "");
  const [summary, setSummary] = useState(campaign?.summary ?? "");
  const [description, setDescription] = useState(campaign?.description ?? "");
  const [campaignType, setCampaignType] = useState<CampaignType>(
    campaign?.campaign_type ?? "DON_LIBRE",
  );
  const [expectedReturnRate, setExpectedReturnRate] = useState(
    campaign?.expected_return_rate != null ? String(campaign.expected_return_rate) : "",
  );
  const [location, setLocation] = useState(campaign?.location ?? "");
  const [beneficiaries, setBeneficiaries] = useState(
    campaign?.beneficiaries ?? "",
  );
  const [fundingItems, setFundingItems] = useState<FundingItem[]>([
    ...(campaign
      ? parseFundingPlan(campaign.funding_plan)
      : [{ label: "", amount: "" }]),
  ]);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([
    ...(campaign
      ? parseTimeline(campaign.project_timeline)
      : [{ step: "", period: "" }]),
  ]);
  const [category, setCategory] = useState<CampaignCategory>(
    campaign?.category ?? "ARTISANAT",
  );
  const [goalAmount, setGoalAmount] = useState(
    campaign ? String(campaign.goal_amount) : "",
  );
  const [deadline, setDeadline] = useState(campaign?.deadline ?? "");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    campaign?.cover_image ?? null,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const minDeadline = tomorrowIso();

  const updateFundingItem = (
    index: number,
    field: keyof FundingItem,
    value: string,
  ) => {
    setFundingItems((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const updateTimelineItem = (
    index: number,
    field: keyof TimelineItem,
    value: string,
  ) => {
    setTimelineItems((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleCoverChange = (file: File | null) => {
    setCoverImage(file);
    setCoverPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setGlobalError(null);
    setSubmitting(true);

    const data = new FormData();
    data.append("title", title);
    data.append("summary", summary);
    data.append("description", description);
    data.append("campaign_type", campaignType);
    if (campaignType === "INVESTISSEMENT_PARTICIPATIF") {
      data.append("expected_return_rate", expectedReturnRate);
    }
    data.append("location", location);
    data.append("beneficiaries", beneficiaries);
    data.append(
      "funding_plan",
      fundingItems
        .map((item) => `${item.label.trim()} — ${item.amount.trim()} F CFA`)
        .join("\n"),
    );
    data.append(
      "project_timeline",
      timelineItems
        .map((item) => `${item.step.trim()} — ${item.period.trim()}`)
        .join("\n"),
    );
    data.append("category", category);
    data.append("goal_amount", goalAmount);
    data.append("deadline", deadline);
    if (coverImage) data.append("cover_image", coverImage);

    try {
      await authFetch(
        campaign ? `/campaigns/${campaign.slug}/` : "/campaigns/",
        { method: campaign ? "PATCH" : "POST", body: data },
      );
      navigate("/campagnes?vue=mes-campagnes");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setGlobalError(
          err.details?.detail
            ? toMessage(err.details.detail)
            : t("form.errors.forbidden"),
        );
      } else if (err instanceof ApiError && err.status === 400 && err.details) {
        const nextErrors: Record<string, string> = {};
        for (const [key, value] of Object.entries(err.details)) {
          if (fieldNames.includes(key)) nextErrors[key] = toMessage(value);
        }
        if (Object.keys(nextErrors).length > 0) {
          setFieldErrors(nextErrors);
        } else {
          setGlobalError(t("form.errors.invalid"));
        }
      } else {
        setGlobalError(t("form.errors.generic"));
      }
      setSubmitting(false);
    }
  };

  const errorFor = (name: string) =>
    fieldErrors[name] ? (
      <p id={`${name}-error`} role="alert" className="text-sm text-red-600">
        {fieldErrors[name]}
      </p>
    ) : null;

  const invalidProps = (name: string) =>
    fieldErrors[name]
      ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` }
      : {};

  return (
    <form
      data-testid="create-campaign-form"
      onSubmit={handleSubmit}
      noValidate
      className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards mt-10 w-full rounded-[28px] border border-black/5 bg-surface p-4 shadow-[0_18px_60px_-16px_rgba(0,0,0,0.12)] delay-150 duration-700 motion-reduce:animate-none sm:p-12 lg:p-14"
    >
      {globalError && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {globalError}
        </p>
      )}

      <div className="space-y-7">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-ink">
            {t("form.title")}
          </Label>
          <Input
            id="title"
            required
            placeholder={t("form.titlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-14 rounded-xl px-5 text-base"
            {...invalidProps("title")}
          />
          {errorFor("title")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="summary" className="text-ink">
            {t("form.summary")}{" "}
            <span className="font-normal text-ink-muted">
              {t("form.summaryHint")}
            </span>
          </Label>
          <Input
            id="summary"
            required
            placeholder={t("form.summaryPlaceholder")}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="h-14 rounded-xl px-5 text-base"
            {...invalidProps("summary")}
          />
          {errorFor("summary")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-ink">
            {t("form.description")}
          </Label>
          <textarea
            id="description"
            required
            rows={8}
            placeholder={t("form.descriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-surface px-5 py-4 text-base leading-relaxed text-ink outline-none placeholder:text-ink-muted focus-visible:border-gold-dark focus-visible:ring-2 focus-visible:ring-gold-dark/30"
            {...invalidProps("description")}
          />
          {errorFor("description")}
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-ink">
            {t("form.typeLegend")}
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {campaignTypeOptions.map((option) => (
              <label
                key={option.value}
                className="cursor-pointer rounded-2xl border border-black/10 bg-surface p-4 transition-all duration-200 hover:border-gold/50 has-checked:border-gold has-checked:bg-gold/8 has-focus-visible:ring-2 has-focus-visible:ring-gold-dark/50 motion-reduce:transition-none"
              >
                <input
                  type="radio"
                  name="campaign_type"
                  value={option.value}
                  checked={campaignType === option.value}
                  onChange={() => setCampaignType(option.value)}
                  className="sr-only"
                />
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">
                    {option.title}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      campaignType === option.value
                        ? "border-gold-dark bg-gold-dark"
                        : "border-black/20 bg-surface"
                    }`}
                  >
                    {campaignType === option.value && (
                      <span className="size-1.5 rounded-full bg-surface" />
                    )}
                  </span>
                </span>
                <span className="mt-1.5 block text-xs leading-relaxed text-ink-secondary">
                  {option.description}
                </span>
              </label>
            ))}
          </div>
          {errorFor("campaign_type")}
          {campaignType === "INVESTISSEMENT_PARTICIPATIF" && (
            <div className="mt-4 space-y-2">
              <Label htmlFor="expected_return_rate" className="text-ink">
                {t("form.returnRateLabel")}{" "}
                <span className="font-normal text-ink-muted">{t("form.returnRateUnit")}</span>
              </Label>
              <Input
                id="expected_return_rate"
                type="number"
                inputMode="decimal"
                min={0.01}
                step={0.01}
                required
                placeholder="8"
                value={expectedReturnRate}
                onChange={(e) => setExpectedReturnRate(e.target.value)}
                className="h-14 max-w-xs rounded-xl px-5 text-base"
                {...invalidProps("expected_return_rate")}
              />
              {errorFor("expected_return_rate")}
            </div>
          )}
          {campaign && campaign.campaign_type === "DON_CONTREPARTIE" && (
            <p className="mt-3 text-sm text-ink-secondary">
              <Link
                to={`/campagnes/${campaign.slug}/contreparties`}
                className="font-semibold text-gold-dark underline-offset-4 hover:underline"
              >
                {t("form.manageRewardsPrefix")}
              </Link>{" "}
              {t("form.manageRewardsSuffix")}
            </p>
          )}
        </fieldset>

        <div className="grid gap-7 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="location" className="text-ink">
              {t("form.location")}
            </Label>
            <Input
              id="location"
              required
              placeholder={t("form.locationPlaceholder")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-14 rounded-xl px-5 text-base"
              {...invalidProps("location")}
            />
            {errorFor("location")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="beneficiaries" className="text-ink">
              {t("form.beneficiaries")}
            </Label>
            <Input
              id="beneficiaries"
              required
              placeholder={t("form.beneficiariesPlaceholder")}
              value={beneficiaries}
              onChange={(e) => setBeneficiaries(e.target.value)}
              className="h-14 rounded-xl px-5 text-base"
              {...invalidProps("beneficiaries")}
            />
            {errorFor("beneficiaries")}
          </div>
        </div>

        <fieldset className="space-y-4">
          <div>
            <legend className="text-sm font-medium text-ink">
              {t("form.fundingLegend")}
            </legend>
            <p className="mt-1 text-sm text-ink-muted">
              {t("form.fundingHint")}
            </p>
          </div>
          <div className="space-y-3">
            {fundingItems.map((item, index) => (
              <div
                key={`funding-${index}`}
                className="grid gap-3 rounded-2xl border border-black/8 bg-surface-alt/60 p-4 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-end"
              >
                <div className="space-y-2">
                  <Label htmlFor={`funding-label-${index}`}>
                    {t("form.expenseLabel", { number: index + 1 })}
                  </Label>
                  <Input
                    id={`funding-label-${index}`}
                    required
                    value={item.label}
                    onChange={(event) =>
                      updateFundingItem(index, "label", event.target.value)
                    }
                    placeholder={t("form.expensePlaceholder")}
                    className="h-14 rounded-xl px-5 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`funding-amount-${index}`}>
                    {t("form.amountLabel")}
                  </Label>
                  <Input
                    id={`funding-amount-${index}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    required
                    value={item.amount}
                    onChange={(event) =>
                      updateFundingItem(index, "amount", event.target.value)
                    }
                    placeholder={t("form.amountPlaceholder")}
                    className="h-14 rounded-xl px-5 text-base"
                  />
                </div>
                <button
                  type="button"
                  disabled={fundingItems.length === 1}
                  onClick={() =>
                    setFundingItems((items) =>
                      items.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  className="flex h-12 w-full items-center justify-center rounded-xl border border-black/10 text-ink-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30 sm:size-14"
                  aria-label={t("form.removeExpense", { number: index + 1 })}
                >
                  <Trash2 aria-hidden="true" className="size-5" />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFundingItems((items) => [...items, { label: "", amount: "" }])
            }
            className="h-12 rounded-full border-gold/60 px-6 text-ink hover:bg-gold/10"
          >
            <Plus aria-hidden="true" className="size-4" />
            {t("form.addExpense")}
          </Button>
          {errorFor("funding_plan")}
        </fieldset>

        <fieldset className="space-y-4">
          <div>
            <legend className="text-sm font-medium text-ink">
              {t("form.timelineLegend")}
            </legend>
            <p className="mt-1 text-sm text-ink-muted">
              {t("form.timelineHint")}
            </p>
          </div>
          <div className="space-y-3">
            {timelineItems.map((item, index) => (
              <div
                key={`timeline-${index}`}
                className="grid gap-3 rounded-2xl border border-black/8 bg-surface-alt/60 p-4 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-end"
              >
                <div className="space-y-2">
                  <Label htmlFor={`timeline-step-${index}`}>
                    {t("form.stepLabel", { number: index + 1 })}
                  </Label>
                  <Input
                    id={`timeline-step-${index}`}
                    required
                    value={item.step}
                    onChange={(event) =>
                      updateTimelineItem(index, "step", event.target.value)
                    }
                    placeholder={t("form.stepPlaceholder")}
                    className="h-14 rounded-xl px-5 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`timeline-period-${index}`}>{t("form.periodLabel")}</Label>
                  <Input
                    id={`timeline-period-${index}`}
                    required
                    value={item.period}
                    onChange={(event) =>
                      updateTimelineItem(index, "period", event.target.value)
                    }
                    placeholder={t("form.periodPlaceholder")}
                    className="h-14 rounded-xl px-5 text-base"
                  />
                </div>
                <button
                  type="button"
                  disabled={timelineItems.length === 1}
                  onClick={() =>
                    setTimelineItems((items) =>
                      items.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  className="flex h-12 w-full items-center justify-center rounded-xl border border-black/10 text-ink-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30 sm:size-14"
                  aria-label={t("form.removeStep", { number: index + 1 })}
                >
                  <Trash2 aria-hidden="true" className="size-5" />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setTimelineItems((items) => [...items, { step: "", period: "" }])
            }
            className="h-12 rounded-full border-gold/60 px-6 text-ink hover:bg-gold/10"
          >
            <Plus aria-hidden="true" className="size-4" />
            {t("form.addStep")}
          </Button>
          {errorFor("project_timeline")}
        </fieldset>

        <div className="grid gap-7 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="category" className="text-ink">
              {t("form.category")}
            </Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as CampaignCategory)}
              className="h-14 w-full rounded-xl border border-black/10 bg-surface px-5 text-base text-ink outline-none focus-visible:border-gold-dark focus-visible:ring-2 focus-visible:ring-gold-dark/30"
              {...invalidProps("category")}
            >
              {categories.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
            {errorFor("category")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal_amount" className="text-ink">
              {t("form.goalAmount")}{" "}
              <span className="font-normal text-ink-muted">{t("form.goalAmountUnit")}</span>
            </Label>
            <Input
              id="goal_amount"
              type="number"
              inputMode="numeric"
              min={1000}
              step={1}
              required
              placeholder={t("form.goalAmountPlaceholder")}
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              className="h-14 rounded-xl px-5 text-base"
              {...invalidProps("goal_amount")}
            />
            {errorFor("goal_amount")}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deadline" className="text-ink">
            {t("form.deadline")}
          </Label>
          <Input
            id="deadline"
            type="date"
            required
            min={minDeadline}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="h-14 rounded-xl px-5 text-base"
            {...invalidProps("deadline")}
          />
          {errorFor("deadline")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cover_image" className="text-ink">
            {t("form.coverImage")}{" "}
            <span className="font-normal text-ink-muted">{t("form.optional")}</span>
          </Label>
          <input
            id="cover_image"
            type="file"
            accept="image/*"
            onChange={(e) => handleCoverChange(e.target.files?.[0] ?? null)}
            className="block min-h-14 w-full rounded-xl border border-black/10 bg-surface text-base text-ink-secondary file:mr-4 file:min-h-14 file:cursor-pointer file:border-0 file:bg-gold/15 file:px-5 file:py-3.5 file:font-medium file:text-gold-dark hover:file:bg-gold/25"
            {...invalidProps("cover_image")}
          />
          {errorFor("cover_image")}
          {coverPreview ? (
            <div className="relative mt-3 overflow-hidden rounded-2xl border border-black/5">
              <img
                src={coverPreview}
                alt={t("form.coverAlt")}
                className="aspect-[16/9] w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleCoverChange(null)}
                aria-label={t("form.removeCover")}
                className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur transition-colors outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-gold-dark/50"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-xs text-ink-muted">
              <ImagePlus aria-hidden="true" className="size-4" />
              {t("form.coverHint")}
            </p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="mt-10 h-14 w-full rounded-full bg-gold text-base font-semibold text-ink shadow-md shadow-gold/25 transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30 sm:w-auto sm:px-12"
      >
        <Sparkles aria-hidden="true" className="size-4" />
        {submitting
          ? campaign
            ? t("form.saving")
            : t("form.creating")
          : campaign
            ? t("form.saveSubmit")
            : t("form.createSubmit")}
      </Button>
      <p className="mt-4 text-xs leading-relaxed text-ink-muted">
        {campaign ? t("form.editNote") : t("form.createNote")}
      </p>
    </form>
  );
}

function CreateCampaignPage() {
  const { t } = useTranslation("createCampaign");
  const { slug } = useParams<{ slug: string }>();
  const { user, authFetch } = useAuth();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(Boolean(slug));
  const [campaignError, setCampaignError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    authFetch(`/campaigns/${slug}/`)
      .then((data) => {
        if (!cancelled) setCampaign(data as CampaignDetail);
      })
      .catch(() => {
        if (!cancelled) setCampaignError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingCampaign(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authFetch, slug]);

  // La route est protégée par RequireAuth : user est garanti non nul ici.
  if (!user) return null;

  let content: ReactNode;
  if (loadingCampaign) {
    content = (
      <div className="mt-10 h-96 animate-pulse rounded-[28px] bg-black/[0.05]" />
    );
  } else if (campaignError) {
    content = (
      <AccessNotice title={t("access.campaignUnavailableTitle")}>
        <p>{t("access.campaignUnavailableText")}</p>
      </AccessNotice>
    );
  } else if (user.role !== "PORTEUR") {
    content = (
      <AccessNotice title={t("access.ownerOnlyTitle")}>
        <p>
          {t("access.ownerOnlyText")}
        </p>
      </AccessNotice>
    );
  } else if (user.kyc_status !== "VALIDE") {
    content = (
      <AccessNotice title={t("access.kycTitle")}>
        <p>
          {t("access.kycText")}
        </p>
        <Button
          asChild
          className="mt-6 h-11 rounded-full bg-gold px-7 font-semibold text-ink shadow-md shadow-gold/25 transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30"
        >
          <Link to="/compte?onglet=kyc">{t("access.kycCta")}</Link>
        </Button>
      </AccessNotice>
    );
  } else if (
    campaign &&
    !["BROUILLON", "REJETEE", "SUSPENDUE"].includes(campaign.status)
  ) {
    content = (
      <AccessNotice title={t("access.lockedTitle")}>
        <p>
          {t("access.lockedText")}
        </p>
      </AccessNotice>
    );
  } else {
    content = <CreateCampaignForm campaign={campaign ?? undefined} />;
  }

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(250,197,2,0.14),transparent)]"
      />

      <div className="relative mx-auto flex max-w-5xl flex-col px-5 pt-16 pb-24 sm:px-8 sm:pt-24 sm:pb-32">
        <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards flex flex-col items-center text-center duration-700 motion-reduce:animate-none">
          <span className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">
            {campaign ? t("page.eyebrowEdit") : t("page.eyebrowNew")}
          </span>
          <h1 className="mt-4 font-heading text-3xl font-bold text-ink sm:text-4xl">
            {campaign ? t("page.titleEdit") : t("page.titleNew")}
          </h1>
          <div
            aria-hidden="true"
            className="mt-6 h-[3px] w-16 rounded-full bg-gradient-to-r from-gold to-gold-dark"
          />
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-secondary">
            {campaign ? t("page.introEdit") : t("page.introNew")}
          </p>
        </div>

        {content}
      </div>
    </section>
  );
}

export default CreateCampaignPage;
