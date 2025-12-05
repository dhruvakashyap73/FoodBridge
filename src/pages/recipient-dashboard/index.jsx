import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import RoleBasedHeader from '../../components/ui/RoleBasedHeader';
import DashboardNavigation from '../../components/ui/DashboardNavigation';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import FilterBar from './components/FilterBar';
import ActiveFoodPosts from './components/ActiveFoodPosts';
import MetricsCard from '../donor-dashboard/components/MetricsCard';
import { supabase } from '../../supabaseClient';
import { findOptimalDonations } from '../../utils/nearestNeighborMatcher';

/**
 * RecipientDashboard - Main recipient dashboard with AI-based nearest neighbor matching
 * Shows donations ranked by distance and expiry urgency
 */
const RecipientDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allFoodPosts, setAllFoodPosts] = useState([]);
  const [recipientLocation, setRecipientLocation] = useState(null);
  const [optimizationStatus, setOptimizationStatus] = useState('Getting your location...');
  const [sortingStrategy, setSortingStrategy] = useState('distance'); // 'balanced', 'distance', or 'urgency'
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    urgency: 'all',
    status: 'all',
    startDate: '',
    endDate: '',
    view: 'grid'
  });
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 12;

  // Refs for scrolling to sections
  const overviewRef = useRef(null);
  const availableFoodRef = useRef(null);
  const requestsRef = useRef(null);
  const receivedRef = useRef(null);

  // Get current section from URL
  const currentSection = searchParams.get('section') || 'overview';

  // Get recipient's location first
  useEffect(() => {
    getCurrentLocation();
    // Also fetch donations immediately (will optimize when location arrives)
    fetchAndOptimizeDonations();
  }, []);

  // Re-fetch and re-optimize when location becomes available
  useEffect(() => {
    if (recipientLocation) {
      console.log('🔄 Location obtained, re-fetching with AI optimization...');
      fetchAndOptimizeDonations();
    }
  }, [recipientLocation]);

  const getCurrentLocation = () => {
    setOptimizationStatus('🌍 Getting your location...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setRecipientLocation(location);
          console.log('✅ Recipient location obtained:', location);
          setOptimizationStatus('🤖 Running AI optimization...');
        },
        (error) => {
          console.error('Error getting location:', error);
          // Use default location (Bangalore) if geolocation fails
          const defaultLocation = { lat: 12.9716, lng: 77.5946 };
          setRecipientLocation(defaultLocation);
          setOptimizationStatus('📍 Using default location, running AI optimization...');
        }
      );
    } else {
      // Fallback to default location
      const defaultLocation = { lat: 12.9716, lng: 77.5946 };
      setRecipientLocation(defaultLocation);
      setOptimizationStatus('📍 Using default location, running AI optimization...');
    }
  };

  const fetchAndOptimizeDonations = async () => {
    setLoading(true);
    try {
      console.log('=== RECIPIENT DASHBOARD: Starting fetch ===');
      console.log('Recipient Location:', recipientLocation);
      
      // STEP 1: First fetch ALL donations from database (show immediately)
      console.log('� Fetching all donations from database...');
      const { data: allDonations, error: fetchError } = await supabase
        .from('donations')
        .select('*')
        .eq('status', 'successful')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Error fetching donations:', fetchError);
        setOptimizationStatus('❌ Error loading donations');
        setLoading(false);
        return;
      }

      console.log(`✅ Found ${allDonations?.length || 0} donations in database`);

      if (!allDonations || allDonations.length === 0) {
        console.log('⚠️ No donations found with status="successful"');
        setOptimizationStatus('📋 No active donations available');
        setAllFoodPosts([]);
        setLoading(false);
        return;
      }

      // STEP 2: Try to optimize with AI (if recipient location available)
      let donationsToShow = allDonations;
      
      if (recipientLocation) {
        console.log('🤖 Running AI optimization with recipient location...');
        console.log(`   Strategy: ${sortingStrategy.toUpperCase()}`);
        setOptimizationStatus('🔍 Finding nearest donations with AI...');
        
        try {
          const rankedDonations = await findOptimalDonations(recipientLocation, sortingStrategy);
          
          if (rankedDonations && rankedDonations.length > 0) {
            console.log(`✅ AI returned ${rankedDonations.length} ranked donations`);
            donationsToShow = rankedDonations;
            
            const withLocation = rankedDonations.filter(d => d.priorityScore !== null).length;
            const withoutLocation = rankedDonations.filter(d => d.priorityScore === null).length;
            
            const strategyLabel = sortingStrategy === 'distance' ? '📍 Distance-First' : 
                                 sortingStrategy === 'urgency' ? '⏰ Urgency-First' : 
                                 '⚖️ Balanced';
            
            setOptimizationStatus(
              `✅ ${strategyLabel}: ${rankedDonations.length} donations | ` +
              `${withLocation} ranked${withoutLocation > 0 ? `, ${withoutLocation} no GPS` : ''}`
            );
          } else {
            console.log('⚠️ AI returned no results, showing unoptimized donations');
            setOptimizationStatus(`📋 Showing ${allDonations.length} donations (AI optimization unavailable)`);
            donationsToShow = allDonations.map(donation => ({
              ...donation,
              distance: null,
              priorityScore: null,
              urgencyScore: null,
              travelTimeMinutes: null,
              timeUntilExpiryMinutes: null
            }));
          }
        } catch (aiError) {
          console.error('⚠️ AI optimization error:', aiError);
          setOptimizationStatus(`📋 Showing ${allDonations.length} donations (AI optimization failed)`);
          donationsToShow = allDonations.map(donation => ({
            ...donation,
            distance: null,
            priorityScore: null,
            urgencyScore: null,
            travelTimeMinutes: null,
            timeUntilExpiryMinutes: null
          }));
        }
      } else {
        console.log('📍 No recipient location yet, showing unoptimized donations');
        setOptimizationStatus(`📋 Showing ${allDonations.length} donations (waiting for location...)`);
        donationsToShow = allDonations.map(donation => ({
          ...donation,
          distance: null,
          priorityScore: null,
          urgencyScore: null,
          travelTimeMinutes: null,
          timeUntilExpiryMinutes: null
        }));
      }

      // Transform donations to UI format
      const transformedPosts = donationsToShow.map(donation => {
        console.log(`📦 Transforming donation ${donation.id}:`, {
          food_name: donation.food_name,
          distance: donation.distance,
          priorityScore: donation.priorityScore,
          feasibility: donation.feasibility,
          pickup_latitude: donation.pickup_latitude,
          pickup_longitude: donation.pickup_longitude,
          donorLocation: donation.donorLocation
        });

        return {
          id: donation.id,
          title: donation.food_name || 'Untitled Food',
          description: donation.description || 'No description available',
          image: donation.image_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400',
          quantity: `${donation.quantity || 0} ${donation.unit || 'servings'}`,
          location: donation.pickup_city || donation.pickup_state || 'Location not specified',
          category: donation.food_type || 'other',
          urgency: donation.urgency_level || 'medium',
          status: 'active',
          expiryTime: donation.expiry_datetime ? new Date(donation.expiry_datetime) : new Date(Date.now() + 24 * 60 * 60 * 1000),
          matchCount: 0,
          postedAt: donation.created_at ? new Date(donation.created_at) : new Date(),
          // AI optimization data (may be null if not optimized)
          distance: donation.distance !== undefined ? donation.distance : null,
          priorityScore: donation.priorityScore !== undefined ? donation.priorityScore : null,
          urgencyScore: donation.urgencyScore !== undefined ? donation.urgencyScore : null,
          travelTimeMinutes: donation.feasibility?.travelTimeMinutes !== undefined ? donation.feasibility.travelTimeMinutes : null,
          timeUntilExpiryMinutes: donation.feasibility?.timeUntilExpiryMinutes !== undefined ? donation.feasibility.timeUntilExpiryMinutes : null,
          // Additional details
          estimatedServings: donation.estimated_servings,
          dietaryType: donation.dietary_type,
          spiceLevel: donation.spice_level,
          allergens: donation.allergens || [],
          pickupAddress: {
            street: donation.pickup_street_address,
            area: donation.pickup_area,
            city: donation.pickup_city,
            state: donation.pickup_state,
            pincode: donation.pickup_pin_code,
            latitude: donation.donorLocation?.lat || donation.pickup_latitude || null,
            longitude: donation.donorLocation?.lng || donation.pickup_longitude || null
          },
          pickupInstructions: donation.pickup_instructions,
          preferredPickupTime: donation.preferred_pickup_time,
          contactPerson: donation.contact_person_name || donation.contact_person,
          contactPhone: donation.contact_phone,
          donationReason: donation.donation_reason,
          urgencyNotes: donation.urgency_notes,
          categories: donation.categories || []
        };
      });

      console.log(`✅ Transformed ${transformedPosts.length} posts for UI`);
      console.log('Sample transformed post:', transformedPosts[0]);

      setAllFoodPosts(transformedPosts);
    } catch (error) {
      console.error('Error in fetchAndOptimizeDonations:', error);
      setOptimizationStatus('❌ Error optimizing donations');
    } finally {
      setLoading(false);
    }
  };

  // Metrics data
  const metricsData = [
    {
      title: 'Meals Secured This Month',
      value: '1,247',
      unit: 'meals',
      change: '+18',
      changeType: 'increase',
      icon: 'Utensils',
      color: 'success'
    },
    {
      title: 'Beneficiaries Served',
      value: '423',
      unit: 'people',
      change: '+12',
      changeType: 'increase',
      icon: 'Users',
      color: 'primary'
    },
    {
      title: 'Active Requests',
      value: '7',
      unit: 'requests',
      change: '-2',
      changeType: 'decrease',
      icon: 'Heart',
      color: 'warning'
    },
    {
      title: 'Pickup Success Rate',
      value: '94',
      unit: '%',
      change: '+3',
      changeType: 'increase',
      icon: 'TrendingUp',
      color: 'accent'
    }
  ];

  // Apply filters to posts
  const getFilteredPosts = () => {
    return allFoodPosts.filter(post => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          post.title.toLowerCase().includes(searchLower) ||
          post.description.toLowerCase().includes(searchLower) ||
          post.location.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.category !== 'all' && post.category !== filters.category) {
        return false;
      }

      // Urgency filter
      if (filters.urgency !== 'all' && post.urgency !== filters.urgency) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && post.status !== filters.status) {
        return false;
      }

      // Date range filter
      if (filters.startDate) {
        const postDate = new Date(post.postedAt);
        const startDate = new Date(filters.startDate);
        if (postDate < startDate) return false;
      }

      if (filters.endDate) {
        const postDate = new Date(post.postedAt);
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        if (postDate > endDate) return false;
      }

      return true;
    });
  };

  const filteredPosts = getFilteredPosts();
  const totalPages = Math.ceil(filteredPosts.length / pageSize);
  const paginatedPosts = filteredPosts.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [filters]);

  // Refresh data when page loads
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters, currentPage]);

  // Handle section navigation and scrolling
  useEffect(() => {
    const scrollToSection = () => {
      let targetRef = null;
      
      switch (currentSection) {
        case 'overview':
          targetRef = overviewRef;
          break;
        case 'available':
          targetRef = availableFoodRef;
          break;
        case 'requests':
          targetRef = requestsRef;
          break;
        case 'received':
          targetRef = receivedRef;
          break;
        default:
          targetRef = overviewRef;
      }

      if (targetRef?.current) {
        const offset = 100; // Offset for header
        const elementPosition = targetRef.current.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    };

    // Small delay to ensure content is rendered
    const timer = setTimeout(scrollToSection, 100);
    return () => clearTimeout(timer);
  }, [currentSection]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewDetails = (postId) => {
    navigate(`/food-details?id=${postId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <RoleBasedHeader
        userRole="recipient"
        isMenuOpen={isMenuOpen}
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
      />

      <div className="flex pt-16">
        {/* Sidebar Navigation */}
        <DashboardNavigation userRole="recipient" />

        {/* Main Content */}
        <main className="flex-1 lg:ml-64">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Breadcrumb */}
            <BreadcrumbNavigation userRole="recipient" className="mb-6" />

            {/* Page Header */}
            <div ref={overviewRef} className="mb-8">
              <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
                Recipient Dashboard
              </h1>
              <p className="text-muted-foreground">
                Discover available food donations and coordinate pickups for your beneficiaries
              </p>
              
              {/* AI Optimization Status */}
              {recipientLocation && (
                <div className="mt-4 bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">🤖</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-foreground">AI-Powered Matching Active</h3>
                        <p className="text-xs text-muted-foreground">{optimizationStatus}</p>
                        <p className="text-xs text-primary font-medium mt-1">
                          Location: {recipientLocation.lat.toFixed(4)}°, {recipientLocation.lng.toFixed(4)}°
                        </p>
                      </div>
                    </div>
                    
                    {/* Sorting Strategy Selector */}
                    <div className="ml-4">
                      <label className="text-xs font-medium text-foreground block mb-1">
                        Sort By:
                      </label>
                      <select
                        value={sortingStrategy}
                        onChange={(e) => {
                          setSortingStrategy(e.target.value);
                          fetchAndOptimizeDonations();
                        }}
                        className="px-3 py-1.5 text-xs border border-primary/30 rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="distance">📍 Nearest First</option>
                        <option value="urgency">⏰ Expiring Soon</option>
                        <option value="balanced">⚖️ Balanced</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {metricsData.map((metric, index) => (
                <MetricsCard
                  key={index}
                  title={metric.title}
                  value={metric.value}
                  unit={metric.unit}
                  change={metric.change}
                  changeType={metric.changeType}
                  icon={metric.icon}
                  color={metric.color}
                />
              ))}
            </div>

            {/* Main Content - Full Width */}
            <div className="space-y-6">
              {/* Available Food Section */}
              <div ref={availableFoodRef}>
                {/* Filter Bar */}
                <FilterBar
                  onFilterChange={handleFilterChange}
                  initialFilters={filters}
                />

                {/* Available Food Posts */}
                <div>
                  <h2 className="text-2xl font-heading font-bold text-foreground mb-4">
                    Available Food Posts
                  </h2>
                  <ActiveFoodPosts
                    posts={paginatedPosts}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalCount={filteredPosts.length}
                    loading={loading}
                    onPageChange={handlePageChange}
                    onViewDetails={handleViewDetails}
                    viewMode={filters.view}
                  />
                </div>
              </div>

              {/* My Requests Section - Placeholder */}
              <div ref={requestsRef} className="pt-8">
                <div className="bg-card rounded-lg p-8 border border-border text-center">
                  <h2 className="text-2xl font-heading font-bold text-foreground mb-4">
                    My Requests
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Track your food requests and their status
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This section is coming soon
                  </p>
                </div>
              </div>

              {/* Received Section - Placeholder */}
              <div ref={receivedRef} className="pt-8">
                <div className="bg-card rounded-lg p-8 border border-border text-center">
                  <h2 className="text-2xl font-heading font-bold text-foreground mb-4">
                    Received Donations
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    View your completed donations and impact
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This section is coming soon
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default RecipientDashboard;
