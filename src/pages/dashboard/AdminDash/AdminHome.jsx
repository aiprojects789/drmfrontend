import React from 'react'
import BoxCard from '../../../components/dashboard/BoxCard'
const AdminHome = () => {
  return (
    <>
             <h1 className='text-2xl font-bold'>Admin Dashboard</h1>
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
           <BoxCard title="Total Users" count='10'/>
           <BoxCard title="New Users" count='3'/>
           <BoxCard title="Active Artworks" count='10'/>
           <BoxCard title="Pending Artworks" count='10'/>
           </div>
            </>
  )
}

export default AdminHome
