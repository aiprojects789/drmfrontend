import React, { useState } from 'react';
import { Bell, Lock, User, Mail, Shield } from 'lucide-react';
import {Card,Button} from '@mui/material'
const Settings= () => {
  const [notifications, setNotifications] = useState({
    email: true,
    browser: true,
    sales: true,
    newLicenses: true,
    piracyAlerts: true,
    marketing: false
  });

 

  const handleSaveNotifications = (e) => {
    e.preventDefault();
    // Handle notifications update
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your preferences
        </p>
      </div>

      <div className="space-y-6">

        {/* Security Settings */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Add an extra layer of security to your account
                  </p>
                  <Button
                  color='secondary'
                    variant="outlined"
                    size="sm"
                    startIcon={<Shield className="h-5 w-5" />}
                  >
                    Enable 2FA
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900">Change Password</h4>
                <div className="mt-2">
                  <Button
                  color='secondary'
                    variant="outlined"
                    size="sm"
                    startIcon={<Lock className="h-5 w-5" />}
                  >
                    Update Password
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900">Connected Devices</h4>
                <div className="mt-2">
                  <Button
                  color='secondary'
                    variant="outlined"
                    size="sm"
                    startIcon={<Bell className="h-5 w-5" />}
                  >
                    Manage Devices
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;