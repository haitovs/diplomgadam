import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Check, Copy, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { storeApi } from "../../api/store";
import {
  Badge,
  Button,
  Card,
  ErrorNote,
  Input,
  PageHeader,
  SectionTitle,
  Skeleton,
  Toggle,
} from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import type { TranslationKey } from "../../i18n/translations";

interface DayState {
  isClosed: boolean;
  intervals: { opens: string; closes: string }[];
}

const emptyWeek = (): DayState[] =>
  Array.from({ length: 7 }, () => ({ isClosed: true, intervals: [] }));

export default function StoreHoursPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [week, setWeek] = useState<DayState[]>(emptyWeek);
  const [special, setSpecial] = useState<
    { date: string; isClosed: boolean; opens: string; closes: string }[]
  >([]);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const detail = useQuery({ queryKey: ["store-detail"], queryFn: () => storeApi.detail() });

  useEffect(() => {
    if (!detail.data || loaded) return;
    const next = emptyWeek();
    for (const entry of detail.data.hours) {
      const day = next[entry.weekday];
      if (entry.isClosed) continue;
      if (entry.opens && entry.closes) {
        day.isClosed = false;
        day.intervals.push({ opens: entry.opens, closes: entry.closes });
      }
    }
    // A weekday with no stored rows at all stays closed, which matches how the
    // server reads an absent day.
    setWeek(next);
    setSpecial(
      detail.data.specialHours.map((entry) => ({
        date: entry.date,
        isClosed: entry.isClosed,
        opens: entry.opens ?? "09:00",
        closes: entry.closes ?? "22:00",
      })),
    );
    setLoaded(true);
  }, [detail.data, loaded]);

  const save = useMutation({
    mutationFn: async () => {
      const hours = week.flatMap((day, weekday) =>
        day.isClosed || day.intervals.length === 0
          ? [{ weekday, isClosed: true }]
          : day.intervals.map((interval) => ({
              weekday,
              isClosed: false,
              opens: interval.opens,
              closes: interval.closes,
            })),
      );
      await storeApi.setHours({ hours });
      await storeApi.setSpecialHours({
        entries: special.map((entry) => ({
          date: entry.date,
          isClosed: entry.isClosed,
          opens: entry.isClosed ? null : entry.opens,
          closes: entry.isClosed ? null : entry.closes,
        })),
      });
    },
    onSuccess: async () => {
      setError("");
      setSavedAt(Date.now());
      await queryClient.invalidateQueries({ queryKey: ["store-detail"] });
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : t("error_generic")),
  });

  if (detail.isLoading) return <HoursSkeleton />;

  if (detail.isError) {
    return (
      <div className="space-y-5">
        <PageHeader title={t("portal_hours")} description={t("hours_overnight_hint")} />
        <ErrorNote message={t("error_network")} />
      </div>
    );
  }

  const updateDay = (index: number, patch: Partial<DayState>) =>
    setWeek((prev) =>
      prev.map((day, i) => (i === index ? { ...day, ...patch } : day)),
    );

  const copyToAll = (index: number) => {
    const source = week[index];
    setWeek(week.map(() => ({ ...source, intervals: [...source.intervals] })));
  };

  return (
    <div className="space-y-6 pb-4">
      <PageHeader title={t("portal_hours")} description={t("hours_overnight_hint")} />

      <Card>
        {/* One row per weekday. A closed day drops to the sunken surface and
            says so in words, so the state is never carried by colour alone. */}
        <ul className="space-y-2.5">
          {week.map((day, index) => (
            <li
              key={index}
              className={`rounded-card border border-[var(--border-subtle)] transition-colors duration-200 ${
                day.isClosed ? "surface-sunken" : "bg-[var(--surface-card)]"
              }`}
            >
              <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
                <div className="flex items-center gap-3 sm:w-72 sm:shrink-0">
                  <h3
                    className={`min-w-0 flex-1 truncate font-display text-base font-semibold sm:flex-none sm:w-28 ${
                      day.isClosed
                        ? "text-sand-600 dark:text-sand-400"
                        : "text-sand-900 dark:text-sand-50"
                    }`}
                  >
                    {t(`day_${index}` as TranslationKey)}
                  </h3>

                  <div className="w-28 shrink-0">
                    <Toggle
                      checked={!day.isClosed}
                      onChange={(open) =>
                        updateDay(index, {
                          isClosed: !open,
                          intervals:
                            open && day.intervals.length === 0
                              ? [{ opens: "09:00", closes: "22:00" }]
                              : day.intervals,
                        })
                      }
                      label={day.isClosed ? t("day_closed") : t("open_now")}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToAll(index)}
                    title={t("hours_copy_to_all")}
                    aria-label={t("hours_copy_to_all")}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sand-500 transition-colors duration-200 hover:bg-sand-100 hover:text-clay-700 dark:hover:bg-sand-800 dark:hover:text-clay-300"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  {day.isClosed ? (
                    <Badge>{t("hours_closed_all_day")}</Badge>
                  ) : (
                    <div className="space-y-2">
                      {day.intervals.map((interval, i) => (
                        <div key={i} className="flex items-center gap-2">
                          {/* Numbered when a day is split, so two shifts read
                              as one day rather than two stray rows. */}
                          {day.intervals.length > 1 && (
                            <span
                              aria-hidden
                              className="grid h-6 w-6 shrink-0 place-items-center rounded-full surface-sunken text-xs font-semibold tabular-nums text-sand-600 dark:text-sand-400"
                            >
                              {i + 1}
                            </span>
                          )}
                          <div className="min-w-0 flex-1 sm:w-32 sm:flex-none">
                            <Input
                              type="time"
                              value={interval.opens}
                              onChange={(e) =>
                                updateDay(index, {
                                  intervals: day.intervals.map((v, vi) =>
                                    vi === i ? { ...v, opens: e.target.value } : v,
                                  ),
                                })
                              }
                              className="tabular-nums"
                              aria-label={t("hours_opens")}
                            />
                          </div>
                          <span aria-hidden className="shrink-0 text-sand-500">
                            –
                          </span>
                          <div className="min-w-0 flex-1 sm:w-32 sm:flex-none">
                            <Input
                              type="time"
                              value={interval.closes}
                              onChange={(e) =>
                                updateDay(index, {
                                  intervals: day.intervals.map((v, vi) =>
                                    vi === i ? { ...v, closes: e.target.value } : v,
                                  ),
                                })
                              }
                              className="tabular-nums"
                              aria-label={t("hours_closes")}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              updateDay(index, {
                                intervals: day.intervals.filter((_, vi) => vi !== i),
                              })
                            }
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sand-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                            aria-label={t("action_delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={<Plus className="h-3.5 w-3.5" />}
                        onClick={() =>
                          updateDay(index, {
                            intervals: [
                              ...day.intervals,
                              { opens: "17:00", closes: "23:00" },
                            ],
                          })
                        }
                      >
                        {t("hours_add_interval")}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <SectionTitle
          title={t("special_hours_title")}
          description={t("special_hours_hint")}
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<CalendarPlus className="h-3.5 w-3.5" />}
              onClick={() =>
                setSpecial((prev) => [
                  ...prev,
                  {
                    date: new Date().toISOString().slice(0, 10),
                    isClosed: true,
                    opens: "09:00",
                    closes: "22:00",
                  },
                ])
              }
            >
              {t("special_hours_add")}
            </Button>
          }
        />

        {special.length === 0 ? (
          <p className="rounded-card border border-dashed border-sand-300 px-4 py-6 text-center text-sm text-sand-600 dark:border-sand-700 dark:text-sand-500">
            {t("empty_none")}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {special.map((entry, index) => (
              <li
                key={index}
                className={`flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-card border border-[var(--border-subtle)] px-4 py-3 ${
                  entry.isClosed ? "surface-sunken" : "bg-[var(--surface-card)]"
                }`}
              >
                <div className="w-40 shrink-0">
                  <Input
                    type="date"
                    value={entry.date}
                    onChange={(e) =>
                      setSpecial((prev) =>
                        prev.map((v, i) =>
                          i === index ? { ...v, date: e.target.value } : v,
                        ),
                      )
                    }
                    className="tabular-nums"
                    aria-label={t("special_hours_date")}
                  />
                </div>

                <div className="w-28 shrink-0">
                  <Toggle
                    checked={entry.isClosed}
                    onChange={(closed) =>
                      setSpecial((prev) =>
                        prev.map((v, i) =>
                          i === index ? { ...v, isClosed: closed } : v,
                        ),
                      )
                    }
                    label={t("day_closed")}
                  />
                </div>

                {!entry.isClosed && (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="min-w-0 flex-1 sm:w-32 sm:flex-none">
                      <Input
                        type="time"
                        value={entry.opens}
                        onChange={(e) =>
                          setSpecial((prev) =>
                            prev.map((v, i) =>
                              i === index ? { ...v, opens: e.target.value } : v,
                            ),
                          )
                        }
                        className="tabular-nums"
                        aria-label={t("hours_opens")}
                      />
                    </div>
                    <span aria-hidden className="shrink-0 text-sand-500">
                      –
                    </span>
                    <div className="min-w-0 flex-1 sm:w-32 sm:flex-none">
                      <Input
                        type="time"
                        value={entry.closes}
                        onChange={(e) =>
                          setSpecial((prev) =>
                            prev.map((v, i) =>
                              i === index ? { ...v, closes: e.target.value } : v,
                            ),
                          )
                        }
                        className="tabular-nums"
                        aria-label={t("hours_closes")}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setSpecial((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sand-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                  aria-label={t("action_delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {error && <ErrorNote message={error} />}

      {/* The action bar follows the owner down a long week rather than sitting
          at the bottom of it. */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 shadow-lifted backdrop-blur">
        <Button
          loading={save.isPending}
          onClick={() => save.mutate()}
          icon={<Save className="h-4 w-4" />}
        >
          {t("action_save")}
        </Button>
        {savedAt > 0 && !save.isPending && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <Check className="h-4 w-4" />
            {t("saved")}
          </span>
        )}
      </div>
    </div>
  );
}

/** Holds the week's shape while it loads, so the rows do not jump into place. */
function HoursSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Card>
        <div className="space-y-2.5">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-card" />
          ))}
        </div>
      </Card>
    </div>
  );
}
