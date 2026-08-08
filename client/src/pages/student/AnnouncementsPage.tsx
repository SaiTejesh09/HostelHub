import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Megaphone, Pin, Calendar, Tag, AlertCircle, Filter } from 'lucide-react';
import api from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: 'GENERAL' | 'ACADEMIC' | 'MAINTENANCE' | 'EVENT' | 'EMERGENCY';
  isPinned: boolean;
  createdAt: string;
  expiresAt?: string;
  author: {
    email: string;
    studentProfile?: { name: string };
  };
}

export default function AnnouncementsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['announcements', selectedCategory, selectedPriority],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedPriority) params.append('priority', selectedPriority);
      const res = await api.get(`/announcements?${params.toString()}`);
      return res.data;
    },
  });

  const announcements: Announcement[] = response?.data || [];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 flex items-center gap-1"><AlertCircle size={12} /> Urgent</span>;
      case 'HIGH':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">High</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Medium</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">Low</span>;
    }
  };

  const getCategoryBadge = (category: string) => {
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">{category}</span>;
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="text-indigo-600" size={28} />
              Hostel Notice Board & Announcements
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Stay updated with recent notices, emergency alerts, and events.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
              <Filter size={16} className="text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-gray-700 cursor-pointer text-sm"
              >
                <option value="">All Categories</option>
                <option value="GENERAL">General</option>
                <option value="ACADEMIC">Academic</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="EVENT">Event</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-gray-700 cursor-pointer text-sm"
              >
                <option value="">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading notices...</div>
        ) : isError ? (
          <div className="text-center py-12 text-red-500">Failed to load announcements.</div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            <Megaphone size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium text-gray-700">No announcements found</p>
            <p className="text-sm text-gray-500">Check back later for news and updates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {announcements.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-xl border transition-shadow hover:shadow-md p-5 flex flex-col justify-between ${
                  item.isPinned ? 'border-indigo-300 ring-1 ring-indigo-200 bg-indigo-50/20' : 'border-gray-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.isPinned && (
                        <span className="bg-indigo-600 text-white p-1 rounded-md" title="Pinned Notice">
                          <Pin size={14} className="fill-current" />
                        </span>
                      )}
                      {getCategoryBadge(item.category)}
                      {getPriorityBadge(item.priority)}
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                      <Calendar size={12} />
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm whitespace-pre-line leading-relaxed mb-4">
                    {item.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                  <span>Posted by: {item.author.studentProfile?.name || item.author.email}</span>
                  {item.expiresAt && (
                    <span>Expires: {new Date(item.expiresAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
