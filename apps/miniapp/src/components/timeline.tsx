interface TimelineEvent {
  label: string;
  date: string | null;
  completed: boolean;
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`h-3 w-3 rounded-full ${
                event.completed
                  ? 'bg-cyan-300 shadow-[0_0_16px_rgba(103,240,228,0.55)]'
                  : 'bg-slate-700'
              }`}
            />
            {index < events.length - 1 && (
              <div className={`h-8 w-0.5 ${event.completed ? 'bg-cyan-300/70' : 'bg-slate-700'}`} />
            )}
          </div>
          <div>
            <div className={`text-sm ${event.completed ? 'text-slate-100' : 'text-slate-400'}`}>
              {event.label}
            </div>
            {event.date && (
              <div className="text-xs text-slate-500">
                {new Date(event.date).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
