"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchActivityLogs } from "../../api";
import { FiFilter } from "react-icons/fi";

// Define ActivityLog interface to match backend model
interface ActivityLog {
  id: number;
  username: string;  // Change from user.username to just username
  action_type: string;
  description: string;
  timestamp: string;
  ip_address: string | null;
}

export default function AdminActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering state
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Predefined action types from backend
  const ACTION_TYPES = [
    'USER_REGISTRATION',
    'PASSWORD_CHANGE', 
    'ADMIN_MODERATION', 
    'CONTENT_FLAG', 
    'LOGIN'
  ];

  // Fetch logs on component mount and when filters change
  useEffect(() => {
    const loadLogs = async () => {
      try {
        setIsLoading(true);
        const response = await fetchActivityLogs({
          action_type: actionTypeFilter,
          start_date: startDate,
          end_date: endDate
        });
        
        if (response.error) {
          setError(response.error);
        } else {
          setLogs(response as ActivityLog[]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    loadLogs();
  }, [actionTypeFilter, startDate, endDate]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading activity logs...</div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar - Consistent with previous page */}
      <nav className="bg-white shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center py-4 px-6">
          <h1 className="text-xl font-semibold text-gray-800">Activity Logs</h1>
          <div className="space-x-6 text-gray-600">
            <Link href="/admin/users" className="hover:text-blue-500 transition">Users</Link>
            <Link href="/admin/sales" className="hover:text-blue-500 transition">View Sales</Link>
            <Link href="/" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">Home</Link>
          </div>
        </div>
      </nav>

      {/* Logs Container */}
      <div className="max-w-6xl mx-auto mt-10 bg-white p-6 rounded-lg shadow-lg">
        {/* Filtering Section */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-700">System Activity Logs</h2>
          
          <div className="flex items-center space-x-4">
            {/* Action Type Filter */}
            <select 
              value={actionTypeFilter}
              onChange={(e) => setActionTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              {ACTION_TYPES.map(type => (
                <option key={type} value={type}>
                  {type.replace('_', ' ').toLowerCase()}
                </option>
              ))}
            </select>

            {/* Date Filters */}
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Start Date"
            />
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="End Date"
            />
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Timestamp</th>
                <th className="py-3 px-6 text-left">Username</th>
                <th className="py-3 px-6 text-left">Action Type</th>
                <th className="py-3 px-6 text-left">Description</th>
                <th className="py-3 px-6 text-left">IP Address</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-medium">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-500">No activity logs found</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-100 transition">
                    <td className="py-3 px-6">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-6">@{log.username}</td>
                    <td className="py-3 px-6">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {log.action_type.replace('_', ' ').toLowerCase()}
                      </span>
                    </td>
                    <td className="py-3 px-6">{log.description}</td>
                    <td className="py-3 px-6">{log.ip_address || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}