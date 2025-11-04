import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import { MessageSquare } from 'lucide-react';

interface FeedbackEntry {
  id: string;
  message: string;
  email?: string;
  userId?: string;
  timestamp: string;
}

interface FeedbackListProps {
  entries: FeedbackEntry[];
}

function FeedbackList({ entries }: FeedbackListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="h-12 w-12 text-deep-navy-300 mb-4" />
          <p className="text-body text-deep-navy-500">No feedback entries yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-h3">Recent Feedback Entries</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="border-l-4 border-rephlo-blue bg-deep-navy-50 p-4 rounded-r-md"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1">
                  <p className="text-body text-deep-navy-800">{entry.message}</p>
                </div>
                <Badge variant="neutral" className="flex-shrink-0">
                  {formatDate(entry.timestamp)}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-caption text-deep-navy-500">
                {entry.email && (
                  <span>Email: {entry.email}</span>
                )}
                {entry.userId && (
                  <span>User ID: {entry.userId}</span>
                )}
                {!entry.email && !entry.userId && (
                  <span className="text-deep-navy-400">Anonymous</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default FeedbackList;
