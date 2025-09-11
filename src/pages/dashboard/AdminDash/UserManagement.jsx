import React, { useEffect, useState } from 'react';
import { Button, message, Modal, Spin } from 'antd';
import { RiDeleteBin3Line } from 'react-icons/ri';
import axios from 'axios';
import 'antd/dist/reset.css';

const baseURL = "http://127.0.0.1:8000/api/v1/admin";

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${baseURL}/users/summary-full`);
      setUsers(res.data.users || []);
      console.log("Fetched users:", res.data.users);
    } catch (err) {
      console.error("Fetch users error:", err);
      message.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  
  // Delete user
  const deleteUser = async (id) => {
    try {
      await axios.delete(`${baseURL}/users/${id}`);
      message.success("User deleted successfully");
      fetchUsers();
    } catch (error) {
      message.error("Failed to delete user");
    }
  };


  // Table head
  const headCells = ["Users", "Joining Date", "Status", ""];

  return (
    <div style={{ position: "relative" }}>
      {loading && (
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", textAlign: "center" }}>
          <Spin size="large" />
        </div>
      )}

      <table
        style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}
        border="1"
        cellPadding="8"
        cellSpacing="0"
      >
        <thead>
          <tr>
            {headCells.map((label, index) => (
              <th
                key={index}
                style={{ padding: "8px 12px", backgroundColor: "#f5f5f5", textAlign: "left" }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {users.map((user) => {
            const userId = user._id || user.id;
            return (
              <tr key={userId}>
                <td style={{ padding: "8px 12px", wordWrap: "break-word" }}>
                  {user.username || user.email || "Unknown"}
                </td>
                <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                </td>
                <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                  {user.is_active ? "Active" : "Inactive"}
                </td>
                <td style={{ padding: "8px 12px", width: 120 }}>
                  <Button
                    type="primary"
                    danger
                    icon={<RiDeleteBin3Line />}
                    onClick={() => deleteUser(userId)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default UsersManagement;
