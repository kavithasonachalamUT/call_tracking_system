import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { userService } from '../../services/userService';

export const ReassignCallModal = ({
  isOpen,
  onClose,
  call,
  onReassign,
}) => {
  const [agents, setAgents] = useState([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !call) return;
    let isMounted = true;

    const fetchAgents = async () => {
      try {
        setIsLoadingAgents(true);
        const users = await userService.getUsers({ limit: 100 });
        if (isMounted) {
          setAgents(users);
          if (users.length > 0) {
            setSelectedAgentId(String(call.agent_id || users[0].id));
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to fetch agents list.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingAgents(false);
        }
      }
    };

    fetchAgents();

    return () => {
      isMounted = false;
    };
  }, [isOpen, call]);

  if (!call || !isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAgentId) {
      setError('Please select an agent.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onReassign(call.id, parseInt(selectedAgentId, 10));
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to reassign call.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reassign Call to Agent"
      maxWidth="max-w-md"
      footer={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isSubmitting || isLoadingAgents || agents.length === 0}
          >
            {isSubmitting ? 'Reassigning...' : 'Reassign Call'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Call ID:</span>
            <span className="font-semibold text-slate-800">#{call.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current Agent:</span>
            <span className="font-semibold text-slate-800">{call.agent_name || `Agent #${call.agent_id}`}</span>
          </div>
        </div>

        <div>
          <label htmlFor="target-agent" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Select New Agent <span className="text-rose-500">*</span>
          </label>
          {isLoadingAgents ? (
            <div className="h-[46px] flex items-center px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400">
              Loading active agents...
            </div>
          ) : (
            <select
              id="target-agent"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-[46px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
            >
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.email}) — {ag.role?.toUpperCase()}
                </option>
              ))}
            </select>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default ReassignCallModal;
