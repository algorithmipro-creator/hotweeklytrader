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
            <div className={`w-3 h-3 rounded-full ${event.completed ? 'bg-green-500' : 'bg-gray-600'}`} />
            {index < events.length - 1 && (
              <div className={`w-0.5 h-8 ${event.completed ? 'bg-green-500' : 'bg-gray-700'}`} />
            )}
          </div>
          <div>
            <div className={`text-sm ${event.completed ? 'text-text' : 'text-text-secondary'}`}>
              {event.label}
            </div>
            {event.date && (
              <div className="text-xs text-text-secondary">
                {new Date(event.date).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
