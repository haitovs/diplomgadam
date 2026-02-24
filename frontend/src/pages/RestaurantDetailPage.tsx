import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Phone, Globe, Leaf, Clock, ChevronLeft } from "lucide-react";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import FavoriteToggle from "../components/FavoriteToggle";
import RatingBadge from "../components/RatingBadge";
import { useRestaurantDetail } from "../hooks/useRestaurantDetail";

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const { data, isLoading, isError, refetch } = useRestaurantDetail(id);

  if (isLoading) return <LoadingState label="Loading restaurant profile..." />;
  if (isError || !data) return <ErrorState message="Restaurant not found." action={refetch} />;

  const sustainColor =
    data.sustainabilityScore >= 80 ? "text-emerald-500" :
    data.sustainabilityScore >= 60 ? "text-amber-500" : "text-rose-500";

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-500 dark:hover:text-brand-300 transition-colors font-medium">
        <ChevronLeft className="w-4 h-4" />
        Back to catalogue
      </Link>

      {/* Hero */}
      <section className="glass-panel overflow-hidden">
        <div className="relative">
          <img src={data.heroImage} alt={`Photo of ${data.name}`} className="h-80 md:h-96 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute top-6 right-6 flex gap-3">
            <FavoriteToggle id={data.id} />
            <RatingBadge rating={data.rating} reviews={data.reviewCount} />
          </div>
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">{data.name}</h1>
            <div className="flex flex-wrap gap-2 mt-3">
              {data.cuisines.map((c) => (
                <span key={c} className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm border border-white/20">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          <p className="text-slate-600 dark:text-slate-300 text-lg max-w-3xl leading-relaxed">{data.description}</p>

          {data.dietary.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.dietary.map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-brand-500" />
                <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 font-semibold">Location</p>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">{data.location.address}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{data.location.neighborhood}, {data.location.city}</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-brand-500" />
                <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 font-semibold">Contact</p>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">{data.contact.phone}</p>
              {data.contact.website && (
                <a href={data.contact.website} className="inline-flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 hover:underline mt-1" target="_blank" rel="noreferrer">
                  <Globe className="w-3.5 h-3.5" />
                  Website
                </a>
              )}
            </div>

            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="w-4 h-4 text-emerald-500" />
                <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 font-semibold">Sustainability</p>
              </div>
              <div className={`text-3xl font-bold ${sustainColor}`}>{data.sustainabilityScore}%</div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Based on locally sourced ingredients & waste tracing</p>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Menu */}
      <section className="glass-panel p-6 md:p-8 space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Signature menu</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {data.menuHighlights.map((item) => (
            <motion.div
              key={item.name}
              className="p-4 border border-slate-100 dark:border-slate-700/50 rounded-xl bg-white/60 dark:bg-slate-800/40 hover:shadow-md hover:scale-[1.01] transition-all duration-200"
              whileHover={{ y: -2 }}
            >
              <div className="flex justify-between items-start">
                <span className="font-semibold text-slate-900 dark:text-white">{item.name}</span>
                <span className="text-sm font-bold text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">{item.price}</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Full Menu Section */}
      {data.fullMenu && data.fullMenu.length > 0 && (
        <section className="glass-panel p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Full Menu</h2>
          {Object.entries(
            data.fullMenu.reduce((acc, item) => {
              const category = item.category || 'Other';
              if (!acc[category]) acc[category] = [];
              acc[category].push(item);
              return acc;
            }, {} as Record<string, typeof data.fullMenu>)
          ).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2">
                {category}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 border border-slate-100 dark:border-slate-700/50 rounded-xl bg-white/50 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-800/60 transition-colors">
                    {item.image_url && (
                      <img src={item.image_url} alt={`${item.name}`} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" loading="lazy" />
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-slate-900 dark:text-white">{item.name}</span>
                        <span className="text-sm font-bold text-amber-500 dark:text-amber-400">{item.price} {item.currency}</span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Schedule */}
      <section className="glass-panel p-6 md:p-8 space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Schedule</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.schedule.map((slot) => (
            <div key={slot.days} className="flex items-center gap-3 p-4 border border-slate-100 dark:border-slate-700/50 rounded-xl bg-white/50 dark:bg-slate-800/40">
              <Clock className="w-5 h-5 text-brand-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{slot.days}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{slot.hours}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      {data.gallery.length > 0 && (
        <section className="glass-panel p-6 md:p-8 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gallery</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {data.gallery.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`${data.name} gallery ${i + 1}`}
                className="h-40 w-full object-cover rounded-xl hover:scale-[1.03] transition-transform duration-300"
                loading="lazy"
              />
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}
