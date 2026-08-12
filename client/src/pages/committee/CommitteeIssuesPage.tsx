import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

const STATUSES = ['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const statusColor: Record<string, string> = {
  OPEN: 'badge-danger', IN_PROGRESS: 'badge-warning', RESOLVED: 'badge-success', CLOSED: 'badge-muted',
};

export default function CommitteeIssuesPage() {
  const [filter, setFilter] = useState('OPEN');
  const [selected, setSelected] = useState<any>(null);
  const [response, setResponse] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['committee-issues', filter],
    queryFn: () => api.get(`/issues?${filter ? `status=${filter}&` : ''}limit=50`).then((r) => r.data),
  });

  const { data: detail } = useQuery({
    queryKey: ['issue-detail', selected?.id],
    queryFn: () => api.get(`/issues/${selected?.id}`).then((r) => r.data.data),
    enabled: !!selected,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/issues/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['committee-issues'] }); toast.success('Status updated'); },
  });

  const addResponse = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      api.post(`/issues/${id}/responses`, { message }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['issue-detail'] }); setResponse(''); toast.success('Response added'); },
  });

  return (
    <DashboardLayout title="Manage Issues">
      <div className="page" style={{ padding: '24px 20px', maxWidth: 1200, margin: '0 auto' }}>
        <div className="page-header" style={{ marginBottom: 24 }}>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 800 }}>
            <Wrench size={26} color="var(--color-primary)" />
            Manage Maintenance Issues
          </h1>
          <p className="page-subtitle" style={{ marginTop: 6 }}>Review and resolve student maintenance issues</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`btn ${filter === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 24, alignItems: 'start' }}>
          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {isLoading ? [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />) :
              data?.data?.map((i: any) => (
                <div
                  key={i.id}
                  className="card animate-fade-in"
                  style={{ padding: '16px 20px', cursor: 'pointer', borderColor: selected?.id === i.id ? 'var(--color-primary)' : undefined, transition: 'all 0.2s' }}
                  onClick={() => setSelected(i)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span className={`badge ${statusColor[i.status] || 'badge-muted'}`}>{i.status.replace('_', ' ')}</span>
                        <span className="badge badge-muted">{i.category.replace('_', ' ')}</span>
                        {i.location && <span className="badge badge-blue">{i.location}</span>}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }} className="truncate">{i.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {i.user?.studentProfile?.name || 'Unknown'} {i.user?.studentProfile?.roomNumber && `(${i.user.studentProfile.roomNumber})`} · {new Date(i.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--color-primary-light)', fontWeight: 600 }}>{i._count?.responses || 0} updates</span>
                  </div>
                </div>
              ))}
            {!isLoading && (!data?.data || data.data.length === 0) && (
              <div className="card"><div className="empty-state" style={{ padding: '40px 0' }}>
                <div className="empty-state-icon"><Check size={32} /></div>
                <h3>No {filter || 'maintenance'} issues</h3>
                <p>All clear in this category.</p>
              </div></div>
            )}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="card animate-fade-in" style={{ padding: 24, position: 'sticky', top: 'calc(var(--navbar-height) + 24px)', maxHeight: 'calc(100vh - var(--navbar-height) - 60px)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>{detail?.title}</h3>
                  {selected.location && <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>Location: {selected.location}</div>}
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)}><X size={16} /></button>
              </div>

              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>{detail?.description}</p>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Update Status</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
                    <button
                      key={s}
                      className={`btn btn-sm ${detail?.status === s ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => updateStatus.mutate({ id: selected.id, status: s })}
                      disabled={updateStatus.isPending}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 12 }}>Updates</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {detail?.responses?.map((r: any) => (
                    <div key={r.id} style={{ padding: 12, background: '#f9fafb', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>
                        {r.user?.studentProfile?.name || r.user?.role || 'Staff'} <span style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>· {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p style={{ fontSize: 13, lineHeight: 1.4 }}>{r.message}</p>
                    </div>
                  ))}
                  {(!detail?.responses || detail.responses.length === 0) && (
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: '10px 0' }}>No updates yet</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
                <input className="form-input" style={{ flex: 1 }} placeholder="Add an update..." value={response} onChange={(e) => setResponse(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && response.trim()) addResponse.mutate({ id: selected.id, message: response }); }} />
                <button className="btn btn-primary" disabled={!response.trim()} onClick={() => addResponse.mutate({ id: selected.id, message: response })}>Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
