export const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};
export const formatTimeAgo = (date) => {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 30) {
        return formatDate(date);
    }
    else if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    else {
        return 'Just now';
    }
};
export const formatTenure = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInMs = now.getTime() - created.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);
    if (diffInDays === 0) {
        return 'Member created today';
    }
    else if (diffInDays === 1) {
        return 'Member for 1 day';
    }
    else if (diffInDays < 30) {
        return `Member for ${diffInDays} days`;
    }
    else if (diffInMonths === 1) {
        return 'Member for 1 month';
    }
    else if (diffInMonths < 12) {
        return `Member for ${diffInMonths} months`;
    }
    else if (diffInYears === 1) {
        return 'Member for 1 year';
    }
    else {
        return `Member for ${diffInYears} years`;
    }
};
export const truncateText = (text, maxLength) => {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength) + '...';
};
export const getInitials = (firstName, lastName, fallbackText) => {
    if (firstName && lastName) {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    else if (firstName) {
        return firstName.charAt(0).toUpperCase();
    }
    else if (lastName) {
        return lastName.charAt(0).toUpperCase();
    }
    else if (fallbackText) {
        return fallbackText.charAt(0).toUpperCase();
    }
    return 'U';
};
//# sourceMappingURL=formatters.js.map