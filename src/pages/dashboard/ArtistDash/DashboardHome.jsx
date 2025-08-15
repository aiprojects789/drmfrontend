import React from 'react' 
import BoxCard from '../../../components/dashboard/BoxCard'
const DashboardHome = () => {
  const stats = [
    { label: 'Total Artworks Uploaded', value: 123 },
    { label: 'Total Earning', value: '$456' },
    { label: 'Active Licenses', value: 123 },
  ]
  return (
    <>
<h1 className='text-2xl font-bold'>Welcome</h1>
    <div className='flex justify-center mt-7'>
     <div className='border-gray-300 border-2 py-5 px-6 rounded-2xl self-center w-3/5'>
     {stats.map((stat, index) => (
      <div key={index} className='flex justify-between mb-5'>
        <span className='text-purple-500'>{stat.label}</span>
        <span className='font-semibold '>{stat.value}</span>
      </div>
     ))}.
      
      </div> 
    </div>
    <div className="grid grid-cols-2 gap-5 my-[10%]">
      
    <BoxCard title="Total Artworks Uploaded" count='0'/>
    <BoxCard title="Total Licenses Earned" count='0'/>
    <BoxCard title="Active Licenses Detected" count='0'/>
    <BoxCard title="Piracy Cases Detected" count='0'/>
    </div>
    </>
  )
}

export default DashboardHome
