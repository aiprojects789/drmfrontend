import React from 'react'
import DataTable from '../../../components/dashboard/DataTable';
import { Button } from 'antd';
import { RiDeleteBin3Line } from 'react-icons/ri';

const UsersManagement = () => {
   const headCells = [
    { id: "username", numeric: false, disablePadding: true, label: "Users" },
    { id: "date_join", numeric: false, disablePadding: false, label: "Joining Date" },
    { id: "status", numeric: false, disablePadding: false, label: "Status" },
    { id: "delete", numeric: false, disablePadding: false, label: "" }

  ];
  const rows = [
    {
      id: 1,
      username: "Abdullah",
      date_join: "2023-10-01",
      status: "Active",
      delete:<Button
            type="primary"
            danger
            className="!py-6 !px-6 !text-lg"
            icon={<RiDeleteBin3Line className="h-4 w-4" />}
          >
            Delete
          </Button>,
    },
    {
      id: 2,
      username: "Ali",
      date_join: "2023-12-01",
      status: "Inactive",
      delete:<Button
            type="primary"
            danger
            className="!py-6 !px-6 !text-lg"
            icon={<RiDeleteBin3Line className="h-4 w-4" />}
          >
            Delete
          </Button>,
    },
    {
      id: 3,
      username: "Amir",
      date_join: "2023-11-01",
      status: "Active",
      delete:<Button
            type="primary"
            danger
            className="!py-6 !px-6 !text-lg"
            icon={<RiDeleteBin3Line className="h-4 w-4" />}
          >
            Delete
          </Button>,
    },
  ];
 

  return (
    <DataTable headCells={headCells} rows={rows}/>
  )
}

export default UsersManagement
