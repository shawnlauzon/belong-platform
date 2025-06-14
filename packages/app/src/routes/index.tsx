import { createFileRoute, Link } from '@tanstack/react-router';
import { useCurrentUser } from '@belongnetwork/api';
import { Button } from '@belongnetwork/components';
import { Users, Package, Heart, ArrowRight } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const { data: user } = useCurrentUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Connect with Your
            <span className="text-blue-600 block">Local Community</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Share resources, build relationships, and strengthen your neighborhood 
            through the power of community connection.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard">
                <Button size="lg" className="w-full sm:w-auto">
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button size="lg" className="w-full sm:w-auto">
                    Get Started
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            How Belong Network Works
          </h2>
          <p className="text-lg text-gray-600">
            Simple tools to build stronger communities
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg p-8 shadow-lg text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Join Communities
            </h3>
            <p className="text-gray-600">
              Connect with neighbors in your area and join local communities 
              based on your interests and location.
            </p>
          </div>

          <div className="bg-white rounded-lg p-8 shadow-lg text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Share Resources
            </h3>
            <p className="text-gray-600">
              Offer tools, skills, and services to your community, or request 
              help when you need it most.
            </p>
          </div>

          <div className="bg-white rounded-lg p-8 shadow-lg text-center">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Build Trust
            </h3>
            <p className="text-gray-600">
              Express gratitude and build lasting relationships through our 
              community trust and thanks system.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {!user && (
        <div className="bg-blue-600 py-16">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of neighbors already building stronger communities.
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary">
                Create Your Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}