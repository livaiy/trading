'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Post } from '@/lib/types';
import { formatDate, truncateText, cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import LoginPrompt from '@/components/LoginPrompt';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  BookOpenIcon,
  ClockIcon,
  UserIcon,
  PlayIcon,
  LockClosedIcon,
  StarIcon
} from '@heroicons/react/24/outline';

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  
  // Premium video states
  const [premiumVideoTitle, setPremiumVideoTitle] = useState('');
  const [premiumVideoFile, setPremiumVideoFile] = useState<File | null>(null);
  const [premiumVideoDescription, setPremiumVideoDescription] = useState('');
  const [premiumVideoCategory, setPremiumVideoCategory] = useState('trading-basics');
  
  // Edit states
  const [editingVideo, setEditingVideo] = useState<Post | null>(null);
  const [editMode, setEditMode] = useState<'premium' | undefined>(undefined);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Pagination states
  const [showAllPremium, setShowAllPremium] = useState(false);
  const videosPerPage = 6;
  
  const [submitting, setSubmitting] = useState(false);
  const { profile } = useAuth();

  const categories = [
    { value: 'all', label: 'All Articles', count: 0 },
    { value: 'trading-basics', label: 'Trading Basics', count: 0 },
    { value: 'technical-analysis', label: 'Technical Analysis', count: 0 },
    { value: 'fundamental-analysis', label: 'Fundamental Analysis', count: 0 },
    { value: 'risk-management', label: 'Risk Management', count: 0 },
    { value: 'psychology', label: 'Trading Psychology', count: 0 },
    { value: 'strategies', label: 'Trading Strategies', count: 0 },
    { value: 'tools', label: 'Trading Tools', count: 0 },
  ];

  useEffect(() => {
    // Detect recovery cookie to avoid treating user as logged-in premium during reset flow
    try {
      const hasRecovery = document.cookie
        .split(';')
        .map(v => v.trim())
        .some(v => v.startsWith('recovery='));
      setIsRecovery(hasRecovery);
    } catch {}

    fetchPosts();
    checkUserStatus();
  }, []);

  useEffect(() => {
    filterPosts();
  }, [posts, searchTerm, selectedCategory]);

  const checkUserStatus = async () => {
    try {
      if (isRecovery) {
        // During recovery, always treat as not-premium
        setIsAdminUser(false);
        setIsPremiumUser(false);
        setIsAuthenticated(false);
        return;
      }
      const supabase = createClient();
      const { data: userResp } = await supabase.auth.getUser();
      
      if (userResp.user) {
        setIsAuthenticated(true);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_admin, membership_type')
          .eq('id', userResp.user.id)
          .single();
        
        setIsAdminUser(profileData?.is_admin || false);
        setIsPremiumUser(profileData?.membership_type === 'premium');
      } else {
        setIsAuthenticated(false);
        setIsAdminUser(false);
        setIsPremiumUser(false);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const supabase = createClient();
      
      // Fetch all published posts (including premium ones for blurring effect)
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(*)
        `)
        .eq('type', 'article')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        setPosts([]);
      } else {
        setPosts(data || []);
      }
    } catch (error) {
      console.error('Error in fetchPosts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterPosts = () => {
    let filtered = premiumVideoPosts;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(post =>
        post.tags?.includes(selectedCategory)
      );
    }

    setFilteredPosts(filtered);
  };

  const getCategoryCount = (category: string) => {
    if (category === 'all') return premiumVideoPosts.length;
    return premiumVideoPosts.filter(post => post.tags?.includes(category)).length;
  };

  const toSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const parseTags = (category: string): string[] => {
    return ['video', category];
  };

  const handleAddPremiumVideo = async () => {
    if (!isAdminUser) return;
    if (!premiumVideoTitle || !premiumVideoFile) return;
    setSubmitting(true);
    
    try {
      console.log('=== Starting premium video upload ===');
      console.log('Form data:', { premiumVideoTitle, premiumVideoFile, premiumVideoDescription, premiumVideoCategory });
      
      const supabase = createClient();
      console.log('Supabase client created');
      
      const { data: userResp, error: userError } = await supabase.auth.getUser();
      console.log('User response:', { userResp, userError });
      
      if (userError) {
        throw new Error('Auth error: ' + userError.message);
      }
      
      const userId = userResp.user?.id;
      if (!userId) {
        throw new Error('Not authenticated - no user ID');
      }

      console.log('User ID:', userId);

      // Upload file to Supabase Storage
      const fileExt = premiumVideoFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      
      console.log('Uploading file:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, premiumVideoFile);

      if (uploadError) {
        throw new Error(`Upload error: ${uploadError.message}`);
      }

      console.log('File uploaded successfully:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      const videoUrl = urlData.publicUrl;
      console.log('Video URL:', videoUrl);

      const slug = `${toSlug(premiumVideoTitle)}-${Math.random().toString(36).slice(2, 8)}`;
      const tags = parseTags(premiumVideoCategory);

      const insertData = {
        title: premiumVideoTitle,
        slug,
        content: '',
        excerpt: premiumVideoDescription,
        type: 'article',
        status: 'published',
        is_premium: true, // Premium content
        author_id: userId,
        tags,
        metadata: { video_url: videoUrl, video_type: 'file' },
        published_at: new Date().toISOString(),
      };

      console.log('Inserting premium video data:', insertData);

      const { data, error } = await supabase
        .from('posts')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from insert');
      }

      console.log('Premium video uploaded successfully:', data);

      setPremiumVideoTitle('');
      setPremiumVideoFile(null);
      setPremiumVideoDescription('');
      setPremiumVideoCategory('trading-basics');
      
      // Refresh posts
      console.log('Refreshing posts...');
      await fetchPosts();
      
      alert('Video premium berhasil ditambahkan!');
    } catch (e) {
      console.error('Add premium video failed:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      alert('Gagal menambahkan video premium: ' + errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditVideo = (video: Post) => {
    setEditingVideo(video);
    setEditMode('premium');
    setPremiumVideoTitle(video.title);
    setPremiumVideoDescription(video.excerpt || '');
    setPremiumVideoCategory(video.tags?.find(tag => tag !== 'video') || 'trading-basics');
    setShowEditModal(true);
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!isAdminUser) return;
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', videoId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      alert('Video deleted successfully!');
      await fetchPosts();
    } catch (e) {
      console.error('Delete video failed:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      alert('Failed to delete video: ' + errorMessage);
    }
  };

  const handleUpdateVideo = async () => {
    if (!isAdminUser || !editingVideo) return;
    setSubmitting(true);

    try {
      const supabase = createClient();
      const { data: userResp, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw new Error('Auth error: ' + userError.message);
      const userId = userResp.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const updateData: any = {
        title: premiumVideoTitle,
        excerpt: premiumVideoDescription,
        tags: parseTags(premiumVideoCategory),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', editingVideo.id);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      alert('Video berhasil diperbarui!');
      setEditingVideo(null);
      setEditMode(undefined);
      setShowEditModal(false);
      setPremiumVideoTitle('');
      setPremiumVideoFile(null);
      setPremiumVideoDescription('');
      setPremiumVideoCategory('trading-basics');
      
      await fetchPosts();
    } catch (e) {
      console.error('Update video failed:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      alert('Gagal memperbarui video: ' + errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const cancelEdit = () => {
    setEditingVideo(null);
    setEditMode(undefined);
    setShowEditModal(false);
    setPremiumVideoTitle('');
    setPremiumVideoFile(null);
    setPremiumVideoDescription('');
    setPremiumVideoCategory('trading-basics');
  };

  // Pagination functions
  const getDisplayedPremiumVideos = () => {
    if (showAllPremium) return filteredPosts;
    return filteredPosts.slice(0, videosPerPage);
  };

  const toggleShowAllPremium = () => {
    setShowAllPremium(!showAllPremium);
  };

  // Filter premium video posts
  const premiumVideoPosts = posts.filter(post => 
    post.is_premium && 
    (post.metadata as any)?.video_url
  );

  if (loading) {
    return (
      <div className="min-h-screen pb-12 bg-gradient-to-r from-indigoSteel-dark via-indigoSteel-light to-indigoSteel-dark overflow-x-hidden">
        <div className="container">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card p-6">
                  <div className="h-48 bg-gray-200 rounded mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 bg-gradient-to-r from-indigoSteel-dark via-indigoSteel-light to-indigoSteel-dark overflow-x-hidden">
      <div className="container">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center mb-4">
            <BookOpenIcon className="h-8 w-8 text-primary-600 mr-3" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Trading Blog
            </h1>
            <span className="ml-4 badge badge-warning">Premium Content</span>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl">
            Premium trading content and exclusive video tutorials. 
            <span className="text-yellow-600 font-medium">
              {' '}Upgrade to premium to access all content!
            </span>
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search premium content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="lg:w-48">
              <div className="relative">
                <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input pl-10 appearance-none"
                >
                  {categories.map((category) => (
                    <option className="bg-black bg-opacity-80" key={category.value} value={category.value}>
                      {category.label} ({getCategoryCount(category.value)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-300">
            Showing {filteredPosts.length} of {premiumVideoPosts.length} premium videos
          </p>
        </div>

        {/* Admin Form for Premium Videos */}
        {isAdminUser && (
          <div className="card p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Premium Video (Admin Only)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-900 mb-1">Title</label>
                <input
                  type="text"
                  className="input"
                  value={premiumVideoTitle}
                  onChange={(e) => setPremiumVideoTitle(e.target.value)}
                  placeholder="Video title"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-900 mb-1">Video File</label>
                <input
                  type="file"
                  accept="video/*"
                  className="input"
                  onChange={(e) => setPremiumVideoFile(e.target.files?.[0] || null)}
                  disabled={editingVideo !== null && editMode === 'premium'}
                />
                <p className="text-xs text-gray-300 mt-1">
                  {editingVideo && editMode === 'premium' ? 'File cannot be changed while editing' : 'Upload a video file (MP4, AVI, MOV, etc.)'}
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={premiumVideoDescription}
                  onChange={(e) => setPremiumVideoDescription(e.target.value)}
                  placeholder="Short description about this video..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-900 mb-1">Category</label>
                <select
                  className="input"
                  value={premiumVideoCategory}
                  onChange={(e) => setPremiumVideoCategory(e.target.value)}
                >
                  {categories.slice(1).map((category) => (
                    <option className="bg-black bg-opacity-80" key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <button 
                className="btn btn-primary" 
                onClick={handleAddPremiumVideo} 
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Add Premium Video'}
              </button>
            </div>
            <p className="text-xs text-gray-300 mt-2">
              Premium videos are visible only to premium users.
            </p>
          </div>
        )}

        {/* Premium Videos Grid */}
        {premiumVideoPosts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(filteredPosts.length > 0 ? getDisplayedPremiumVideos() : []).map((post) => {
                const vurl = (post.metadata as any)?.video_url as string | undefined;
                return (
                  <article key={`premium-video-${post.id}`} className="card overflow-hidden hover:shadow-lg transition-shadow relative">
                    <div className="aspect-video bg-gray-200 relative">
                      {isPremiumUser ? (
                        <video src={vurl} className="w-full h-full object-cover" controls />
                      ) : (
                        <>
                          {/* Blurred video background */}
                          <video 
                            src={vurl} 
                            className="w-full h-full object-cover filter blur-sm" 
                            muted 
                            loop
                            style={{ filter: 'blur(8px)' }}
                          />
                          {/* Clickable overlay with upgrade message */}
                          <Link href="/upgrade" className="absolute inset-0">
                            <LoginPrompt 
                              isAuthenticated={true}
                              isPremiumUser={false}
                              title="Premium Content"
                              description="Upgrade to Premium to watch this video"
                              buttonText="Upgrade Now"
                              buttonHref="/upgrade"
                            />
                          </Link>
                        </>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-center mb-2">
                        <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full mr-2">
                          PREMIUM
                        </span>
                        <span className="text-xs text-gray-300">
                      {isPremiumUser ? 'Premium content' : 'Upgrade required'}
                        </span>
                      </div>
                      <Link href={isPremiumUser ? `/videos/${post.slug}` : `/upgrade`} className="block">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 hover:text-primary-700">{post.title}</h3>
                      </Link>
                      {post.excerpt ? (
                        <p className="text-sm text-gray-300 line-clamp-2">{post.excerpt}</p>
                      ) : null}
                      <div className="mt-2 flex items-center text-xs text-gray-900">
                        <UserIcon className="h-3 w-3 mr-1" />
                        {post.author?.full_name || 'Admin'}
                        <ClockIcon className="h-3 w-3 ml-3 mr-1" />
                        {formatDate(post.published_at || post.created_at)}
                      </div>
                      {post.tags && post.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs badge badge-warning text-yellow-900 px-2 py-1 rounded"
                            >
                              {tag.replace('-', ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                      {isAdminUser && (
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleEditVideo(post)}
                            className="btn btn-outline btn-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteVideo(post.id)}
                            className="btn btn-outline btn-sm text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {filteredPosts.length === 0 && (
              <div className="text-center text-gray-300 mt-4">No results match your filters.</div>
            )}
            {filteredPosts.length > videosPerPage && (
              <div className="text-center mt-8">
                <button
                  onClick={toggleShowAllPremium}
                  className="btn btn-outline"
                >
              {showAllPremium ? 'Show Less' : `See All (${filteredPosts.length} videos)`}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-12">
            {isPremiumUser ? (
              <div className="text-center text-gray-300">
                No premium videos yet.
              </div>
            ) : (
              <Link href="/upgrade" className="block max-w-3xl mx-auto rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow">
                <div className="relative bg-gradient-to-r from-gray-800 to-gray-700 text-white p-10 text-center">
                  <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpenIcon className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-2xl font-bold mb-2">Premium Content</div>
                  <div className="text-sm opacity-90 mb-4">Upgrade to access all premium trading videos.</div>
                  <span className="btn btn-primary btn-sm">Upgrade Now</span>
                </div>
              </Link>
            )}
          </div>
        )}

      </div>

      {/* Edit Modal */}
      {showEditModal && editingVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-black bg-opacity-50 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-grey-300">
                  Edit Premium Video
                </h3>
                <button
                  onClick={cancelEdit}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-grey-300 mb-1">Title</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={premiumVideoTitle}
                    onChange={(e) => setPremiumVideoTitle(e.target.value)}
                    placeholder="Video title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-grey-300 mb-1">Description</label>
                  <textarea
                    className="input w-full"
                    rows={3}
                    value={premiumVideoDescription}
                    onChange={(e) => setPremiumVideoDescription(e.target.value)}
                    placeholder="Short description about this video..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-grey-300 mb-1">Category</label>
                  <select
                    className="input w-full"
                    value={premiumVideoCategory}
                    onChange={(e) => setPremiumVideoCategory(e.target.value)}
                  >
                    {categories.slice(1).map((category) => (
                      <option className="bg-black bg-opacity-80" key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleUpdateVideo}
                  className="btn btn-primary flex-1"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Update Video'}
                </button>
                <button
                  onClick={cancelEdit}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}