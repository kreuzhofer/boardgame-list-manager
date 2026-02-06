import { useEffect, useState } from 'react';
import { accountsApi, ApiError } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Account } from '../types/account';

export function AdminPage() {
  const { account } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = account?.role === 'admin';

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await accountsApi.getAll();
      setAccounts(response.accounts);
      setError(null);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Konnte Konten nicht laden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAccounts();
    }
  }, [isAdmin]);

  const handleRoleToggle = async (target: Account) => {
    const nextRole = target.role === 'admin' ? 'account_owner' : 'admin';
    await accountsApi.setRole(target.id, nextRole);
    await loadAccounts();
  };

  const handleStatusToggle = async (target: Account) => {
    const nextStatus = target.status === 'active' ? 'deactivated' : 'active';
    await accountsApi.setStatus(target.id, nextStatus);
    await loadAccounts();
  };

  const handlePasswordReset = async (target: Account) => {
    const newPassword = window.prompt(`Neues Passwort für ${target.email}:`);
    if (!newPassword) {
      return;
    }
    await accountsApi.resetPassword(target.id, newPassword);
    alert('Passwort zurückgesetzt. Alle Sitzungen wurden beendet.');
  };

  const handleForceLogout = async (target: Account) => {
    const confirm = window.confirm(`Alle Sitzungen von ${target.email} beenden?`);
    if (!confirm) {
      return;
    }
    await accountsApi.forceLogout(target.id);
  };

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Admin</h2>
        <p className="text-sm text-gray-600">
          Du hast keine Berechtigung für diesen Bereich.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Admin</h2>
        <p className="text-sm text-gray-500">Lade Konten...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Admin</h2>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3">
          {error}
        </div>
      )}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">E-Mail</th>
              <th className="text-left px-4 py-3 font-medium">Rolle</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((entry) => (
              <tr key={entry.id} className="border-t border-gray-100">
                <td className="px-4 py-3 text-gray-800">{entry.email}</td>
                <td className="px-4 py-3 text-gray-600">{entry.role}</td>
                <td className="px-4 py-3 text-gray-600">{entry.status}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleRoleToggle(entry)}
                      className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      Rolle wechseln
                    </button>
                    <button
                      onClick={() => handleStatusToggle(entry)}
                      className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                    >
                      {entry.status === 'active' ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button
                      onClick={() => handlePasswordReset(entry)}
                      className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100"
                    >
                      Passwort reset
                    </button>
                    <button
                      onClick={() => handleForceLogout(entry)}
                      className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      Sitzungen beenden
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-gray-500" colSpan={4}>
                  Keine Konten gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminPage;
