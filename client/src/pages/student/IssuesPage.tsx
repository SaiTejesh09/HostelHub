import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MessageSquare, Send, X, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { useAuthStore } from '../../stores/authStore';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'CARPENTRY', label: 'Carpentry' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'IT', label: 'IT/Network' },
  { value: 'OTHER', label: 'Other' },
];

const STATUSES = [
  { value: '', label: 'All Status' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

interface IssueFormData {
  title: string;
  description: string;
  category: string;
  location: string;
}

const statusColor: Record<string, string> = {
  OPEN: 'badge-danger',
  IN_PROGRESS: 'badge-warning',
  RESOLVED: 'badge-success',
  CLOSED: 'badge-muted',
};

export default function IssuesPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState('');
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const params = new URLSearchParams({ page: String(page), limit: '10' });
  if (category) params.set('category', category);
  if (status) params.set('status', status);

  const { data, isLoading } = useQuery({
    queryKey: ['issues', page, category, status],
    queryFn: () => api.get(`/issues?${params}`).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: IssueFormData) => api.post('/issues', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issues'] });
      toast.success('Maintenance issue submitted successfully');
      setShowForm(false);
      setForm({ title: '', description: '', category: 'PLUMBING', location: '' });
    },
    onError: (e: any) => {
      const data = e.response?.data;
      if (data?.errors && data.errors.length > 0) {
        toast.error(data.errors[0].message);
      } else {
        toast.error(data?.message || 'Failed to submit');
      }
    },
  });

  const addResponse = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      api.post(`/issues/${id}/responses`, { message }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['issue-detail'] }); setResponse(''); toast.success('Response added'); },
  });

  useEffect(() => {
    const socket = getSocket();
    
    const handleStatusUpdated = (data: any) => {
      qc.invalidateQueries({ queryKey: ['issues'] });
      if (selectedIssue?.id === data.issueId) {
        qc.invalidateQueries({ queryKey: ['issue-detail', data.issueId] });
      }
    };

    const handleNewResponse = (data: any) => {
      if (selectedIssue?.id === data.issueId) {
        qc.invalidateQueries({ queryKey: ['issue-detail', data.issueId] });
      } else {
        qc.invalidateQueries({ queryKey: ['issues'] });
      }
    };

    socket.on('issue:status_updated', handleStatusUpdated);
    socket.on('issue:new_response', handleNewResponse);

    return () => {
      socket.off('issue:status_updated', handleStatusUpdated);
      socket.off('issue:new_response', handleNewResponse);
    };
  }, [qc, selectedIssue]);

  const { data: detail } = useQuery({
    queryKey: ['issue-detail', selectedIssue?.id],
    queryFn: () => api.get(`/issues/${selectedIssue?.id}`).then((r) => r.data.data),
    enabled: !!selectedIssue,
  });

  const [form, setForm] = useState<IssueFormData>({
    title: '',
    description: '',
    category: 'PLUMBING',
    location: '',
  });

  return (
    <DashboardLayout title="Maintenance Issues">
      <div className="page" style={{ padding: '24px 20px', maxWidth: 1000, margin: '0 auto' }}>
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 800 }}>
              <Wrench size={26} color="var(--color-primary)" />
              Maintenance Issues
            </h1>
            <p className="page-subtitle" style={{ marginTop: 6 }}>Report and track maintenance issues in your room or block</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Report Issue
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <select
            className="form-input form-select"
            style={{ width: 'auto', minWidth: 160 }}
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          >
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            className="form-input form-select"
            style={{ width: 'auto', minWidth: 140 }}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Issues List */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
            ))}
          </div>
        ) : data?.data?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.data.map((i: any) => (
              <div
                key={i.id}
                className="card animate-fade-in"
                style={{ padding: '16px 20px', cursor: 'pointer' }}
                onClick={() => setSelectedIssue(i)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span className="badge badge-muted">{i.category.replace('_', ' ')}</span>
                      {i.location && <span className="badge badge-blue">{i.location}</span>}
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }} className="truncate">{i.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }} className="truncate">
                      {i.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <span className={`badge ${statusColor[i.status] || 'badge-muted'}`}>{i.status.replace('_', ' ')}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {new Date(i.createdAt).toLocaleDateString()}
                    </span>
                    {i._count?.responses > 0 && (
                      <span style={{ fontSize: 12, color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                        <MessageSquare size={12} /> {i._count.responses}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {data.pagination && data.pagination.totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
                <button className="btn btn-secondary btn-sm" disabled={!data.pagination.hasPrev} onClick={() => setPage(page - 1)}>
                  Previous
                </button>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                  Page {data.pagination.page} of {data.pagination.totalPages}
                </span>
                <button className="btn btn-secondary btn-sm" disabled={!data.pagination.hasNext} onClick={() => setPage(page + 1)}>
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><Wrench size={32} /></div>
              <h3>No issues found</h3>
              <p>Report a maintenance issue using the button above</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Issue Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Report Issue</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    className="form-input"
                    placeholder="Brief title (e.g. Leaking tap in bathroom)"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Category</label>
                    <select
                      className="form-input form-select"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      {CATEGORIES.filter((c) => c.value).map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Location</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Room 203"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input form-textarea"
                    placeholder="Describe the issue in detail..."
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={createMutation.isPending || !form.title || !form.description || !form.location}
                onClick={() => createMutation.mutate(form)}
              >
                {createMutation.isPending ? 'Submitting...' : 'Submit Issue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <div className="modal-overlay" onClick={() => setSelectedIssue(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>{detail?.title || selectedIssue.title}</h2>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <span className={`badge ${statusColor[selectedIssue.status]}`}>
                    {selectedIssue.status}
                  </span>
                  {selectedIssue.location && <span className="badge badge-blue">{selectedIssue.location}</span>}
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedIssue(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
                {detail?.description || selectedIssue.description}
              </p>

              {/* Responses */}
              <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                Updates ({detail?.responses?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20, maxHeight: 280, overflowY: 'auto' }}>
                {detail?.responses?.map((r: any) => (
                  <div key={r.id} style={{ padding: 16, background: r.user?.id === user?.id ? 'rgba(99,102,241,0.06)' : '#f9fafb', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 700, marginBottom: 6 }}>
                      {r.user?.studentProfile?.name || r.user?.role || 'Staff'} <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>· {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.5 }}>{r.message}</p>
                  </div>
                ))}
                {(!detail?.responses || detail.responses.length === 0) && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)' }}>
                    <p style={{ fontSize: 14 }}>No updates yet</p>
                  </div>
                )}
              </div>

              {/* Add Response */}
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  className="form-input"
                  placeholder="Add a comment..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && response.trim()) {
                      addResponse.mutate({ id: selectedIssue.id, message: response });
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-primary"
                  disabled={!response.trim() || addResponse.isPending}
                  onClick={() => addResponse.mutate({ id: selectedIssue.id, message: response })}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
