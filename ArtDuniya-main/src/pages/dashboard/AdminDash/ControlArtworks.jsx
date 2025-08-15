import React from 'react';
import { Card, Button } from 'antd';
import { CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@mui/material';

const { Meta } = Card;

const ControlArtworks = () => (
    // <Badge badgeContent="Approved" color="success" className=''>
      <Card
        style={{ width: 400 }}
        cover={<img alt="example" src="/artwork.jfif" />}
        actions={[
          <Button
            type="primary"
            className="!bg-green-500 !py-6 !px-6"
            icon={<CheckCircle />}
          >
            Approve
          </Button>,
          <Button
            type="primary"
            danger
            className="!py-6 !px-6"
            icon={<XCircle className="h-4 w-4" />}
          >
            Reject
          </Button>,
        ]}
      >
        <Meta
          title={<div className="text-2xl font-bold">Daffodils View</div>}
          description={
            <div>
              <p className="text-lg text-gray-500">By: ABC</p>
              <p className="text-lg text-gray-500">Uploaded: May 10, 2025</p>
            </div>
          }
        />
      </Card>
    // </Badge>
);

export default ControlArtworks;
