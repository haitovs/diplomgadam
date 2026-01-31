import { Link, useParams } from "react-router-dom";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import FavoriteToggle from "../components/FavoriteToggle";
import RatingBadge from "../components/RatingBadge";
import DietaryTags from "../components/DietaryTags";
import { useRestaurantDetail } from "../hooks/useRestaurantDetail";

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const { data, isLoading, isError, refetch } = useRestaurantDetail(id);

  if (isLoading) return <LoadingState label="Loading restaurant profile..." />;
  if (isError || !data) return <ErrorState message="Restaurant not found." action={refetch} />;

  return (
    <div className="space-y-8">
      <Link to="/" className="text-sm text-brand-600 underline">
        ← Back to catalogue
      </Link>
      <section className="glass-panel overflow-hidden">
        <div className="relative">
          <img src={data.heroImage} alt={data.name} className="h-96 w-full object-cover" />
          <div className="absolute top-6 right-6 flex gap-3">
            <FavoriteToggle id={data.id} />
            <RatingBadge rating={data.rating} reviews={data.reviewCount} />
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">{data.name}</h1>
            <p className="text-slate-500 max-w-3xl">{data.description}</p>
          </div>
          <DietaryTags tags={data.dietary} />
          <div className="grid md:grid-cols-3 gap-6 text-sm text-slate-600">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Location</p>
              <p>{data.location.address}</p>
              <p>{data.location.neighborhood}</p>
              <p>{data.location.city}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Contact</p>
              <p>{data.contact.phone}</p>
              <a href={data.contact.website} className="text-brand-600 underline" target="_blank" rel="noreferrer">
                Website
              </a>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Sustainability score</p>
              <div className="text-3xl font-semibold text-emerald-500">{data.sustainabilityScore}%</div>
              <p className="text-xs text-slate-400">Based on locally sourced ingredients & waste tracing</p>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel p-6 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Signature menu</h2>
        <div className="grid md:grid-cols-2 gap-5">
          {data.menuHighlights.map((item) => (
            <div key={item.name} className="p-4 border border-slate-100 rounded-xl">
              <div className="flex justify-between text-slate-900 font-semibold">
                <span>{item.name}</span>
                <span>{item.price}</span>
              </div>
              <p className="text-sm text-slate-500">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Full Menu Section */}
      {data.fullMenu && data.fullMenu.length > 0 && (
        <section className="glass-panel p-6 space-y-6">
          <h2 className="text-xl font-semibold text-slate-900">Full Menu</h2>

          {Object.entries(
            data.fullMenu.reduce((acc, item) => {
              const category = item.category || 'Other';
              if (!acc[category]) acc[category] = [];
              acc[category].push(item);
              return acc;
            }, {} as Record<string, typeof data.fullMenu>)
          ).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-lg font-medium text-slate-800 border-b border-slate-100 pb-2">
                {category}
              </h3>
              <div className="grid md:grid-cols-2 gap-5">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 border border-slate-100 rounded-xl bg-white/50 hover:bg-white/80 transition-colors">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between text-slate-900 font-semibold mb-1">
                        <span>{item.name}</span>
                        <span className="text-orange-500">{item.price} {item.currency}</span>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="glass-panel p-6 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Schedule</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-slate-600">
          {data.schedule.map((slot) => (
            <div key={slot.days} className="p-4 border border-slate-100 rounded-xl">
              <p className="font-semibold">{slot.days}</p>
              <p>{slot.hours}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
