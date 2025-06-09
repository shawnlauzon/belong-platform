import { useBelongStore } from '@belongnetwork/core';
import React from 'react';

interface TrustScoreProps {
  size?: 'sm' | 'md' | 'lg';
  showBreakdown?: boolean;
  memberId: string;
  communityId: string;
}

export function TrustScore({
  size = 'md',
  showBreakdown = false,
  memberId,
  communityId,
}: TrustScoreProps) {
  const [breakdown, setBreakdown] = React.useState<any>(null);

  const trustScore = useBelongStore(
    (state) =>
      state.users.list.find((user) => user.id === memberId)?.trust_scores?.[
        communityId
      ] ?? 0
  );

  const getSize = () => {
    switch (size) {
      case 'sm':
        return 'h-16 w-16 text-lg';
      case 'md':
        return 'h-24 w-24 text-2xl';
      case 'lg':
        return 'h-32 w-32 text-3xl';
      default:
        return 'h-24 w-24 text-2xl';
    }
  };

  const getColor = () => {
    if (trustScore < 4) return 'from-gray-200 to-gray-300 text-gray-700';
    if (trustScore < 6) return 'from-blue-200 to-blue-300 text-blue-700';
    if (trustScore < 8) return 'from-trust-200 to-trust-400 text-trust-800';
    return 'from-trust-400 to-trust-600 text-white';
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`rounded-full flex items-center justify-center font-bold bg-gradient-to-br ${getColor()} ${getSize()} shadow-md`}
      >
        {trustScore.toFixed(1)}
      </div>
      <div className="mt-2 text-center">
        <div className="font-semibold text-warmgray-900">{trustScore}</div>
        <div className="text-xs text-warmgray-500">Trust Score</div>
      </div>

      {showBreakdown && breakdown && (
        <div className="mt-4 w-full max-w-xs bg-white rounded-lg shadow-sm p-4 border border-gray-100 text-sm">
          <h4 className="font-medium text-center mb-3">Score Breakdown</h4>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-warmgray-600">Base</span>
              <div className="flex items-center gap-2">
                <span className="text-warmgray-900 font-medium">
                  {breakdown.baseContribution.toFixed(1)}
                </span>
                <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-400 rounded-full"
                    style={{
                      width: `${(breakdown.baseContribution / 10) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-warmgray-600">
                Thanks ({breakdown.thanksReceived})
              </span>
              <div className="flex items-center gap-2">
                <span className="text-warmgray-900 font-medium">
                  {breakdown.thanksContribution.toFixed(1)}
                </span>
                <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-400 rounded-full"
                    style={{
                      width: `${(breakdown.thanksContribution / 10) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-warmgray-600">
                Shared ({breakdown.resourcesShared})
              </span>
              <div className="flex items-center gap-2">
                <span className="text-warmgray-900 font-medium">
                  {breakdown.sharingContribution.toFixed(1)}
                </span>
                <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-trust-400 rounded-full"
                    style={{
                      width: `${(breakdown.sharingContribution / 10) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-warmgray-600">
                Tenure ({breakdown.tenureMonths} mo)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-warmgray-900 font-medium">
                  {breakdown.tenureContribution.toFixed(1)}
                </span>
                <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full"
                    style={{
                      width: `${(breakdown.tenureContribution / 10) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-between items-center font-medium">
              <span className="text-warmgray-800">Total</span>
              <span className="text-warmgray-900">{trustScore.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
