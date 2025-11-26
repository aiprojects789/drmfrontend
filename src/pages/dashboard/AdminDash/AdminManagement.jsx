import React, { useEffect, useState } from 'react';
import { Table, Input, Button, message, Modal, Form } from 'antd';
import axios from 'axios';
import { baseURL } from '../../../utils/backend_url'; // adjust path if needed



const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${baseURL}/users/summary-full`);
      setUsers(res.data.admin_users || []);
    } catch (error) {
      message.error("Failed to fetch users");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    (user.username || user.email || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

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

  // Open Edit Modal
  const editAdmin = (user) => {
    setCurrentUser(user);
    editForm.setFieldsValue(user); // populate edit form
    setIsModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!currentUser) return message.error("No user selected");
    const userId = currentUser._id || currentUser.id;
    if (!userId) return message.error("User ID not found");

    try {
      const values = await editForm.validateFields();
      await axios.put(`${baseURL}/users/${userId}`, values);
      message.success("User updated successfully");
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      const data = error.response?.data;
      if (typeof data?.detail === "string") {
        editForm.setFields([{ name: "email", errors: [data.detail] }]);
      } else if (Array.isArray(data?.detail)) {
        const fieldsErrors = data.detail.map(err => ({
          name: err.loc?.[1] || "username",
          errors: [err.msg]
        }));
        editForm.setFields(fieldsErrors);
      } else {
        message.error("Failed to update user");
      }
    }
  };

  // Open Add Admin Modal
  const openAddModal = () => {
    setCurrentUser(null);
    addForm.resetFields();
    addForm.setFieldsValue({ role: "admin" });
    setIsAddModalOpen(true);
  };

  // Handle Add Admin Submit
  const handleAddAdmin = async () => {
    try {
      const values = await addForm.validateFields();
      await axios.post(`${baseURL}/create-admin`, values);
      message.success("Admin created successfully");
      setIsAddModalOpen(false);
      addForm.resetFields();
      fetchUsers();
    } catch (error) {
      const data = error.response?.data;
      if (!data) {
        message.error("Failed to create admin");
        return;
      }
      if (typeof data.detail === "string") {
        addForm.setFields([{ name: "email", errors: [data.detail] }]);
      } else if (Array.isArray(data.detail)) {
        const fieldsErrors = data.detail.map(err => ({
          name: err.loc?.[1] || "username",
          errors: [err.msg]
        }));
        addForm.setFields(fieldsErrors);
      } else {
        message.error("Failed to create admin");
      }
    }
  };

  const columns = [
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
      render: (_, user) => user.username || user.email || "Unknown",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (_, user) => user.role || "admin",
    },
    {
      title: "Action",
      key: "action",
      render: (_, user) => (
        <>
          <Button
            type="primary"
            style={{ marginRight: 8 }}
            onClick={() => editAdmin(user)}
          >
            Edit
          </Button>
          <Button
            type="primary"
            danger
            onClick={() => deleteUser(user._id || user.id)}
          >
            Delete
          </Button>
        </>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <Input.Search
          placeholder="Search users"
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
        <Button type="primary" onClick={openAddModal}>
          Add Admin
        </Button>
      </div>

      <Table
        rowKey={user => user._id || user.id}
        columns={columns}
        dataSource={filteredUsers}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* Edit Modal */}
      <Modal
        title="Edit Admin"
        open={isModalOpen}
        onOk={handleUpdate}
        onCancel={() => setIsModalOpen(false)}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="full_name" label="Full Name">
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Admin Modal */}
      <Modal
        title="Add Admin"
        open={isAddModalOpen}
        onOk={handleAddAdmin}
        onCancel={() => setIsAddModalOpen(false)}
      >
        <Form form={addForm} layout="vertical">
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Password is required' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" hidden label="Role">
            <Input /> {/* default Admin */}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminUserManagement;
