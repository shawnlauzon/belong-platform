import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@belongnetwork/components';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@belongnetwork/components';
import { Button } from '@belongnetwork/components';
import { ViewSwitcher } from '@belongnetwork/components';
// import { useBelongStore } from '@belongnetwork/core';
import { mapbox } from '@belongnetwork/core';
import { Users, Calendar, Map as MapIcon, Heart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@belongnetwork/components';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/community')({
  component: CommunityPage,
});

function CommunityPage() {
  // const activeCommunity = useBelongStore((state: any) => state.getActiveCommunity());
  const activeCommunity: any = null; // TODO: implement community store
  // const viewMode = useBelongStore((state: any) => state.app.viewMode);
  const [viewMode, setViewMode] = useState<'member' | 'organizer'>('member'); // TODO: implement view mode store
  const [activeTab, setActiveTab] = useState<'members' | 'events'>('members');

  if (!activeCommunity) {
    return (
      <AppLayout showCommunitySelector={false}>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-warmgray-500 mb-4">No community selected</p>
            <p className="text-sm text-warmgray-400">
              Please select a community from the selector above
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showCommunitySelector={false}>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-warmgray-800">
            {activeCommunity.name} Community
          </h1>
          <p className="text-warmgray-500">
            {activeCommunity.memberCount} members •{' '}
            {activeCommunity.description}
          </p>
        </div>

        <div className="self-end sm:self-auto">
          <ViewSwitcher initialView={viewMode} />
        </div>
      </div>

      {/* Community map preview */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-8">
        {activeCommunity?.center ? (
          <img
            src={mapbox.getStaticMapUrl(
              {
                lat: activeCommunity.center.lat,
                lng: activeCommunity.center.lng,
              },
              {
                width: 800,
                height: 200,
                zoom: 10,
                marker: true,
                markerColor: 'f97316', // Orange-500
              }
            )}
            alt={`Map of ${activeCommunity.name}`}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
            <MapIcon className="h-12 w-12 text-white" />
          </div>
        )}
      </div>

      {viewMode === 'member' && (
        <div className="space-y-6">
          <div className="bg-white shadow-sm rounded-lg p-1">
            <div className="flex">
              <Button
                variant={activeTab === 'members' ? 'default' : 'ghost'}
                className="flex-1 flex items-center justify-center gap-2 rounded-md"
                onClick={() => setActiveTab('members')}
              >
                <Users className="h-4 w-4" />
                <span>Members</span>
              </Button>
              <Button
                variant={activeTab === 'events' ? 'default' : 'ghost'}
                className="flex-1 flex items-center justify-center gap-2 rounded-md"
                onClick={() => setActiveTab('events')}
              >
                <Calendar className="h-4 w-4" />
                <span>Events</span>
              </Button>
            </div>
          </div>

          {activeTab === 'members' && (
            // TODO Load mock members from API
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* {mockMembers.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))} */}
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-4">
              // TODO load events from API
              {/* {mockEvents
                .filter((e) => e.community_id === currentCommunity.id)
                .map((event) => (
                  <Card key={event.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-warmgray-800">
                              {event.title}
                            </h3>
                            <p className="text-sm text-warmgray-500">
                              {new Date(event.date).toLocaleDateString()} at{' '}
                              {new Date(event.date).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <div className="mt-2 sm:mt-0 bg-gray-100 px-3 py-1 rounded-full text-xs font-medium text-warmgray-700">
                            {event.attendee_count} attending
                          </div>
                        </div>

                        <div className="text-sm text-warmgray-600 mb-4">
                          {event.description}
                        </div>

                        <div className="bg-gray-50 rounded-md p-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="font-medium text-warmgray-700">
                                Location:
                              </span>
                              <span className="ml-1 text-warmgray-600">
                                {event.location}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-warmgray-700">
                                Parking:
                              </span>
                              <span className="ml-1 text-warmgray-600">
                                {event.parking}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <Button size="sm">RSVP</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

              {mockEvents.filter((e) => e.community_id === currentCommunity.id)
                .length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-warmgray-500 mb-4">
                      No upcoming events in your community
                    </p>
                    <Button size="sm">Suggest an Event</Button>
                  </CardContent>
                </Card>
              )} */}
            </div>
          )}
        </div>
      )}

      {viewMode === 'organizer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Community Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-100 text-center">
                  <div className="text-2xl font-bold text-primary-600">
                    {activeCommunity?.memberCount}
                  </div>
                  <div className="text-sm text-warmgray-500">Members</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100 text-center">
                  <div className="text-2xl font-bold text-primary-600">87</div>
                  <div className="text-sm text-warmgray-500">Resources</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100 text-center">
                  <div className="text-2xl font-bold text-primary-600">32</div>
                  <div className="text-sm text-warmgray-500">Thanks</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100 text-center">
                  <div className="text-2xl font-bold text-primary-600">7.2</div>
                  <div className="text-sm text-warmgray-500">Avg Trust</div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Activity Trend</h3>
                <div className="bg-gray-100 rounded-lg p-4 flex items-end h-36">
                  {/* Placeholder for chart */}
                  <div className="flex-1 flex items-end justify-around h-full">
                    {[35, 42, 28, 65, 53, 58, 72].map((value, i) => (
                      <div
                        key={i}
                        className="w-10 bg-primary-500 rounded-t-sm"
                        style={{ height: `${value}%` }}
                      ></div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-warmgray-500">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organizer Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Members
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Event
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MapIcon className="mr-2 h-4 w-4" />
                  Edit Community Boundaries
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Heart className="mr-2 h-4 w-4" />
                  Send Community Update
                </Button>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">
                  New Member Requests
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                      <Link
                        to="/profile/$id"
                        params={{ id: 'jamie-davis' }}
                        className="hover:opacity-80 transition-opacity"
                        title="View Jamie Davis's profile"
                      >
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src="https://randomuser.me/api/portraits/women/22.jpg" />
                          <AvatarFallback>JD</AvatarFallback>
                        </Avatar>
                      </Link>
                      <Link
                        to="/profile/$id"
                        params={{ id: 'jamie-davis' }}
                        className="text-sm hover:text-primary-600 transition-colors"
                        title="View Jamie Davis's profile"
                      >
                        Jamie Davis
                      </Link>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 px-2">
                        ✓
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2">
                        ✕
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                      <Link
                        to="/profile/$id"
                        params={{ id: 'thomas-miller' }}
                        className="hover:opacity-80 transition-opacity"
                        title="View Thomas Miller's profile"
                      >
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src="https://randomuser.me/api/portraits/men/22.jpg" />
                          <AvatarFallback>TM</AvatarFallback>
                        </Avatar>
                      </Link>
                      <Link
                        to="/profile/$id"
                        params={{ id: 'thomas-miller' }}
                        className="text-sm hover:text-primary-600 transition-colors"
                        title="View Thomas Miller's profile"
                      >
                        Thomas Miller
                      </Link>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 px-2">
                        ✓
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2">
                        ✕
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
