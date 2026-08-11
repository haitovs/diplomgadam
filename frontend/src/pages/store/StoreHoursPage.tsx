import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { storeApi } from "../../api/store";
import {
  Button,
  Card,
  ErrorNote,
  Input,
  SectionTitle,
  Spinner,
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

  if (detail.isLoading) return <Spinner />;

  const updateDay = (index: number, patch: Partial<DayState>) =>
    setWeek((prev) =>
      prev.map((day, i) => (i === index ? { ...day, ...patch } : day)),
    );

  const copyToAll = (index: number) => {
    const source = week[index];
    setWeek(week.map(() => ({ ...source, intervals: [...source.intervals] })));
  };

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle
          title={t("portal_hours")}
          description={t("hours_overnight_hint")}
        />

        <div className="space-y-3">
          {week.map((day, index) => (
            <div
              key={index}
              className="rounded-xl border border-sand-200 p-3.5 dark:border-sand-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold text-sand-800 dark:text-sand-100">
                  {t(`day_${index}` as TranslationKey)}
                </span>
                <div className="flex items-center gap-3">
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
                  <button
                    type="button"
                    onClick={() => copyToAll(index)}
                    title={t("hours_copy_to_all")}
                    className="rounded-lg p-1.5 text-sand-500 hover:bg-sand-100 hover:text-sand-600 dark:hover:bg-sand-800"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {!day.isClosed && (
                <div className="mt-3 space-y-2">
                  {day.intervals.map((interval, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
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
                        className="w-32"
                        aria-label={t("hours_opens")}
                      />
                      <span className="text-sand-500">–</span>
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
                        className="w-32"
                        aria-label={t("hours_closes")}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateDay(index, {
                            intervals: day.intervals.filter((_, vi) => vi !== i),
                          })
                        }
                        className="rounded-lg p-1.5 text-sand-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                        aria-label={t("action_delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={<Plus className="w-3.5 h-3.5" />}
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
          ))}
        </div>
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
              icon={<Plus className="w-3.5 h-3.5" />}
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
          <p className="text-sm text-sand-600 dark:text-sand-500">
            {t("empty_none")}
          </p>
        ) : (
          <div className="space-y-2">
            {special.map((entry, index) => (
              <div
                key={index}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-sand-200 p-3 dark:border-sand-700"
              >
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
                  className="w-40"
                />
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
                {!entry.isClosed && (
                  <>
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
                      className="w-32"
                    />
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
                      className="w-32"
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setSpecial((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="ml-auto rounded-lg p-1.5 text-sand-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                  aria-label={t("action_delete")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {error && <ErrorNote message={error} />}

      <div className="sticky bottom-3 flex items-center gap-3">
        <Button
          loading={save.isPending}
          onClick={() => save.mutate()}
          icon={<Save className="w-4 h-4" />}
        >
          {t("action_save")}
        </Button>
        {savedAt > 0 && !save.isPending && (
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {t("saved")}
          </span>
        )}
      </div>
    </div>
  );
}
