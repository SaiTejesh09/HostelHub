import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus, Trash2, Pin, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: 'GENERAL' | 'ACADEMIC' | 'MAINTENANCE' | 'EVENT' | 'EMERGENCY';
  isPinned: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function ManageAnnouncementsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'MEDIUM',
    category: 'GENERAL',
    isPinned: false,
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['manage-announcements'],
    queryFn: async () => {
      const res = await api.get('/announcements/manage/all');
      return res.data;
    },
  });

  const announcements: Announcement[] = response?.data || [];

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingItem) {
        return api.put(`/announcements/${editingItem.id}`, data);
      }
      return api.post('/announcements', data);
    },
    onSuccess: () => {
      toast.success(editingItem ? 'Announcement updated' : 'Announcement created');
      queryClient.invalidateQueries({ queryKey: ['manage-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save announcement');
    },
  });

  const pinMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/announcements/${id}/pin`);
    },
    onSuccess: () => {
      toast.success('Pin status updated');
      queryClient.invalidateQueries({ queryKey: ['manage-announcements'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/announcements/${id}`);
    },
    onSuccess: () => {
      toast.success('Announcement deleted');
      queryClient.invalidateQueries({ queryKey: ['manage-announcements'] });
    },
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({ title: '', content: '', priority: 'MEDIUM', category: 'GENERAL', isPinned: false });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Announcement) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      content: item.content,
      priority: item.priority,
      category: item.category,
      isPinned: item.isPinned,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="text-indigo-600" size={28} />
              Manage Announcements
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Create, edit, pin, and manage hostel notices and emergency broadcasts.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            <Plus size={18} />
            Post Announcement
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading management board...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Priority</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {announcements.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => pinMutation.mutate(item.id)}
                        className={`p-1.5 rounded-lg border ${
                          item.isPinned
                            ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                            : 'bg-gray-50 text-gray-400 border-gray-200 hover:text-gray-600'
                        }`}
                        title={item.isPinned ? 'Unpin' : 'Pin to top'}
                      >
                        <Pin size={16} />
                      </button>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{item.title}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 font-medium text-xs">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md font-semibold text-xs ${
                        item.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                        item.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                        item.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-md"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(item.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-md"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingItem ? 'Edit Announcement' : 'Post New Announcement'}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 border-gray-300"
                    placeholder="Notice title..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-lg text-sm border-gray-300"
                    >
                      <option value="GENERAL">General</option>
                      <option value="ACADEMIC">Academic</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="EVENT">Event</option>
                      <option value="EMERGENCY">Emergency</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-lg text-sm border-gray-300"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Content</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500"
                    placeholder="Write notice details..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPinned"
                    checked={formData.isPinned}
                    onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isPinned" className="text-sm text-gray-700 font-medium cursor-pointer">
                    Pin notice to top of student feed
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Saving...' : editingItem ? 'Save Changes' : 'Post Announcement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
