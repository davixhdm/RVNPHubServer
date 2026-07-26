const timeAgo = (date) => {
  if (!date) return '';

  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} mins ago`;
  if (hours === 1) return '1 hr ago';
  if (hours < 24) return `${hours} hrs ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (weeks === 1) return '1 week ago';
  if (weeks < 4) return `${weeks} weeks ago`;
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;

  return new Date(date).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDate = (date, format = 'full') => {
  if (!date) return '';
  const d = new Date(date);

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
    case 'time':
      return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    case 'datetime':
      return d.toLocaleString('en-KE', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    case 'full':
    default:
      return d.toLocaleDateString('en-KE', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
  }
};

const isExpired = (date) => {
  if (!date) return false;
  return new Date(date) < new Date();
};

const getRemainingTime = (date) => {
  if (!date) return '';
  const diff = new Date(date) - new Date();
  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `Expires in ${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0) return `Expires in ${hours}h ${minutes}m`;
  return `Expires in ${minutes}m`;
};

const getWeekRange = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
};

const getMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

export { timeAgo, formatDate, isExpired, getRemainingTime, getWeekRange, getMonthRange };