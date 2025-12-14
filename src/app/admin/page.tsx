'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUser, isAdmin, makeUserAdmin, removeUserAdmin } from '@/lib/auth';
import { Profile } from '@/lib/types';
import {
  UserIcon,
  ShieldCheckIcon,
  UserMinusIcon,
  UserPlusIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

interface Testimonial {
  id: string;
  name: string;
  content: string;
  avatar: string;
  created_at: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'testimonials'>('users');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    avatar: ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const adminStatus = await isAdmin();
      setIsAdminUser(adminStatus);

      if (adminStatus) {
        await fetchUsers();
        await fetchTestimonials();
      }
    };

    bootstrap();
  }, []);

  const fetchUsers = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMakeAdmin = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await makeUserAdmin(userId);
      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error making user admin:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await removeUserAdmin(userId);
      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error removing admin:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const fetchTestimonials = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
    }
  };

  const handleAddTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('add');
    try {
      const supabase = createClient();
      let avatarUrl = '';

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(`testimonials/${fileName}`, avatarFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(`testimonials/${fileName}`);

        avatarUrl = publicUrl;
      }

      const { error } = await supabase
        .from('testimonials')
        .insert([{
          name: formData.name,
          content: formData.content,
          avatar: avatarUrl
        }]);

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      setShowAddModal(false);
      setFormData({ name: '', content: '', avatar: '' });
      setAvatarFile(null);
      await fetchTestimonials();
    } catch (error: any) {
      console.error('Error adding testimonial:', error);
      alert(`Gagal menambahkan testimonial: ${error.message || 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTestimonial) return;

    setActionLoading('edit');
    try {
      const supabase = createClient();
      let avatarUrl = editingTestimonial.avatar;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(`testimonials/${fileName}`, avatarFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(`testimonials/${fileName}`);

        avatarUrl = publicUrl;
      }

      const { error } = await supabase
        .from('testimonials')
        .update({
          name: formData.name,
          content: formData.content,
          avatar: avatarUrl
        })
        .eq('id', editingTestimonial.id);

      if (error) throw error;

      setShowEditModal(false);
      setEditingTestimonial(null);
      setFormData({ name: '', content: '', avatar: '' });
      setAvatarFile(null);
      await fetchTestimonials();
    } catch (error) {
      console.error('Error editing testimonial:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus testimonial ini?')) return;

    setActionLoading(id);
    try {
      const supabase = createClient();

      // First, get the testimonial to check if it has an avatar
      const { data: testimonial, error: fetchError } = await supabase
        .from('testimonials')
        .select('avatar')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Delete the testimonial from database
      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // If testimonial had an avatar, try to delete it from storage
      if (testimonial?.avatar) {
        try {
          // Extract file path from URL
          const urlParts = testimonial.avatar.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const filePath = `testimonials/${fileName}`;

          await supabase.storage
            .from('avatars')
            .remove([filePath]);
        } catch (storageError) {
          console.warn('Failed to delete avatar from storage:', storageError);
          // Don't throw error here as the testimonial is already deleted
        }
      }

      await fetchTestimonials();
    } catch (error: any) {
      console.error('Error deleting testimonial:', error);
      alert(`Gagal menghapus testimonial: ${error.message || 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openEditModal = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setFormData({
      name: testimonial.name,
      content: testimonial.content,
      avatar: testimonial.avatar
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', content: '', avatar: '' });
    setAvatarFile(null);
    setEditingTestimonial(null);
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container">
          <div className="animate-pulse">
            <div className="h-8 bg-white/20 rounded w-1/4 mb-8"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="card p-6">
                  <div className="h-6 bg-white/20 rounded mb-2"></div>
                  <div className="h-4 bg-white/20 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdminUser) {
    return (
      <div className="min-h-screen py-12">
        <div className="container">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Akses Ditolak</h1>
            <p className="text-white/80">
              Anda tidak memiliki izin untuk mengakses halaman admin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <ShieldCheckIcon className="h-8 w-8 text-primary-600 mr-3" />
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Admin Panel
            </h1>
          </div>
          <p className="text-xl text-white/80">
            Kelola pengguna, role admin, dan testimonial aplikasi.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-white/10 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'users'
                  ? 'bg-primary-600 text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <UserIcon className="h-4 w-4 inline mr-2" />
              Pengguna
            </button>
            <button
              onClick={() => setActiveTab('testimonials')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'testimonials'
                  ? 'bg-primary-600 text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4 inline mr-2" />
              Testimonial
            </button>
          </div>
        </div>

        {activeTab === 'users' && (
          <>
            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder="Cari pengguna..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Users List */}
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="card p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {user.full_name || 'Tidak ada nama'}
                        </h3>
                        <p className="text-white/80">{user.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`badge ${user.is_admin ? 'badge-success' : 'badge-secondary'}`}>
                            {user.is_admin ? 'Admin' : 'User'}
                          </span>
                          <span className={`badge ${user.membership_type === 'premium' ? 'badge-warning' : 'badge-secondary'}`}>
                            {user.membership_type === 'premium' ? 'Premium' : 'Free'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {user.is_admin ? (
                        <button
                          onClick={() => handleRemoveAdmin(user.id)}
                          disabled={actionLoading === user.id}
                          className="btn btn-outline btn-error btn-sm"
                        >
                          <UserMinusIcon className="h-4 w-4 mr-1" />
                          {actionLoading === user.id ? 'Loading...' : 'Hapus Admin'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleMakeAdmin(user.id)}
                          disabled={actionLoading === user.id}
                          className="btn btn-primary btn-sm"
                        >
                          <UserPlusIcon className="h-4 w-4 mr-1" />
                          {actionLoading === user.id ? 'Loading...' : 'Jadikan Admin'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <UserIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Tidak ada pengguna ditemukan
                </h3>
                <p className="text-white/80">
                  {searchTerm ? 'Coba ubah kata kunci pencarian.' : 'Belum ada pengguna terdaftar.'}
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'testimonials' && (
          <>
            {/* Testimonials Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Kelola Testimonial</h2>
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="btn btn-primary"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Tambah Testimonial
              </button>
            </div>

            {/* Testimonials List */}
            <div className="space-y-4">
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className="card p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        {testimonial.avatar ? (
                          <img
                            src={testimonial.avatar}
                            alt={testimonial.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <UserIcon className="h-6 w-6 text-primary-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">
                          {testimonial.name}
                        </h3>
                        <p className="text-white/80 mt-2">{testimonial.content}</p>
                        <p className="text-white/60 text-xs mt-2">
                          Dibuat: {new Date(testimonial.created_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(testimonial)}
                        disabled={actionLoading === testimonial.id}
                        className="btn btn-outline btn-secondary btn-sm"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTestimonial(testimonial.id)}
                        disabled={actionLoading === testimonial.id}
                        className="btn btn-outline btn-error btn-sm"
                      >
                        {actionLoading === testimonial.id ? 'Loading...' : <TrashIcon className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {testimonials.length === 0 && (
              <div className="text-center py-12">
                <ChatBubbleLeftRightIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Belum ada testimonial
                </h3>
                <p className="text-white/80">
                  Tambahkan testimonial pertama untuk ditampilkan di halaman utama.
                </p>
              </div>
            )}
          </>
        )}

        {/* Add Testimonial Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">Tambah Testimonial</h3>
              <form onSubmit={handleAddTestimonial} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Nama
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full"
                    placeholder="Masukkan nama"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Konten
                  </label>
                  <textarea
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="input w-full h-24 resize-none"
                    placeholder="Masukkan testimonial"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Avatar (Opsional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    className="input w-full"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn btn-outline flex-1"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === 'add'}
                    className="btn btn-primary flex-1"
                  >
                    {actionLoading === 'add' ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Testimonial Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">Edit Testimonial</h3>
              <form onSubmit={handleEditTestimonial} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Nama
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full"
                    placeholder="Masukkan nama"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Konten
                  </label>
                  <textarea
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="input w-full h-24 resize-none"
                    placeholder="Masukkan testimonial"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Avatar (Opsional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    className="input w-full"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="btn btn-outline flex-1"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === 'edit'}
                    className="btn btn-primary flex-1"
                  >
                    {actionLoading === 'edit' ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

